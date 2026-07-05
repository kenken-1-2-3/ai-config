# ai-config — rules source of truth

This repo generates each `~/wow/*` project's `CLAUDE.local.md` / `AGENTS.override.md` via `install.sh` + `projects.json`. Editing `rules/*.md` has NO effect on other repos until `./install.sh` is run.

## Working in this repo

- Before editing anything under `rules/`, `ops/`, `skills/`, or `projects.json`, read [ops/maintenance.md](ops/maintenance.md) and follow its edit protocol (backup, then edit, then re-run `./install.sh` when `rules/` or `skills/` changed).
- `ops/` is the session operating system: [diagnosis](ops/diagnosis.md), [model dispatch](ops/model-dispatch.md), [judgment rubrics](ops/judgment-rubrics.md), [delegation templates](ops/delegation-templates.md), [projects overview](ops/projects-overview.md), [codex collaboration](ops/codex-collaboration.md), [letter to future sessions](ops/letter-to-future-sessions.md).
- `specs/<project>/<feature>.md` — handoff specs (see Spec-Driven Workflow section in `rules/wow_gsi.md`). Specs are committed here, never in the project repos.
- `data/site-environments/` — cached per-site environment.json; `data/translations/` — translation working data.
- `backups/<date>/` — pre-edit snapshots of rules/config. Never delete; not a place to restore from silently — ask the user first.

## Conventions

- Rules are written in English, terse, imperative, one behavior per bullet. Domain terms stay in Chinese (會員端, 代理端, 發版).
- A rule must state a concrete trigger and a concrete action. "Be careful with X" is not a rule; "Before editing X, do Y / stop and ask" is.
- Commit rule changes in this repo (with user confirmation, per `rules/wow_gsi.md` commit policy) — uncommitted rule edits silently diverge across machines.
