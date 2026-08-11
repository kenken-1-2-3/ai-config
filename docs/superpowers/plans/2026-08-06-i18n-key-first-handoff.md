# I18n Key-First Handoff Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require all new agent-side and member-side user-facing copy to use an i18n key immediately and always report proposed locale entries at task completion.

**Architecture:** Extend the shared `Multilingual Terms` policy already loaded by Dashboard and both Multiverse repositories, then remove the conflicting NX instruction that stops when an original key is missing. Keep Locale Manager mutation as a separate user-authorized workflow.

**Tech Stack:** Markdown policy files, repository rule loading through the existing `projects.json` mappings, deterministic text assertions, and scenario-based read-only policy validation.

## Global Constraints

- Preserve all existing user changes in `rules/wow_gsi.md`, including its current key-reuse rules and commit-attribution rule.
- Do not modify `projects.json`, `install.sh`, generated AGENTS files, Codex config, plugin state, or skill installation.
- Do not modify `rules/locale_manager.md` or `skills/locale-entry-maintenance/SKILL.md`; Locale Manager writes remain separately authorized.
- Missing remote locale data is not a blocker for frontend implementation.
- New user-visible copy must never be temporarily hardcoded in Chinese, English, or another language and must not use a literal fallback.
- When source copy supplies only one language, the agent may propose `en`, `zh-TW`, and `zh-CN` values without another question.
- Never create a commit without fresh, explicit user confirmation for that exact commit.

---

### Task 1: Enforce key-first UI copy and final locale handoff

**Files:**
- Modify: `rules/wow_gsi.md:90-96`
- Modify: `rules/multiverse_nx.md:13-16`
- Reference: `docs/superpowers/specs/2026-08-06-i18n-key-first-handoff-design.md`

**Interfaces:**
- Consumes: existing `Multilingual Terms` key search/reuse policy and project mappings that already load `wow_gsi.md`.
- Produces: one shared key-first policy for Dashboard, old Multiverse, and Multiverse NX; an NX migration rule with no missing-key conflict.

- [ ] **Step 1: Record the failing policy baseline**

Run:

```bash
rg -n -i "hardcode|literal fallback|Locale keys to add|本次無需新增翻譯 key" rules/wow_gsi.md
rg -n "no matching key|ask the user how to handle" rules/multiverse_nx.md
```

Expected:

- The shared rule has no required hardcode prohibition or completion-report contract.
- NX still says to ask the user how to handle a missing original key.

- [ ] **Step 2: Extend the shared multilingual policy**

Preserve the existing three key search/reuse bullets in `rules/wow_gsi.md`, then replace the two late-confirmation bullets with this exact policy:

```markdown
- For `Whitelabel_GSI_Dashboard`, `Whitelabel_GSI_Platform_Multiverse`, and `whitelabel-gsi-platform-multiverse-nx`, every newly introduced user-visible label, button, placeholder, tooltip, modal message, validation message, error message, empty state, or similar UI copy must use the repository's existing i18n call pattern from the first implementation.
- When no compatible key exists, derive a proposed key from the nearest existing module namespace and naming convention, use that key in code immediately, and keep implementation moving. A missing remote locale entry alone is not a blocker and is not a reason to ask the user.
- Never temporarily hardcode Chinese, English, or another user-facing language, and never add a literal fallback string for a proposed key.
- If the product meaning or intended wording itself is ambiguous, ask before choosing the copy or key. If only one language is provided but the meaning is clear, generate proposed `en`, `zh-TW`, and `zh-CN` values without another question.
- Every completed task in these three frontend repositories must include a `Locale keys to add` section with `Target | Key | en | zh-TW | zh-CN | Usage`. Use `agent-side / backstage` for Dashboard and `member-side / frontend` for both Multiverse repositories. Mark generated translations as proposed.
- List only newly proposed keys in that section. If none are needed, report exactly: `本次無需新增翻譯 key`.
- Do not mutate Locale Manager data unless the user separately asks to add or update those entries.
```

- [ ] **Step 3: Remove the NX missing-key conflict**

Replace the Page Migration bullet in `rules/multiverse_nx.md` with:

```markdown
- When migrating pages from the old Multiverse member side into this NX repo, reuse original i18n translation keys when they are semantically compatible. If required user-visible copy has no matching original key, follow the shared key-first workflow: derive and use a proposed key immediately, then report it under `Locale keys to add`. Do not stop solely because the original page has no matching key.
```

- [ ] **Step 4: Run deterministic policy assertions**

Run:

```bash
rg -n "every newly introduced user-visible|Never temporarily hardcode|Locale keys to add|本次無需新增翻譯 key|Do not mutate Locale Manager" rules/wow_gsi.md
rg -n "follow the shared key-first workflow|Do not stop solely" rules/multiverse_nx.md
git diff --check -- rules/wow_gsi.md rules/multiverse_nx.md
```

Expected:

- Every shared-policy phrase appears exactly once.
- Both NX replacement phrases appear exactly once.
- `git diff --check` exits successfully.

- [ ] **Step 5: Forward-test both frontend sides**

Run two independent read-only policy scenarios with minimal context:

1. Dashboard scenario: a new Chinese-only button has no compatible backstage key. Expected response uses a proposed key in code, generates proposed `en`, `zh-TW`, and `zh-CN`, and reports `agent-side / backstage`; it does not hardcode or wait for Locale Manager.
2. NX scenario: a migrated empty state has no original key. Expected response uses a proposed frontend key, reports `member-side / frontend`, and does not ask merely because the key is missing.

Both scenario reviewers must return PASS and cite the governing policy lines.

- [ ] **Step 6: Review the exact change scope**

Run:

```bash
git diff -- rules/wow_gsi.md rules/multiverse_nx.md
git status --short
```

Expected:

- Only the multilingual section and NX Page Migration bullet contain new edits for this task.
- Existing unrelated dirty files remain untouched. In particular, distinguish the pre-existing commit-attribution edit in `rules/wow_gsi.md` from this task's multilingual-policy edits.
- Preserve the three pre-existing key search/reuse bullets in the worktree; do not silently stage unrelated pre-existing edits.
- No auto-loading, Locale Manager, plugin, or config file is modified.

- [ ] **Step 7: Commit only after fresh approval**

Stop and show the final diff and verification results. Ask the user for explicit confirmation for this exact commit. Only after approval:

```bash
git add -p -- rules/wow_gsi.md rules/multiverse_nx.md
git diff --cached --check
git diff --cached -- rules/wow_gsi.md rules/multiverse_nx.md
git commit -m "rules: require i18n keys for new UI copy"
```

Expected staged scope:

- Stage the Multilingual Terms policy and NX Page Migration change approved by the user.
- Include the already-present key search/reuse bullets only if they are shown as part of the exact approved policy commit.
- Exclude the unrelated pre-existing commit-attribution edit and every other dirty file.
