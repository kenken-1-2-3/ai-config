# Whitelabel GSI Dashboard Rules

Apply these rules to `Whitelabel_GSI_Dashboard`.

## Local Environment

- Treat `src/assets/env/environment.json` as local-development-only.
- Unless the user explicitly asks, do not inspect, diff, format, review, commit, or include `src/assets/env/environment.json` in summaries.

## Git Authentication

- This repo uses HTTPS + Personal Access Token authentication for Git.
- Keep `origin` on `https://gltw.6633663.com/web_frontend/Whitelabel_GSI_Dashboard`; do not switch to SSH unless the user explicitly asks.
- Never embed a username, password, or token in the Git remote URL, command output, docs, or committed config.
- Use macOS Keychain via `credential.helper=osxkeychain`, and keep credentials path-scoped with `git config --local credential.https://gltw.6633663.com.useHttpPath true`.
- Before `git pull` or `git fetch`, prefer a non-interactive auth probe: `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD`.
- If HTTPS auth fails, stop and report that the token or Keychain credential needs refresh. Do not automatically try SSH fallback, and do not treat a cached `origin/main` as proof that the remote was freshly reachable.

## Admin UI Scope

- Only change the requested admin page, route, component, or API surface.
- Do not make unrelated table, filter, layout, modal, or interaction changes.
- If the same behavior appears on many pages, update only the pages named by the user unless they explicitly ask for all affected pages.

## Shared Components and UI Consistency

- Before implementing or changing 代理端 UI, inspect the current shared components and at least one comparable existing page; record the component and reference-page paths in the implementation notes or handoff. Reuse compatible shared components and their supported props/slots instead of duplicating them, bypassing project wrappers with raw UI-library controls, or restyling a local copy.
- Match the reference page's applicable layout, spacing, typography, field/control sizing, table/filter/action placement and interaction patterns. Reuse the project's existing tokens/styles; do not invent a separate visual language. This authorizes presentation consistency, not copying unrelated fields, actions, defaults or validation behavior into the requirement.
- If no shared component covers a required capability, use existing project primitives/patterns for the smallest scoped addition; do not remove the requirement or redesign shared components to force reuse. Broader shared changes retain the existing scope-authorization gate. Deviate from established styling only when the requirement, authoritative design or explicit user decision specifies the difference; resolve material source conflicts rather than silently choosing one.
- Before reporting UI work complete, compare the rendered target with the reference page in comparable viewport/state conditions and verify both shared-component reuse and visual/interaction consistency. Report reused component paths, comparison evidence and any authorized deviations; build/test success alone does not establish UI consistency. Keep any applicable Figma and functional/API acceptance gates.

- (2026-11-03) 代理端 UI requirements → apply the shared-component and consistency checks above. Why: new pages must fit the existing backoffice. Evidence: user「代理端的需求都要用目前共用元件 不能跟其他頁面風格差太多」and reports the preceding requirement missed this; that specific page has not been independently inspected here.

## Verification

- Use the smallest relevant validation for touched files.
- Do not fix lint-only issues unless they block running/building or the user asks for lint cleanup.
