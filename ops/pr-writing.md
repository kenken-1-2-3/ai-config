# PR / MR descriptions

Use when asked to draft or update a PR/MR description. Honor the repository template and current authorized scope; this reference only governs the text.

- Describe the final diff for a reviewer without the chat history: lead with the concrete problem and resulting behavior, using the project's domain language. Refresh the title/body when scope changes; omit abandoned approaches unless they explain a necessary tradeoff.
- Use the smallest helpful representation: prose for a simple fix; a short before/after sketch, flow or dependency view only when it explains ownership, order or impact better. Do not require a diagram or a source-file inventory for every change.
- Attach evidence suited to the claim: matching before/after states for visual work, exact checks/results for logic, and actual Network/persistence evidence for integration. Identify revision/working diff and relevant environment; label missing baseline, blocked and unverified cases explicitly. Never fabricate a failing-before run or treat a screenshot/fixture as proof of persistence.
- Reuse valid evidence under `rules/agent_dispatch.md`; drafting a description alone does not require rerunning unchanged checks. Revalidate stale affected evidence and retain all mandatory acceptance gates; a polished description is not verification.
- State concrete impact (sites/templates, shared callers, interfaces or data) and reversibility: whether reverting code is sufficient, or data/deployment recovery is also needed. For a small bounded fix, one sentence is enough; avoid vague blast-radius labels or speculative exhaustive risk lists.
- Before describing a merge destination or providing a creation link, verify the actual source/target pair against the authorized promotion; follow `ops/judgment-rubrics.md` for environment-branch links. Draft-only work may mark an unknown target as unresolved without choosing or publishing one.

Suggested content, adapted to the repository template: **Problem and result → Verification evidence and gaps → Impact and rollback**. Existing Git, publication and attribution rules remain the sole authority for those operations.
