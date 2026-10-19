# Executing an approved spec in slices

Use only for authorized implementation or preparation of a multi-slice handoff. Keep the canonical spec's requirement, readiness and completion gates; this reference does not activate spec authoring for direct implementation.

## Slice and schedule

- Choose the smallest independently verifiable end-to-end behavior across the layers actually required by the approved REQs. Verify one representative complete path before expanding to dependent variants/templates; do not invent backend work or treat fixtures as integration. For an authorized broad mechanical migration that cannot land in vertical slices, use expand → bounded migrations → contract, with explicit dependencies and an integration verification gate.
- Keep one Execution Ledger in the canonical spec. Main owns ledger updates and the active handoff; workers return evidence. Reuse existing ticket IDs when available, otherwise use local slice IDs without creating tracker issues. Link REQ/AC/VT and research evidence instead of copying their contents or conversation history.
- Record only genuine blocking edges; reject missing or cyclic dependencies. A slice is eligible only when its prerequisites are verified in the working state and its REQs pass the existing readiness gate. An API-blocked UI slice remains bounded by its approved execution boundary.
- Apply the delegation/resource-conflict gate in `rules/agent_dispatch.md` before scheduling eligible work; a ready graph does not require workers. Keep the established branch under `rules/skill_trigger_guard.md`. Ledger state grants no permission to create branches/worktrees, commit, merge, push, create PRs or close tracker issues.
- Resolve mechanical ordering and granularity from the approved scope without a new confirmation round. Ask only for unresolved material human decisions or an operation lacking required authorization.

## Execution Ledger

Add this table only for multi-slice work; it is an execution record, not a second acceptance contract.

| Slice / ticket | REQ IDs | Blocked by | Owner / write scope / exclusive resources | State / blocker / next action | Evidence / verified state |
| --- | --- | --- | --- | --- | --- |
| `<ID>` | `<canonical REQ IDs>` | `<IDs or NONE>` | `<main or worker; paths/interfaces; shared environment>` | `<PENDING / RUNNING / READY_TO_INTEGRATE / VERIFIED / BLOCKED / RECHECK_REQUIRED; reason/next action>` | `<AC/VT evidence pointers; source revision + uncommitted diff identity; relevant build/env/data/source versions>` |

## Integrate and resume

- Worker completion means `READY_TO_INTEGRATE`, not `VERIFIED`. Main checks the actual diff against the frozen acceptance packet and validates the resulting working state per `rules/agent_dispatch.md`; integration here need not involve a Git merge or commit. Update evidence and unblock dependents only after that gate passes.
- On resume or a relevant shared change, compare the ledger's recorded code/configuration/environment/data/source/dependency state with reality. Apply the existing evidence-reuse rule: mark affected or uncertain results `RECHECK_REQUIRED`, retain prior evidence, rerun affected cases and mandatory final gates. Do not reset failure history or repeat unchanged exploration merely because a worker/session changed.
- Report spec conformance (missing, incorrect or unrequested behavior) separately from code-standard findings, using the same recorded diff baseline and verified working state. Review staffing follows the existing risk gate; two report axes do not require two reviewers.
- A verified slice cannot establish feature completion. Use the canonical spec's existing AC/VT and `check-spec.js --complete` gate; retain all API, runtime and applicable visual verification requirements. Never close tickets merely because a ledger row is verified.
