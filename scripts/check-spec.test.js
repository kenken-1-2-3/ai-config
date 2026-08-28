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
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API; SRC-DEC-001 | Edit form remains interactive | [UNRESOLVED_API] PUT contract may reject after submit; preserve input | UI_REQUIRED_API_BLOCKED | DEC-001 | AC-001 | VT-001 |",
    ],
    decisionRows = [
      "| DEC-001 | 2026-08-06 | REQ-001 | Keep the complete UI interactive and report rejected persistence after submit | SRC-DEC-001 |",
    ],
    handoffStatus = "READY",
    userConfirmation = "2026-08-06 / user approved in task",
    activeReqIds = "REQ-001",
    executionBoundary = null,
    includeExecutionBoundary = true,
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
    apiNotificationContent,
    matrixHeader = "| REQ-ID | Source anchor / asset | UI surface | API / persistence | Status | Decision ID | Acceptance ID | Verification ID / evidence |",
  } = overrides;
  const decisionContent =
    decisionRows.length === 0
      ? "No decisions."
      : `| Decision ID | Date | REQ-ID | Decision + reason | Approval / source |
| --- | --- | --- | --- | --- |
${decisionRows.join("\n")}`;
  const resolvedExecutionBoundary =
    executionBoundary ||
    (matrixRows.some((row) => row.includes("| UI_REQUIRED_API_BLOCKED |"))
      ? "BOUNDED_UI_ONLY"
      : "FULL_CONTRACT");
  const resolvedApiNotificationContent =
    apiNotificationContent === undefined
      ? matrixRows.some((row) => row.includes("| UI_REQUIRED_API_BLOCKED |"))
        ? `| Notification ID | Date | REQ-ID | Missing API contract / evidence | Affected behavior | Safe scope / next action | User-facing notification / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-001 | 2026-08-06 | REQ-001 | PUT contract is unavailable; API source checked | Edit form persistence | Bounded UI-only scope; backend owns the contract | Reported in the current task before dependent code |`
        : "No open API contract blockers."
      : apiNotificationContent;

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

${
  resolvedApiNotificationContent === null
    ? ""
    : `## API Contract Notification Log / API 契約缺口通知紀錄

${resolvedApiNotificationContent}`
}

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
${includeExecutionBoundary ? `- Execution boundary: \`${resolvedExecutionBoundary}\`` : ""}

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

test("CONFIRMED API contracts require an API-authoritative source", (t) => {
  const spec = validSpec({
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
    ],
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI | Member mode | GET /member response includes reward_mode | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
  });
  const result = runChecker(makeFixture(t, spec), "--ready");

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /REQ-001 confirms an API \/ persistence contract without a direct or explicitly inherited API \/ persistence source/i,
  );
});

test("CONFIRMED same-as rows may inherit API authority explicitly", (t) => {
  const spec = validSpec({
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v4 | API / persistence | https://example.test/api |",
    ],
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | PC member mode | GET /member response includes reward_mode | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
      "| REQ-002 | SRC-REQ; SRC-UI | H5 member mode | Uses same API contract as REQ-001 | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    activeReqIds: "REQ-002",
  });
  const result = runChecker(makeFixture(t, spec), "--ready");

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

test("CONFIRMED requirements reject unresolved API contract markers", (t) => {
  const unresolvedDescriptions = [
    "threshold field mapping 待 API read-back",
    "API response 缺少 reward_mode 欄位",
    "API 沒回傳 reward_mode",
    "API 欄位不存在 reward_mode",
    "response 不含 threshold fields",
    "threshold 欄位未回傳",
    "response lacks threshold fields",
    "response does not include reward_mode",
    "response does not return reward_mode",
    "response omits reward_mode",
    "reward_mode is missing from API response",
    "field is absent from response",
    "新舊會員端 statement types 都僅有 cashback_count／revenues；舊端僅保留前三個 columns，未實作完整需求",
  ];

  for (const apiDescription of unresolvedDescriptions) {
    const spec = validSpec({
      matrixRows: [
        `| REQ-001 | SRC-REQ; SRC-UI; SRC-API; SRC-DEC-001 | Fixed-award settings | ${apiDescription} | CONFIRMED | DEC-001 | AC-001 | VT-001 |`,
      ],
    });
    const result = runChecker(makeFixture(t, spec));

    assert.notEqual(result.status, 0);
    assert.match(
      result.stderr,
      /REQ-001 is CONFIRMED.*unresolved API marker.*API_CONTRACT_MISSING/i,
    );
  }
});

test("confirmed API enum values such as PENDING(4) are not unresolved markers", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | KYC status | API status mapping: PENDING(4) maps to reviewing | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v3 | API / persistence | https://example.test/api |",
    ],
  });
  const result = runChecker(makeFixture(t, spec));

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("confirmed API cells may describe no API need, verified use, or a bare PENDING enum", (t) => {
  const apiDescriptions = [
    "N/A — 不需要 API 持久化",
    "N/A — 無需確認 API contract",
    "需使用 API v4；contract 已由 response read-back 確認",
    "API status: PENDING",
    "API status: BLOCKED",
    "API status: UNKNOWN",
    "No missing API fields; v4 response verified",
    "There are no unknown response fields after read-back",
    "无需確認 API contract；v4 已驗證",
    "API response does not return an error for valid input",
    "API response 只有會員資料；空狀態動畫尚未實作",
    "API types 僅有 ACTIVE／INACTIVE；hover 樣式未實作",
    "prototype 只有一種；文件尚未實作",
    "API response 只有 current user；完整需求皆已實作",
    "[VERIFIED_ABSENCE] authoritative response does not include deprecated_field by design; REQ-001 does not require deprecated_field",
    "[VERIFIED_ABSENCE] v4 response intentionally omits the reward_mode by design; reward_mode is not a required field; REQ-001 does not require reward_mode",
    "[VERIFIED_ABSENCE] v4 response 已確認刻意不含 deprecated_field；REQ-001 本需求不需要 deprecated_field",
    "[VERIFIED_ABSENCE] v4 response 已確認刻意不含 reward_mode；reward_mode 不是必要欄位；REQ-001 本需求不需要 reward_mode",
  ];

  for (const apiDescription of apiDescriptions) {
    const spec = validSpec({
      matrixRows: [
        `| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Confirmed UI | ${apiDescription} | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |`,
      ],
      decisionRows: [],
      sourceRows: [
        "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
        "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
        "| SRC-API | v4 | API / persistence | https://example.test/api |",
      ],
    });
    const result = runChecker(makeFixture(t, spec));
    assert.equal(
      result.status,
      0,
      `${apiDescription}\n${result.stderr || result.stdout}`,
    );
  }
});

test("VERIFIED_ABSENCE requires API authority and concrete contract evidence", (t) => {
  const noApiSource = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI | Confirmed UI | [VERIFIED_ABSENCE] v4 response intentionally omits deprecated_field; REQ-001 does not require deprecated_field | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
    ],
  });
  const missingAuthority = runChecker(makeFixture(t, noApiSource));
  assert.notEqual(missingAuthority.status, 0);
  assert.match(missingAuthority.stderr, /VERIFIED_ABSENCE.*without an API \/ persistence source/i);

  const vagueEvidence = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Confirmed UI | [VERIFIED_ABSENCE] by design | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v4 | API / persistence | https://example.test/api |",
    ],
  });
  const missingEvidence = runChecker(makeFixture(t, vagueEvidence));
  assert.notEqual(missingEvidence.status, 0);
  assert.match(missingEvidence.stderr, /VERIFIED_ABSENCE.*without concrete evidence.*non-blocking/i);

  const requiredButAbsent = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Confirmed UI | [VERIFIED_ABSENCE] v4 response intentionally omits required reward_mode by design; REQ-001 does not require reward_mode | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v4 | API / persistence | https://example.test/api |",
    ],
  });
  const requiredAbsence = runChecker(makeFixture(t, requiredButAbsent));
  assert.notEqual(requiredAbsence.status, 0);
  assert.match(requiredAbsence.stderr, /VERIFIED_ABSENCE.*non-blocking for REQ-001/i);
  assert.match(requiredAbsence.stderr, /needs a mapped API contract notification/i);

  const chineseRequiredButAbsent = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Confirmed UI | [VERIFIED_ABSENCE] v4 response 已確認必要欄位 `reward_mode` 不存在；REQ-001 本需求不需要 reward_mode | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v4 | API / persistence | https://example.test/api |",
    ],
  });
  const chineseRequiredAbsence = runChecker(
    makeFixture(t, chineseRequiredButAbsent),
  );
  assert.notEqual(chineseRequiredAbsence.status, 0);
  assert.match(
    chineseRequiredAbsence.stderr,
    /VERIFIED_ABSENCE.*non-blocking for REQ-001/i,
  );

  for (const apiDescription of [
    "[VERIFIED_ABSENCE] API omission by design; REQ-001 does not require it",
    "[VERIFIED_ABSENCE] response intentionally omits the field by design; REQ-001 does not require it",
    "[VERIFIED_ABSENCE] response intentionally omits this value by design; REQ-001 does not require it",
    "[VERIFIED_ABSENCE] response intentionally omits a property by design; REQ-001 does not require it",
  ]) {
    const genericOmission = validSpec({
      matrixRows: [
        `| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Confirmed UI | ${apiDescription} | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |`,
      ],
      decisionRows: [],
      sourceRows: [
        "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
        "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
        "| SRC-API | v4 | API / persistence | https://example.test/api |",
      ],
    });
    const missingTarget = runChecker(makeFixture(t, genericOmission));
    assert.notEqual(missingTarget.status, 0);
    assert.match(missingTarget.stderr, /VERIFIED_ABSENCE.*without concrete evidence/i);
  }

  const unconfirmedAbsence = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Confirmed UI | [VERIFIED_ABSENCE] API says deprecated_field is missing; REQ-001 does not require deprecated_field | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v4 | API / persistence | https://example.test/api |",
    ],
  });
  const missingIntent = runChecker(makeFixture(t, unconfirmedAbsence));
  assert.notEqual(missingIntent.status, 0);
  assert.match(missingIntent.stderr, /VERIFIED_ABSENCE.*without concrete evidence.*non-blocking/i);

  const contradictoryAbsence = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Confirmed UI | [VERIFIED_ABSENCE] response unavailable; deprecated_field absence is unverified; REQ-001 does not require deprecated_field | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v4 | API / persistence | https://example.test/api |",
    ],
  });
  const contradictoryEvidence = runChecker(makeFixture(t, contradictoryAbsence));
  assert.notEqual(contradictoryEvidence.status, 0);
  assert.match(
    contradictoryEvidence.stderr,
    /VERIFIED_ABSENCE.*evidence is still pending, unavailable, or unverified/i,
  );
  assert.match(
    contradictoryEvidence.stderr,
    /REQ-001 is CONFIRMED.*unresolved API marker.*API_CONTRACT_MISSING/i,
  );
});

test("VERIFIED_ABSENCE must be the API cell prefix", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Confirmed UI | Historical note; [VERIFIED_ABSENCE] v4 schema intentionally omits reward_mode by design; REQ-001 does not require reward_mode | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v4 | API / persistence | https://example.test/api |",
    ],
  });
  const result = runChecker(makeFixture(t, spec));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must place \[VERIFIED_ABSENCE\] at the start/i);
  assert.match(result.stderr, /REQ-001 is CONFIRMED.*unresolved API marker/i);
  assert.match(result.stderr, /needs a mapped API contract notification/i);
});

test("PROVISIONAL cannot hide an unresolved API contract from the notification gate", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Fixed-award settings | [UNRESOLVED_API] response fields need read-back | PROVISIONAL | N/A — technical fact | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v3 | API / persistence | https://example.test/api |",
    ],
  });
  const result = runChecker(makeFixture(t, spec));

  assert.notEqual(result.status, 0);
  assert.match(
    result.stderr,
    /REQ-001 is PROVISIONAL.*API_CONTRACT_MISSING.*notified and tracked/i,
  );
});

test("API_CONTRACT_MISSING requires the unresolved marker at the start of the API cell", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Fixed-award settings | Historical note; [UNRESOLVED_API] response fields need read-back | API_CONTRACT_MISSING | N/A — technical fact | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v3 | API / persistence | https://example.test/api |",
    ],
    apiNotificationContent: `| Notification ID | Date | REQ-ID | Missing API contract / evidence | Affected behavior | Safe scope / next action | User-facing notification / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-001 | 2026-08-28 | REQ-001 | Response fields need read-back | Fixed-award settings | Backend owns contract | Reported in current task |`,
  });
  const result = runChecker(makeFixture(t, spec));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must prefix API \/ persistence with \[UNRESOLVED_API\]/i);
});

test("locale CDN read-back remains a provisional locale concern, not an API contract gap", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Localized labels | Locale Manager en/zh-CN/CDN read-back 待完成 | PROVISIONAL | N/A — locale verification pending | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v3 | API / persistence | https://example.test/locale |",
    ],
  });
  const result = runChecker(makeFixture(t, spec));

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("only explicit same-as references inherit another requirement's API blocker", (t) => {
  const sourceRows = [
    "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
    "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
    "| SRC-API | v3 | API / persistence | https://example.test/api |",
  ];
  const notification = `| Notification ID | Date | REQ-ID | Missing API contract / evidence | Affected behavior | Safe scope / next action | User-facing notification / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-001 | 2026-08-28 | REQ-001 | GET response lacks threshold fields | Fixed-award values | Independent layout only; backend owns contract | Reported in current task |`;
  const rows = [
    "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Fixed-award settings | [UNRESOLVED_API] GET response lacks threshold fields | API_CONTRACT_MISSING | N/A — technical fact; no decision required | AC-001 | VT-001 |",
    "| REQ-002 | SRC-REQ; SRC-UI; SRC-API | Verified comparison | Compared with REQ-001, this endpoint is verified | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
  ];
  const comparison = runChecker(
    makeFixture(
      t,
      validSpec({
        matrixRows: rows,
        decisionRows: [],
        sourceRows,
        apiNotificationContent: notification,
        activeReqIds: "REQ-002",
      }),
    ),
  );
  assert.equal(comparison.status, 0, comparison.stderr || comparison.stdout);

  for (const apiDescription of [
    "Not same as REQ-001; this endpoint is verified",
    "Does not inherit from REQ-001; this endpoint is verified",
    "不同 REQ-001；此 endpoint 已驗證",
  ]) {
    rows[1] =
      `| REQ-002 | SRC-REQ; SRC-UI; SRC-API | Verified comparison | ${apiDescription} | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |`;
    const negated = runChecker(
      makeFixture(
        t,
        validSpec({
          matrixRows: rows,
          decisionRows: [],
          sourceRows,
          apiNotificationContent: notification,
          activeReqIds: "REQ-002",
        }),
      ),
    );
    assert.equal(negated.status, 0, negated.stderr || negated.stdout);
  }

  rows[1] =
    "| REQ-002 | SRC-REQ; SRC-UI; SRC-API | Inherited settings | Same as REQ-001 | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |";
  const inherited = runChecker(
    makeFixture(
      t,
      validSpec({
        matrixRows: rows,
        decisionRows: [],
        sourceRows,
        apiNotificationContent: notification,
        activeReqIds: "REQ-002",
      }),
    ),
  );
  assert.notEqual(inherited.status, 0);
  assert.match(inherited.stderr, /REQ-002.*inherits the unresolved contract from REQ-001/i);

  rows[1] =
    "| REQ-002 | SRC-REQ; SRC-UI; SRC-API | Inherited settings | Uses same API contract as REQ-001 | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |";
  const commonWording = runChecker(
    makeFixture(
      t,
      validSpec({
        matrixRows: rows,
        decisionRows: [],
        sourceRows,
        apiNotificationContent: notification,
        activeReqIds: "REQ-002",
      }),
    ),
    "--ready",
  );
  assert.notEqual(commonWording.status, 0);
  assert.match(
    commonWording.stderr,
    /REQ-002.*inherits the unresolved contract from REQ-001/i,
  );

  rows[1] =
    "| REQ-002 | SRC-REQ; SRC-UI; SRC-API | Unknown inheritance | Same as REQ-999 | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |";
  const unknownInheritance = runChecker(
    makeFixture(
      t,
      validSpec({
        matrixRows: rows,
        decisionRows: [],
        sourceRows,
        apiNotificationContent: notification,
        activeReqIds: "REQ-002",
      }),
    ),
  );
  assert.notEqual(unknownInheritance.status, 0);
  assert.match(
    unknownInheritance.stderr,
    /REQ-002 inherits an API contract from unknown requirement REQ-999/i,
  );

  const recursiveRows = [
    rows[0],
    "| REQ-002 | SRC-REQ; SRC-UI; SRC-API | Intermediate inheritance | Same as REQ-001 | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    "| REQ-003 | SRC-REQ; SRC-UI; SRC-API | Transitive inheritance | Uses same API contract as REQ-002 | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
  ];
  const recursiveInheritance = runChecker(
    makeFixture(
      t,
      validSpec({
        matrixRows: recursiveRows,
        decisionRows: [],
        sourceRows,
        apiNotificationContent: notification,
        activeReqIds: "REQ-003",
      }),
    ),
    "--ready",
  );
  assert.notEqual(recursiveInheritance.status, 0);
  assert.match(
    recursiveInheritance.stderr,
    /REQ-003.*inherits the unresolved contract from REQ-001/i,
  );

  const cycleRows = [
    "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Circular A | Same as REQ-002 | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    "| REQ-002 | SRC-REQ; SRC-UI; SRC-API | Circular B | Uses same API contract as REQ-001 | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
  ];
  const circularInheritance = runChecker(
    makeFixture(
      t,
      validSpec({
        matrixRows: cycleRows,
        decisionRows: [],
        sourceRows,
        apiNotificationContent: "No open API contract blockers.",
        activeReqIds: "REQ-001",
      }),
    ),
    "--ready",
  );
  assert.notEqual(circularInheritance.status, 0);
  assert.match(circularInheritance.stderr, /circular API contract inheritance/i);
});

test("API_CONTRACT_MISSING requires a notification section", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Fixed-award settings | [UNRESOLVED_API] response threshold fields are not provided | API_CONTRACT_MISSING | N/A — technical fact; no decision required | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v3 | API / persistence | https://example.test/api |",
    ],
    apiNotificationContent: null,
  });
  const result = runChecker(makeFixture(t, spec));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing section: API Contract Notification Log/i);
  assert.match(result.stderr, /REQ-001.*needs a mapped API contract notification/i);
});

test("an unresolved UI_REQUIRED_API_BLOCKED row cannot bypass notification", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API; SRC-DEC-001 | Fixed-award settings | [UNRESOLVED_API] response fields need read-back | UI_REQUIRED_API_BLOCKED | DEC-001 | AC-001 | VT-001 |",
    ],
    apiNotificationContent: null,
  });
  const result = runChecker(makeFixture(t, spec), "--ready");

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing section: API Contract Notification Log/i);
  assert.match(result.stderr, /REQ-001.*needs a mapped API contract notification/i);

  const hiddenGap = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API; SRC-DEC-001 | Fixed-award settings | PUT may reject after submit | UI_REQUIRED_API_BLOCKED | DEC-001 | AC-001 | VT-001 |",
    ],
    apiNotificationContent: "No open API contract blockers.",
  });
  const hiddenResult = runChecker(makeFixture(t, hiddenGap));
  assert.notEqual(hiddenResult.status, 0);
  assert.match(
    hiddenResult.stderr,
    /UI_REQUIRED_API_BLOCKED must prefix API \/ persistence with \[UNRESOLVED_API\]/i,
  );
  assert.match(hiddenResult.stderr, /REQ-001.*needs a mapped API contract notification/i);
});

test("API notification rows require valid mappings and notification evidence", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Fixed-award settings | [UNRESOLVED_API] response threshold fields are not provided | API_CONTRACT_MISSING | N/A — technical fact; no decision required | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v3 | API / persistence | https://example.test/api |",
    ],
    apiNotificationContent: `| Notification ID | Date | REQ-ID | Missing API contract / evidence | Affected behavior | Safe scope / next action | User-facing notification / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-001 | PENDING | REQ-404 | PENDING | Fixed-award values | Await backend contract | 未告知 |`,
  });
  const result = runChecker(makeFixture(t, spec));

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /notification NTF-001 has empty Date/i);
  assert.match(result.stderr, /notification NTF-001 has empty Missing API contract/i);
  assert.match(result.stderr, /notification NTF-001 has empty User-facing notification/i);
  assert.match(result.stderr, /unknown requirement ID REQ-404/i);
  assert.match(result.stderr, /REQ-001.*needs a mapped API contract notification/i);
});

test("API notification evidence cannot defer the user-facing report", (t) => {
  const deferredEvidence = [
    "尚未告知使用者，將於最後交接回報",
    "尚未向使用者回報，最後交接再說",
    "待告知 user",
    "Not yet reported to the user",
    "Will report in final handoff",
    "User has not been notified",
    "No notification was sent; report later",
    "No user-facing notification was sent",
    "Evidence: no notification was sent",
    "Notification pending; will tell user later",
    "Backend response requested; user will be told later",
    "banana",
  ];

  for (const evidence of deferredEvidence) {
    const spec = validSpec({
      matrixRows: [
        "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Fixed-award settings | [UNRESOLVED_API] response fields need read-back | API_CONTRACT_MISSING | N/A — technical fact | AC-001 | VT-001 |",
      ],
      decisionRows: [],
      sourceRows: [
        "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
        "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
        "| SRC-API | v3 | API / persistence | https://example.test/api |",
      ],
      apiNotificationContent: `| Notification ID | Date | REQ-ID | Missing API contract / evidence | Affected behavior | Safe scope / next action | User-facing notification / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-001 | 2026-08-28 | REQ-001 | Response fields need read-back | Fixed-award settings | Backend owns contract | ${evidence} |`,
    });
    const result = runChecker(makeFixture(t, spec));

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /notification NTF-001 has empty User-facing notification/i);
  }
});

test("future wording is allowed in next action when notification evidence is current", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Fixed-award settings | [UNRESOLVED_API] response fields need read-back | API_CONTRACT_MISSING | N/A — technical fact | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v3 | API / persistence | https://example.test/api |",
    ],
    apiNotificationContent: `| Notification ID | Date | REQ-ID | Missing API contract / evidence | Affected behavior | Safe scope / next action | User-facing notification / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-001 | 2026-08-28 | REQ-001 | Response fields need read-back | Fixed-award settings | Will report the verified mapping after backend publishes v4 | Reported in the current task before dependent code |`,
  });
  const result = runChecker(makeFixture(t, spec));

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("a notified API contract blocker passes structure but blocks handoff and completion", (t) => {
  const base = {
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Fixed-award settings | [UNRESOLVED_API] response threshold fields are not provided | API_CONTRACT_MISSING | N/A — technical fact; no decision required | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v3 | API / persistence | https://example.test/api |",
    ],
    apiNotificationContent: `| Notification ID | Date | REQ-ID | Missing API contract / evidence | Affected behavior | Safe scope / next action | User-facing notification / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-001 | 2026-08-28 | REQ-001 | GET response lacks threshold fields; schema and fixture checked | PC/H5 cannot show verified live values | Independent layout only; backend owns response contract | Reported in the current task before dependent code |`,
  };

  const structure = runChecker(makeFixture(t, validSpec(base)));
  assert.equal(structure.status, 0, structure.stderr || structure.stdout);

  const ready = runChecker(makeFixture(t, validSpec(base)), "--ready");
  assert.notEqual(ready.status, 0);
  assert.match(ready.stderr, /REQ-001.*API_CONTRACT_MISSING.*cannot hand off/i);

  const complete = runChecker(
    makeFixture(
      t,
      validSpec({
        ...base,
        acceptanceChecked: true,
        verificationChecked: true,
        evidence: "fixture render recorded",
        featureStatus: "COMPLETE",
        remainingReqIds: "NONE",
      }),
    ),
    "--complete",
  );
  assert.notEqual(complete.status, 0);
  assert.match(complete.stderr, /REQ-001 has status API_CONTRACT_MISSING/i);
});

test("an unrelated active requirement may hand off while another API contract remains blocked", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Fixed-award integration | [UNRESOLVED_API] response fields need read-back | API_CONTRACT_MISSING | N/A — technical fact | AC-001 | VT-001 |",
      "| REQ-002 | SRC-REQ; SRC-UI; SRC-API | Independent shell layout | N/A — no persistence | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v3 | API / persistence | https://example.test/api |",
    ],
    activeReqIds: "REQ-002",
    apiNotificationContent: `| Notification ID | Date | REQ-ID | Missing API contract / evidence | Affected behavior | Safe scope / next action | User-facing notification / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-001 | 2026-08-28 | REQ-001 | Response fields need read-back | Fixed-award integration | REQ-002 remains independent; backend owns contract | Reported in current task |`,
  });
  const result = runChecker(makeFixture(t, spec), "--ready");

  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("bounded UI handoff requires an exact execution boundary", (t) => {
  const wrongBoundary = runChecker(
    makeFixture(t, validSpec({ executionBoundary: "FULL_CONTRACT" })),
    "--ready",
  );
  assert.notEqual(wrongBoundary.status, 0);
  assert.match(wrongBoundary.stderr, /need Execution boundary BOUNDED_UI_ONLY/i);

  const confirmedRows = [
    "| REQ-001 | SRC-REQ; SRC-UI; SRC-API; SRC-DEC-001 | Complete settings | GET and PUT contracts verified | CONFIRMED | DEC-001 | AC-001 | VT-001 |",
  ];
  const unnecessaryBoundary = runChecker(
    makeFixture(
      t,
      validSpec({
        matrixRows: confirmedRows,
        executionBoundary: "BOUNDED_UI_ONLY",
      }),
    ),
    "--ready",
  );
  assert.notEqual(unnecessaryBoundary.status, 0);
  assert.match(
    unnecessaryBoundary.stderr,
    /BOUNDED_UI_ONLY requires an active UI_REQUIRED_API_BLOCKED/i,
  );
});

test("bounded UI handoff cannot promote fixture evidence to integration success", (t) => {
  const falseIntegration = runChecker(
    makeFixture(
      t,
      validSpec({
        verificationChecked: true,
        verificationDescription: "API integration passed using fixture data.",
        evidence: "fixture response snapshot",
      }),
    ),
    "--ready",
  );
  assert.notEqual(falseIntegration.status, 0);
  assert.match(
    falseIntegration.stderr,
    /cannot use checked VT-001 fixture evidence as API \/ Network \/ persistence integration success/i,
  );

  const boundedUiEvidence = runChecker(
    makeFixture(
      t,
      validSpec({
        verificationChecked: true,
        verificationDescription: "UI fixture render passed; API integration BLOCKED.",
        evidence: "UI screenshot recorded",
      }),
    ),
    "--ready",
  );
  assert.equal(
    boundedUiEvidence.status,
    0,
    boundedUiEvidence.stderr || boundedUiEvidence.stdout,
  );
});

test("ready handoff and feature completion require an explicit execution boundary", (t) => {
  const confirmedRows = [
    "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Complete settings | GET and PUT contracts verified | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
  ];
  const missingReadyBoundary = runChecker(
    makeFixture(
      t,
      validSpec({
        matrixRows: confirmedRows,
        decisionRows: [],
        includeExecutionBoundary: false,
      }),
    ),
    "--ready",
  );
  assert.notEqual(missingReadyBoundary.status, 0);
  assert.match(missingReadyBoundary.stderr, /handoff must declare an Execution boundary/i);

  const missingCompletionBoundary = runChecker(
    makeFixture(
      t,
      validSpec({
        matrixRows: confirmedRows,
        decisionRows: [],
        includeExecutionBoundary: false,
        acceptanceChecked: true,
        verificationChecked: true,
        evidence: "unit test and screenshot recorded",
        featureStatus: "COMPLETE",
        remainingReqIds: "NONE",
      }),
    ),
    "--complete",
  );
  assert.notEqual(missingCompletionBoundary.status, 0);
  assert.match(
    missingCompletionBoundary.stderr,
    /completion must declare Execution boundary FULL_CONTRACT/i,
  );
});

test("resolved requirements may retain historical API notifications", (t) => {
  const spec = validSpec({
    matrixRows: [
      "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Fixed-award settings | GET response threshold fields verified against v4 response | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
    ],
    decisionRows: [],
    sourceRows: [
      "| SRC-REQ | 2026-08-06 | Scope / behavior | https://example.test/requirements |",
      "| SRC-UI | 2026-08-06 | UI / visual | [reference](./assets/reference.png) |",
      "| SRC-API | v4 | API / persistence | https://example.test/api |",
    ],
    apiNotificationContent: `| Notification ID | Date | REQ-ID | Missing API contract / evidence | Affected behavior | Safe scope / next action | User-facing notification / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-001 | 2026-08-27 | REQ-001 | v3 response lacked threshold fields | PC/H5 live values were blocked | Resolved by v4 response read-back | Reported in the task before integration resumed |`,
  });
  const result = runChecker(makeFixture(t, spec));

  assert.equal(result.status, 0, result.stderr || result.stdout);
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

  const hiddenMissingField = runChecker(
    makeFixture(
      t,
      validSpec({
        matrixRows: [
          "| REQ-001 | SRC-REQ; SRC-UI; SRC-API | Member mode | API response missing reward_mode | CONFIRMED | N/A — no decision needed | AC-001 | VT-001 |",
        ],
        decisionRows: [],
        acceptanceChecked: true,
        verificationChecked: true,
        evidence: "unit test and screenshot recorded",
        featureStatus: "COMPLETE",
        remainingReqIds: "NONE",
      }),
    ),
    "--complete",
  );
  assert.notEqual(hiddenMissingField.status, 0);
  assert.match(hiddenMissingField.stderr, /REQ-001 is CONFIRMED.*unresolved API marker/i);
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
