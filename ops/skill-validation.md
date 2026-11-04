# Validate changes to skills and workflow rules

This is ai-config's verification recipe, owned by `ops/maintenance.md` §5. Use it when workflow behavior, routing or acceptance changes, and when auditing this recipe after its covered sources change. Keep the existing project checks and independent-review gate. Do not launch model evaluations on ordinary typo edits or install a new test framework.

## Coverage and prerequisites

| Journey | Sources to compare with the last verified run | Observable check | Limits |
| --- | --- | --- | --- |
| Structural routing | `rules/`, managed skill entry points, `projects.json`, `scripts/check-skill-routing.js` | Existing routing checker and its negative controls | Text/registration integrity, not agent behavior |
| Shared 代理端 UI | `rules/dashboard.md`, `rules/global/core.md`, `scripts/skill-behavior.js` and its fixtures | Candidate page uses the actual fixture's shared components and preserves the locked reference | Synthetic component composition; no real Dashboard, rendered Figma or browser acceptance |
| Missing API contract | `skills/spec-driven-workflow/`, `rules/global/core.md`, `scripts/check-spec.js`, behavior fixtures | Candidate spec passes structural validation while the real readiness checker rejects the unresolved required API contract | Source fidelity, user notification and completeness also need independent artifact/transcript review |
| Installed entry points | `install.sh`, `projects.json`, changed rules/skills | Full installer, then source/installed-content or link comparison | A successful installer alone does not prove behavior |

Use the existing Node runtime and built-in test runner. No application server, credentials, remote writes or new packages are needed for the fixture cases. Treat missing commands, missing fixture inputs, child failures and timeouts as failures or unverified evidence, never as expected success. Inspect the actual CLI help and fixture task before handing it to a worker.

## Run a natural task

1. Select only the cases that exercise the changed behavior, plus relevant non-trigger cases (for example a prompt-only request must not turn into implementation). Freeze the source snapshots, case inputs and rubric before running. If no existing case covers the risk, add one focused case rather than treating an unrelated passing case as coverage.
2. Prepare a fresh candidate directory and a separate state file outside it with `node scripts/skill-behavior.js prepare <case> <new-absolute-candidate-directory> <new-absolute-state-file>`. Supported cases are `shared-ui` and `api-contract`. Never point it at a working application checkout. Preparation refuses existing destinations; keep the grader, state and rubric outside the candidate's write scope.
3. Give an eligible native worker only the generated natural task, candidate path, applicable source rules/skill paths, and its write/resource boundaries. No answer key, desired verdict, competitor identity or corrective hints. Keep setup restrictions explicit. Agent staffing/model bindings remain governed by `rules/agent_dispatch.md`; do not invent an external-model fallback. If an independent run is unavailable, record `NOT_RUN` rather than treating an author's hand-written solution as agent evidence.
4. Retain the actual task text, worker identity/model/effort, source snapshot, tool/action record and final artifacts. Run `node scripts/skill-behavior.js check <state-file> --allow-isolated-code-execution` only for the authorized task-owned fixture. The flag acknowledges executing candidate code; the subprocess is bounded but is not a security sandbox. Do not use this checker to run untrusted downloaded code.
5. Judge the machine result and semantic evidence separately. An independent reviewer checks the actual diff, primary requirements and relevant action record, including unauthorized scope changes and unsupported completion claims. `MACHINE_PASS` means only the implemented mechanical checks passed; overall acceptance stays `UNVERIFIED` until this review is complete. Missing action evidence cannot prove a notification happened. A blocked product integration can be the correct evaluated behavior; it is never product completion.
6. For an old/new comparison, hold the model, effort, task, environment and budget constant while changing the rule variant. Use separate fresh directories and anonymized outputs for review. Compare actual outputs/actions, not whether the agent says it followed the rule. One successful run is a smoke result, not evidence of a reliable improvement. Record unsuccessful and incomplete trials; never use average scores to override a critical failure. Evaluate model choices separately from rule changes.

## Maintain and prove the checks

Use `ops/change-workflow.md`'s recipe-maintenance classification. The coverage table above owns the map; do not create another feature inventory. A renamed/moved source or new shared dependency still belongs to the affected journey. Keep its source revision plus dirty-input identity, environment, command, result and evidence pointer in the task's verification record, outside disposable `/tmp` storage. A timestamp or commit alone does not prove the recipe is still valid.

For each new mechanical guard, retain a correct control and a small broken variant representing the evidenced failure. Run the same checker on both: correct behavior passes and the intended mistake fails for the relevant reason. A missing dependency or crash does not prove detection. Keep guards scoped to observable contracts; do not globally ban valid patterns or delete existing safeguards merely to reduce instruction text. This fixture suite guards the evaluation mechanism, not every production application.

- (2026-11-04) Checking the fixture's save action → enforce no render-time save, one call per press and exact callback-result forwarding in the runtime grader. Why: a constant callback result hid eager saves and no-op actions. Evidence: `scripts/skill-behavior.test.js` reproduced three false accepts before the fix; all 27 focused tests passed after it. Preserve these negative controls when maintaining this journey.

Commands from the ai-config checkout:

```sh
node scripts/check-skill-routing.js
node --test scripts/check-skill-routing.test.js scripts/check-spec.test.js scripts/skill-behavior.test.js
git diff --check
./install.sh
```

Run checks affected by the edit and all mandatory project checks; use the full installer when maintenance requires it. Retain test output and the installer log. Confirm changed installed copies or global skill links against their source. Clean up only task-created fixture resources after saving evidence; do not delete evidence needed to reproduce the result.

## Result record

Report each case's source/candidate identity, exact prompt and command, actual binding, mechanical result, independent review result, artifact/action evidence paths and remaining limits. A blocked case does not inherit another case's pass. Keep real-app UI/API/persistence acceptance separate. Changes to unrelated working files, index or Git refs are not part of this recipe.

Initial cases are representative of the user's shared-UI and API-contract corrections. They are not reconstructions of the original production incidents. Rework reduction and general model reliability remain `PENDING_OBSERVATION` until comparable subsequent trials exist.
