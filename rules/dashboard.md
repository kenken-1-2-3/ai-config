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

## Verification

- Use the smallest relevant validation for touched files.
- Do not fix lint-only issues unless they block running/building or the user asks for lint cleanup.
