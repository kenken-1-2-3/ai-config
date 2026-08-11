# Model Dispatch Rules (Claude Code binding)

Scope: this file binds the shared dispatch core to the **Claude Code harness** (its agent types, model names, tool mechanics). The harness-agnostic delegation gate、minimal context envelope、two-retry cap 與 proportional verification lives in `rules/agent_dispatch.md`, loaded by both Claude and Codex via install.sh; that file is the authority for the core rules, this file only adds Claude-specific bindings. If you are NOT running in Claude Code (e.g. Codex), use the core file alone — the model names and tools below do not exist in your harness.

For the main-session model ("the commander"). Goal: the main conversation holds decisions and conclusions, not raw file contents. Written 2026-07-03; tool facts re-verified against the live harness 2026-07-05 — if a tool/param named here errors as unknown, trust the error and update this file per ops/maintenance.md.

## 1. Apply the core delegation gate before choosing an agent

先依 `rules/agent_dispatch.md` 列出至少兩個彼此獨立、可平行且各自可驗收的 subtasks；列不出來就由 commander 處理。檔案數量、輸出長度或「bulk work」本身都不是委派理由，一個 sequential 30-file refactor 仍是一個 coherent task。

通過 gate 後才套用本檔的 Claude-specific binding：

- Repo-wide independent survey → `Explore`。
- Independent web research／implementation → `general-purpose` 或對應 agent。
- 已完全定義的 mechanical subtask 可用較小 model；語意或風險較高時依下方 model table。

若兩個候選 subtask 會讀寫同一可變狀態、需要彼此產物，或都需要完整 history，就不要為了平行而硬拆。

## 2. What actually exists in this harness (do not invent)

- Agent types (harness-injected and may change — trust the live agent list in your system prompt over this line): `Explore` (read-only search, returns conclusions), `Plan` (architecture/implementation planning, read-only), `general-purpose` (full tools, multi-step), `claude` (catch-all, full tools), `claude-code-guide` (questions about Claude Code/API itself).
- `model` parameter on the Agent tool: `haiku`, `sonnet`, `opus`. (`fable` appears only in special sessions — never depend on it.) If omitted, the subagent inherits the agent definition's model or the parent's.
- There is **no `effort` parameter** on the Agent tool. Depth levers that do exist: (a) choose a bigger model; (b) tell `Explore` the search breadth in the prompt ("medium" / "very thorough"); (c) write more constrained prompts; (d) `run_in_background: true` for parallel work.
- Verify current model IDs/pricing via the `claude-api` skill or `claude-code-guide` agent — never from memory.
- **Deferred tools** (added 2026-07-05): some tools (mostly MCP) are listed by name only, schema unloaded — calling one directly fails with InputValidationError. That error means "load it first": one `ToolSearch` call with `select:<name1>,<name2>,...` for ALL tools you'll need (comma-separated, one round-trip), then call normally. It does not mean the tool is broken.

## 3. Default model per task shape

| Task shape | Model | Notes |
|---|---|---|
| Mechanical: apply a fully-specified pattern, rename, format, collect file lists | `haiku` | Spell out the exact pattern + one worked example in the prompt |
| Standard: search/survey, implement a scoped feature, write tests, summarize docs | `sonnet` | Default. Most work lands here |
| Hard: cross-cutting refactor design, debugging with unclear cause, review of risky changes, anything that failed once at sonnet | `opus` | Also for second opinions |

## 4. Every dispatch carries four things (no exceptions)

1. **Goal + why**: what to produce and what it will be used for (the "why" lets the agent make sane micro-decisions).
2. **Exact scope**: paths、active `REQ-ID` 與必要 source anchors；不附完整 transcript。
3. **Acceptance criteria**: checkable conditions — "report includes X per repo", "tests T pass", "no file outside dir D modified".
4. **Report format**: exact structure of the reply. Long artifacts go to a file; the reply carries the path + a ≤10-line summary.

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

## 7. Verification is proportional to risk

- **Ordinary files/code**: deterministic read-back、test、build、typecheck、lint 或實際 app check 就是有效 evidence；不要只因為寫了檔案再開一個 fresh agent。
- **High-risk judgment calls**（金流／權限／安全、不可逆 migration、大範圍 cross-site、仍有歧義的 spec interpretation）或使用者明確要求時，才用 fresh `opus` 做第二意見。只交必要 diff、spec path、active `REQ-ID` 與 acceptance，不傳 full history。
- A subagent saying "should work" is not verification. 第二意見若與 deterministic evidence 或第一判斷衝突，停止並請使用者決定。

## 8. Parallelism

- Independent read-only surveys: dispatch in parallel, `run_in_background: true`, continue working while they run.
- Background agents notify the main conversation automatically on completion — never poll or read their output files (they're full JSONL transcripts and will flood your context).
- Never run two agents that write to the same files. If in doubt, serialize writes.
