# Model Dispatch Rules

For the main-session model ("the commander"). Goal: the main conversation holds decisions and conclusions, not raw file contents. Written 2026-07-03; tool facts verified against the live harness on that date — if a tool/param named here errors as unknown, trust the error and update this file per ops/maintenance.md.

## 1. The commander does not do bulk work

Delegate to a subagent (Agent tool) instead of doing it yourself when the step is any of:

- Reading **more than 3 files** (read threshold; the batch-edit threshold below is a separate number) or any file you only need a summary of.
- Repo-wide exploration: "find where X happens", naming-convention sweeps, dependency tracing → `Explore` agent.
- Web research of more than one page → `general-purpose` agent (it returns conclusions; raw pages never enter your context).
- Batch edits following a known pattern across **more than 5 files** → implementation agent with the pattern spelled out.
- Anything whose raw output you'd immediately compress (long logs, big diffs, survey reports).

Do it yourself when: single known file, single targeted grep, an edit you can specify exactly, or anything where explaining the task costs more than doing it.

## 2. What actually exists in this harness (do not invent)

- Agent types (harness-injected and may change — trust the live agent list in your system prompt over this line): `Explore` (read-only search, returns conclusions), `Plan` (architecture/implementation planning, read-only), `general-purpose` (full tools, multi-step), `claude` (catch-all, full tools), `claude-code-guide` (questions about Claude Code/API itself).
- `model` parameter on the Agent tool: `haiku`, `sonnet`, `opus`. (`fable` appears only in special sessions — never depend on it.) If omitted, the subagent inherits the agent definition's model or the parent's.
- There is **no `effort` parameter** on the Agent tool. Depth levers that do exist: (a) choose a bigger model; (b) tell `Explore` the search breadth in the prompt ("medium" / "very thorough"); (c) write more constrained prompts; (d) `run_in_background: true` for parallel work.
- Verify current model IDs/pricing via the `claude-api` skill or `claude-code-guide` agent — never from memory.

## 3. Default model per task shape

| Task shape | Model | Notes |
|---|---|---|
| Mechanical: apply a fully-specified pattern, rename, format, collect file lists | `haiku` | Spell out the exact pattern + one worked example in the prompt |
| Standard: search/survey, implement a scoped feature, write tests, summarize docs | `sonnet` | Default. Most work lands here |
| Hard: cross-cutting refactor design, debugging with unclear cause, review of risky changes, anything that failed once at sonnet | `opus` | Also for second opinions |

## 4. Every dispatch carries three things (no exceptions)

1. **Goal + why**: what to produce and what it will be used for (the "why" lets the agent make sane micro-decisions).
2. **Acceptance criteria**: checkable conditions — "report includes X per repo", "tests T pass", "no file outside dir D modified".
3. **Report format**: exact structure of the reply. Long artifacts go to a file; the reply carries the path + a ≤10-line summary.

Ready-made prompts: `~/wow/ai-config/ops/delegation-templates.md`. Use them; don't improvise from scratch.

## 5. Report contract (what comes back into the main conversation)

- Conclusions and decisions only, with `file:line` references — never pasted file bodies.
- Anything longer than ~30 lines is written to a file (repo docs, or the session scratchpad for throwaways); the reply contains the path.
- The agent states what it did NOT verify. A report with no "unverified" section is treated as suspicious, not as clean.

## 6. Escalation / de-escalation ladder

- `haiku` produces a wrong or off-spec result **once** → redo at `sonnet` immediately. Do not debug haiku's attempt.
- `sonnet` fails the **same subtask twice** → escalate to `opus`, passing the full failure trail (both attempts, error output, what was already ruled out). Never let opus start blind.
- `opus` (or you) solves it and the fix is a repeatable pattern → write the pattern + one worked example into the dispatch prompt and batch-apply at `haiku`/`sonnet`.
- Hard cap: **two retry rounds per approach** on the same subtask. After that, the approach is presumed wrong — consult `ops/judgment-rubrics.md` §"wrong direction" instead of retrying a third time.

## 7. Verification is never self-verification

The context that produced the work must not be the only context that approves it.

- **Files written**: dispatch a fresh `Explore`/`general-purpose` agent to read the file back and check it against the acceptance criteria verbatim (give it the criteria, not your summary of them).
- **Code changed**: run the project's smallest relevant validation (see each repo's rules/AGENTS.md) or actually run the app. A subagent saying "should work" is not verification.
- **High-risk judgment calls** (cross-site impact, irreversible actions, spec interpretation): get a second opinion from a fresh `opus` agent, or generate 2–3 candidate answers and have a fresh agent pick with reasons. If second opinions disagree → that's a stop-and-ask-the-user signal.

## 8. Parallelism

- Independent read-only surveys: dispatch in parallel, `run_in_background: true`, continue working while they run.
- Never run two agents that write to the same files. If in doubt, serialize writes.
