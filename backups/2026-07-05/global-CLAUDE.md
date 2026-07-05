# Global Rules (all projects)

Source of truth: `~/wow/ai-config/` (ops docs, project rules, skills).
Keep this file short — it loads into every session. Details live in the ops files below; read them when the trigger matches, not preemptively.

## Routing — read the file when its trigger fires

| Trigger | Read |
|---|---|
| Task needs bulk reading (>3 files), repo scanning, web research, or batch edits | `~/wow/ai-config/ops/model-dispatch.md` |
| About to delegate to a subagent | `~/wow/ai-config/ops/delegation-templates.md` |
| Unsure whether to escalate model, retry, ask the user, or declare done | `~/wow/ai-config/ops/judgment-rubrics.md` |
| Working in any `~/wow/*` repo and need project facts (stack, commands, gotchas) | `~/wow/ai-config/ops/projects-overview.md` |
| Handing work to / receiving work from Codex (spec, implementation, or review) | `~/wow/ai-config/ops/codex-collaboration.md` |
| A bug survived two fix attempts | `~/wow/ai-config/ops/references/systematic-debugging/SKILL.md` |
| Writing an implementation plan for multi-step work | `~/wow/ai-config/ops/references/writing-plans/SKILL.md` |
| About to edit files under `~/wow/ai-config/` (rules, ops, skills) | `~/wow/ai-config/ops/maintenance.md` |

## Always-on rules (no file read needed)

1. **Delegate bulk work.** If a step means reading many files, scanning a repo, or web research, dispatch a subagent and receive only conclusions + `file:line` references. The main conversation is for decisions, not raw file contents.
2. **Hard-stop actions** — require the user's explicit instruction in the current conversation (a general "go ahead" earlier does not count): deploy/發版, any merge into `develop`/`staging`/`main`, `git push` (except the post-approved-merge push defined in project rules), `git commit`, Jira/ticket writes, editing shared/cross-site code for a single-site request, deleting or overwriting files you did not create this session.
3. **Done means verified.** Before claiming completion, run the check defined by the project rules (smallest relevant validation) and state the actual command + result. If verification was skipped, say so explicitly — never imply it passed.
4. **Precedence**: user's direct instruction > project rules (`CLAUDE.local.md` / `AGENTS.md`) > this file > plugin-injected workflows (e.g. superpowers skill-triggering). Do not let a plugin's "must invoke skill" rule override a direct, simple user request — for trivial tasks, just do the task. Where superpowers IS enabled (non-`~/wow` projects), its "1% chance → must invoke" rule is replaced by these triggers: `brainstorming` only when the user asks to design/build something new from scratch; `systematic-debugging` only when a bug survived two fix attempts; `test-driven-development` only when writing a new feature's code, not for docs/config edits. Otherwise skip the skill and do the task.
5. **Memory**: when you learn a durable fact about the user's environment or get corrected on workflow, save it via the memory mechanism the same turn. Convert relative dates to absolute.
