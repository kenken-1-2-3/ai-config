# WOW Projects Overview

Surveyed 2026-07-03 (fresh-context agents read each repo directly; git state is a
snapshot from that date — re-check branches before relying on them).
Terminology: 會員端 = member side (Multiverse repos), 代理端 = agent side (Dashboard).

## Whitelabel_GSI_Platform_Multiverse — 會員端 (current primary)

- **Purpose**: member-side multi-tenant cash gaming platform; Quasar 2 / Vue 3 SPA, one template folder per branded site.
- **Stack**: Quasar 2, Vue 3 Composition API, TS 4.5, Pinia, vue-i18n; **pnpm** (yarn.lock/package-lock.json also exist but pnpm is documented default); Node `.nvmrc` = 22.
- **Layout**: `template/<siteKey>/` = per-site pages/routes/assets (**28 site folders**); `src/common/` = shared cross-tenant code (high-risk area, see rules/multiverse.md); `src/boot|router|stores|api/`; `src-cordova/` native shell; `tool/` build/deploy/i18n scripts; `docs/specs/`.
- **Commands**: `dev`, `dev:ios`, `dev:android`, `build:i18n`, `build:onlyCode`, `deploy`, `deploy:all`, `deploy:specific`. No `build`/`lint`/`test` script declared. Deploy is invoked as `yarn deploy` by convention (per rules/multiverse.md) even though pnpm is the install default — do not "fix" this to pnpm.
- **Gotchas**: never run `tsc --noEmit`; i18n is remote at runtime (no local locale JSON); `src/env/environment.json` is local-dev-only, don't touch; `yarn deploy` = 發版 (release), only on explicit user request.
- **Docs**: AGENTS.md, CLAUDE.local.md, README.md, docs/specs/.

## whitelabel-gsi-platform-multiverse-nx — 會員端 (next-gen rewrite)

- **Purpose**: Nx monorepo rewrite of the above; Nuxt 3 SPA per tenant + shared UI layer.
- **Stack**: Nx 18, Nuxt 3, TS 5.3, PrimeVue, Pinia, TanStack Vue Query; **pnpm**.
- **Layout**: `apps/<tenant>/` (currently `r001`, `r017`); `libs/shared/ui-layer/` = shared components/composables/stores/i18n/SCSS; `android/` Capacitor shell; `scripts/` (e.g. r017 theme generation).
- **Commands**: `dev:r017` / `build:r017` at root; otherwise `nx serve <app>`, `nx build <app>`, `nx run-many -t <target>`.
- **Gotchas**: no `tsc --noEmit`; full reference structure lives on branch `test/init-project-sturcture-1769408493481-localdummy` per AGENTS.md; `nx.json` `affected.defaultBase` says `master` but default branch is `main` (mismatch affects `nx affected`); reuse old-Multiverse i18n keys when migrating pages, never invent keys.
- **Docs**: AGENTS.md, CLAUDE.local.md, README.md, SKILL.md.

## Whitelabel_GSI_Dashboard — 代理端 (admin backoffice)

- **Purpose**: agent-side admin dashboard; Quasar 2 (`@quasar/app-vite`) + Vue 3 + TS.
- **Stack**: Node 22 pinned; **three lockfiles coexist (npm/yarn/pnpm) — verify which one CI uses before installing**.
- **Layout**: `src/pages`, `src/components`, `src/router/routes.ts` (route `meta.permission` access control), `src/stores`, `src/hook` (older) vs `src/composables` (newer), `src/api/*` with `request.type.ts`/`response.type.ts`, `src/utils/constants`, `src/boot`.
- **Commands**: `dev`, `dev:mock`, `build:testing`, `build:prod`, `lint`, `ts-check`, `format`. `test` is a no-op placeholder.
- **Gotchas**: i18n remote (never touch `locales/*.json`); no `tsc --noEmit` per AGENTS.md; repo-local skills exist in `skills/` (dashboard-api-integration, dashboard-new-page, dashboard-permission-wiring, dashboard-table-filter-page) — use them for those task shapes.
- **Docs**: AGENTS.md, CLAUDE.local.md, README.md, 利息宝页面创建说明.md.

## whitelabel-frontend-config — runtime config data

- **Purpose**: pure JSON config repo; per-environment, per-site `environment.json` consumed by the apps at runtime. No build tooling.
- **Layout**: `develop/devm/`, `staging/<SITS_ID>/`, `production/<SITS_ID>/`, each with product subfolders (`whitelabel_gsi_dashboard`, `_agent`, `_general_agent`, `whitelabel_gsi_platform_multiverse/<AGENT_ID>`). Leaf = one `environment.json` (`mode`, `baseApi`, `staticResourceUrl`, `apiPath`, `version`…).
- **Scale**: production 60 SITS entries, staging 114, develop 1.
- **Gotchas**: SITS codes (`24BM`, `R030`…) are opaque — cross-reference README or ask; one-site changes must never leak into shared entries; check current branch first (often a feature branch, not `main`).
- **Docs**: CLAUDE.local.md, README.md.

## static-resources — asset library

- **Purpose**: environment-segmented static assets (images/webp) for member side. No code, no package.json — never run npm/pnpm here.
- **Layout**: `statics/staging/images/`, `statics/production/images/`, tab icons under `images/tabs/webp/{dark,light,special}/` (`special` = set_r022/set_r023; default theme = dark; old flat PNG paths are stale).
- **Gotchas**: root `public/` is gitignored customer uploads — not tracked, don't commit into it.
- **Docs**: CLAUDE.local.md, README.md.

## whitelabel-gsi-locale-manager — i18n source of truth

- **Purpose**: Vue 3 + Vite + PrimeVue admin tool managing cross-project locale data, synced with Google Sheets (Apps Script) and exported via scripts.
- **Stack**: pnpm@9, Node >=22.
- **Layout**: standard Vue app + `scripts/export-json.ts`, `gas/Code.gs` (Apps Script backend), `input/locales/{json,ts}` (generated artifacts, currently empty).
- **Commands**: `dev`, `build` (`vue-tsc -b && vite build`), `lint`, `export:json:backstage`, `export:json:frontend`.
- **Gotchas**: locale data lives in Google Sheets/API, not the repo; always dedupe against existing zh-TW/zh-CN values before creating keys (see rules/locale_manager.md); `.env` holds live tokens (Jenkins, Sheets) — sensitive, never commit or print.
- **Docs**: CLAUDE.local.md, README.md.

## ai-config — this repo (rules source of truth)

- **Purpose**: personal AI rules/skills/specs; `install.sh` reads `projects.json` and generates `CLAUDE.local.md` + `AGENTS.override.md` + project-local skills into each repo (git-excluded there).
- **Key fact**: editing a rule here does nothing until `./install.sh` runs (a post-merge hook runs it after `git pull`). Rule edits should be committed here — this repo is the sync point across machines.
- **Layout**: `rules/` (assembled into per-project rule files), `skills/`, `specs/<project>/`, `data/site-environments/` (cached per-site environment.json), `ops/` (session operating system: dispatch, rubrics, templates — added 2026-07-03).
- (2026-07-05) Need a wow repo's on-disk path → read `projects.json`, don't guess separators (Dashboard is `Whitelabel_GSI_Dashboard`, underscores). Why: a guessed hyphenated path made an installed `settings.local.json` look missing. Evidence: false "missing" finding in the 2026-07-05 audit session, corrected same session.
