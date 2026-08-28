#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const VALID_STATUSES = new Set([
  "CONFIRMED",
  "API_CONTRACT_MISSING",
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
  "API_CONTRACT_MISSING",
  "UI_REQUIRED_API_BLOCKED",
  "PROVISIONAL",
  "SOURCE_CONFLICT",
]);

const HANDOFF_BLOCKING_STATUSES = new Set([
  "API_CONTRACT_MISSING",
  "PROVISIONAL",
  "SOURCE_CONFLICT",
]);

const VALID_EXECUTION_BOUNDARIES = new Set([
  "FULL_CONTRACT",
  "BOUNDED_UI_ONLY",
]);

const PRODUCT_AUTHORITATIVE_SOURCE_ROLES = new Set([
  "scopebehavior",
  "uivisual",
  "userdecision",
]);

const API_AUTHORITATIVE_SOURCE_ROLES = new Set(["apipersistence"]);

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

const API_NOTIFICATION_COLUMNS = [
  ["notificationid", "Notification ID"],
  ["date", "Date"],
  ["reqid", "REQ-ID"],
  ["missingapicontractevidence", "Missing API contract / evidence"],
  ["affectedbehavior", "Affected behavior"],
  ["safescopenextaction", "Safe scope / next action"],
  ["userfacingnotificationevidence", "User-facing notification / evidence"],
];

const UNRESOLVED_API_PATTERNS = [
  /\[UNRESOLVED_API\]/i,
  /(?:^|[^不無无])待(?:補|確認|釐清|提供|取得|驗證|完成)?[^|。；;]{0,24}(?:API|後端|endpoint|schema|contract|契約|欄位|field|payload|response|mapping)/i,
  /(?:^|[^不無无])需(?:補|確認|釐清|提供|取得|驗證|完成|實際|真實)[^|。；;]{0,24}(?:API|後端|endpoint|schema|contract|契約|欄位|field|payload|response|mapping)/i,
  /(?:API|後端|endpoint|schema|contract|契約|欄位|field|payload|response|mapping)[^|。；;]{0,32}(?:待補|待確認|待釐清|待完成|尚未提供|尚缺|尚無|未提供|未確認|未驗證|未回傳|沒回傳|沒有回傳|未帶|沒帶|缺少|缺失|不存在|不含|未包含|省略|需實際|需真實)/i,
  /(?<!no )(?<!not )(?<!without )\b(?:missing|unknown|unverified|unconfirmed)\s+(?:api|endpoint|schema|contract|request|response|field|payload|mapping)\b/i,
  /(?<!no )(?<!not )\b(?:api|endpoint|schema|contract|request|response|field|payload|mapping)\b[^.;|]{0,40}\b(?:is|are|remains?)\s+(?:missing|unknown|unverified|unconfirmed|not provided|pending)\b/i,
  /\b(?:api|endpoint|schema|contract|request|response|field|payload|mapping)\b[^.;|]{0,40}\b(?:does not include|do not include|does not return|do not return|lacks?|excludes?)\s+(?!(?:(?:an?|any)\s+)?errors?\b)\S+/i,
  /(?<!no )(?<!not )\b(?:API\s+)?(?:response|payload|schema|contract)\b\s+(?:is\s+)?(?:missing|absent)\s+(?!no\b)\S+/i,
  /(?<!no )(?<!not )\b[A-Za-z_][A-Za-z0-9_.-]*\s+(?:is|are)\s+(?:missing|absent)\s+from\s+(?:the\s+)?(?:API\s+)?(?:response|payload|schema|contract)\b/i,
  /\b(?:API\s+)?(?:response|payload|schema|contract)\b[^.;|]{0,40}\bomit(?:s|ted)?\s+(?!no\b)\S+/i,
  /(?:\b(?:API|response|schema|contract|payload|endpoint|fields?)\b|\bstatement\s+types?\b|欄位|契約)[^|]{0,180}(?:僅有|只有|僅保留)[^|]{0,180}(?:未實作完整(?:需求|契約)|未完整實作(?:本|此)?(?:需求|契約)|缺少完整(?:需求|契約)|契約不完整)/i,
  /^(?:TBD|TODO|BLOCKED|UNVERIFIED|UNKNOWN)\s*[-—:：]\s*/i,
];

const VERIFIED_ABSENCE_CONTRADICTION_PATTERNS = [
  /\b(?:unavailable|unverified|unconfirmed|unknown|pending|not provided|not checked)\b/i,
  /\b(?:needs?|requires?)\s+(?:verification|confirmation|read-?back)\b/i,
  /(?:待確認|待驗證|待查證|待回讀|尚未(?:提供|確認|驗證|取得|查證|回傳)|未(?:提供|確認|驗證|取得|查證)|無法(?:取得|確認|驗證))/i,
];

const VERIFIED_ABSENCE_REQUIRED_PATTERNS = [
  /(?<!not )(?<!non-)\b(?:required|mandatory)\b/i,
  /(?<!非)(?<!不)(?:必要|必需|必填)(?:欄位|字段|field)?/i,
];

const VERIFIED_ABSENCE_INTENT_PATTERNS = [
  /\bby design\b/i,
  /\bintentional(?:ly)?\b[^.;|]{0,80}\b(?:omit(?:s|ted)?|absent|exclude[ds]?|not (?:defined|included))\b/i,
  /\b(?:confirmed|verified)\b[^.;|]{0,80}\b(?:absent|omitted|excluded|not (?:defined|included))\b/i,
  /\b(?:API|OpenAPI|endpoint|schema|contract|payload|request|response)\b[^.;|]{0,80}\b(?:omit(?:s|ted)?|exclude[ds]?|does not (?:define|include))\b/i,
  /(?:設計上|刻意|明確|已確認|已驗證|契約確認|schema 確認)[^。；;|]{0,40}(?:不含|不存在|未定義|省略|排除)/i,
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

function hasUnresolvedApiContract(value) {
  const cleaned = cleanInline(value);
  if (/\[UNRESOLVED_API\]/i.test(cleaned)) return true;
  if (/^\s*\[VERIFIED_ABSENCE\]/i.test(cleaned)) {
    return hasVerifiedAbsenceContradiction(cleaned);
  }
  return UNRESOLVED_API_PATTERNS.slice(1).some((pattern) => pattern.test(cleaned));
}

function hasVerifiedApiAbsence(value) {
  return /^\s*\[VERIFIED_ABSENCE\]/i.test(cleanInline(value));
}

function containsVerifiedApiAbsence(value) {
  return /\[VERIFIED_ABSENCE\]/i.test(cleanInline(value));
}

function hasVerifiedAbsenceContradiction(value) {
  const detail = cleanInline(value).replace(/^\s*\[VERIFIED_ABSENCE\]\s*/i, "");
  const withoutNegatedRequired = detail
    .replace(/\b(?:not (?:a )?|no longer )(?:required|mandatory)\b/gi, "")
    .replace(/(?:不(?:是)?|非)(?:必要|必需|必填)(?:欄位|字段|field)?/gi, "");
  if (
    VERIFIED_ABSENCE_REQUIRED_PATTERNS.some((pattern) =>
      pattern.test(withoutNegatedRequired),
    )
  ) {
    return true;
  }
  const withoutConfirmedChineseAbsence = withoutNegatedRequired.replace(
    /(?:已確認|已驗證)[^。；;|]{0,20}(?:未提供|未回傳|不存在|不含|未定義)/gi,
    "",
  );
  return VERIFIED_ABSENCE_CONTRADICTION_PATTERNS.some((pattern) =>
    pattern.test(withoutConfirmedChineseAbsence),
  );
}

function hasVerifiedAbsenceNonBlockingScope(value, reqId) {
  const detail = cleanInline(value).replace(/^\s*\[VERIFIED_ABSENCE\]\s*/i, "");
  const escapedReqId = reqId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const requirementSubject = `(?:${escapedReqId}|this requirement|the requirement|本需求|此需求|本 REQ|此 REQ)`;
  return [
    new RegExp(
      `${requirementSubject}[^.;。；|]{0,80}(?:does not require|is not dependent on|is unaffected by|不需要|不依賴|不受影響)`,
      "i",
    ),
    new RegExp(
      `(?:not required (?:by|for)|does not affect|no impact on|不影響|不阻擋)[^.;。；|]{0,80}${requirementSubject}`,
      "i",
    ),
  ].some((pattern) => pattern.test(detail));
}

function hasConcreteVerifiedAbsenceTarget(value) {
  const detail = cleanInline(value).replace(/^\s*\[VERIFIED_ABSENCE\]\s*/i, "");
  if (/`[^`\r\n]{1,80}`/.test(detail)) return true;
  if (/(?:欄位|字段)\s*[「『][^」』\r\n]{1,80}[」』]/.test(detail)) return true;
  if (/\/[A-Za-z0-9][A-Za-z0-9_./{}-]*/.test(detail)) return true;

  const genericTargets = new Set([
    "a",
    "an",
    "api",
    "by",
    "contract",
    "data",
    "design",
    "field",
    "fields",
    "it",
    "key",
    "omission",
    "parameter",
    "payload",
    "property",
    "request",
    "response",
    "schema",
    "that",
    "the",
    "these",
    "this",
    "those",
    "value",
  ]);
  const candidates = [];
  const targetPatterns = [
    /\b(?:field|property|key|parameter)(?:(?:\s+(?:named|called))|\s*[:=])\s+([A-Za-z][A-Za-z0-9_.-]*)\b/gi,
    /\b(?:omit(?:s|ted)?|exclude[ds]?|include[ds]?|define[ds]?)\s+(?:(?:a|an|the|this|that|these|those)\s+)?(?:(?:field|property|key|parameter|value)\s+)?([A-Za-z][A-Za-z0-9_.-]*)\b/gi,
    /\b([A-Za-z][A-Za-z0-9_.-]*)\s+(?:is|are)\s+(?:absent|omitted|excluded|not (?:defined|included))\b/gi,
    /(?:不含|不存在|未定義|省略|排除|未提供|未回傳)(?:的)?(?:欄位|字段)?\s*([A-Za-z][A-Za-z0-9_.-]*)\b/gi,
  ];
  for (const pattern of targetPatterns) {
    for (const match of detail.matchAll(pattern)) candidates.push(match[1]);
  }
  return candidates.some((candidate) => {
    const normalized = candidate.toLowerCase();
    return !genericTargets.has(normalized) && !/^req-[a-z0-9-]+$/i.test(candidate);
  });
}

function hasVerifiedAbsenceEvidence(value, reqId) {
  const detail = cleanInline(value).replace(/^\s*\[VERIFIED_ABSENCE\]\s*/i, "");
  return (
    detail.length >= 12 &&
    !hasVerifiedAbsenceContradiction(detail) &&
    /(?:API|OpenAPI|endpoint|schema|contract|契約|payload|request|response|回應|回傳)/i.test(
      detail,
    ) &&
    VERIFIED_ABSENCE_INTENT_PATTERNS.some((pattern) => pattern.test(detail)) &&
    hasConcreteVerifiedAbsenceTarget(detail) &&
    hasVerifiedAbsenceNonBlockingScope(detail, reqId)
  );
}

function isMissingNotificationValue(value) {
  const cleaned = cleanInline(value);
  return isPlaceholder(cleaned) || /^N\/A\b/i.test(cleaned);
}

function isDeferredNotificationEvidence(value) {
  return /^(?:NOT (?:YET )?(?:REPORTED|COMMUNICATED)|UNREPORTED|USER (?:HAS |WAS )?NOT (?:BEEN )?(?:NOTIFIED|INFORMED)|NO NOTIFICATION (?:WAS |HAS BEEN )?SENT|NOTIFICATION (?:(?:WAS |HAS BEEN )?NOT SENT|(?:IS )?PENDING)|WILL (?:BE )?REPORT(?:ED)?|TO BE REPORTED|(?:未|尚未|沒有|並未)(?:向[^，。；;]{0,20})?(?:告知|通知|回報)|通知(?:尚未|未曾|沒有)[^，。；;]{0,12}(?:送出|發出)|待告知|將.*告知|稍後告知)|\bUSER WILL BE (?:TOLD|NOTIFIED|INFORMED) LATER\b/i.test(
    cleanInline(value),
  );
}

function hasUserFacingNotificationEvidence(value) {
  const cleaned = cleanInline(value);
  return (
    /^(?:REPORTED|NOTIFIED|INFORMED|COMMUNICATED)\b[^|]{0,160}\b(?:CURRENT|SAME|THIS|THE)\s+(?:TASK|TURN|THREAD)\b/i.test(
      cleaned,
    ) ||
    /^(?:CURRENT|SAME|THIS)\s+(?:TASK|TURN|THREAD)\b[^|]{0,160}\b(?:REPORTED|NOTIFIED|INFORMED|COMMUNICATED)\b/i.test(
      cleaned,
    ) ||
    /^(?:已於)?(?:本輪|同輪|本次|當前)(?:任務|task|turn|thread)?[^|]{0,80}(?:告知|通知|回報)/i.test(
      cleaned,
    ) ||
    /^(?:已告知|已通知|已回報)[^|]{0,80}(?:本輪|同輪|本次|當前|task|turn|thread)/i.test(
      cleaned,
    )
  );
}

function extractIds(value, prefix) {
  const matches =
    value.match(new RegExp(`\\b${prefix}-[A-Z0-9][A-Z0-9-]*\\b`, "gi")) || [];
  return [...new Set(matches.map((match) => match.toUpperCase()))];
}

function extractInheritedRequirementIds(value) {
  const ids = [];
  for (const segment of value.split(/[;；]/)) {
    const cleaned = segment.trim();
    const match =
      cleaned.match(
        /^(?:(?:同|沿用)\s*(?:一份)?(?:API\s*)?(?:契約|contract)?\s*|(?:same as|inherits? from)\s+)(REQ-[A-Z0-9][A-Z0-9-]*)\b/i,
      ) ||
      cleaned.match(
        /^uses?\s+(?:the\s+)?same\s+(?:API\s+)?contract\s+as\s+(REQ-[A-Z0-9][A-Z0-9-]*)\b/i,
      ) ||
      cleaned.match(
        /^(?:API\s+)?contract\s+(?:is\s+)?(?:the\s+)?(?:same as|inherited from)\s+(REQ-[A-Z0-9][A-Z0-9-]*)\b/i,
      );
    if (match) ids.push(match[1].toUpperCase());
  }
  return [...new Set(ids)];
}

function claimsFixtureIntegrationSuccess(value) {
  return cleanInline(value)
    .split(/[.;。；]/)
    .some((segment) => {
      const namesIntegration = /\b(?:API|Network|integration|persistence)\b/i.test(
        segment,
      );
      const usesFixture = /\b(?:fake|mock|fixture|stub)\b/i.test(segment);
      const claimsSuccess = /\b(?:pass(?:ed|es)?|success(?:ful(?:ly)?)?|verified|complete(?:d)?|working)\b/i.test(
        segment,
      );
      return namesIntegration && (usesFixture || claimsSuccess);
    });
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

      const apiPersistence = row.apipersistence || "";
      const containsVerifiedAbsence = containsVerifiedApiAbsence(apiPersistence);
      const hasVerifiedAbsence = hasVerifiedApiAbsence(apiPersistence);
      const hasApiAuthoritativeSource = rowSources.some((sourceId) =>
        API_AUTHORITATIVE_SOURCE_ROLES.has(sourceRoles.get(sourceId)),
      );
      const hasValidVerifiedAbsence =
        hasVerifiedAbsence &&
        hasApiAuthoritativeSource &&
        hasVerifiedAbsenceEvidence(apiPersistence, reqId);
      const apiContractIsUnresolved = containsVerifiedAbsence
        ? !hasValidVerifiedAbsence
        : hasUnresolvedApiContract(apiPersistence);
      if (containsVerifiedAbsence) {
        if (!hasVerifiedAbsence) {
          errors.push(
            `${reqId} must place [VERIFIED_ABSENCE] at the start of API / persistence`,
          );
        }
        if (!hasApiAuthoritativeSource) {
          errors.push(
            `${reqId} uses [VERIFIED_ABSENCE] without an API / persistence source`,
          );
        }
        if (!hasVerifiedAbsenceEvidence(apiPersistence, reqId)) {
          errors.push(
            `${reqId} uses [VERIFIED_ABSENCE] without concrete evidence that the omission is intentional and non-blocking for ${reqId}`,
          );
        }
        if (hasVerifiedAbsenceContradiction(apiPersistence)) {
          errors.push(
            `${reqId} uses [VERIFIED_ABSENCE] but its evidence is still pending, unavailable, or unverified`,
          );
        }
      }
      if (status === "CONFIRMED" && apiContractIsUnresolved) {
        errors.push(
          `${reqId} is CONFIRMED but API / persistence contains an unresolved API marker; use API_CONTRACT_MISSING until verified, or use [VERIFIED_ABSENCE] only with authoritative evidence that the omission is intentional and non-blocking for this requirement`,
        );
      }
      if (status === "PROVISIONAL" && apiContractIsUnresolved) {
        errors.push(
          `${reqId} is PROVISIONAL but API / persistence contains an unresolved API marker; use API_CONTRACT_MISSING so the contract gap is notified and tracked`,
        );
      }
      if (
        (status === "API_CONTRACT_MISSING" ||
          status === "UI_REQUIRED_API_BLOCKED") &&
        !/^\s*\[UNRESOLVED_API\]/i.test(apiPersistence)
      ) {
        errors.push(
          `${reqId} with status ${status} must prefix API / persistence with [UNRESOLVED_API]`,
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
      if (status === "UI_REQUIRED_API_BLOCKED") {
        for (const verificationId of verificationIds) {
          const verification = verificationDefinitions.get(verificationId);
          if (
            verification?.checked &&
            claimsFixtureIntegrationSuccess(verification.description)
          ) {
            errors.push(
              `${reqId} cannot use checked ${verificationId} fixture evidence as API / Network / persistence integration success while UI_REQUIRED_API_BLOCKED`,
            );
          }
        }
      }

      requirements.push({
        reqId,
        status,
        apiPersistence,
        apiContractIsUnresolved,
        containsVerifiedAbsence,
        hasApiAuthoritativeSource,
        decisionIds,
        acceptanceIds,
        verificationIds,
      });
    }
  }

  const requirementsById = new Map(
    requirements.map((requirement) => [requirement.reqId, requirement]),
  );

  function hasApiAuthority(requirement, visited = new Set()) {
    if (requirement.hasApiAuthoritativeSource) return true;
    if (visited.has(requirement.reqId)) return false;
    const nextVisited = new Set(visited);
    nextVisited.add(requirement.reqId);
    return extractInheritedRequirementIds(requirement.apiPersistence).some((linkedReqId) => {
      const linkedRequirement = requirementsById.get(linkedReqId);
      return linkedRequirement ? hasApiAuthority(linkedRequirement, nextVisited) : false;
    });
  }

  for (const requirement of requirements) {
    if (
      requirement.status === "CONFIRMED" &&
      !requirement.containsVerifiedAbsence &&
      !isExplicitNonUi(requirement.apiPersistence) &&
      !hasApiAuthority(requirement)
    ) {
      errors.push(
        `${requirement.reqId} confirms an API / persistence contract without a direct or explicitly inherited API / persistence source`,
      );
    }
  }
  for (const requirement of requirements) {
    for (const linkedReqId of extractInheritedRequirementIds(requirement.apiPersistence)) {
      if (!requirementsById.has(linkedReqId)) {
        errors.push(
          `${requirement.reqId} inherits an API contract from unknown requirement ${linkedReqId}`,
        );
      }
    }
  }

  function findInheritanceCycle(requirement, path = []) {
    const cycleStart = path.indexOf(requirement.reqId);
    if (cycleStart !== -1) return [...path.slice(cycleStart), requirement.reqId];
    const nextPath = [...path, requirement.reqId];
    for (const linkedReqId of extractInheritedRequirementIds(requirement.apiPersistence)) {
      const linkedRequirement = requirementsById.get(linkedReqId);
      if (!linkedRequirement) continue;
      const cycle = findInheritanceCycle(linkedRequirement, nextPath);
      if (cycle) return cycle;
    }
    return null;
  }

  const reportedInheritanceCycles = new Set();
  for (const requirement of requirements) {
    const cycle = findInheritanceCycle(requirement);
    if (!cycle) continue;
    const cycleKey = [...new Set(cycle)].sort().join("|");
    if (reportedInheritanceCycles.has(cycleKey)) continue;
    reportedInheritanceCycles.add(cycleKey);
    errors.push(`circular API contract inheritance: ${cycle.join(" -> ")}`);
  }

  function findInheritedApiBlocker(requirement, visited = new Set()) {
    if (visited.has(requirement.reqId)) return null;
    const nextVisited = new Set(visited);
    nextVisited.add(requirement.reqId);
    for (const linkedReqId of extractInheritedRequirementIds(requirement.apiPersistence)) {
      const linkedRequirement = requirementsById.get(linkedReqId);
      if (!linkedRequirement) continue;
      if (
        HANDOFF_BLOCKING_STATUSES.has(linkedRequirement.status) ||
        linkedRequirement.status === "UI_REQUIRED_API_BLOCKED" ||
        linkedRequirement.apiContractIsUnresolved
      ) {
        return linkedReqId;
      }
      const nestedBlocker = findInheritedApiBlocker(linkedRequirement, nextVisited);
      if (nestedBlocker) return nestedBlocker;
    }
    return null;
  }

  for (const requirement of requirements) {
    if (requirement.status !== "CONFIRMED") continue;
    const blockerReqId = findInheritedApiBlocker(requirement);
    if (blockerReqId) {
      errors.push(
        `${requirement.reqId} is CONFIRMED but its API / persistence inherits the unresolved contract from ${blockerReqId}`,
      );
    }
  }

  const notificationRequiredReqIds = new Set(
    requirements
      .filter(
        (requirement) =>
          requirement.status === "API_CONTRACT_MISSING" ||
          requirement.status === "UI_REQUIRED_API_BLOCKED" ||
          requirement.apiContractIsUnresolved,
      )
      .map((requirement) => requirement.reqId),
  );
  const notificationSection = findSection(markdown, "API Contract Notification Log");
  if (notificationRequiredReqIds.size > 0 && notificationSection === null) {
    errors.push(
      "missing section: API Contract Notification Log (required by an unresolved API contract)",
    );
  } else if (notificationSection !== null && notificationSection.trim() === "") {
    errors.push("section is empty: API Contract Notification Log");
  }

  const notifiedReqIds = new Set();
  if (
    notificationSection !== null &&
    (notificationRequiredReqIds.size > 0 || sectionHasTable(notificationSection))
  ) {
    const notificationTable = parseFirstTable(
      notificationSection,
      "API Contract Notification Log",
      API_NOTIFICATION_COLUMNS,
      errors,
    );
    if (notificationTable) {
      const notificationIds = new Set();
      for (const [index, row] of notificationTable.rows.entries()) {
        const rowNumber = index + 1;
        const ids = extractIds(row.notificationid || "", "NTF");
        const notificationId = ids[0] || `row ${rowNumber}`;
        if (
          ids.length !== 1 ||
          cleanInline(row.notificationid || "").toUpperCase() !== ids[0]
        ) {
          errors.push(
            `API Contract Notification Log row ${rowNumber} needs one valid Notification ID`,
          );
        } else if (notificationIds.has(notificationId)) {
          errors.push(`duplicate notification ID ${notificationId}`);
        } else {
          notificationIds.add(notificationId);
        }

        for (const [key, label] of API_NOTIFICATION_COLUMNS.slice(1)) {
          if (
            isMissingNotificationValue(row[key] || "") ||
            (key === "userfacingnotificationevidence" &&
              (isDeferredNotificationEvidence(row[key] || "") ||
                !hasUserFacingNotificationEvidence(row[key] || "")))
          ) {
            errors.push(`notification ${notificationId} has empty ${label}`);
          }
        }

        const reqIds = extractIds(row.reqid || "", "REQ");
        if (reqIds.length === 0) {
          errors.push(
            `notification ${notificationId} must reference at least one REQ-ID`,
          );
        }
        for (const reqId of reqIds) {
          if (!requirementIds.has(reqId)) {
            errors.push(
              `notification ${notificationId} references unknown requirement ID ${reqId}`,
            );
          } else {
            notifiedReqIds.add(reqId);
          }
        }
      }
    }
  }

  for (const reqId of notificationRequiredReqIds) {
    if (!notifiedReqIds.has(reqId)) {
      errors.push(
        `${reqId} with an unresolved API contract needs a mapped API contract notification`,
      );
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
  const executionBoundary = cleanInline(
    bulletValue(handoff, "Execution boundary") || "",
  ).toUpperCase();
  if (!handoffStatus) errors.push("Handoff Readiness is missing Status");
  if (!confirmation) errors.push("Handoff Readiness is missing User confirmation");
  if (executionBoundary && !VALID_EXECUTION_BOUNDARIES.has(executionBoundary)) {
    errors.push(
      `Handoff Readiness has invalid Execution boundary ${executionBoundary}; expected ${[
        ...VALID_EXECUTION_BOUNDARIES,
      ].join(", ")}`,
    );
  }
  let activeIds = [];
  if (!activeValue || isPlaceholder(activeValue)) {
    errors.push("Handoff Readiness is missing Active REQ IDs");
  } else {
    activeIds = extractIds(activeValue, "REQ");
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
    if (!executionBoundary) {
      errors.push("implementation handoff must declare an Execution boundary");
    }
    const activeRequirements = activeIds
      .map((reqId) => requirementsById.get(reqId))
      .filter(Boolean);
    const hasActiveBoundedUi = activeRequirements.some(
      (requirement) => requirement.status === "UI_REQUIRED_API_BLOCKED",
    );
    if (hasActiveBoundedUi && executionBoundary !== "BOUNDED_UI_ONLY") {
      errors.push(
        "active UI_REQUIRED_API_BLOCKED requirements need Execution boundary BOUNDED_UI_ONLY",
      );
    } else if (!hasActiveBoundedUi && executionBoundary === "BOUNDED_UI_ONLY") {
      errors.push(
        "Execution boundary BOUNDED_UI_ONLY requires an active UI_REQUIRED_API_BLOCKED requirement",
      );
    }
    for (const requirement of activeRequirements) {
      if (HANDOFF_BLOCKING_STATUSES.has(requirement.status)) {
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
    if (!executionBoundary) {
      errors.push("feature completion must declare Execution boundary FULL_CONTRACT");
    } else if (executionBoundary !== "FULL_CONTRACT") {
      errors.push("feature completion requires Execution boundary FULL_CONTRACT");
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
