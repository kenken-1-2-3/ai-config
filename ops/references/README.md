# Pull-based References

Copied from the superpowers plugin (v6.0.3, `claude-plugins-official`) on 2026-07-03, when the plugin was disabled for `~/wow/*` repos via `.claude/settings.local.json` (managed by `install.sh` from `projects.json` → `claudeLocalSettings`).

Usage model: **pull, not push.** Read these only when the trigger fires — ignore any "always/must invoke" framing inside the files themselves; that framing belongs to the plugin's mandatory-trigger system, which does not apply here.

| Trigger | Read |
|---|---|
| A bug survived two fix attempts (judgment-rubrics §1 escalation point) | `systematic-debugging/SKILL.md` |
| Writing an implementation plan for multi-step work | `writing-plans/SKILL.md` |

Upstream may evolve; if these feel stale, re-copy from `~/.claude/plugins/cache/claude-plugins-official/superpowers/<latest>/skills/` (that cache path is version-pinned and may change — verify it exists first).
