# Whitelabel GSI Platform Multiverse Rules

Apply these rules to `Whitelabel_GSI_Platform_Multiverse`.

## Local Environment

- Treat `src/env/environment.json` as local-development-only.
- Unless the user explicitly asks, do not inspect, diff, format, review, commit, or include `src/env/environment.json` in summaries.

## Template Scope

- Template-specific work should stay in the requested `template/<siteKey>` folder.
- Edit shared code only when the requirement explicitly asks for shared behavior, says all templates, or the existing implementation proves all affected templates use the shared path.
- If the request does not name the affected template/siteKey, ask before editing.
- If a requirement is for one agent/site/template but the change appears to require `src/common`, shared hooks/components, shared layout, shared config, or any non-template-specific member-side surface, stop and call out that it may affect other agents' sites before editing.
- Prefer isolating one-site behavior in the requested `template/<siteKey>` path or site-specific config. Touch shared member-side code only after the user confirms the cross-site impact is intended.

## Remote I18n

- This repository loads i18n messages remotely at runtime.
- Do not search, edit, or create local locale JSON files.
- Preserve existing `$t(...)` and `t(...)` calls unless the user provides an exact replacement.
- If the user provides a remote i18n key, use it directly.

## Deployment (發版)

- Merging a branch back into `develop` or `staging` does NOT release; it only updates those test environments.
- Releasing ("發版") is a separate step run with `yarn deploy` (single template) or `yarn deploy:all` (all templates). When the user says 發版/release, run one of these — nothing is released until then.
- `yarn deploy` prompts:
  1. Select template (版型): the user will name which template; select that one. If the user did not name it, ask before deploying.
  2. Version number (版號): accept the default (just confirm).
  3. Final confirmation: answer `y`.
- `yarn deploy:all`: same prompts as `yarn deploy` except it does not ask for a template (deploys all); version number uses the default and final confirmation is `y`.
- Deployment is outward-facing; only run it when the user explicitly asks to 發版/release.

## Verification

- Use the smallest relevant validation for touched files.
- Do not run `tsc --noEmit`.
- Prefer `git --no-pager diff --check` plus targeted checks that are already available in the project.
