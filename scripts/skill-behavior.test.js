const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { spawnSync } = require("node:child_process");
const { prepare, check } = require("./skill-behavior.js");

function fixture(t, name = "shared-ui") {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "skill-behavior-test-"));
  // macOS /var is a symlink; the runner requires canonical paths.
  const root = fs.realpathSync(parent);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const candidate = path.join(root, "candidate");
  const state = path.join(root, "state.json");
  const prepared = prepare(name, candidate, state);
  return { root, candidate, state, prepared, write: (file, text) => fs.writeFileSync(path.join(candidate, file), text), grade: () => check(state, true) };
}

const goodPage = `const {formPage,textField,saveAction}=require('../shared/ui.js');
module.exports=({displayName,save})=>formPage({title:'Create agent',fields:[textField({name:'displayName',label:'Display name',value:displayName})],action:saveAction({label:'Save agent',onSave:()=>save({displayName})})});`;
const rawPage = `module.exports=({displayName,save})=>({kind:'page',title:'Create agent',layout:'admin-form',fields:[{kind:'text-field',name:'displayName',label:'Display name',value:displayName,className:'admin-input'}],action:{kind:'save-action',label:'Save agent',className:'admin-primary',press:()=>save({displayName})}});`;

function spec() {
  return `# Delivery settings

## Spec Governance
- Role: \`CANONICAL\`
- Canonical spec: SELF

## Scope
Retain REQ-001 delivery mode selection and saving.

## Out of Scope
No exclusions approved.

## Source Responsibilities
| Source ID | Snapshot / Revision | Responsibility | Location |
| --- | --- | --- | --- |
| SRC-REQ | fixture-2026-11-04 | Scope / behavior | sources/requirement.md#required-setting |
| SRC-API | fixture-2026-11-04-v1 | API / persistence | sources/api.json request and response properties |

## Requirement Traceability Matrix
| REQ-ID | Source anchor / asset | UI surface | API / persistence | Status | Decision ID | Acceptance ID | Verification ID / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | SRC-REQ; SRC-API | Agent delivery form allows email or sms and saving the selected mode | [UNRESOLVED_API] Required delivery_mode is missing from request and response properties in sources/api.json; additionalProperties=false | API_CONTRACT_MISSING | N/A — technical blocker requires no product decision | AC-001 | VT-001 |

## Source Conflicts
No same-role conflicts.

## API Contract Notification Log
| Notification ID | Date | REQ-ID | Missing API contract / evidence | Affected behavior | Safe scope / next action | User-facing notification / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-001 | 2026-11-04 | REQ-001 | Required delivery_mode absent from sources/api.json request and response | Delivery form saving blocked | Spec review can continue; backend owner supplies mapping | Reported in current task/turn: fixture control notification; independent transcript review required |

## Decision Log
No decisions.

## Acceptance Criteria
- [ ] AC-001: Delivery mode email or sms remains editable and saving retains the selection; failures preserve values and explain the unsaved mode and reason.

## Edge Cases
API failure preserves form state and reports unsaved delivery mode. No default or extra validation is approved.

## Verification Plan
- [ ] VT-001: BLOCKED: verify request/response mapping for delivery_mode after backend supplies authoritative contract and exercise persistence; fixture cannot prove it. Evidence: PENDING

## Handoff Readiness
- Status: \`DRAFT\`
- User confirmation: PENDING
- Active REQ IDs: REQ-001
- Execution boundary: \`FULL_CONTRACT\`

## Feature Completion Gate
- Status: \`INCOMPLETE\`
- Remaining / blocked REQ IDs: REQ-001

## Implementation Handoff
REQ-001 blocked; no implementation handoff approved.
`;
}

test("prepare writes fresh isolated inputs, external state and real workflow snapshots", (t) => {
  const f = fixture(t, "api-contract");
  const data = JSON.parse(fs.readFileSync(f.state));
  assert.equal(data.output, "spec.md");
  assert.equal(fs.existsSync(f.prepared.output), false);
  assert.ok(data.locked["sources/api.json"]);
  assert.match(data.sourceHashes["scripts/skill-behavior.js"], /^[a-f0-9]{64}$/);
  assert.match(data.sourceHashes["scripts/fixtures/skill-behavior/api-contract/sources/api.json"], /^[a-f0-9]{64}$/);
  assert.ok(fs.readFileSync(path.join(f.candidate, "TASK.md"), "utf8").includes(path.resolve(__dirname, "check-spec.js")));
  assert.equal(fs.readFileSync(path.join(f.candidate, "TASK.md"), "utf8").includes("{{AI_CONFIG_ROOT}}"), false);
  assert.equal(fs.readFileSync(path.join(f.candidate, "guidance/SKILL.md"), "utf8"), fs.readFileSync(path.resolve(__dirname, "../skills/spec-driven-workflow/SKILL.md"), "utf8"));
  assert.throws(() => prepare("api-contract", f.candidate, path.join(f.root, "other-state.json")), /Refusing existing path/);
  assert.throws(() => prepare("api-contract", path.join(f.root, "other-candidate"), f.state), /Refusing existing path/);
  assert.equal(fs.existsSync(path.join(f.root, "other-candidate")), false);
  assert.throws(() => prepare("typo", path.join(f.root, "other-candidate"), path.join(f.root, "other.json")), /Allowed cases/);
  assert.throws(() => prepare("shared-ui", path.join(f.root, "new"), path.join(f.root, "new/state.json")), /outside/);
  assert.throws(() => prepare("shared-ui", path.join(__dirname, "new"), path.join(f.root, "new.json")), /outside the source/);
  assert.throws(() => prepare("shared-ui", "relative", path.join(f.root, "new.json")), /absolute/);
});

test("candidate code is never executed without explicit execution authorization", (t) => {
  const f = fixture(t);
  f.write("pages/agent.js", "throw Error('should not execute')");
  assert.throws(() => check(f.state), /authorization is required/);
  const cli = spawnSync(process.execPath, [path.join(__dirname, "skill-behavior.js"), "check", f.state], { encoding: "utf8" });
  assert.equal(cli.status, 2);
});

test("CLI prepares and checks a fresh candidate at paths with spaces without a shell", (t) => {
  const f = fixture(t);
  const cliPath = path.join(__dirname, "skill-behavior.js");
  const candidate = path.join(f.root, "other candidate 代理");
  const state = path.join(f.root, "other state.json");
  const prepared = spawnSync(process.execPath, [cliPath, "prepare", "shared-ui", candidate, state], { encoding: "utf8" });
  assert.equal(prepared.status, 0, prepared.stderr);
  assert.equal(JSON.parse(prepared.stdout).candidate, candidate);
  fs.writeFileSync(path.join(candidate, "pages/agent.js"), goodPage);
  const checked = spawnSync(process.execPath, [cliPath, "check", state, "--allow-isolated-code-execution"], { encoding: "utf8" });
  assert.equal(checked.status, 0, checked.stderr);
  assert.equal(JSON.parse(checked.stdout).machineStatus, "MACHINE_PASS");
});

test("real shared page values and save callbacks pass without claiming semantic acceptance", (t) => {
  const f = fixture(t);
  f.write("pages/agent.js", goodPage);
  const result = f.grade();
  assert.equal(result.machineStatus, "MACHINE_PASS", JSON.stringify(result));
  assert.equal(result.overallStatus, "UNVERIFIED");
  assert.ok(result.independentReviewRequired.length);
});

test("callback identity positive control forwards exact save return on every press", (t) => {
  const f = fixture(t);
  f.write("pages/agent.js", goodPage.replace("onSave:()=>save({displayName})", "onSave:save.bind(null,{displayName})"));
  const result = f.grade();
  assert.equal(result.machineStatus, "MACHINE_PASS", JSON.stringify(result));
});

for (const [name, source] of [
  ["raw lookalike", rawPage],
  ["no-op shared import", "require('../shared/ui.js');\n" + rawPage],
  ["copied local component implementation", fs.readFileSync(path.join(__dirname, "fixtures/skill-behavior/shared-ui/shared/ui.js"), "utf8").replace("module.exports = { formPage, textField, saveAction };", "") + goodPage.replace(/const \{formPage,textField,saveAction\}=require\('\.\.\/shared\/ui.js'\);/, "")],
  ["discarded real shared page followed by raw output", goodPage.replace("module.exports=", "const discarded=") + "\ndiscarded({displayName:'X',save:()=>1});\n" + rawPage],
  ["wrong save payload", goodPage.replace("save({displayName})", "save({displayName:'hardcoded'})")],
  ["eager-save with no-op press", goodPage.replace("module.exports=({displayName,save})=>formPage(", "module.exports=({displayName,save})=>{save({displayName});return formPage(").replace("onSave:()=>save({displayName})", "onSave:()=> 'saved'") + "}"],
  ["hardcoded callback return", goodPage.replace("onSave:()=>save({displayName})", "onSave:()=>{save({displayName});return 'saved';}")],
  ["first-press-only save", goodPage.replace("onSave:()=>save({displayName})", "onSave:(()=>{let done=false;return ()=>{if(done)return 'saved';done=true;return save({displayName});};})()")],
  ["claim-only output", "console.log('PASS'); module.exports=()=>({});"],
  ["early process exit", "process.exit(0)"],
]) {
  test(`${name} fails actual shared runtime`, (t) => {
    const f = fixture(t);
    f.write("pages/agent.js", source);
    const result = f.grade();
    assert.equal(result.machineStatus, "FAIL");
    assert.equal(result.checks.find((item) => item.name === "shared-runtime").pass, false);
  });
}

test("locked fixture edits and unrelated new files fail before executing candidate code", (t) => {
  const f = fixture(t);
  f.write("pages/agent.js", goodPage);
  f.write("shared/ui.js", "throw Error('must not execute tampered fixture');");
  f.write("unrelated.txt", "unapproved");
  const result = f.grade();
  assert.equal(result.machineStatus, "FAIL");
  assert.equal(result.checks.find((item) => item.name === "locked:shared/ui.js").pass, false);
  assert.equal(result.checks.find((item) => item.name === "allowed-files").pass, false);
  assert.equal(result.checks.some((item) => item.name === "shared-runtime"), false);
});

test("candidate mutations during execution cannot hide behind a successful child", (t) => {
  const f = fixture(t);
  f.write("pages/agent.js", "require('node:fs').appendFileSync('./shared/ui.js','\\n//tamper');\n" + goodPage);
  const result = f.grade();
  assert.equal(result.checks.find((item) => item.name === "shared-runtime").pass, true);
  assert.equal(result.machineStatus, "FAIL");
  assert.equal(result.checks.find((item) => item.name === "post-execution-integrity").pass, false);
});

test("unrelated empty directories fail allowed output scope", (t) => {
  const f = fixture(t);
  f.write("pages/agent.js", goodPage);
  fs.mkdirSync(path.join(f.candidate, "unrelated"));
  const result = f.grade();
  assert.equal(result.machineStatus, "FAIL");
  assert.equal(result.checks.find((item) => item.name === "allowed-directories").pass, false);
});

test("bounded child kills runaway candidate and caps excessive output", (t) => {
  const f = fixture(t);
  f.write("pages/agent.js", "while(true){};");
  const started = Date.now();
  const slow = f.grade();
  assert.equal(slow.machineStatus, "FAIL");
  assert.equal(slow.checks.find((item) => item.name === "shared-runtime").evidence.error, "ETIMEDOUT");
  assert.ok(Date.now() - started < 10000);
  f.write("pages/agent.js", "process.stdout.write('x'.repeat(200000));\n" + goodPage);
  const large = f.grade();
  assert.equal(large.machineStatus, "FAIL");
  assert.ok(large.checks.find((item) => item.name === "shared-runtime").evidence.output.length <= 65536);
});

test("symlink output is rejected rather than evaluated", (t) => {
  const f = fixture(t);
  fs.symlinkSync(path.join(f.candidate, "pages/member.js"), path.join(f.candidate, "pages/agent.js"));
  assert.throws(f.grade, /Unsupported file/);
});

test("authored API spec passes actual structure and is rejected as ready and complete for its real gap", (t) => {
  const f = fixture(t, "api-contract");
  f.write("spec.md", spec());
  const result = f.grade();
  assert.equal(result.machineStatus, "MACHINE_PASS", JSON.stringify(result));
  assert.equal(result.overallStatus, "UNVERIFIED");
  assert.equal(result.checks.find((item) => item.name === "actual-check-spec-structure").evidence.exit, 0);
  assert.match(result.checks.find((item) => item.name === "actual-check-spec-ready-rejects-gap").evidence.output, /REQ-001 has unresolved status API_CONTRACT_MISSING/);
});

test("equivalent checker-supported markdown status formatting remains valid", (t) => {
  const f = fixture(t, "api-contract");
  f.write("spec.md", spec().replaceAll("`INCOMPLETE`", "INCOMPLETE").replace("| API_CONTRACT_MISSING |", "| `API_CONTRACT_MISSING` |"));
  const result = f.grade();
  assert.equal(result.machineStatus, "MACHINE_PASS", JSON.stringify(result));
});

for (const [name, mutate] of [
  ["omitted required field gap", (text) => text.replaceAll("delivery_mode", "other_field")],
  ["gap misrepresented as confirmed", (text) => text.replaceAll("API_CONTRACT_MISSING", "CONFIRMED")],
  ["missing notification log", (text) => text.replace(/## API Contract Notification Log[^]*?(?=## Decision Log)/, "")],
  ["false feature completion", (text) => text.replace("`INCOMPLETE`", "`COMPLETE`")],
]) {
  test(`${name} fails API machine grading`, (t) => {
    const f = fixture(t, "api-contract");
    f.write("spec.md", mutate(spec()));
    assert.equal(f.grade().machineStatus, "FAIL");
  });
}

test("missing candidate output fails without execution", (t) => {
  const f = fixture(t, "api-contract");
  const result = f.grade();
  assert.equal(result.machineStatus, "FAIL");
  assert.equal(result.checks.some((item) => item.name === "actual-check-spec-structure"), false);
});
