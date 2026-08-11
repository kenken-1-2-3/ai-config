# Skill Routing Reliability Design

## Goal

Improve completion rate and response speed by making Codex load the smallest correct set of skills for each turn, stop carrying workflow skills into later phases, and handle known Locale Manager and Multiverse failure modes deterministically.

## Evidence Baseline

Recent session traces show four repeatable routing failures:

1. Locale key add/update turns did not load `locale-entry-maintenance`, so each turn rebuilt lookup, retry, and verification logic ad hoc.
2. A BETBY language bug in shared `src/common` code did not load `multiverse-cross-template-bugfix`; the first fix covered Launch API mapping but missed Renderer mapping.
3. Screenshot-backed functional bugs loaded `figma-pixel-implementation` even when the user did not request visual parity or pixel-accurate implementation.
4. `spec-driven-workflow`, TDD, review, and delegation skills remained active during branch switching, commit, push, and deploy follow-ups.

These traces are the RED baseline. Tests added by this change must encode the same trigger, non-trigger, and phase-exit cases before production rules are modified.

## Scope

Modify only the ai-config repository:

- `rules/skill_trigger_guard.md`
- `skills/locale-entry-maintenance/SKILL.md`
- `skills/multiverse-cross-template-bugfix/SKILL.md`
- targeted trigger and phase-exit wording in `skills/spec-driven-workflow/SKILL.md`
- targeted trigger wording in `skills/figma-pixel-implementation/SKILL.md`
- deterministic skill-contract tests and their runner under `scripts/`

Preserve the user's existing uncommitted changes in these files. Do not modify global `~/.codex/config.toml`, enabled plugins, model defaults, project source code, or live Locale Manager data. Do not commit without a separate explicit instruction.

## Chosen Approach

Use a small routing contract plus domain-specific skill fixes. Do not create a new always-loaded router skill or lifecycle hook.

This keeps routing guidance in the existing project rule, keeps operational facts in the domain skills, and avoids adding another prompt layer.

## Routing Contract

Classify loaded skills into two roles:

- **Primary workflow skill:** owns the judgment and sequence for the current user outcome, such as spec authoring, locale entry maintenance, or cross-template diagnosis.
- **Capability skill:** required only to operate a selected surface or file type, such as Chrome, in-app browser, or PDF.

For each user turn:

1. Select zero or one primary workflow skill.
2. Add capability skills only when the corresponding tool or artifact is actually used.
3. Re-evaluate from the newest user request; do not inherit a primary skill merely because it applied earlier in the task.
4. Treat branch switching, commit, push, deploy, status questions, and simple repository lookups as new turn shapes. They do not retain spec, pixel, TDD, delegation, or review workflows unless the new request independently triggers them.
5. If two workflow skills appear applicable, choose the one that owns the immediate outcome. Load a second only when it governs a separate, necessary operation that will occur in the same turn.

The final answer should report material workflow skills only when that helps explain the result; it must not emit a long list of every capability surfaced in the prompt.

## Ticket And Branch Continuity

Skill routing is per turn, but branch ownership is per ticket. By default, work for the same project in one session belongs to one ticket and stays on its established work branch through implementation, review feedback, QA fixes, and release preparation. A phase change does not create a new branch or worktree.

Use a different work branch only when the user explicitly starts another ticket, changes project/repository, or requests another branch/worktree. Temporary promotion checkouts of `develop`, `staging`, or `main` must return to the ticket's work branch before follow-up code changes.

## Current Codex Delegation Backend

Codex must not invoke external Claude Code through `cc:*` skills, the Claude CLI, or tracked Claude Code jobs. When delegation is justified, use native session subagents and keep integration in the main agent. Only a user request explicitly naming Claude Code for the current task may override this temporary default.

## Requirement-Driven Remote I18n

For every requirement that introduces or changes user-facing copy, resolve a remote i18n key as part of the same ticket. Search the consumer repo, shared/legacy sources, and target remote dataset first; reuse a semantically compatible key when possible. If none exists and all required copy is known, create a key through Locale Manager using existing naming, batching, quota, and read-back rules rather than stopping at the gap or creating local locale files.

Return each mapping to the user as `REUSED`, `CREATED`, or `BLOCKED`, including target dataset, key, `en`, `zh-TW`, `zh-CN`, and read-back evidence. Install the Locale maintenance skill only in the old Multiverse, Dashboard, and Multiverse NX consumer projects plus Locale Manager itself.

## Locale Entry Maintenance Changes

Keep exact-key and copy duplicate checks, then add a bounded bulk-write contract:

1. Fetch the target dataset once per operation and build a local exact-key/copy index.
2. Compute the requested delta before writing; do not repeatedly fetch the full dataset per key.
3. Use batches of at most 10 entries. After every successful batch, perform one read-back and verify only affected keys.
4. When the API reports an ambiguous non-quota error, perform one read-back, distinguish the result below, and allow at most one remaining-delta retry per operation:
   - no write occurred;
   - partial or complete write occurred despite an error response;
   - Translate quota exhaustion.
5. On the first Translate quota exhaustion result, stop issuing writes. Perform one read-back, report persisted and remaining keys, and provide a resumable remaining-key list.
6. On a later resume turn, take a fresh snapshot, recompute the delta from that list, and submit only keys still missing or mismatched.
7. Do not load the standalone spreadsheet skill merely because the API is backed by Google Sheets.
8. Do not claim all requested entries complete unless every requested priority locale passes read-back.

No production API call is part of the skill test suite.

## Cross-Template Bugfix Changes

Trigger `multiverse-cross-template-bugfix` when a reported single-template bug enters shared `src/common` hooks, composables, provider adapters, renderer mappings, or configuration used by more than one template.

The workflow must inventory the complete implementation family, not just sibling templates. For provider language handling this includes, where present:

- launch/request language mapping;
- renderer initialization mapping;
- fallback behavior;
- all callers of the shared hook or adapter.

The skill must still not trigger when evidence confirms the code path is template-local.

## Spec And Pixel Phase Exit

`spec-driven-workflow` applies only while authoring, auditing, or updating the spec contract. Once the immediate user request becomes direct implementation, branch management, release, or deployment, the skill exits; implementation may read the approved spec without reloading the authoring workflow.

`figma-pixel-implementation` applies only when the user explicitly requests visual parity, pixel-perfect implementation, screenshot-based layout recreation, or precise visual measurement. A screenshot attached to demonstrate a functional defect, missing icon font, untranslated key, runtime error, or wrong data is evidence for diagnosis and must not trigger the pixel workflow by itself.

## Deterministic Tests

Add a small contract checker and test file covering at least these cases:

- Locale key plus Chinese/English copy requires `locale-entry-maintenance`.
- Locale API backed by Google Sheets does not imply the spreadsheet skill.
- Shared BETBY renderer or provider mapping requires cross-template analysis.
- Confirmed template-local behavior does not require cross-template analysis.
- Explicit pixel-perfect request triggers the pixel skill.
- Screenshot of a functional bug does not trigger the pixel skill.
- Explicit spec authoring or drift audit triggers the spec skill.
- Commit, push, deploy, branch switching, simple lookup, and direct implementation do not retain the spec skill.
- The global routing rule defines at most one primary workflow skill and phase re-evaluation.
- The global routing rule separates per-turn skill re-evaluation from per-ticket branch continuity.
- Codex delegation uses native subagents and never infers permission to call Claude Code from the task shape.
- Remote-i18n consumer requirements search legacy/current data, create only missing keys, and report the verified mapping to the user.

The tests validate trigger metadata and required contract language. Negative fixtures remove or reverse critical clauses so the checker must reject weakened routing, quota, resume, provider-family, spec-exit, and screenshot boundaries. Historical session traces remain the behavioral baseline; forward-testing with agents is optional and must not touch live systems.

## Success Criteria

- All new skill-contract tests fail against the pre-change behavior for the intended reason, then pass after the minimal edits.
- Existing `check-spec` tests continue to pass.
- Skill frontmatter remains valid and descriptions contain the complete trigger/non-trigger boundary.
- Existing uncommitted spec, pixel, and dispatch improvements are preserved.
- No global config, plugin state, project repository, live API data, stage, or commit is changed.
