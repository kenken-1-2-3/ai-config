# Whitelabel Frontend Config Rules

Apply these rules to `whitelabel-frontend-config`.

## Scope

- Treat this repository as configuration-only unless the user asks otherwise.
- Avoid unrelated formatting or key reordering.
- Preserve existing naming and grouping conventions.
- When a request is for one agent/site/siteKey, change only that site's config entry unless the user explicitly asks for a shared/default change.
- If the needed change touches shared defaults, grouped config used by multiple sites, or a common config path that could affect other agents' sites, stop and call out the cross-site impact before editing.

## Verification

- Prefer reviewing exact diffs and affected config entries.
- Do not make broad cleanup changes.
