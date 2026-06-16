# Whitelabel GSI Platform Multiverse NX Rules

Apply these rules to `whitelabel-gsi-platform-multiverse-nx`.

This repo has its own `AGENTS.md` describing structure, scope, and Nx/Nuxt tooling — follow it as the primary repo guide. The notes below are supplementary and intentionally avoid duplicating it.

## Relation To Old Multiverse

- This is the new-generation 會員端 (member side), an Nx rewrite of `Whitelabel_GSI_Platform_Multiverse`.
- The older `Whitelabel_GSI_Platform_Multiverse` is currently the primary repo; treat this NX repo as the in-progress next version unless the user says otherwise.
- Do not carry over old-Multiverse assumptions (the `template/<siteKey>` layout, `yarn deploy` release flow) — they do not apply here.

## Page Migration

- When migrating pages from the old Multiverse member side into this NX repo, reuse the original i18n translation keys. Do not invent, rename, or replace translation keys. If the original page has no matching key for required text, explicitly call it out and ask the user how to handle it.

## Tooling

- Package manager is pnpm (`pnpm-lock.yaml` / `pnpm-workspace.yaml`); use `pnpm` and `nx`, not `yarn` or `npm`.
- Nx monorepo: tenant apps live in `apps/<tenant>`, shared code in `libs/shared/ui-layer`.
- Do not run `tsc --noEmit`.
