# <feature 名稱>

> 交接合約：Spec 作者產出，實作者只依此檔與 active `REQ-ID` 實作，reviewer 對照 `AC-ID`／`VT-ID` 驗證。
> 位置：`~/wow/ai-config/specs/<project>/<feature>.md`

## Background / 背景與目標

- 問題與預期結果：`<why / outcome>`
- 目標端別與 repo：`<會員端 / 代理端 / 其他>`、`<repo>`
- 原始需求連結：`<Notion / issue / user message>`

## Spec Governance / 規格治理

- Role: `CANONICAL`
- Canonical spec: `SELF`

一般 feature 只建立一份 `CANONICAL` spec，所有 execution slices 共用它並以 Active REQ IDs 切分。不要另建 child spec。若既有／外部流程強制需要 slice spec，Role 改為 `SLICE`、Canonical spec 填 canonical spec 的可讀連結；slice 只能回報 active REQ 結果，不能通過 `--complete` 或宣稱 feature 完成。

## Scope / 範圍

- `<本次要交付的 coherent outcome；細項以追蹤矩陣為準>`

## Out of Scope / 不在範圍

- `<只列來源明確排除或使用者已核准排除的項目；API 未提供不可直接列為 out of scope>`

## Source Responsibilities / 來源職責與版本

| Source ID | Snapshot / Revision | Responsibility | Location |
| --- | --- | --- | --- |
| SRC-REQ-001 | `<日期 / issue revision>` | Scope / behavior | `<需求中的一個 section / anchor>` |
| SRC-UI-001 | `<日期 / frame version>` | UI / visual | `<一個 Figma frame、state 或本地相對素材連結>` |
| SRC-API-001 | `<版本 / 日期>` | API / persistence | `<一個 API/schema/response snapshot>` |
| SRC-CODE-001 | `<branch + commit>` | Implementation pattern | `<repo 路徑與參考檔>` |
| SRC-DEC-001 | `<決策日期>` | User decision | `<明確核准的 user task message / decision record>` |

來源責任：需求來源決定產品範圍；視覺來源決定 UI；API 來源決定持久化能力；repo 只提供現況與 pattern。不得因 API、schema、endpoint 或 persistence 缺口預先 disable、hide 或 lock 需求控制項；使用者嘗試動作後若無法持久化，保留輸入並明確提醒未儲存範圍。實質 API 契約缺口要在發現的同一個 user-facing turn 告知，不能只埋在 spec 或最後交接。同一責任的來源若互斥，先標 `SOURCE_CONFLICT` 並請使用者決定。

一個來源文件可拆多列；每個可能被獨立漏掉的 section、frame、asset 或 state 各一列，並由至少一個 `REQ-ID` 引用。產品權威來源的 Location 必須指到直接明示該行為的 section、frame 或 user message；只有整份文件 URL／標題不算直接 anchor。刪除沒有使用的範例列（沒有決策時也刪除 `SRC-DEC-001`），不要用一個粗粒度 Source ID 包住整份需求。

## Requirement Traceability Matrix / 需求追蹤矩陣

Status 只能使用：`CONFIRMED`、`API_CONTRACT_MISSING`、`UI_REQUIRED_API_BLOCKED`、`PROVISIONAL`、`SOURCE_CONFLICT`、`OUT_OF_SCOPE_APPROVED`。

UI surface 不是 `N/A + 理由` 時，Source anchor / asset 至少引用一個 Responsibility = `Scope / behavior`、`UI / visual` 或 `User decision` 的來源。技術來源獨有的欄位只記在 API / persistence；例如 API 回 `format_example` 但產品來源未要求顯示時，UI surface 寫 `N/A — 產品來源未要求呈現`，不得新增 placeholder／hint AC。

任何非 `N/A + 理由` 的 `CONFIRMED` API／persistence contract 都必須直接引用 Responsibility = `API / persistence` 的來源，或以 checker 支援的明確 `Same as REQ-*`／`Inherits from REQ-*` chain 繼承該來源；不可用產品需求或 repo 猜 response shape。必要 endpoint、欄位、enum／mode discriminator、mapping 或 live response 尚缺／未驗證時，API / persistence 以 `[UNRESOLVED_API]` 開頭，status 填 `API_CONTRACT_MISSING`，並在下方 Notification Log 建立 `NTF-ID`。這是技術事實，不需要 `DEC-ID`；不可寫「待 API read-back／尚未提供」卻標 `CONFIRMED`／`PROVISIONAL`。只有權威契約已確認欄位刻意不存在，且本列 `REQ-ID` 不需要該欄位、行為完全不受影響時，才能以 `[VERIFIED_ABSENCE]` 開頭、引用 Responsibility = `API / persistence` 的 Source ID，並在 cell 寫出具名欄位／endpoint 與具體 schema／response evidence、by design／已確認不存在的結論，以及「本 REQ 不需要／不受影響」。required 欄位確定缺少仍須標 `API_CONTRACT_MISSING` 並通知；unavailable、unverified、pending 或待 read-back 不算 verified absence。只有使用者明確核准 bounded UI fallback 後，才用 `DEC-ID` 改為 `UI_REQUIRED_API_BLOCKED`，並把 Handoff Readiness 限定為 `BOUNDED_UI_ONLY`；fixture evidence 仍不能當 integration evidence，該 API blocker 也仍須保留 notification。

| REQ-ID | Source anchor / asset | UI surface | API / persistence | Status | Decision ID | Acceptance ID | Verification ID / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | SRC-REQ-001; SRC-UI-001 | `<頁面 / 入口 / 欄位 / 狀態；非 UI 則寫 N/A + 理由>` | `<endpoint / payload / local blocker；不持久化則寫 N/A + 理由>` | PROVISIONAL | `N/A — 尚未形成決策` | AC-001 | VT-001 |

## Source Conflicts / 未決與來源衝突

- `<REQ-ID：來源 A 與來源 B 的具體差異、影響、需要使用者決定的問題；沒有則寫「無」>`

## API Contract Notification Log / API 契約缺口通知紀錄

| Notification ID | Date | REQ-ID | Missing API contract / evidence | Affected behavior | Safe scope / next action | User-facing notification / evidence |
| --- | --- | --- | --- | --- | --- | --- |
| NTF-001 | `<YYYY-MM-DD>` | REQ-001 | `<缺少／未知的 endpoint、欄位、schema、mapping 或 live response；列出已查來源>` | `<受影響畫面、模式、顯示、儲存或驗收>` | `<可安全繼續的獨立範圍；owner 與取得契約的下一步>` | `Reported in current task/turn: <可定位的 task message／回報紀錄>` |

每個 API / persistence 仍含 `[UNRESOLVED_API]` 或等價未解契約敘述的 requirement（包括 `UI_REQUIRED_API_BLOCKED`）都必須被至少一筆 notification row 覆蓋。User-facing notification evidence 必須是 `Reported in current task/turn: ...` 或 `已於本輪告知：...` 這類正向、可定位的紀錄；`pending`、未通知、稍後通知或任意非空文字都不算。沒有 open gap 時刪除範例表格並寫 `No open API contract blockers.`；已解決的歷史通知可保留，但 API / persistence 必須改成已驗證的契約與 evidence，不可只把 status 改成 `CONFIRMED`。

## Affected Area / 受影響範圍

- 端別、repo、模組、route、template/siteKey：`<...>`
- 跨站／共用程式影響：`<無，或列出影響並附使用者確認>`
- 不得碰的使用者既有 local changes：`<路徑或無>`

## Existing Patterns / 參考實作

- `<檔案路徑 / 元件 / hook>`：`<要沿用的 pattern，不代表需求上限>`

## Decision Log / 關鍵決策與理由

| Decision ID | Date | REQ-ID | Decision + reason | Approval / source |
| --- | --- | --- | --- | --- |
| DEC-001 | `<YYYY-MM-DD>` | REQ-001 | `<決定與理由>` | SRC-DEC-001 |

使用者確認的新決策要在同一輪更新到本表、矩陣 status 與受影響 AC／VT；不要只留在 task 對話。若沒有決策，刪除範例表格並寫 `No decisions.`；`UI_REQUIRED_API_BLOCKED` 與 `OUT_OF_SCOPE_APPROVED` 不可寫 No decisions，必須引用已核准的 `DEC-ID`，而該 Decision 的 Approval / source 必須是 Responsibility = `User decision` 的 Source ID，不能引用 API／repo 當核准。

## Acceptance Criteria / 驗收條件

> 每條可客觀判斷，並被至少一個 `REQ-ID` 引用。不得加入該 REQ 所引用產品來源沒有授權的 user-visible 行為。

- [ ] AC-001: `<從使用者可觀察結果描述，不寫籠統的「功能正常」>`

## Edge Cases / 邊界與狀態

- loading：`<...>`
- empty：`<...>`
- error / API unavailable：`<控制項保持可操作；動作失敗時保留輸入，明確提醒哪些值未儲存及原因；不得假成功或靜默丟值>`
- permission：`<...>`
- 合法阻擋：`<權限、破壞性操作確認、in-flight 防重複、loading lock、客觀無效輸入；不得用 API 缺口冒充合法阻擋>`
- 後端 constraint：`<可記錄既有 enforcement；新增前端 validation、copy、hide／disable state 仍須通過 UI authority gate>`
- create / edit / detail / copy 等相關狀態：`<...>`

## Verification Plan / 驗證計畫

> 每條寫取得 evidence 的方法，並被至少一個 `REQ-ID` 引用；執行後補上實際 evidence 路徑／URL／摘要。

- [ ] VT-001: `<最小相關測試、操作、截圖或 Network 驗證>`；Evidence: `<執行後填寫>`

## Git Flow

- 基底分支：`<main / develop / other>`（開始前更新）。
- 工作分支：`<feat|fix|perf|refactor|chore>/<summary>`。
- 推進路徑：`<work branch → develop → staging → main>`。
- 不可直接在共享分支實作；每次 commit／merge 都要先取得使用者針對該次操作的明確確認。

## Handoff Readiness

- Status: `DRAFT`
- User confirmation: PENDING
- Active REQ IDs: `REQ-001`
- Execution boundary: `FULL_CONTRACT`
- Structural check: `node ~/wow/ai-config/scripts/check-spec.js <本 spec 絕對路徑>`
- Ready check: `node ~/wow/ai-config/scripts/check-spec.js --ready <本 spec 絕對路徑>`

改成 `READY` 前必須完成雙向 read-back、解完 active `API_CONTRACT_MISSING`／`PROVISIONAL`／`SOURCE_CONFLICT`、記錄使用者確認並通過 ready check。正常完整契約使用 `FULL_CONTRACT`。使用者若只核准 bounded UI fallback，affected row 應改為有 `DEC-ID` 的 `UI_REQUIRED_API_BLOCKED`，Execution boundary 改成 `BOUNDED_UI_ONLY`；API／Network／persistence VT 與 notification 仍維持 `BLOCKED`／open。

## Feature Completion Gate

- Status: `INCOMPLETE`
- Remaining / blocked REQ IDs: `REQ-001`
- Complete check: `node ~/wow/ai-config/scripts/check-spec.js --complete <本 spec 絕對路徑>`

完成一個 slice 只更新該批 active REQ 的 AC／VT evidence，不可把 Feature Completion Gate 改成 `COMPLETE`。只有本檔 Role = `CANONICAL`、所有非排除需求均驗收、沒有 `API_CONTRACT_MISSING`／`UI_REQUIRED_API_BLOCKED`／未決狀態、Remaining / blocked REQ IDs 精確等於 `NONE` 且 complete check 通過，才可宣稱整個 feature 完成。`SLICE` spec 永遠不能改成 `COMPLETE`。

## Implementation Handoff / 交接給實作者

- Spec path：`<本 spec 絕對路徑>`
- Active REQ IDs：使用 Handoff Readiness 的唯一清單，不在此重複。
- Target repo / branch：`<...>`
- Known blockers：`<REQ-ID + NTF-ID／DEC-ID + 局部影響 + 可安全執行邊界；不得擴大成整頁刪除>`
- Report format：`<AC/VT 逐條結果 + evidence + 未驗證項；fixture UI 與 API／Network／persistence evidence 分開>`

只交接上述內容，不貼完整原始對話。若從需求整理切到實作、切換 coherent slice，或 task 已累積大量圖片／工具輸出，建立新 task 並以此 spec 傳遞決策。

多批實作才依 [execution reference](/Users/kenyu/wow/ai-config/skills/spec-driven-workflow/references/execution.md) 在本 canonical spec 加入 Execution Ledger；單批工作省略。Ledger 只記執行依賴與證據位置，不取代上方需求矩陣、Active REQ IDs 或完成閘門。
