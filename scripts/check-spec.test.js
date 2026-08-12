#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const checkerPath = path.join(__dirname, "check-spec.js");

function validSpec(overrides = {}) {
  const {
    assetPath = "./assets/reference.png",
    sourceRows = [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      `| SRC-UI | 2026-08-06 | UI / visual | [reference](${assetPath}) |`,
      "| SRC-API | v3 | API / persistence | https://example.test/api |",
      "| SRC-DEC-001 | 2026-08-06 | User decision | task message approving DEC-001 |",
    ],
    matrixRows = [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API; SRC-DEC-001 | Edit form remains interactive | PUT may reject after submit; preserve input | UI_REQUIRED_API_BLOCKED | DEC-001 | AC-001 | VT-001 |",
    ],
    decisionRows = [
      "| DEC-001 | 2026-08-06 | REQ-001 | Keep the complete UI interactive and report rejected persistence after submit | SRC-DEC-001 |",
    ],
    handoffStatus = "READY",
    userConfirmation = "2026-08-06 / user approved in task",
    activeReqIds = "REQ-001",
    specRole = "CANONICAL",
    canonicalSpec = "SELF",
    featureStatus = "INCOMPLETE",
    remainingReqIds = "REQ-001",
    acceptanceChecked = false,
    acceptanceDescription =
      "The complete edit form remains interactive and preserves input after rejected persistence.",
    verificationChecked = false,
    verificationDescription =
      "Render the edit form with the save endpoint unavailable.",
    evidence = "PENDING",
    matrixHeader = "| REQ-ID | Source anchor / asset | UI surface | API / persistence | Status | Decision ID | Acceptance ID | Verification ID / evidence |",
  } = overrides;
  const decisionContent =
    decisionRows.length === 0
      ? "No decisions."
      : `| Decision ID | Date | REQ-ID | Decision + reason | Approval / source |
| --- | --- | --- | --- | --- |
${decisionRows.join("\n")}`;

  return `# Sample spec

## Background / 背景與目標

Sample goal.

## Spec Governance / 規格治理

- Role: \`${specRole}\`
- Canonical spec: ${canonicalSpec}

## Scope / 範圍

- Deliver the traced requirement.

## Out of Scope / 不在範圍

- None.

## Source Responsibilities / 來源職責與版本

| Source ID | Snapshot / Revision | Responsibility | Location |
| --- | --- | --- | --- |
${sourceRows.join("\n")}

## Requirement Traceability Matrix / 需求追蹤矩陣

${matrixHeader}
| --- | --- | --- | --- | --- | --- | --- | --- |
${matrixRows.join("\n")}

## Source Conflicts / 未決與來源衝突

- None.

## Decision Log / 關鍵決策與理由

${decisionContent}

## Acceptance Criteria / 驗收條件

- [${acceptanceChecked ? "x" : " "}] AC-001: ${acceptanceDescription}

## Edge Cases / 邊界與狀態

- API unavailable: keep the action available; after rejection, preserve input and report what was not saved.

## Verification Plan / 驗證計畫

- [${verificationChecked ? "x" : " "}] VT-001: ${verificationDescription} Evidence: ${evidence}

## Git Flow

- Work branch: feat/sample.

## Handoff Readiness

- Status: \`${handoffStatus}\`
- User confirmation: ${userConfirmation}
- Active REQ IDs: ${activeReqIds}

## Feature Completion Gate

- Status: \`${featureStatus}\`
- Remaining / blocked REQ IDs: ${remainingReqIds}

## Implementation Handoff / 交接給實作者

- Use the Active REQ IDs from Handoff Readiness.
- Report AC/VT evidence.
`;
}

function makeFixture(t, markdown, createAsset = true, assetName = "reference.png") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-spec-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));

  if (createAsset) {
    fs.mkdirSync(path.join(dir, "assets"));
    fs.writeFileSync(path.join(dir, "assets", assetName), "fixture");
  }

  const specPath = path.join(dir, "sample.md");
  fs.writeFileSync(specPath, markdown);
  return specPath;
}

function runChecker(specPath, ...args) {
  return spawnSync(process.execPath, [checkerPath, ...args, specPath], {
    encoding: "utf8",
  });
}

test("a handoff-ready spec accepts a locally blocked API without removing its UI", (t) => {
  const result = runChecker(makeFixture(t, validSpec()), "--ready");

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /valid.*1 requirement/i);
});

test("user-visible behavior cannot be authorized by an API field alone", (t) => {
  const spec = validSpec({
    sourceRows: [
      "| SRC-API | v3 | API / persistence | nationality option includes format_example |",
    ],
    matrixRows: [
      "| REQ-001 | SRC-API | ID-number input shows format_example as its placeholder | nationality option returns format_example | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    acceptanceDescription:
      "The ID-number input shows format_example as its placeholder.",
    verificationDescription:
      "Render the ID-number input and compare its placeholder with format_example.",
  });
  const result = runChecker(makeFixture(t, spec));

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /REQ-001.*user-visible UI surface.*Scope \/ behavior.*UI \/ visual.*User decision/i,
  );
});

test("user-visible behavior cannot be authorized by an implementation pattern alone", (t) => {
  const spec = validSpec({
    sourceRows: [
      "| SRC-CODE | main@abc123 | Implementation pattern | existing input has a tooltip |",
    ],
    matrixRows: [
      "| REQ-001 | SRC-CODE | New ID-number tooltip | N/A — no persistence | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    acceptanceDescription: "The ID-number input shows the new tooltip.",
    verificationDescription: "Render the ID-number input and inspect its tooltip.",
  });
  const result = runChecker(makeFixture(t, spec));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REQ-001.*user-visible UI surface.*product-authoritative source/i);
});

test("non-UI API facts remain valid without a product-authoritative source", (t) => {
  const spec = validSpec({
    sourceRows: [
      "| SRC-API | v3 | API / persistence | response includes format_example |",
    ],
    matrixRows: [
      "| REQ-001 | SRC-API | N/A — ticket does not require presenting this field | Response type includes format_example | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    acceptanceDescription:
      "The response contract records format_example without adding UI behavior.",
    verificationDescription:
      "Inspect the response type and confirm no UI requirement is introduced.",
  });
  const result = runChecker(makeFixture(t, spec));

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("traceability references must resolve to registered sources, acceptance criteria, and verification items", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-MISSING | Edit form | PUT endpoint | CONFIRMED | N/A — no decision needed | AC-404 | VT-404 |",
    ],
    decisionRows: [],
  });
  const result = runChecker(makeFixture(t, spec));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown source ID SRC-MISSING/i);
  assert.match(result.stderr, /unknown acceptance ID AC-404/i);
  assert.match(result.stderr, /unknown verification ID VT-404/i);
});

test("every granular source inventory row must be covered by a requirement", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ | Edit form | PUT endpoint | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
  });
  const result = runChecker(makeFixture(t, spec));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source ID SRC-UI is not referenced/i);
  assert.match(result.stderr, /source ID SRC-API is not referenced/i);
});

test("blocked or approved-out-of-scope requirements need a mapped decision record", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API; SRC-DEC-001 | Edit form | N/A — excluded by decision | OUT_OF_SCOPE_APPROVED | N/A — missing decision | AC-001 | VT-001 |",
    ],
    decisionRows: [],
  });
  const result = runChecker(makeFixture(t, spec), "--ready");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REQ-001.*OUT_OF_SCOPE_APPROVED.*Decision ID/i);
});

test("API documentation cannot serve as approval for blocked or out-of-scope UI", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API; SRC-DEC-001 | Edit form | N/A — endpoint absent | OUT_OF_SCOPE_APPROVED | DEC-001 | AC-001 | VT-001 |",
    ],
    decisionRows: [
      "| DEC-001 | 2026-08-06 | REQ-001 | Remove edit because update is absent | SRC-API |",
    ],
  });
  const result = runChecker(makeFixture(t, spec), "--ready");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DEC-001.*explicit User decision source/i);
});

test("handoff readiness rejects unresolved requirements and placeholder approval", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Edit form | PUT endpoint | PROVISIONAL | N/A — awaiting decision | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    handoffStatus: "DRAFT",
    userConfirmation: "PENDING — awaiting approval",
  });
  const result = runChecker(makeFixture(t, spec), "--ready");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /PROVISIONAL/i);
  assert.match(result.stderr, /handoff status.*READY/i);
  assert.match(result.stderr, /user confirmation/i);
});

test("bare N/A and prefixed placeholders do not count as explicit mappings", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | N/A | PENDING — awaiting API | CONFIRMED | N/A | AC-001 | VT-001 |",
    ],
    decisionRows: [],
  });
  const result = runChecker(makeFixture(t, spec));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /REQ-001 has empty UI surface/i);
  assert.match(result.stderr, /REQ-001 has empty API \/ persistence/i);
  assert.match(result.stderr, /REQ-001 has empty Decision ID/i);
});

test("active handoff requirement IDs must exist in the matrix", (t) => {
  const result = runChecker(
    makeFixture(t, validSpec({ activeReqIds: "REQ-404" })),
    "--ready",
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unknown active requirement ID REQ-404/i);
});

test("local source assets must exist", (t) => {
  const result = runChecker(makeFixture(t, validSpec(), false));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /local link does not exist.*assets\/reference\.png/i);
});

test("local asset links may contain spaces and balanced parentheses", (t) => {
  const spec = validSpec({ assetPath: "<./assets/reference (1).png>" });
  const result = runChecker(
    makeFixture(t, spec, true, "reference (1).png"),
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("requirement IDs must be unique", (t) => {
  const row = "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | List | GET endpoint | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |";
  const result = runChecker(
    makeFixture(t, validSpec({ matrixRows: [row, row], decisionRows: [] })),
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate requirement ID REQ-001/i);
});

test("the traceability matrix must retain every contract column", (t) => {
  const spec = validSpec({
    matrixHeader: "| REQ-ID | Source anchor / asset | UI surface | Status | Decision ID | Acceptance ID | Verification ID / evidence |",
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Edit form | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
  });
  const result = runChecker(makeFixture(t, spec));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing column.*API \/ persistence/i);
});

test("--complete requires all requirements and evidence to be complete", (t) => {
  const matrixRows = [
    "| REQ-001 | SRC-REQ; SRC-UI; SRC-API; SRC-DEC-001 | Edit form | PUT endpoint | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
  ];
  const complete = validSpec({
    matrixRows,
    decisionRows: [],
    acceptanceChecked: true,
    verificationChecked: true,
    evidence: "unit test and screenshot recorded",
    featureStatus: "COMPLETE",
    remainingReqIds: "NONE",
  });
  const pass = runChecker(makeFixture(t, complete), "--complete");
  assert.equal(pass.status, 0, pass.stderr || pass.stdout);

  const blocked = runChecker(makeFixture(t, validSpec()), "--complete");
  assert.notEqual(blocked.status, 0);
  assert.match(blocked.stderr, /UI_REQUIRED_API_BLOCKED/i);
  assert.match(blocked.stderr, /feature completion status must be COMPLETE/i);
});

test("--complete is reserved for the canonical feature spec", (t) => {
  const matrixRows = [
    "| REQ-001 | SRC-REQ; SRC-UI; SRC-API; SRC-DEC-001 | List | GET endpoint | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
  ];
  const slice = validSpec({
    matrixRows,
    decisionRows: [],
    specRole: "SLICE",
    canonicalSpec: "https://example.test/canonical-spec",
    acceptanceChecked: true,
    verificationChecked: true,
    evidence: "focused test recorded",
    featureStatus: "COMPLETE",
    remainingReqIds: "NONE",
  });
  const result = runChecker(makeFixture(t, slice), "--complete");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /only a CANONICAL spec can claim feature completion/i);
});

test("feature completion requires exact NONE for remaining requirements", (t) => {
  const matrixRows = [
    "| REQ-001 | SRC-REQ; SRC-UI; SRC-API; SRC-DEC-001 | List | GET endpoint | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
  ];
  const spec = validSpec({
    matrixRows,
    decisionRows: [],
    acceptanceChecked: true,
    verificationChecked: true,
    evidence: "focused test recorded",
    featureStatus: "COMPLETE",
    remainingReqIds: "NONE — REQ-007 still blocked",
  });
  const result = runChecker(makeFixture(t, spec), "--complete");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Remaining \/ blocked REQ IDs as exact NONE/i);
});
