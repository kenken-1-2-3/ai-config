# AI Config

Personal AI assistant rules for WOW/GSI workspaces.

## Install

```bash
./install.sh
```

The installer reads `projects.json` and creates:

- `<project>/.codex/personal_rules.md` for Codex
- `<project>/CLAUDE.local.md` for Claude Code
- `<project>/skills/<skill-name>/SKILL.md` for project-local skills configured in `projects.json`

It also adds generated `.codex/`, `CLAUDE.local.md`, and configured local skills to each repo's local `.git/info/exclude`.

## Add A Project

1. Add a rule file under `rules/`.
2. Add the project entry to `projects.json`.
3. Run `./install.sh`.

## Add A Skill

1. Add the skill under `skills/<skill-name>/SKILL.md`.
2. Add the skill name to the target project's `skills` array in `projects.json`.
3. Run `./install.sh`.

## Notes

- Generated `.codex/`, `CLAUDE.local.md`, and configured project-local skill files are local to each machine and are not committed to project repos.
- This repository should be the source of truth for shared personal rules.
