# Whitelabel GSI Dashboard Rules

Apply these rules to `Whitelabel_GSI_Dashboard`.

## Local Environment

- Treat `src/assets/env/environment.json` as local-development-only.
- Unless the user explicitly asks, do not inspect, diff, format, review, commit, or include `src/assets/env/environment.json` in summaries.

## Admin UI Scope

- Only change the requested admin page, route, component, or API surface.
- Do not make unrelated table, filter, layout, modal, or interaction changes.
- If the same behavior appears on many pages, update only the pages named by the user unless they explicitly ask for all affected pages.

## Verification

- Use the smallest relevant validation for touched files.
- Do not fix lint-only issues unless they block running/building or the user asks for lint cleanup.
