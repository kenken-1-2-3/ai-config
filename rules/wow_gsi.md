# WOW/GSI Shared Rules

Apply these rules to WOW/GSI projects unless the user explicitly says otherwise.

## Terminology

- 會員端 (member side) refers to the `Whitelabel_GSI_Platform_Multiverse` project.
- 代理端 (agent side) refers to the `Whitelabel_GSI_Dashboard` project.
- Notion docs and requirements commonly use these terms; map them to the matching repo.

## Git Flow

- `main`: production branch, bound to the formal/production environment.
- `develop`: development test branch, bound to the dev test environment.
- `staging`: staging test branch, bound to the staging test environment.
- Before opening a branch from `main`, pull `main` first so it is up to date.
- Main feature branches use `feat/{main-feature-summary}` and are opened from `main`.
- Feature child branches use `feat/{main-feature-summary}/{sub-feature-summary}` when multiple people work under one parent feature; merge them back into the parent feature branch and remove the child branch when complete.
- Bug fix branches use `fix/{bug-summary}`.
- For production bugs, open the fix branch from `main`; for in-progress feature bugs, open from the active feature branch and merge back to that parent feature branch.
- Optimization branches use `perf/{optimization-summary}`.
- Refactor branches use `refactor/{refactor-summary}`.
- Other work uses `chore/{other-work-summary}`.
- Promote the same work branch through the environments in order: open it from `main`, then merge it into `develop`, then `staging`, then `main`.
  1. After development, merge the work branch into `develop` and verify through the dev test environment.
  2. Once dev testing passes, merge the work branch into `staging` and verify through the staging test environment.
  3. Once staging testing passes, merge the work branch into `main` to release to production.
- Do not skip a stage; each merge happens only after the previous environment's testing passes.
- Never merge into any branch on your own. Always confirm with the user before performing any merge.
- Create the production MR to `main` only when the staging-tested change needs to go online.
- Do not rebase by default. If a merge into `develop`, `staging`, or `main` has conflicts, merge the target branch into the work branch, resolve conflicts there, then redo the merge or update the MR.

## ESLint

- Do not proactively fix ESLint issues if they do not prevent the app from running, building, or passing required verification.
- Only fix non-blocking ESLint issues when the user explicitly asks for lint cleanup or asks to fix those specific issues.

## Scope Control

- Only implement the requested requirement.
- Do not optimize unrelated screens, styles, layouts, micro-interactions, transitions, or animations unless the user explicitly asks for those changes.
- Keep visual and motion changes limited to what is necessary for the requirement.

## Merge Requests

- Do not proactively create or open Merge Requests or Pull Requests.
- Do not use `glab` or `gh` to create MRs/PRs unless the user explicitly asks.
- After pushing, share the GitLab/GitHub returned MR/PR link with the user and let the user decide whether to open it.

## Opening URLs

- Do not open URLs with the in-app browser.
- Always open URLs through the Chrome extension instead.

## Testing

- Write tests to verify the work.
- Do not include test files in commits; remove them before committing.

## Multilingual Terms

- When implementing or writing a spec, if you hit a multilingual (i18n) term that needs confirmation — wording or translation for a UI string across languages — ask the user before deciding.
- Do not guess or invent translations or copy. Confirm the exact term first.

## Spec-Driven Workflow

- This is an optional workflow used only when the user explicitly asks to turn a requirement into a spec for Codex to implement.
- Roles: Claude reads the requirement and writes a spec, Codex implements from the spec, Claude reviews the result against the spec.
- The spec is the single source of truth for the handoff. Write it in the ai-config repo at `~/wow/ai-config/specs/<project>/<feature>.md`, where it is version-controlled and committed (do not put specs in the project repo).
- A spec must include acceptance criteria as a checklist; review checks the diff against those criteria, item by item.
- When implementing from a spec (Codex) or reviewing against one (Claude), treat the spec as the contract: if the requirement needs to change mid-way, update the spec first, then continue.
