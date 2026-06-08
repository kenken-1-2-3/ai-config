# Whitelabel GSI Platform Multiverse Rules

Apply these rules to `Whitelabel_GSI_Platform_Multiverse`.

## Local Environment

- Treat `src/env/environment.json` as local-development-only.
- Unless the user explicitly asks, do not inspect, diff, format, review, commit, or include `src/env/environment.json` in summaries.

## Template Scope

- Template-specific work should stay in the requested `template/<siteKey>` folder.
- Edit shared code only when the requirement explicitly asks for shared behavior, says all templates, or the existing implementation proves all affected templates use the shared path.
- If the request does not name the affected template/siteKey, ask before editing.

## Remote I18n

- This repository loads i18n messages remotely at runtime.
- Do not search, edit, or create local locale JSON files.
- Preserve existing `$t(...)` and `t(...)` calls unless the user provides an exact replacement.
- If the user provides a remote i18n key, use it directly.

## Verification

- Use the smallest relevant validation for touched files.
- Do not run `tsc --noEmit`.
- Prefer `git --no-pager diff --check` plus targeted checks that are already available in the project.
