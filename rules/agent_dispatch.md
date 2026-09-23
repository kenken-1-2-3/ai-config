# Dispatch Core (all agents, all harnesses)

Harness-agnostic delegation, context-budget and verification rules. Claude Code 的 model 綁定另見 `~/wow/ai-config/ops/model-dispatch.md`；其他 harness 直接遵循本檔。

## Current Codex delegation backend

- When the active session is Codex, do not invoke external Claude Code. This includes `cc:review`, `cc:rescue`, `cc:adversarial-review`, the Claude CLI, and any tracked Claude Code job.
- When the delegation gate below is satisfied, use the session's native subagent or multi-agent tools. Keep the main agent responsible for integration and final verification.
- Only an explicit user request that names Claude Code for the current task may override this rule. Do not infer permission from needing implementation, diagnosis, research, review, or a second opinion.
- This restriction is Codex-side only; it does not prevent a user-started Claude Code session from doing its own work.

## Delegation gate

- 只有在能列出 **至少兩個彼此獨立、可平行推進** 的 subtask 時才委派。只有一個 coherent task、步驟有先後依賴、會寫同一批檔案，或 worker 需要同一份完整 history 時，留在 main agent 處理。
- 獨立表示：subtask 不需要等待另一個 subtask 的產物、不共享可變狀態，且可以各自用客觀 acceptance 驗收。
- 不為單次 deterministic check、短 read-back、同一檔案的小修或純粹「可能比較快」而開 subagent；委派與整合成本也要算進 context budget。
- 不派多個 worker 重做同一份分析。需要第二觀點時，把它明確定義成 review，並只在下方列出的高風險條件使用。
- The Codex quality-first serial handoff below is the only exception to the parallel-subtask requirement and to the ban on delegating small/single-file changes. Its purpose is separation of judgment from implementation, not concurrency.
- This exception covers one bounded implementation or known-root-cause fix only. Deterministic checks, short read-backs, and unresolved judgment remain with the main agent.

### Quality-first serial handoff (Codex pilot, started 2026-08-17)

Keep model identifiers in this registry only. When models change, update the bindings and rerun representative tasks; do not rewrite the workflow.

| Role family | Current binding | Reasoning effort | Responsibility |
|---|---|---|---|
| Judgment | `gpt-6-sol` | `high` | Coordination, routine requirements and specification, existing-architecture analysis, and routine acceptance |
| Specialist Judgment | `gpt-6-astra` | `high` | Complex or high-risk judgment, unknown-root-cause diagnosis, high-risk acceptance and review, final release judgment |
| Execution | `gpt-6-sol` | `medium` | Bounded lookup, implementation, test authoring, browser work, and known-root-cause fixes |
| Testing | `gpt-6-luna` | `low` | Read-only execution of already specified verification commands or cases and exact output reporting |

The table below governs model and effort for eligible workloads; it does not require delegation for short checks or change the active session's model. The main Judgment agent may run a routine single short lookup or check directly. Apply any model or effort change through an exposed, supported runtime control; writing this rule does not switch a running worker.

| Workload | Role | Effort |
|---|---|---|
| End-to-end coordination; routine requirements, specification, or existing-architecture analysis | Judgment | `high` |
| Scoped, known-source file, flow, or configuration lookup | Execution | `medium` |
| Clear routine implementation; known-root-cause fix | Execution | `medium` |
| Figma PC/H5 multi-state implementation; multi-module or complex-state known-root-cause fix | Execution | `high` |
| Unknown-root-cause, cross-system, or intermittent bug diagnosis | Specialist Judgment | `high` |
| Ordinary test-code authoring against frozen approved behavior | Execution | `medium` |
| Complex-state or edge-case test-code authoring against frozen approved behavior | Execution | `high` |
| High-risk acceptance design or review | Specialist Judgment | `high` |
| Already specified test, build, or log execution | Testing | `low` |
| Browser operation or visual verification | Execution | `medium`; `high` for complex states or visual comparisons |
| Explicitly requested ordinary review | Execution | `high` |

#### Codex Judgment effort

- Use the default Judgment binding at `high` for ordinary task coordination, requirements/specification and existing-architecture analysis, integrating scoped lookup results, and routine acceptance against defined criteria. Bounded known-source tracing may go to Execution as shown above; Judgment retains requirements and acceptance ownership.
- Route conflicting authoritative sources, unclear cross-site impact, new architecture or consequential cross-system tradeoffs, unknown-root-cause diagnosis, and consequential payment, permission, security, or release-readiness judgment to Specialist Judgment at `high`. Route only the affected phase, then return to the default Judgment binding for routine follow-ups; the main Judgment agent retains ownership and does not redo routine work in the specialist phase.
- If a required model or effort control is unavailable, disclose the missing binding and follow the fallback policy below; never claim that a written rule changed a running worker.
- Missing requirements or API facts still require authoritative evidence or user decisions; effort does not authorize guessing or bypassing blockers. Existing approval, scope, test, and release safeguards remain unchanged.

For a Codex request that changes code or behavior:

1. The main Judgment agent resolves material ambiguity and freezes an acceptance packet before any implementation handoff. The packet must state the goal and source anchors, allowed and forbidden paths, locked acceptance artifacts, objective acceptance criteria and commands, and the baseline working-tree state. External acceptance tests, original fixtures or topology, snapshots, and user-provided expected values are locked unless the user explicitly changes the requirement. The packet may separately permit adding implementation-level tests.
2. After the work is bounded, spawn one native execution-focused worker with the Execution registry model and workload-table effort, or resume one only when its known model and effort match. Otherwise start a fresh bounded worker with minimal context. This serial handoff is allowed even when there is only one coherent implementation task. Give the worker only the acceptance packet and necessary file anchors, not the full conversation.
3. The Execution worker must not edit locked acceptance artifacts, weaken or skip existing checks, introduce test-only production paths, or change fixtures/config merely to make a check pass. If the contract and executable behavior cannot both be satisfied, stop and return `CONTRACT_CONFLICT` with the exact conflicting clauses and evidence.
4. The main Judgment agent owns integration and final verification. Compare the resulting diff and locked artifacts with the recorded baseline, inspect every changed hunk, rerun the relevant deterministic checks in the real execution path, and judge every blocking acceptance criterion individually. Green tests or an aggregate pass percentage cannot override a failed critical criterion.
5. Send a localized correction with a known root cause back to the same Execution worker with the failing evidence. Return to the Judgment agent for diagnosis or re-planning when the root cause is unknown, assumptions changed, `CONTRACT_CONFLICT` was returned, a locked artifact changed, or two correction rounds failed.
6. Do not silently substitute a different model when a binding is unavailable. Preserve the task state, report the unavailable binding, and either use the Judgment agent as an explicit quality-first fallback or ask the user when the fallback would materially change cost, latency, or scope.
7. When this pilot routes implementation, the final report must include the route used, correction-round count, acceptance evidence, and anything not verified. Never include model or tool attribution in commit or PR text.

### Testing dispatch

- Delegating test execution is optional; all verification required by the acceptance packet and project rules remains mandatory. Use one native Testing worker with the Testing registry model and workload-table effort only for an eligible delegated subtask that runs already specified verification commands or cases. Resume only when its known model and effort match; otherwise start a fresh bounded worker. The delegation gate remains in force; a single short deterministic check stays with the main agent.
- Test writing is separate from test execution. Execution may add implementation-level tests only against frozen approved expected behavior. Judgment owns acceptance criteria, novel expectations, and ambiguous failures. Testing is read-only and may not change code, tests, fixtures, configuration, scope, or expected results.
- Give the Testing worker the frozen acceptance packet, exact commands or cases, required environment, and log location. It must not edit code, locked tests, fixtures, snapshots, or configuration; it must not reduce required test scope or create new test expectations.
- The Testing worker reports the actual command and environment, exit status, evidence or log path, and `PASS`, `FAIL`, `BLOCKED`, or `UNVERIFIED` for each checked criterion. A skipped, blocked, or failing check never becomes success, and partial evidence never establishes root cause.
- Route planning of new test expectations and ambiguous failures to Judgment. Route fixes only after the root cause is established, and then to Execution. Main Judgment retains final verification and acceptance responsibilities.

若 harness 不支援 delegation，使用 summarize-and-discard：大量讀取後只保留結論、決策與 `file:line`，不要反覆重讀 raw output。

## Minimal context envelope

每個 delegated／resumed task 只攜帶：

1. Goal + why。
2. 精確路徑、active `REQ-ID` 與必要 source anchors。
3. 客觀 acceptance criteria。
4. Report format：結論、evidence、`file:line`；長輸出寫檔，只回路徑。

不要附完整 conversation、整份 task transcript 或與 active `REQ-ID` 無關的 spec。能選擇 fork 範圍時使用最小 history；已凍結的決策從 spec／decision log 傳遞，不靠 replay。

## Verification proportional to risk

- Deterministic command、測試、build、typecheck、lint、資料查詢，以及依 acceptance criteria 逐條 read-back，都算獨立 evidence；不強制再找第二個模型批准。
- 第二模型 review 只用於高風險變更：金流／權限／安全、不可逆 migration、大範圍跨模組行為、來源語意仍有歧義，或使用者明確要求。Review 只讀必要 diff、spec path 與 active `REQ-ID`，不重播全 history。
- UI 視覺驗證依對應 skill 的 state manifest 與迴圈上限執行；不可用無限次 reviewer 往返取代量測與 deterministic checks。
- 未執行的檢查要明說，不得以模型信心補成「已驗證」。

## Retry and escalation

- 同一 subtask、同一方法最多兩個 retry rounds。第二次仍失敗就改 hypothesis／approach 或回報 blocker，不做第三個近似變體。
- Escalation 要附：嘗試、exact error、已排除事項、active `REQ-ID` 與下一個需要的決策；不得讓接手者從完整 history 重新考古。
- 可選更強模型的 harness 依其 binding 規則處理；不可選時，由使用者決定是否提高 effort 或交給另一 agent。

## Main-agent integration

- Main agent 保留需求取捨、來源衝突與跨 subtask 決策；worker 回傳 evidence，不各自重定義 scope。
- 每個 subtask 結束後只整合一次摘要。後續工作引用該摘要／spec，不重貼 raw findings。
- 若委派後發現 subtasks 實際互相依賴，停止平行寫入，收回 main agent 依序處理。
