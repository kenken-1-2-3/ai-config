# AI Config

Personal AI assistant rules for WOW/GSI workspaces.

## Install

```bash
./install.sh
```

The installer reads `projects.json` and creates:

- `<project>/.codex/personal_rules.md` for Codex
- `<project>/CLAUDE.local.md` for Claude Code

It also adds `.codex/` and `CLAUDE.local.md` to each repo's local `.git/info/exclude`.

## Add A Project

1. Add a rule file under `rules/`.
2. Add the project entry to `projects.json`.
3. Run `./install.sh`.

## Notes

- Generated `.codex/` and `CLAUDE.local.md` files are local to each machine and are not committed to project repos.
- This repository should be the source of truth for shared personal rules.
