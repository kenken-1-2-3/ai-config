# Dispatch Core (all agents, all harnesses)

Harness-agnostic delegation and retry rules. Claude Code binds these to its specific models/tools in `~/wow/ai-config/ops/model-dispatch.md`; other harnesses (Codex) follow this file directly.

## Keep the main conversation for decisions, not raw content

- If your harness supports subagents/delegation: bulk work (reading many files, repo-wide scans, web research, batch edits) goes to a subagent; only conclusions and `file:line` references come back.
- If it does not: use summarize-and-discard — after bulk reading, write conclusions + `file:line` to a working note, and reason from the note, not from re-reading raw content.

## Every delegated or resumed task carries three things

1. Goal + why (what it's for, so the worker can make sane micro-decisions).
2. Acceptance criteria (objectively checkable).
3. Report format (conclusions + references; long output goes to a file, reply carries the path).

## Retry and escalation

- Hard cap: two retry rounds per approach on the same subtask. After two failures, the approach is presumed wrong — change hypothesis or escalate; do not try a third variation.
- Escalation means handing over WITH the failure trail: attempts made, exact errors, what was ruled out. Never let the next attempt start blind.
- If your harness can pick a stronger model for a subtask (Claude Code), do so per its binding file. If it cannot (Codex: main model is fixed in `~/.codex/config.toml`), escalation is user-mediated — stop, report the trail, and ask the user to raise model/effort or hand the subtask to the other agent per the spec-driven workflow.

## Verification is never self-verification

- The context that produced work must not be the only one that approves it: files → independent read-back against the acceptance criteria verbatim; code → run the project's smallest relevant validation or the app itself.
- Claiming "done" without having run the check is forbidden; state what was NOT verified.
