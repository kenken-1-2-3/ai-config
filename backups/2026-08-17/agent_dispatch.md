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
