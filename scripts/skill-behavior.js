#!/usr/bin/env node
// Local fixture evidence only. This runner is bounded, not an OS security sandbox.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const FIXTURES = path.join(__dirname, "fixtures/skill-behavior");
const CASES = new Set(["shared-ui", "api-contract"]);
const hash = (data) => crypto.createHash("sha256").update(data).digest("hex");
const inside = (parent, child) => child === parent || child.startsWith(parent + path.sep);

function absolute(value) {
  if (!value || !path.isAbsolute(value) || path.resolve(value) !== value) throw Error("Use normalized absolute paths");
  return value;
}

function regularTree(dir, base = dir, directories = []) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink() || (!entry.isDirectory() && !entry.isFile())) throw Error(`Unsupported file: ${full}`);
    if (entry.isDirectory()) {
      directories.push(path.relative(base, full));
      files.push(...regularTree(full, base, directories));
    }
    else files.push(path.relative(base, full));
  }
  return files.sort();
}

function prepare(name, destination, statePath) {
  if (!CASES.has(name)) throw Error("Allowed cases: shared-ui, api-contract");
  absolute(destination); absolute(statePath);
  if (inside(ROOT, destination) || inside(ROOT, statePath)) throw Error("Keep candidate and state outside the source repository");
  if (inside(destination, statePath) || inside(statePath, destination)) throw Error("State must be outside the candidate directory");
  for (const value of [destination, statePath]) {
    if (fs.existsSync(value)) throw Error(`Refusing existing path: ${value}`);
    const parent = path.dirname(value);
    if (fs.realpathSync(parent) !== parent) throw Error("Parents must exist and contain no symlinks");
  }
  const output = name === "shared-ui" ? "pages/agent.js" : "spec.md";
  fs.mkdirSync(destination);
  const write = (relative, contents) => {
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, contents, { flag: "wx" });
  };
  const sourceHashes = { "scripts/skill-behavior.js": hash(fs.readFileSync(__filename)) };
  for (const file of regularTree(path.join(FIXTURES, name))) {
    const contents = fs.readFileSync(path.join(FIXTURES, name, file));
    sourceHashes[path.relative(ROOT, path.join(FIXTURES, name, file))] = hash(contents);
    write(file, file === "TASK.md" ? contents.toString("utf8").replaceAll("{{AI_CONFIG_ROOT}}", ROOT) : contents);
  }
  const sources = name === "shared-ui"
    ? [["rules/dashboard.md", "guidance/dashboard.md"]]
    : [["skills/spec-driven-workflow/SKILL.md", "guidance/SKILL.md"], ["skills/spec-driven-workflow/spec-template.md", "guidance/spec-template.md"]];
  for (const [source, target] of sources) {
    const contents = fs.readFileSync(path.join(ROOT, source));
    write(target, contents);
    sourceHashes[source] = hash(contents);
  }
  if (name === "api-contract") sourceHashes["scripts/check-spec.js"] = hash(fs.readFileSync(path.join(ROOT, "scripts/check-spec.js")));
  write("AGENTS.md", `# Isolated local behavior fixture\nRead TASK.md and guidance/${name === "shared-ui" ? "dashboard.md" : "SKILL.md"}. The explicit task output path overrides any guide's normal repository destination.\nOnly create ${output} and optional NOTES.md. All existing files are locked inputs. Do not read or edit external evaluation state, harness/grader code, tests, or expected results. The spec checker may only be executed as directed by TASK.md. Do not modify the source repository, run remote services, install dependencies, or perform Git operations.\nThis is a local fixture; do not claim real Dashboard, Figma, browser, API, Network, persistence, or release acceptance. Report checks and gaps in your response.\n`);
  const locked = Object.fromEntries(regularTree(destination).map((file) => [file, hash(fs.readFileSync(path.join(destination, file)))]));
  fs.writeFileSync(statePath, JSON.stringify({ version: 1, case: name, candidate: destination, output, locked, sourceHashes }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  return { candidate: destination, state: statePath, task: path.join(destination, "TASK.md"), output: path.join(destination, output), provenance: sourceHashes };
}

function child(args, cwd) {
  const result = spawnSync(process.execPath, args, {
    cwd, encoding: "utf8", timeout: 5000, maxBuffer: 64 * 1024,
    env: { PATH: path.dirname(process.execPath), LANG: "C", TZ: "UTC" },
    windowsHide: true,
  });
  return { pass: !result.error && result.status === 0, exit: result.status, signal: result.signal,
    error: result.error ? result.error.code : null, output: ((result.stdout || "") + (result.stderr || "")).slice(0, 65536) };
}

// Wrap the actual shared exports before loading the candidate. Identity sets reject
// copied lookalikes and imports/calls whose returned shared objects are discarded.
const SHARED_CHECK = String.raw`
const assert = require('node:assert/strict');
const shared = require('./shared/ui.js');
const returns = {};
for (const key of Object.keys(shared)) {
  const original = shared[key];
  returns[key] = new WeakSet();
  shared[key] = (...args) => { const result = original(...args); returns[key].add(result); return result; };
}
const render = require('./pages/agent.js');
assert.equal(typeof render, 'function', 'export a page function');
for (const displayName of ['Ada & Co', '代理員🙂', '']) {
  const saved = [];
  const results = [Object.freeze({}), Promise.resolve(Object.freeze({}))];
  const page = render({ displayName, save: value => { const result = results[saved.length]; saved.push(value); return result; } });
  assert.equal(saved.length, 0, 'render must not save before the action is pressed');
  assert.ok(returns.formPage.has(page), 'page must be returned by shared formPage');
  assert.equal(page.title, 'Create agent');
  assert.equal(page.layout, 'admin-form');
  assert.equal(page.fields.length, 1);
  const field = page.fields[0];
  assert.ok(returns.textField.has(field), 'field must be returned by shared textField');
  assert.deepEqual({name: field.name, label: field.label, value: field.value}, {name: 'displayName', label: 'Display name', value: displayName});
  assert.ok(returns.saveAction.has(page.action), 'action must be returned by shared saveAction');
  assert.equal(page.action.label, 'Save agent');
  for (const [index, result] of results.entries()) {
    assert.strictEqual(page.action.press(), result, 'press must return the exact callback result');
    assert.equal(saved.length, index + 1, 'each press must call save exactly once');
    assert.deepEqual(saved, Array.from({length: index + 1}, () => ({displayName})), 'save must receive current field value');
  }
}
console.log('PASS actual shared objects, three rendered inputs, and save callbacks');
`;

function check(statePath, consent = false) {
  if (!consent) throw Error("Check executes candidate code in a bounded child, not a security sandbox; explicit --allow-isolated-code-execution authorization is required");
  absolute(statePath);
  if (fs.lstatSync(statePath).isSymbolicLink()) throw Error("State must be a regular file");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  if (state.version !== 1 || !CASES.has(state.case)) throw Error("Invalid state version or case");
  absolute(state.candidate);
  if (inside(ROOT, state.candidate) || inside(state.candidate, statePath) || fs.realpathSync(state.candidate) !== state.candidate) throw Error("Invalid isolated candidate path");
  const expectedOutput = state.case === "shared-ui" ? "pages/agent.js" : "spec.md";
  if (state.output !== expectedOutput || !state.locked || !state.sourceHashes) throw Error("Invalid state contract");
  const checks = [];
  const record = (name, pass, evidence) => checks.push({ name, pass, evidence });
  const directories = [];
  const files = regularTree(state.candidate, state.candidate, directories);
  const allowed = new Set([...Object.keys(state.locked), expectedOutput, "NOTES.md"]);
  const allowedDirs = new Set();
  for (const file of allowed) {
    for (let dir = path.dirname(file); dir !== "."; dir = path.dirname(dir)) {
      if (path.isAbsolute(dir) || dir === "..") throw Error("Invalid allowed path");
      allowedDirs.add(dir);
    }
  }
  record("allowed-files", files.every((file) => allowed.has(file)), files.filter((file) => !allowed.has(file)));
  record("allowed-directories", directories.every((dir) => allowedDirs.has(dir)), directories.filter((dir) => !allowedDirs.has(dir)));
  for (const [file, digest] of Object.entries(state.locked)) {
    if (path.isAbsolute(file) || file.split(path.sep).includes("..")) throw Error("Invalid locked path");
    record(`locked:${file}`, files.includes(file) && hash(fs.readFileSync(path.join(state.candidate, file))) === digest, "SHA-256 against external prepare state");
  }
  for (const [file, digest] of Object.entries(state.sourceHashes)) {
    if (!inside(ROOT, path.resolve(ROOT, file))) throw Error("Invalid source path");
    record(`source:${file}`, hash(fs.readFileSync(path.join(ROOT, file))) === digest, "Source freshness since prepare");
  }
  record("candidate-output", files.includes(expectedOutput), expectedOutput);
  if (checks.every((item) => item.pass)) {
    if (state.case === "shared-ui") {
      const result = child(["-e", SHARED_CHECK], state.candidate);
      record("shared-runtime", result.pass && result.output.trim() === "PASS actual shared objects, three rendered inputs, and save callbacks", result);
    } else {
      const spec = path.join(state.candidate, expectedOutput);
      const structure = child([path.join(__dirname, "check-spec.js"), spec], state.candidate);
      record("actual-check-spec-structure", structure.pass, structure);
      const ready = child([path.join(__dirname, "check-spec.js"), "--ready", spec], state.candidate);
      record("actual-check-spec-ready-rejects-gap", !ready.error && ready.exit !== null && !ready.pass && /REQ-001 has unresolved status API_CONTRACT_MISSING; cannot hand off/.test(ready.output), ready);
      const complete = child([path.join(__dirname, "check-spec.js"), "--complete", spec], state.candidate);
      record("actual-check-spec-complete-rejects-gap", !complete.error && complete.exit !== null && !complete.pass && /REQ-001 has status API_CONTRACT_MISSING; feature cannot be complete/.test(complete.output), complete);
      const text = fs.readFileSync(spec, "utf8").replace(/`/g, "");
      const completion = text.match(/## Feature Completion Gate[^\n]*\n([^]*?)(?=\n## |$)/);
      record("required-gap-and-incomplete-state", /\|\s*REQ-001\s*\|[^\n]*delivery_mode[^\n]*\|\s*API_CONTRACT_MISSING\s*\|/.test(text) && Boolean(completion && /- Status:\s*INCOMPLETE\b/.test(completion[1])), "REQ-001 retains delivery_mode gap; canonical feature remains INCOMPLETE");
    }
  }
  // Recheck after candidate execution; fixture mutation cannot be hidden by a green child.
  const afterDirs = [];
  const after = regularTree(state.candidate, state.candidate, afterDirs);
  record("post-execution-integrity", after.every((file) => allowed.has(file)) && afterDirs.every((dir) => allowedDirs.has(dir)) && Object.entries(state.locked).every(([file, digest]) => after.includes(file) && hash(fs.readFileSync(path.join(state.candidate, file))) === digest), "Locked bytes and allowed files/directories after bounded child execution");
  const pass = checks.every((item) => item.pass);
  return { case: state.case, machineStatus: pass ? "MACHINE_PASS" : "FAIL", overallStatus: pass ? "UNVERIFIED" : "FAIL", checks,
    independentReviewRequired: ["Compare actual candidate behavior/spec with authoritative sources", "Review worker transcript for notification timing, user intent, scope, and unsupported completion claims"],
    limits: ["Trusted local fixture execution only; timeout/output limits do not isolate hostile code or block networking", "Prepared state and source hashes are caller-trusted provenance, not tamper-proof adversarial guarantees", "Fixture evidence does not prove real Dashboard/Figma/browser/API/Network/persistence parity", "Machine checks do not prove semantic source fidelity or real user-facing notification"] };
}

function main(args) {
  let result;
  if (args[0] === "prepare" && args.length === 4) result = prepare(args[1], args[2], args[3]);
  else if (args[0] === "check" && args.length === 3 && args[2] === "--allow-isolated-code-execution") result = check(args[1], true);
  else throw Error("Usage: skill-behavior.js prepare <shared-ui|api-contract> <new-absolute-candidate-dir> <new-absolute-state.json> | check <state.json> --allow-isolated-code-execution");
  process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  return result.machineStatus === "FAIL" ? 1 : 0;
}
if (require.main === module) {
  try { process.exitCode = main(process.argv.slice(2)); }
  catch (error) { process.stderr.write(error.message + "\n"); process.exitCode = 2; }
}
module.exports = { prepare, check };
