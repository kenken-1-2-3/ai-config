#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const VALID_STATUSES = new Set([
  "CONFIRMED",
  "UI_REQUIRED_API_BLOCKED",
  "PROVISIONAL",
  "SOURCE_CONFLICT",
  "OUT_OF_SCOPE_APPROVED",
]);

const DECISION_REQUIRED_STATUSES = new Set([
  "UI_REQUIRED_API_BLOCKED",
  "OUT_OF_SCOPE_APPROVED",
]);

const COMPLETION_BLOCKING_STATUSES = new Set([
  "UI_REQUIRED_API_BLOCKED",
  "PROVISIONAL",
  "SOURCE_CONFLICT",
]);

const PRODUCT_AUTHORITATIVE_SOURCE_ROLES = new Set([
  "scopebehavior",
  "uivisual",
  "userdecision",
]);

const REQUIRED_SECTIONS = [
  "Spec Governance",
  "Scope",
  "Out of Scope",
  "Source Responsibilities",
  "Requirement Traceability Matrix",
  "Source Conflicts",
  "Decision Log",
  "Acceptance Criteria",
  "Edge Cases",
  "Verification Plan",
  "Handoff Readiness",
  "Feature Completion Gate",
  "Implementation Handoff",
];

const SOURCE_COLUMNS = [
  ["sourceid", "Source ID"],
  ["snapshotrevision", "Snapshot / Revision"],
  ["responsibility", "Responsibility"],
  ["location", "Location"],
];

const MATRIX_COLUMNS = [
  ["reqid", "REQ-ID"],
  ["sourceanchorasset", "Source anchor / asset"],
  ["uisurface", "UI surface"],
  ["apipersistence", "API / persistence"],
  ["status", "Status"],
  ["decisionid", "Decision ID"],
  ["acceptanceid", "Acceptance ID"],
  ["verificationidevidence", "Verification ID / evidence"],
];

const DECISION_COLUMNS = [
  ["decisionid", "Decision ID"],
  ["date", "Date"],
  ["reqid", "REQ-ID"],
  ["decisionreason", "Decision + reason"],
  ["approvalsource", "Approval / source"],
];

function usage(exitCode) {
  const stream = exitCode === 0 ? process.stdout : process.stderr;
  stream.write(
    "Usage: node scripts/check-spec.js [--ready | --complete] <spec.md> [more-specs.md]\n" +
      "\n" +
      "Without a mode flag, validates structure and traceability.\n" +
      "With --ready, also rejects unresolved requirements and unapproved handoffs.\n" +
      "With --complete, requires feature-wide checked acceptance and verification evidence.\n",
  );
  process.exit(exitCode);
}

function parseArguments(argv) {
  let mode = "structure";
  const files = [];

  for (const arg of argv) {
    if (arg === "--ready" || arg === "--complete") {
      const requestedMode = arg.slice(2);
      if (mode !== "structure" && mode !== requestedMode) {
        process.stderr.write("--ready and --complete cannot be combined\n");
        usage(2);
      }
      mode = requestedMode;
    } else if (arg === "--help" || arg === "-h") {
      usage(0);
    } else if (arg.startsWith("-")) {
      process.stderr.write(`Unknown option: ${arg}\n`);
      usage(2);
    } else {
      files.push(arg);
    }
  }

  if (files.length === 0) usage(2);
  return { mode, files };
}

function normalizeHeader(value) {
  return value
    .replace(/[`*_]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function splitTableRow(line) {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  const cells = [];
  let cell = "";
  let escaped = false;

  for (const char of trimmed) {
    if (escaped) {
      cell += char;
      escaped = false;
    } else if (char === "\\") {
      cell += char;
      escaped = true;
    } else if (char === "|") {
      cells.push(cell.trim().replace(/\\\|/g, "|"));
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim().replace(/\\\|/g, "|"));
  return cells;
}

function findSection(markdown, englishTitle) {
  const lines = markdown.split(/\r?\n/);
  const expected = englishTitle.toLowerCase();
  const start = lines.findIndex((line) => {
    const match = line.match(/^##\s+(.+)$/);
    if (!match) return false;
    const englishHeading = match[1].split(/\s+\/\s+/)[0].trim().toLowerCase();
    return englishHeading === expected;
  });

  if (start === -1) return null;
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^#{1,2}\s+/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n");
}

function collectSections(markdown, errors) {
  const sections = new Map();
  for (const title of REQUIRED_SECTIONS) {
    const section = findSection(markdown, title);
    sections.set(title, section);
    if (section === null) {
      errors.push(`missing section: ${title}`);
    } else if (section.trim() === "") {
      errors.push(`section is empty: ${title}`);
    }
  }
  return sections;
}

function parseFirstTable(section, sectionName, requiredColumns, errors) {
  if (section === null) return null;
  const lines = section.split(/\r?\n/);
  const headerIndex = lines.findIndex((line) => line.trim().startsWith("|"));
  if (headerIndex === -1 || headerIndex + 1 >= lines.length) {
    errors.push(`missing Markdown table in ${sectionName}`);
    return null;
  }

  const headers = splitTableRow(lines[headerIndex]);
  const normalizedHeaders = headers.map(normalizeHeader);
  const separator = splitTableRow(lines[headerIndex + 1]);
  if (
    separator.length !== headers.length ||
    separator.some((cell) => !/^:?-{3,}:?$/.test(cell.replace(/\s/g, "")))
  ) {
    errors.push(`invalid Markdown table separator in ${sectionName}`);
  }

  for (const [key, label] of requiredColumns) {
    if (!normalizedHeaders.includes(key)) {
      errors.push(`missing column "${label}" in ${sectionName}`);
    }
  }

  const rows = [];
  for (let index = headerIndex + 2; index < lines.length; index += 1) {
    if (!lines[index].trim().startsWith("|")) break;
    const cells = splitTableRow(lines[index]);
    if (cells.every((cell) => cell === "")) continue;
    if (cells.length !== headers.length) {
      errors.push(
        `${sectionName} row ${rows.length + 1} has ${cells.length} cells; expected ${headers.length}`,
      );
    }

    const row = {};
    normalizedHeaders.forEach((header, cellIndex) => {
      row[header] = cells[cellIndex] ?? "";
    });
    rows.push(row);
  }

  if (rows.length === 0) errors.push(`${sectionName} must contain at least one data row`);
  return { rows };
}

function cleanInline(value) {
  return value.trim().replace(/^`|`$/g, "").trim();
}

function isPlaceholder(value) {
  const cleaned = cleanInline(value);
  return (
    cleaned === "" ||
    /^<[^>]+>$/.test(cleaned) ||
    /^(?:TBD|TODO|PENDING|待確認|未確認)(?:\b|\s*[-—:：])/i.test(cleaned) ||
    /^N\/A(?:\s*[-—:+：]\s*)?$/i.test(cleaned)
  );
}

function isExplicitNonUi(value) {
  return /^N\/A\s*[-—:+：]\s*\S/i.test(cleanInline(value));
}

function extractIds(value, prefix) {
  const matches =
    value.match(new RegExp(`\\b${prefix}-[A-Z0-9][A-Z0-9-]*\\b`, "gi")) || [];
  return [...new Set(matches.map((match) => match.toUpperCase()))];
}

function collectChecklistDefinitions(section, prefix, errors) {
  const definitions = new Map();
  const pattern = new RegExp(
    `^\\s*-\\s*\\[([ xX])\\]\\s+(${prefix}-[A-Z0-9][A-Z0-9-]*)\\s*:\\s*(.+)$`,
    "gm",
  );
  let match;
  while ((match = pattern.exec(section || "")) !== null) {
    const id = match[2].toUpperCase();
    if (definitions.has(id)) errors.push(`duplicate ${prefix} definition ${id}`);
    definitions.set(id, {
      checked: match[1].toLowerCase() === "x",
      description: match[3].trim(),
    });
  }
  if (definitions.size === 0) {
    errors.push(`${prefix === "AC" ? "Acceptance Criteria" : "Verification Plan"} needs at least one ${prefix} checklist item`);
  }
  return definitions;
}

function extractMarkdownLinkTargets(markdown) {
  const targets = [];
  let searchFrom = 0;

  while (searchFrom < markdown.length) {
    const opening = markdown.indexOf("](", searchFrom);
    if (opening === -1) break;
    let cursor = opening + 2;
    while (/\s/.test(markdown[cursor] || "")) cursor += 1;

    if (markdown[cursor] === "<") {
      const closing = markdown.indexOf(">", cursor + 1);
      if (closing !== -1) {
        targets.push(markdown.slice(cursor + 1, closing));
        searchFrom = closing + 1;
        continue;
      }
    }

    const start = cursor;
    let depth = 0;
    let escaped = false;
    while (cursor < markdown.length) {
      const char = markdown[cursor];
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "(") {
        depth += 1;
      } else if (char === ")") {
        if (depth === 0) break;
        depth -= 1;
      }
      cursor += 1;
    }

    if (cursor < markdown.length) {
      targets.push(markdown.slice(start, cursor).trim().split(/\s+["']/)[0]);
      searchFrom = cursor + 1;
    } else {
      searchFrom = opening + 2;
    }
  }
  return targets;
}

function checkLocalLinks(markdown, specPath, errors) {
  const seen = new Set();
  for (let target of extractMarkdownLinkTargets(markdown)) {
    target = target.trim();
    if (
      target === "" ||
      target.startsWith("#") ||
      target.startsWith("//") ||
      /^[a-z][a-z0-9+.-]*:/i.test(target)
    ) {
      continue;
    }

    const pathOnly = target.split(/[?#]/)[0];
    let decoded;
    try {
      decoded = decodeURIComponent(pathOnly);
    } catch {
      decoded = pathOnly;
    }
    const resolved = path.isAbsolute(decoded)
      ? decoded
      : path.resolve(path.dirname(specPath), decoded);
    if (!seen.has(resolved) && !fs.existsSync(resolved)) {
      errors.push(`local link does not exist: ${target}`);
    }
    seen.add(resolved);
  }
}

function bulletValue(section, label) {
  if (section === null) return null;
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = section.match(new RegExp(`^\\s*-\\s*${escaped}\\s*:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : null;
}

function sectionHasTable(section) {
  return (section || "").split(/\r?\n/).some((line) => line.trim().startsWith("|"));
}

function validateSpec(specPath, mode) {
  const errors = [];
  let markdown;
  try {
    markdown = fs.readFileSync(specPath, "utf8");
  } catch (error) {
    return { errors: [`cannot read spec: ${error.message}`], requirementCount: 0 };
  }

  const sections = collectSections(markdown, errors);
  const sourceTable = parseFirstTable(
    sections.get("Source Responsibilities"),
    "Source Responsibilities",
    SOURCE_COLUMNS,
    errors,
  );
  const matrixTable = parseFirstTable(
    sections.get("Requirement Traceability Matrix"),
    "Requirement Traceability Matrix",
    MATRIX_COLUMNS,
    errors,
  );

  const sourceIds = new Set();
  const sourceRoles = new Map();
  if (sourceTable) {
    for (const [index, row] of sourceTable.rows.entries()) {
      const rowNumber = index + 1;
      const ids = extractIds(row.sourceid || "", "SRC");
      if (ids.length !== 1 || cleanInline(row.sourceid || "").toUpperCase() !== ids[0]) {
        errors.push(`Source Responsibilities row ${rowNumber} needs one valid Source ID`);
      } else if (sourceIds.has(ids[0])) {
        errors.push(`duplicate source ID ${ids[0]}`);
      } else {
        sourceIds.add(ids[0]);
        sourceRoles.set(ids[0], normalizeHeader(row.responsibility || ""));
      }
      for (const [key, label] of SOURCE_COLUMNS.slice(1)) {
        if (isPlaceholder(row[key] || "")) {
          errors.push(`source ${ids[0] || `row ${rowNumber}`} has empty ${label}`);
        }
      }
    }
  }

  const acceptanceDefinitions = collectChecklistDefinitions(
    sections.get("Acceptance Criteria"),
    "AC",
    errors,
  );
  const verificationDefinitions = collectChecklistDefinitions(
    sections.get("Verification Plan"),
    "VT",
    errors,
  );
  const referencedSources = new Set();
  const referencedAcceptance = new Set();
  const referencedVerification = new Set();
  const referencedDecisions = new Set();
  const requirementIds = new Set();
  const requirements = [];

  if (matrixTable) {
    for (const [index, row] of matrixTable.rows.entries()) {
      const rowNumber = index + 1;
      const reqIds = extractIds(row.reqid || "", "REQ");
      const reqId = reqIds[0] || `row ${rowNumber}`;
      if (reqIds.length !== 1 || cleanInline(row.reqid || "").toUpperCase() !== reqIds[0]) {
        errors.push(`Requirement Traceability Matrix row ${rowNumber} needs one valid REQ-ID`);
      } else if (requirementIds.has(reqId)) {
        errors.push(`duplicate requirement ID ${reqId}`);
      } else {
        requirementIds.add(reqId);
      }

      for (const [key, label] of MATRIX_COLUMNS.slice(1)) {
        if (isPlaceholder(row[key] || "")) errors.push(`${reqId} has empty ${label}`);
      }

      const rowSources = extractIds(row.sourceanchorasset || "", "SRC");
      if (rowSources.length === 0) errors.push(`${reqId} must reference at least one Source ID`);
      for (const sourceId of rowSources) {
        referencedSources.add(sourceId);
        if (!sourceIds.has(sourceId)) {
          errors.push(`${reqId} references unknown source ID ${sourceId}`);
        }
      }

      const uiSurface = row.uisurface || "";
      const hasUserVisibleUi =
        !isPlaceholder(uiSurface) && !isExplicitNonUi(uiSurface);
      const allRowSourcesAreKnown =
        rowSources.length > 0 &&
        rowSources.every((sourceId) => sourceIds.has(sourceId));
      const hasProductAuthoritativeSource = rowSources.some((sourceId) =>
        PRODUCT_AUTHORITATIVE_SOURCE_ROLES.has(sourceRoles.get(sourceId)),
      );
      if (
        hasUserVisibleUi &&
        allRowSourcesAreKnown &&
        !hasProductAuthoritativeSource
      ) {
        errors.push(
          `${reqId} has a user-visible UI surface but no product-authoritative source; cite at least one Scope / behavior, UI / visual, or User decision source`,
        );
      }

      const status = cleanInline(row.status || "").toUpperCase();
      if (!VALID_STATUSES.has(status)) {
        errors.push(
          `${reqId} has invalid status ${status || "<empty>"}; expected ${[
            ...VALID_STATUSES,
          ].join(", ")}`,
        );
      }

      const decisionIds = extractIds(row.decisionid || "", "DEC");
      for (const decisionId of decisionIds) referencedDecisions.add(decisionId);
      if (DECISION_REQUIRED_STATUSES.has(status) && decisionIds.length === 0) {
        errors.push(`${reqId} with status ${status} must reference at least one Decision ID`);
      }

      const acceptanceIds = extractIds(row.acceptanceid || "", "AC");
      if (acceptanceIds.length === 0) {
        errors.push(`${reqId} must reference at least one Acceptance ID`);
      }
      for (const acceptanceId of acceptanceIds) {
        referencedAcceptance.add(acceptanceId);
        if (!acceptanceDefinitions.has(acceptanceId)) {
          errors.push(`${reqId} references unknown acceptance ID ${acceptanceId}`);
        }
      }

      const verificationIds = extractIds(row.verificationidevidence || "", "VT");
      if (verificationIds.length === 0) {
        errors.push(`${reqId} must reference at least one Verification ID`);
      }
      for (const verificationId of verificationIds) {
        referencedVerification.add(verificationId);
        if (!verificationDefinitions.has(verificationId)) {
          errors.push(`${reqId} references unknown verification ID ${verificationId}`);
        }
      }

      requirements.push({
        reqId,
        status,
        decisionIds,
        acceptanceIds,
        verificationIds,
      });
    }
  }

  for (const sourceId of sourceIds) {
    if (!referencedSources.has(sourceId)) {
      errors.push(`source ID ${sourceId} is not referenced by any requirement`);
    }
  }
  for (const acceptanceId of acceptanceDefinitions.keys()) {
    if (!referencedAcceptance.has(acceptanceId)) {
      errors.push(`acceptance ID ${acceptanceId} is not referenced by any requirement`);
    }
  }
  for (const verificationId of verificationDefinitions.keys()) {
    if (!referencedVerification.has(verificationId)) {
      errors.push(`verification ID ${verificationId} is not referenced by any requirement`);
    }
  }

  const decisions = new Map();
  const decisionSection = sections.get("Decision Log");
  if (referencedDecisions.size > 0 || sectionHasTable(decisionSection)) {
    const decisionTable = parseFirstTable(
      decisionSection,
      "Decision Log",
      DECISION_COLUMNS,
      errors,
    );
    if (decisionTable) {
      for (const [index, row] of decisionTable.rows.entries()) {
        const rowNumber = index + 1;
        const ids = extractIds(row.decisionid || "", "DEC");
        const decisionId = ids[0] || `row ${rowNumber}`;
        if (
          ids.length !== 1 ||
          cleanInline(row.decisionid || "").toUpperCase() !== ids[0]
        ) {
          errors.push(`Decision Log row ${rowNumber} needs one valid Decision ID`);
        } else if (decisions.has(decisionId)) {
          errors.push(`duplicate decision ID ${decisionId}`);
        }
        for (const [key, label] of DECISION_COLUMNS.slice(1)) {
          if (isPlaceholder(row[key] || "")) {
            errors.push(`decision ${decisionId} has empty ${label}`);
          }
        }
        const reqIds = extractIds(row.reqid || "", "REQ");
        if (reqIds.length === 0) {
          errors.push(`decision ${decisionId} must reference at least one REQ-ID`);
        }
        for (const reqId of reqIds) {
          if (!requirementIds.has(reqId)) {
            errors.push(`decision ${decisionId} references unknown requirement ID ${reqId}`);
          }
        }
        const approvalSourceIds = extractIds(row.approvalsource || "", "SRC");
        if (approvalSourceIds.length === 0) {
          errors.push(`decision ${decisionId} must reference at least one approval Source ID`);
        }
        for (const sourceId of approvalSourceIds) {
          if (!sourceIds.has(sourceId)) {
            errors.push(`decision ${decisionId} references unknown approval source ID ${sourceId}`);
          }
        }
        if (ids.length === 1) decisions.set(decisionId, { reqIds, approvalSourceIds });
      }
    }
  }

  for (const requirement of requirements) {
    let hasUserDecisionSource = false;
    for (const decisionId of requirement.decisionIds) {
      const decision = decisions.get(decisionId);
      if (!decision) {
        errors.push(`${requirement.reqId} references unknown decision ID ${decisionId}`);
      } else if (!decision.reqIds.includes(requirement.reqId)) {
        errors.push(
          `${requirement.reqId} references ${decisionId}, but that decision does not map back to it`,
        );
      } else if (
        decision.approvalSourceIds.some(
          (sourceId) => sourceRoles.get(sourceId) === "userdecision",
        )
      ) {
        hasUserDecisionSource = true;
      }
    }
    if (
      DECISION_REQUIRED_STATUSES.has(requirement.status) &&
      requirement.decisionIds.length > 0 &&
      !hasUserDecisionSource
    ) {
      errors.push(
        `${requirement.decisionIds.join(", ")} for ${requirement.reqId} must reference an explicit User decision source`,
      );
    }
  }
  for (const decisionId of decisions.keys()) {
    if (!referencedDecisions.has(decisionId)) {
      errors.push(`decision ID ${decisionId} is not referenced by any requirement`);
    }
  }

  const governance = sections.get("Spec Governance");
  const specRole = cleanInline(bulletValue(governance, "Role") || "").toUpperCase();
  const canonicalSpec = bulletValue(governance, "Canonical spec");
  if (!specRole) {
    errors.push("Spec Governance is missing Role");
  } else if (specRole !== "CANONICAL" && specRole !== "SLICE") {
    errors.push("Spec Governance Role must be CANONICAL or SLICE");
  }
  if (!canonicalSpec || isPlaceholder(canonicalSpec)) {
    errors.push("Spec Governance is missing Canonical spec");
  } else if (specRole === "CANONICAL" && cleanInline(canonicalSpec).toUpperCase() !== "SELF") {
    errors.push("a CANONICAL spec must record Canonical spec as SELF");
  } else if (specRole === "SLICE" && cleanInline(canonicalSpec).toUpperCase() === "SELF") {
    errors.push("a SLICE spec must point to its separate canonical spec");
  }

  const handoff = sections.get("Handoff Readiness");
  const handoffStatus = bulletValue(handoff, "Status");
  const confirmation = bulletValue(handoff, "User confirmation");
  const activeValue = bulletValue(handoff, "Active REQ IDs");
  if (!handoffStatus) errors.push("Handoff Readiness is missing Status");
  if (!confirmation) errors.push("Handoff Readiness is missing User confirmation");
  if (!activeValue || isPlaceholder(activeValue)) {
    errors.push("Handoff Readiness is missing Active REQ IDs");
  } else {
    const activeIds = extractIds(activeValue, "REQ");
    if (activeIds.length === 0) {
      errors.push("Handoff Readiness needs at least one active REQ-ID");
    }
    for (const reqId of activeIds) {
      if (!requirementIds.has(reqId)) {
        errors.push(`unknown active requirement ID ${reqId}`);
      }
      const requirement = requirements.find((item) => item.reqId === reqId);
      if (requirement && requirement.status === "OUT_OF_SCOPE_APPROVED") {
        errors.push(`out-of-scope requirement ${reqId} cannot be active for implementation`);
      }
    }
  }

  if (mode === "ready") {
    if (cleanInline(handoffStatus || "").toUpperCase() !== "READY") {
      errors.push("handoff status must be READY before implementation handoff");
    }
    if (!confirmation || isPlaceholder(confirmation)) {
      errors.push("user confirmation must record the approval before implementation handoff");
    }
    for (const requirement of requirements) {
      if (requirement.status === "PROVISIONAL" || requirement.status === "SOURCE_CONFLICT") {
        errors.push(
          `${requirement.reqId} has unresolved status ${requirement.status}; cannot hand off`,
        );
      }
    }
  }

  const completion = sections.get("Feature Completion Gate");
  const completionStatus = bulletValue(completion, "Status");
  const remaining = bulletValue(completion, "Remaining / blocked REQ IDs");
  if (!completionStatus) errors.push("Feature Completion Gate is missing Status");
  if (!remaining) errors.push("Feature Completion Gate is missing Remaining / blocked REQ IDs");

  if (mode === "complete") {
    if (specRole !== "CANONICAL") {
      errors.push("only a CANONICAL spec can claim feature completion");
    }
    if (cleanInline(completionStatus || "").toUpperCase() !== "COMPLETE") {
      errors.push("feature completion status must be COMPLETE");
    }
    if (!remaining || cleanInline(remaining).toUpperCase() !== "NONE") {
      errors.push("feature completion must record Remaining / blocked REQ IDs as exact NONE");
    }
    if (!confirmation || isPlaceholder(confirmation)) {
      errors.push("user confirmation must be recorded before feature completion");
    }
    for (const requirement of requirements) {
      if (COMPLETION_BLOCKING_STATUSES.has(requirement.status)) {
        errors.push(
          `${requirement.reqId} has status ${requirement.status}; feature cannot be complete`,
        );
      }
      for (const acceptanceId of requirement.acceptanceIds) {
        const item = acceptanceDefinitions.get(acceptanceId);
        if (item && !item.checked) {
          errors.push(`acceptance ID ${acceptanceId} is not checked`);
        }
      }
      for (const verificationId of requirement.verificationIds) {
        const item = verificationDefinitions.get(verificationId);
        if (!item) continue;
        if (!item.checked) errors.push(`verification ID ${verificationId} is not checked`);
        const evidence = item.description.match(/\bEvidence\s*:\s*(.+)$/i);
        if (!evidence || isPlaceholder(evidence[1])) {
          errors.push(`verification ID ${verificationId} needs non-placeholder Evidence`);
        }
      }
    }
  }

  checkLocalLinks(markdown, specPath, errors);
  return { errors, requirementCount: requirementIds.size };
}

const { mode, files } = parseArguments(process.argv.slice(2));
let failed = false;
for (const file of files) {
  const specPath = path.resolve(file);
  const result = validateSpec(specPath, mode);
  if (result.errors.length > 0) {
    failed = true;
    process.stderr.write(`✗ ${specPath}\n`);
    for (const error of result.errors) process.stderr.write(`  - ${error}\n`);
  } else {
    const noun = result.requirementCount === 1 ? "requirement" : "requirements";
    process.stdout.write(
      `✓ ${specPath}: valid (${result.requirementCount} ${noun}, mode: ${mode})\n`,
    );
  }
}
process.exitCode = failed ? 1 : 0;
