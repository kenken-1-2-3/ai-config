# Skill Routing Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route each turn to the smallest correct skill set, stop workflow skills when the user outcome changes, and make Locale bulk writes and Multiverse shared-provider fixes complete predictably.

**Architecture:** Keep the cross-skill selection contract in `rules/skill_trigger_guard.md`; keep API-specific and repository-specific behavior in the existing domain skills. Add a Node contract checker that validates frontmatter and required trigger, non-trigger, phase-exit, quota, and shared-code clauses without calling live services.

**Tech Stack:** Markdown skill/rule files, Node.js CommonJS, `node:test`, `node:assert/strict`.

## Global Constraints

- Preserve all existing uncommitted user changes.
- Do not modify `~/.codex/config.toml`, plugin state, project repositories, or live Locale Manager data.
- Do not stage or commit without a separate explicit user instruction.
- Use historical session failures as the RED behavioral baseline; deterministic tests must fail before production skill edits.
- Keep trigger boundaries in YAML descriptions because discovery occurs before the skill body is loaded.

---

### Task 1: Add the failing routing-contract test

**Files:**
- Create: `scripts/check-skill-routing.test.js`
- Create after RED: `scripts/check-skill-routing.js`

**Interfaces:**
- Consumes: repository root resolved as `path.join(__dirname, "..")`.
- Produces: `runChecks(rootDir): Array<{ id: string, file: string, message: string }>` and a CLI that exits `0` on success or `1` with one issue per line.

- [ ] **Step 1: Write the failing test**

Create tests that import `runChecks`, run it against the real repository, and require these contract IDs to have no failures:

```js
const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { runChecks } = require("./check-skill-routing.js");

const rootDir = path.join(__dirname, "..");

test("skill routing contracts are explicit and phase-scoped", () => {
  const issues = runChecks(rootDir);
  assert.deepEqual(issues, [], issues.map((issue) => `${issue.id}: ${issue.message}`).join("\n"));
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test scripts/check-skill-routing.test.js`

Expected: FAIL because `scripts/check-skill-routing.js` does not exist.

- [ ] **Step 3: Add the minimal checker skeleton and contract table**

Implement CommonJS helpers:

```js
function runChecks(rootDir) {
  return CONTRACTS.flatMap((contract) => {
    const text = fs.readFileSync(path.join(rootDir, contract.file), "utf8");
    return contract.patterns
      .filter((pattern) => !pattern.regex.test(text))
      .map((pattern) => ({ id: contract.id, file: contract.file, message: pattern.message }));
  });
}

module.exports = { runChecks };
```

Define contracts for:

- `routing-primary-limit`
- `routing-phase-reset`
- `locale-trigger`
- `locale-no-spreadsheet`
- `locale-quota-stop`
- `locale-partial-resume`
- `cross-template-shared-code-trigger`
- `cross-template-provider-family`
- `spec-phase-exit`
- `pixel-functional-screenshot-non-trigger`

The CLI prints `Skill routing contracts valid.` when no issues remain.

- [ ] **Step 4: Re-run and verify behavioral RED**

Run: `node --test scripts/check-skill-routing.test.js`

Expected: FAIL with missing contracts from the existing rule and skills, including primary-workflow limit, Locale quota stop, shared provider family, and phase exit.

### Task 2: Add the per-turn routing and phase-exit contract

**Files:**
- Modify: `rules/skill_trigger_guard.md`
- Modify: `skills/spec-driven-workflow/SKILL.md`
- Modify: `skills/figma-pixel-implementation/SKILL.md`
- Test: `scripts/check-skill-routing.test.js`

**Interfaces:**
- Consumes: newest user request and currently intended operation.
- Produces: zero or one primary workflow skill plus only required capability skills.

- [ ] **Step 1: Update the routing rule minimally**

Add a `Per-turn routing contract` defining:

```text
Primary workflow skill: owns the judgment and sequence for the immediate user outcome.
Capability skill: required to operate a surface or artifact actually used in this turn.
Select zero or one primary workflow skill per turn. Re-evaluate from the newest user request; do not inherit a primary skill from an earlier phase.
```

Explicitly classify commit, push, deploy, branch switching, status questions, and simple lookups as fresh turn shapes that do not retain spec, pixel, TDD, review, or delegation workflows.

Also state that fresh skill routing does not imply a fresh branch: by default, follow-up work for the same project and ticket remains on the established work branch through implementation, review, QA, fixes, and release preparation. New branches/worktrees require a different ticket/project or an explicit user request.

For Codex delegation, disable external Claude Code (`cc:*`, Claude CLI, and tracked jobs). When the delegation gate passes, use native session subagents; only a per-task user request explicitly naming Claude Code may override.

For remote-i18n consumer work, make missing-key discovery trigger `locale-entry-maintenance`: search current/legacy/remote sources, reuse compatible keys, create only true gaps through Locale Manager, verify by read-back, and report each mapping to the user. Install the skill in old Multiverse, Dashboard, and Multiverse NX, not unrelated repositories.

- [ ] **Step 2: Add spec workflow exit wording**

Keep the current positive triggers, and make the description/body state that direct implementation, branch management, commit, push, release, and deployment do not trigger or retain the skill. An implementation turn may read an approved spec without loading the spec-authoring workflow.

- [ ] **Step 3: Add the pixel screenshot non-trigger**

Keep explicit pixel-perfect and visual-parity triggers. State that a screenshot used only to show a functional defect, missing icon font, untranslated key, runtime error, or wrong data does not trigger the pixel workflow.

- [ ] **Step 4: Run focused contract tests**

Run: `node --test scripts/check-skill-routing.test.js`

Expected: routing, spec-exit, and pixel non-trigger contracts pass; Locale and cross-template contracts still fail.

### Task 3: Make Locale entry operations bounded and resumable

**Files:**
- Modify: `skills/locale-entry-maintenance/SKILL.md`
- Test: `scripts/check-skill-routing.test.js`

**Interfaces:**
- Consumes: target set plus requested `{ path, en, zh-TW, zh-CN }` entries.
- Produces: verified persisted entries, exact remaining entries, and a resumable result after quota exhaustion.

- [ ] **Step 1: Strengthen frontmatter discovery**

Start the description with `Use when` and include add/update/delete requests containing locale keys and English/Traditional/Simplified Chinese copy. Keep Auto Translate of an entire dataset outside this CRUD skill unless the user is adding/updating specific keys.

- [ ] **Step 2: Replace per-key refetch behavior with one indexed snapshot**

Require one initial dataset fetch, local exact-key/copy indexes, a computed delta, write batches of at most 10 entries, and one read-back of affected keys after each successful batch.

- [ ] **Step 3: Add error classification and quota stop**

On an ambiguous non-quota response, perform one read-back to classify no-write versus partial/complete write and permit at most one remaining-delta retry per operation. On the first Google Apps Script Translate quota signal—including `單日叫用下列服務的次數過多：translate`—stop new writes, read back once, and report verified persisted and remaining keys. A later resume turn must take a fresh snapshot, recompute the delta, and submit only keys still missing or mismatched.

- [ ] **Step 4: Add routing and completion boundaries**

State that a Google Sheets-backed API does not trigger the standalone spreadsheet skill. Require all priority locales to match before reporting complete.

- [ ] **Step 5: Run focused contract tests**

Run: `node --test scripts/check-skill-routing.test.js`

Expected: Locale contracts pass; cross-template contracts still fail.

### Task 4: Cover shared provider and renderer implementation families

**Files:**
- Modify: `skills/multiverse-cross-template-bugfix/SKILL.md`
- Test: `scripts/check-skill-routing.test.js`

**Interfaces:**
- Consumes: a bug that may enter shared `src/common` hooks, composables, adapters, renderer mappings, or configuration.
- Produces: affected callers/templates, shared-versus-local root cause, and complete provider-family verification.

- [ ] **Step 1: Strengthen frontmatter discovery**

Trigger when a seemingly single-template bug reaches shared code used by multiple templates. Preserve the non-trigger when evidence proves the code path is template-local.

- [ ] **Step 2: Expand scoped discovery beyond sibling templates**

Require searching both `src/common` and `template/`, then inventory all callers of the shared hook, composable, provider adapter, renderer mapping, or configuration.

- [ ] **Step 3: Add provider-language completeness**

For BETBY or another provider language fix, require checking launch/request mapping, renderer initialization mapping, fallback behavior, and every caller. Verification must prove the entire implementation family, not one endpoint.

- [ ] **Step 4: Run all routing contracts**

Run: `node --test scripts/check-skill-routing.test.js`

Expected: PASS with `Skill routing contracts valid.` from the checker CLI when run directly.

### Task 5: Validate the complete change without altering external state

**Files:**
- Verify: all files from Tasks 1–4
- Verify existing: `scripts/check-spec.test.js`

**Interfaces:**
- Consumes: completed local diff.
- Produces: test, syntax, frontmatter, whitespace, and scope evidence.

- [ ] **Step 1: Run syntax and routing tests**

Run:

```bash
node --check scripts/check-skill-routing.js
node --check scripts/check-skill-routing.test.js
node --test scripts/check-skill-routing.test.js
node scripts/check-skill-routing.js
```

Expected: all exit `0`.

- [ ] **Step 2: Run existing checker regression tests**

Run: `node --test scripts/check-spec.test.js`

Expected: all existing tests pass.

- [ ] **Step 3: Validate skill frontmatter and descriptions**

Run the bundled skill validator against each modified skill folder, or use the repository contract checker when the bundled validator is unavailable. Confirm names are unchanged and each description contains complete positive and negative trigger boundaries.

- [ ] **Step 4: Check whitespace and inspect only the intended diff**

Run:

```bash
git diff --check
git diff -- rules/skill_trigger_guard.md skills/locale-entry-maintenance/SKILL.md skills/multiverse-cross-template-bugfix/SKILL.md skills/spec-driven-workflow/SKILL.md skills/figma-pixel-implementation/SKILL.md scripts/check-skill-routing.js scripts/check-skill-routing.test.js
```

Expected: no whitespace errors; no unrelated edits introduced by this implementation.

- [ ] **Step 5: Stop before staging or committing**

Report modified files, RED and GREEN evidence, preserved pre-existing changes, and any remaining limitation. Do not stage or commit.
