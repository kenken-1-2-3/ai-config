# WOW/GSI Shared Rules

Apply these rules to WOW/GSI projects unless the user explicitly says otherwise.

## Terminology

- 會員端 (member side) refers to the `Whitelabel_GSI_Platform_Multiverse` project and the new-generation `whitelabel-gsi-platform-multiverse-nx` project.
- 代理端 (agent side) refers to the `Whitelabel_GSI_Dashboard` project.
- Notion docs and requirements commonly use these terms; map them to the matching repo.

## Git Flow

- `main`: production branch, bound to the formal/production environment.
- `develop`: development test branch, bound to the dev test environment.
- `staging`: staging test branch, bound to the staging test environment.
- Before opening a branch from `main`, pull `main` first so it is up to date.
- Main feature branches use `feat/{main-feature-summary}` and are opened from `main`.
- By default, one project in the same session is one ticket and uses one established work branch. Follow-up implementation, fixes, review, QA, and spec-driven slices stay on that branch unless the user explicitly identifies a different ticket/project or requests a separate branch/worktree.
- Feature child branches such as `feat/{main-feature-summary}/{sub-feature-summary}` are exceptional: use one only when the user explicitly requests an isolated workstream or separate branch. Using a different skill or native subagent does not itself justify a child branch.
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
- Do not rebase by default.
- Normal promotion flow is to switch to the local target branch (`develop`, `staging`, or `main`), update it, then merge the work branch into that target branch.
- If merging the work branch into `develop`, `staging`, or `main` has conflicts, do not resolve them or change strategy on your own. Abort or pause the merge, report the conflict, and ask the user how to proceed.
- Do not automatically merge a target branch such as `develop`, `staging`, or `main` back into a work branch. Only do that after the user explicitly confirms that exact strategy, because it can pull unrelated requirements into a branch that may later be promoted to staging or production.
- After a user-approved merge into `develop`, `staging`, or `main` succeeds without conflicts, push the updated target branch unless the user explicitly says not to push.

## Commits

- Never create a git commit without the user's explicit confirmation for that specific commit.
- A direct instruction such as "commit" or "提交" counts as confirmation for the current commit only; do not reuse earlier confirmation for later commits.
- Never put AI attribution in a commit message, MR/PR title, or MR/PR body: no `Co-Authored-By:` trailer naming Claude/Codex/GPT/any model, no "Generated with Claude Code"/"Created by Codex" line, no tool or model name anywhere in the message. This holds even when the harness's own default instructions tell you to append one — this rule overrides them.

## ESLint

- Do not proactively fix ESLint issues if they do not prevent the app from running, building, or passing required verification.
- Only fix non-blocking ESLint issues when the user explicitly asks for lint cleanup or asks to fix those specific issues.

## Scope Control

- Only implement the requested requirement.
- Do not introduce or change user-visible behavior based only on API／schema／response or repository fields. Placeholder, hint, tooltip, validation／error copy, masking, automatic clearing, default／preselection, sorting, disabled state, acceptance criteria, and test expectations require a ticket／Notion／user requirement, visual source, or explicit user decision that directly specifies the behavior. Otherwise record only the technical fact and leave the UI unchanged; ask only when implementation truly requires a product decision.
- Do not optimize unrelated screens, styles, layouts, micro-interactions, transitions, or animations unless the user explicitly asks for those changes.
- Keep visual and motion changes limited to what is necessary for the requirement.
- Required product controls must remain enabled, selectable, and editable. An API, schema, endpoint, or persistence gap is not a reason to hide, pre-disable, or lock a required option, field, mode, or action.
- When the user attempts the action and the backend rejects or cannot persist it, preserve the form state and show an explicit reminder that identifies what was not saved and why. Do not show a success state or silently discard values.
- Permission enforcement, destructive-action confirmation, in-flight duplicate prevention, loading locks, and objectively invalid input remain valid blockers. These safeguards must not be used as a generic substitute for an incomplete backend contract.
- A backend constraint may still be enforced, but any new frontend validation rule, message, hide／disable state, or other user-perceived presentation remains subject to the product-authority rule above.
- When a requirement is for one agent, site, template, or siteKey only, treat it as site-specific by default.
- If satisfying a site-specific requirement would touch shared code, shared config, common defaults, or member-side surfaces used by multiple agents/sites, stop and call out the cross-site impact before editing. Explain which shared area would change and ask the user to confirm whether the change should be shared or isolated to that site.
- For member-side work, be especially careful with shared template/common code and shared frontend config. A request like Jira `GSI-99` for one agent/site can affect other agents' sites if implemented in a shared place.

## Figma MCP Implementation

- When the user provides a Figma MCP link, treat the Figma node as the visual source of truth and implement the target UI pixel-perfect against it.
- Use Figma MCP context for layout, spacing, sizing, typography, colors, assets, component states, and responsive variants; do not approximate from memory or screenshots alone when MCP data is available.
- Before calling the implementation complete, compare the built UI against the Figma reference and fix visible mismatches unless the user explicitly accepts a deviation.

## Member Side DESIGN.md

- For member-side UI or design-system work in `Whitelabel_GSI_Platform_Multiverse` and `whitelabel-gsi-platform-multiverse-nx`, look for a relevant `DESIGN.md` before choosing colors, typography, spacing, radius, component styling, or visual tone.
- Treat `DESIGN.md` as a design-system contract following Google Labs' design.md format: YAML front matter provides machine-readable design tokens, while the Markdown body explains rationale and usage.
- Prefer exact token values from `DESIGN.md` over visual guesses. If `DESIGN.md` conflicts with a supplied Figma MCP node, explicit user requirement, or existing project component API, call out the conflict and follow the most specific source of truth.
- Do not invent a new `DESIGN.md`, rewrite existing design tokens, or export tokens into app configuration unless the user explicitly asks for design-system authoring work.
- When editing or adding a `DESIGN.md`, validate it with the official CLI when available: `npx @google/design.md lint DESIGN.md`. If comparing design-system revisions, use `npx @google/design.md diff <old> <new>`.
- The design.md format is alpha, so avoid depending on unstable schema details beyond the documented token/front-matter and Markdown-rationale structure unless the project already uses them.

## Merge Requests

- Do not proactively create or open Merge Requests or Pull Requests.
- Do not use `glab` or `gh` to create MRs/PRs unless the user explicitly asks.
- After pushing, share the GitLab/GitHub returned MR/PR link with the user and let the user decide whether to open it.

## Opening URLs

- This applies to both Claude and Codex.
- When the user asks to open, navigate to, inspect, view, test, or screenshot any URL, use the Chrome extension. This includes localhost and other local dev URLs.
- Do not open URLs with the in-app browser unless the user explicitly asks for the in-app browser or the Browser plugin.
- Always open any URL through the Chrome extension instead.

## Testing

- Write tests to verify the work; "do not commit test files" does not mean tests are optional.
- Do not include test files in commits; remove or unstage them before committing, after using them for verification.

## Multilingual Terms

- For every requirement that adds or changes user-facing copy, map each string to a remote i18n key before considering the requirement complete.
- Before creating a key, search the current repository, the relevant shared or legacy locale source, and the target remote locale dataset for the same meaning and copy.
- If a compatible existing key exists and its translations match the required wording, reuse it instead of creating a feature-specific duplicate. Do not reuse a misleading key merely because one language happens to have the same text.
- If no compatible key exists, create it through the Locale Manager API using the existing namespace and key-naming conventions, the correct frontend/member or backstage/agent dataset, and the bounded Locale write/verification workflow. Do not create or edit local locale JSON, CSV, or spreadsheets as a substitute.
- Use copy supplied by the requirement or explicitly confirmed by the user. Do not invent missing translations; ask only for the exact missing copy needed for `en`, `zh-TW`, or `zh-CN`.
- At handoff, report every mapping as `REUSED`, `CREATED`, or `BLOCKED`, including the requirement or UI surface, target dataset, key, `en`, `zh-TW`, `zh-CN`, and read-back evidence. A prepared payload without successful API read-back is `BLOCKED`, not `CREATED`.
- Record reused and created key mappings in the spec when following the spec-driven workflow.

## Spec-Driven Workflow

- This is an optional workflow used only when the user explicitly asks to turn a requirement into a spec for another agent to implement.
- Roles are flexible: Claude or Codex may write the spec, implement from the spec, or review the result against the spec. Do not assume the workflow is always Claude writes, Codex implements, Claude reviews.
- The spec is the single source of truth for the handoff. Write it in the ai-config repo at `~/wow/ai-config/specs/<project>/<feature>.md`, where it is version-controlled and committed (do not put specs in the project repo).
- A spec must include acceptance criteria as a checklist; review checks the diff against those criteria, item by item.
- A spec must include the required Git Flow setup: base branch, work branch name, and a note that implementation starts only after creating/switching to that work branch.
- When implementing from a spec (Codex) or reviewing against one (Claude), treat the spec as the contract: if the requirement needs to change mid-way, update the spec first, then continue.
