# Spec: NS-257 代理端新增錢包稽核自動歸零設定與手動更新

> 交接合約：本 spec 是 `Whitelabel_GSI_Dashboard` 實作與 review 的單一依據。需求、backend contract、站台範圍或 remote i18n 若有變更，先更新本 spec，再繼續實作。
>
> 狀態：**Ready for implementation / backend 已更新**。Gate 1 與 frontend permission wiring 已解決；Gate 2、response envelope 與 backend permission enforcement 不再阻擋開始實作，改由實作者完成前端串接後直接在 DEV 網站觀察實際 Network request／response 與 reload persistence，再把結果回填本 spec。Gate 4 已有候選 key 與中英文，待需求方比對。

## 背景 / 目標

- 來源需求：[Notion — `[需求 代理端]新增錢包稽核歸零邏輯`](https://app.notion.com/p/wowgaming/37dfc5d788a9800e86eed341c42988ae)。
- API 文件：[Apifox project 4860774](https://app.apifox.com/project/4860774)，搜尋 `audit-turnover-reset`。
- 關聯 Jira：[NS-257](https://gamingsoft.atlassian.net/browse/NS-257)。
- 關聯 backend 卡：Notion `GSI-263`「稽核自動歸零」。
- Spec 作者於 2026-07-20 讀取 Notion 文字與兩張 UI 示意圖；於 2026-07-23 讀取 Apifox 四支已發布 API，並對照目前 Dashboard repo。
- 需求方於 2026-07-24 確認 backend 已完成更新；剩餘 API 語意與權限差異不再要求實作前另行等待口頭答覆，改由網站串接實測確認。
- 問題背景：玩家可能已消耗完可用餘額，但舊稽核仍存在，影響下一次充值後的稽核計算。真正的歸零必須由 backend 原子地將 `member_wallet.turnover` 與 `member_wallet.audit_turnover` 同時設為 `0`；Dashboard 不自行計算、判斷或修改錢包值。
- 本 Dashboard feature 的目標只有：
  1. 讓有權限的代理端使用者設定「現金／贈金錢包」各幣別是否啟用自動清除稽核，以及啟用時的餘額門檻。
  2. 讓有「會員列表編輯」權限的使用者，在會員列表編輯頁手動要求 backend 重新檢查該會員的稽核狀態，並刷新畫面上的最新稽核資料。
  3. 驗證 backend 產生的操作記錄能由既有操作記錄頁正常顯示；不在前端重複寫 log。

## 決議與串接驗證 Gates

### Gate 1：站台與跨站範圍（已解決）

- 需求方於 2026-07-24 正式確認：「全站」是所有代理／所有站台共用功能，不限 NOV1。
- Dashboard 的共用 `ClientWebSiteSettings.vue` 與 `Info.vue` 直接提供此功能；不需要 backend capability、site capability flag 或 site-specific conditional rendering。
- 不新增 `NOV1`、hostname、agent id 或 siteKey hardcode。

### Gate 2：PUT persistence semantics（改由網站串接實測）

- Apifox `GET /platform/v1/agent/wallet/audit-turnover-reset-settings` 已明確寫明：「回未設定者為預設未啟用」。
- 此問題實際出現在網站資訊設定頁按下本區「儲存設定」時，也就是前端組裝 `PUT { list }` payload 的地方；不影響會員列表的手動歸零 POST。
- 因此 backend 沒有設定的既有幣別，以及新開通但尚未建立設定的幣別，前端 business state 必須是 `is_enabled=false`；Notion 的「預設開啟，0.0000」不再作為 authoritative default。
- 未設定／disabled row 的 input 可顯示 `0.0000` 作格式化空值，但不得因此送成 enabled。
- Apifox PUT schema 將 `is_enabled` 與 `balance_threshold` 標為 optional，文件未完整說明：
  - 前端應送所有「幣別 × wallet type」完整快照，或只送 changed rows；
  - 關閉時若省略／保留 `balance_threshold`，backend 是否保留舊值；
  - 重新開啟時應恢復舊 threshold，或從 `0.0000` 開始。
- 上述三點不再阻擋建立工作分支與 API 串接。實作者先以「只送 changed rows、關閉時保留原 threshold、重新開啟恢復原值」作為最小且不破壞其他設定的初始策略，再於 DEV 網站完成以下實測：
  1. 使用需求方指定的 DEV 測試代理／測試幣別；記錄第一次 GET 的 redacted raw response body 與目前各 row，不記錄 Authorization、token 或會員個資。
  2. 只修改一筆測試幣別，確認 PUT Network payload 只有該 changed row。
  3. PUT 成功後重新 GET／reload，確認未送出的其他 row 未被刪除或改變。
  4. 將同一 row 關閉後 reload，確認 threshold 是否仍保留。
  5. 重新開啟同一 row，確認 threshold 是否恢復且 backend 接受。
  6. 測試結束後恢復該 row 的原始 enabled／threshold，重新 GET 確認已復原。
- 若實測顯示 backend 要求 full snapshot、關閉會清除 threshold，或其他行為與初始策略不同，先將 raw request／response 與最終語意回填本 Gate、更新 acceptance criteria，再調整 production caller；不得只在 code 內留下未記錄的特殊處理。
- Repo 現有 wallet enum 與 Apifox 數值一致，但英文名詞容易誤讀：`1=GENERALLY/Cash`、`2=BONUS/撲滿錢包（walletType.vault）`、`3=REWARD/贈金錢包（walletType.bonus）`。本需求 UI 只編輯 type `1` 與 `3`；若 PUT 最終要求 full snapshot，type `2` 必須原樣帶回，不能因 UI 未顯示而刪除或覆寫。

### Gate 3：Permission 與 envelope（改由網站串接實測）

- Apifox 已發布四支 API：
  1. `GET /platform/v1/agent/wallet/audit-turnover-reset-settings`：代理端查詢設定。
  2. `PUT /platform/v1/agent/wallet/audit-turnover-reset-settings`：代理端批次更新設定。
  3. `POST /platform/v1/agent/member/{memberID}/wallet/audit-turnover-reset`：代理端手動觸發指定會員歸零。
  4. `GET /platform/v1/player/wallet/audit-turnover-reset`：會員端進出款頁自動歸零並回傳 wallets。
- Dashboard 只實作前 3 支；第 4 支屬會員端 repo，詳見 Out of scope。
- 需求方於 2026-07-24 確認本功能的最終 frontend permission 語意：
  - settings 沿用網站資訊設定頁現有的 `permission.edit`；`A_A_AUDIT_TURNOVER_RESET_SETTING_EDIT (3520702)` 是 backend API 的 Edit permission code，由 backend 驗證，frontend 不新增獨立 permission node／function-id lookup。
  - manual reset 直接使用會員列表頁現有的 `permission.edit`；不以 Apifox 標示的 `3100102` 取代 repo 現有 member-list constants。
- Backend 已更新；以下項目不再阻擋開始串接，但必須在完成前透過 DEV 網站實測確認：
  - Manual POST 的 DEV raw response 已確認回傳 `msg: "success"`；成功 Toast 將此值映射至既有 remote i18n key `message.success`。其他 backend `msg` 維持原樣顯示，不解析 `wallets[].reset` 或 `wallets[].skip_reason` 組合前端結果文案。
  - PUT 文件未定義 response schema；成功後一律再呼叫 GET 取得 authoritative settings，不依賴 PUT response data。
- 實測方式與決策：
  1. 在已登入且具相關權限的 DEV 網站開啟 Network，使用指定測試會員，記錄 settings GET／PUT、manual POST 的 redacted raw success 與可安全觸發的 error response；不得把 Authorization、token 或會員個資寫入 spec／測試紀錄。
  2. Settings 沿用網站資訊設定頁現有 `permission.edit`；不修改權限設定頁、route permission 或 permission constants。呼叫 PUT 時由 backend 以 `3520702` 驗證。
  3. 「更新稽核狀態」按鈕沿用會員列表頁現有 `permission.edit`，不修改全域 `A_F_MEMBER_LIST`／`A_A_MEMBER_LIST_EDIT`；這是需求方已確認的最終 wiring。
  4. Manual POST 已確認使用 `msg`；本 feature 不修改 global request helper。
  5. 將 backend permission enforcement、success／error envelope 與 PUT response shape 回填本 Gate。

### Gate 4：remote i18n keys 與多語文案（已有提案，待需求方比對）

- 此 repo 使用 remote i18n，沒有 local locale JSON。實作者不得臨時發明 key；本 spec 可依需求方 2026-07-24 的授權提出候選 key 與中英文，待需求方比對批准後才成為正式 contract。
- 需求方於 2026-07-24 指示：先搜尋既有可用翻譯；找不到時由 spec 提出建議 key、中文與英文，交由需求方比對。
- Dashboard repo 已確認可重用的既有 key；實作前仍須在 remote i18n 實際確認翻譯內容符合：

| 用途 | 既有 key |
| --- | --- |
| 啟用／停用 | `common.enable`／`common.disable` |
| 儲存 | `btn.save` |
| 幣別 | `common.currency` |
| 當前稽核 | `common.current_audit` |
| 現金錢包（type 1） | `walletType.normal` |
| 贈金錢包（type 3） | `walletType.bonus` |

- Dashboard repo 找不到本功能專屬 key，提出以下 remote i18n 草案。這些 key 尚未建立／批准，需求方比對完成前不得視為正式 contract：

| 建議 key | 中文（zh-TW） | 英文（en） |
| --- | --- | --- |
| `audit_turnover_reset.settings.title` | 自動清除稽核設定 | Automatic Audit Turnover Reset Settings |
| `audit_turnover_reset.settings.rule_summary` | 當玩家符合以下 1–5 所有條件時，系統將會自動清除稽核；執行歸零前，系統會再次確認所有條件仍符合；若任一條件已不符合，則取消本次歸零。 | The system automatically resets audit turnover when the player meets all conditions 1–5. Before resetting, the system checks all conditions again. If any condition is no longer met, the reset is cancelled. |
| `audit_turnover_reset.settings.condition.balance` | 餘額條件設定（現金／贈金錢包） | Balance threshold settings (Cash/Reward wallets) |
| `audit_turnover_reset.settings.condition.balance_tooltip` | 當玩家的可用餘額小於或等於所設定的門檻值，且同時符合其他條件時，系統將自動清除稽核。支援設定至小數點後 4 位，各幣種可分別設定。若未設定，則該幣種不啟用自動清除稽核此功能。 | When the player's available balance is less than or equal to the configured threshold and all other conditions are met, the system automatically resets audit turnover. Each currency can be configured separately to four decimal places. If no value is configured, automatic audit turnover reset is disabled for that currency. |
| `audit_turnover_reset.settings.condition.withdrawal` | 無任何一筆待審核的提現訂單（僅現金錢包適用） | No withdrawal orders pending review (Cash wallet only) |
| `audit_turnover_reset.settings.condition.withdrawal_tooltip` | 僅適用於現金錢包。若玩家仍有待審核的提現訂單（如：審核中、鎖單、風控中、風控鎖定、等待回調等），則不符合自動清除稽核條件。 | Cash wallet only. If the player still has a withdrawal order pending review, such as under review, locked, under risk control, risk-control locked, or awaiting callback, the player is not eligible for automatic audit turnover reset. |
| `audit_turnover_reset.settings.condition.bet` | 所有注單皆已結算（無未結算注單） | All bets have been settled (no unsettled bets) |
| `audit_turnover_reset.settings.condition.bet_tooltip` | 玩家所有注單皆須完成結算（取消的訂單也算完成結算），若仍存在未結算注單，則不符合自動清除稽核條件。 | All of the player's bets must be settled; cancelled bets also count as settled. If any unsettled bet remains, the player is not eligible for automatic audit turnover reset. |
| `audit_turnover_reset.settings.condition.transfer_wallet` | 轉帳產品錢包內無卡餘額 | No remaining balance in transfer-provider wallets |
| `audit_turnover_reset.settings.condition.transfer_wallet_tooltip` | 若玩家於轉帳產品仍有餘額，系統將先向供應商確認並要求額度轉回；於供應商回覆完成前，不符合自動清除稽核條件。適用產品：918Kiss、Mega888、Pussy888。 | If the player still has a balance in a transfer product, the system first confirms it with the provider and requests the balance to be transferred back. The player is not eligible for automatic audit turnover reset until the provider confirms completion. Applicable products: 918Kiss, Mega888, and Pussy888. |
| `audit_turnover_reset.settings.condition.interest_treasure` | 利息寶無未派發／進行中訂單 | No undistributed or in-progress Interest Treasure orders |
| `audit_turnover_reset.settings.condition.interest_treasure_tooltip` | 若玩家參與利息寶且仍有未派發訂單，則不符合自動清除稽核條件。 | If the player participates in Interest Treasure and still has undistributed orders, the player is not eligible for automatic audit turnover reset. |
| `audit_turnover_reset.settings.threshold` | 餘額門檻 | Balance Threshold |
| `audit_turnover_reset.settings.no_currency_enabled` | 若沒有開啟幣別，表示不開啟自動清除稽核設定。 | If no currency is enabled, automatic audit turnover reset is disabled. |
| `audit_turnover_reset.settings.save_success` | 自動清除稽核設定已儲存 | Automatic audit turnover reset settings saved |
| `audit_turnover_reset.validation.threshold` | 請輸入大於或等於 0、最多 4 位小數的數值 | Enter a value greater than or equal to 0 with up to 4 decimal places |
| `audit_turnover_reset.member.action` | 更新稽核狀態 | Update Audit Status |
| `audit_turnover_reset.member.tooltip_description` | 立即重新檢查玩家是否符合稽核歸零條件。 | Immediately recheck whether the player meets the audit turnover reset conditions. |
| `audit_turnover_reset.member.tooltip_eligible` | 若符合，立即執行稽核歸零。 | If eligible, reset audit turnover immediately. |
| `audit_turnover_reset.member.tooltip_ineligible` | 若不符合，不執行歸零，僅回傳最新稽核資訊。 | If not eligible, do not reset it and only return the latest audit turnover information. |
| `audit_turnover_reset.member.result_dialog.title` | 更新稽核狀態結果 | Update Audit Status Result |
| `audit_turnover_reset.member.skip_reason.disabled` | 設定未啟用 | Setting is disabled |
| `audit_turnover_reset.member.skip_reason.balance_over_threshold` | 餘額高於門檻 | Balance exceeds the threshold |
| `audit_turnover_reset.member.skip_reason.pending_withdrawal` | 有待處理提款單 | A pending withdrawal exists |
| `audit_turnover_reset.member.skip_reason.unsettled_wager` | 有未結算注單 | Unsettled wagers exist |
| `audit_turnover_reset.member.skip_reason.pending_interest` | 有待結算利息 | Pending interest settlement exists |
| `audit_turnover_reset.member.skip_reason.transfer_wallet_not_done` | 轉帳產品錢包處理尚未完成 | Transfer wallet processing is not complete |
| `audit_turnover_reset.member.skip_reason.nothing_to_reset` | 無需歸零 | Nothing to reset |
| `audit_turnover_reset.member.skip_reason.wallet_not_found` | 找不到錢包紀錄 | Wallet record not found |
| `audit_turnover_reset.member.skip_reason.check_failed` | 前置檢查失敗 | Pre-check failed |
- Manual POST 所有 wallet `reset=true` 時，Toast 沿用既有 remote i18n key `message.success`。
- 結果 Modal 的欄位沿用既有 `table_header.currency`、`table_header.wallet_type`、`table_header.status`；成功狀態沿用 `message.success`。
- 不建立或修改 local locale JSON。需求方比對並確認 key／文案後，先更新本表，再開始實作。

## 範圍

### A. 網站資訊設定：自動清除稽核設定

- 目標 route：`/SiteSettings/ClientSideSettings/ClientWebSiteSettings`。
- 在「重置密碼文案模板」區塊下方新增「自動清除稽核設定」區塊；Notion 原圖是視覺來源，實作時須量測原圖並做 screenshot comparison，不可自行近似 spacing、字級、欄寬、顏色或 breakpoint。
- 建議建立 feature-local presentational component：
  - `src/pages/WebsiteSettings/ClientSideSettings/components/AutoAuditResetSettings.vue`
  - parent `ClientWebSiteSettings.vue` 持有 API state、load/save 與 permission；child 只負責 section UI、validation events 與 model binding。
  - API 雖為獨立 GET／PUT，child 仍不得繞過 parent 的 feature permission 與 page loading/error pattern。
- 區塊開頭顯示需求提供的規則總覽文案：
  - 「當玩家符合以下『1–5 所有條件』時，系統將會自動清除稽核；執行歸零前，系統會再次確認所有條件仍符合；若任一條件已不符合，則取消本次歸零。」
- 明確列出五項條件，文字內容以正式 remote i18n 為準：
  1. 餘額條件設定（現金／贈金錢包）。
  2. 無任何一筆待審核的提現訂單（僅現金錢包適用）。
  3. 所有注單皆已結算（無未結算注單）。
  4. 轉帳產品錢包內無卡餘額；需求目前列出 918Kiss、Mega888、Pussy888。
  5. 利息寶無未派發／進行中訂單。
- 每項條件標題旁的 info icon hover 必須顯示對應的完整「說明文案」，使用本 spec Gate 4 中的 `*_tooltip` 文案；不得只重複條件標題。
- 第 1 項依 Notion 原圖做成可編輯區域：
  - 現金錢包與贈金錢包分頁／切換。
  - 若站台未開啟贈金錢包，完全不顯示「贈金錢包」tab；沿用既有 `BONUS_WALLET_TYPE` 與 `form.wallet_type_list`／site settings data 判斷，不建立新 wallet enum。
  - 僅列出站台已開通幣別；沿用 `queryStore.getCurrencyList()` 與 `queryStore.currencyList`，不可寫死幣別。
  - desktop 版每列兩個幣別；每個幣別顯示 currency label、enabled toggle、threshold input。
  - threshold 為非負數字，最多小數 4 位；form state 以 string 保存，避免浮點格式破壞 `0.0000` 或後端精度。
  - 關閉幣別後該幣別不參與 backend 自動清除判斷；input 應 disabled，但是否保留 threshold 依 Gate 2 正式決議。
  - 不設定需求未提供的最大值；若 backend 有上限，須先補進 contract 與驗收條件。
  - 顯示需求指定的補充文案：「若沒有開啟幣別，表示不開啟自動清除稽核設定。」
- 第 2–5 項是規則說明，不讓前端使用者改變 backend 判斷條件；依 Notion 原圖顯示為唯讀條目／展開說明。
- Save 行為：
  - 依原圖提供本區獨立「儲存設定」按鈕。
  - 使用獨立 `PUT /platform/v1/agent/wallet/audit-turnover-reset-settings`，不併入既有 `PUT /settings`。
  - 一次 request 的 `{ list }` 在同一 backend transaction upsert 多筆「幣別 × wallet type」，並只產生一筆網站設定 operation log。
  - 儲存期間顯示 loading 並防止重複提交。
  - PUT 成功後重新呼叫 settings GET，以 GET response 重新 hydrate UI，再顯示成功提示；失敗保留使用者尚未送出的值並走既有錯誤處理。

### B. 會員列表編輯：更新稽核狀態

- 目標 route：`/MemberManagement/List/Edit/:id` 的會員資訊頁。
- 在 `src/pages/MemberManagement/MemberList/Edit/Info.vue` 的「當前稽核」標題列新增「更新稽核狀態」按鈕，位置依 Notion 原圖，並保留目前既有的「會員稽核調整」按鈕與 `SingleAuditAdjustmentDialog` 行為。
- 新按鈕的 permission 與既有「會員稽核調整」不同：
  - 新按鈕的權限語意是「會員列表編輯」。需求方已確認直接使用目前 page `permission.edit`，不修改 repo 現有 `A_F_MEMBER_LIST`／`A_A_MEMBER_LIST_EDIT=3340302`。
  - 不得錯用 `A_F_MEMBER_AUDIT_ADJUSTMENT` 或 `A_A_MEMBER_AUDIT_ADJUSTMENT_EDIT`；該 permission 只控制既有人工稽核調整功能。
  - ADMIN mode 沿用 `usePermission()` 既有 override。
  - 無會員列表 edit 權限時不顯示操作按鈕；不改 page entry 或其他欄位的 view/edit 行為。
- 按鈕 tooltip／說明要表達：
  - 立即重新檢查玩家是否符合稽核歸零條件。
  - 若符合，立即執行稽核歸零。
  - 若不符合，不執行歸零，僅回傳最新稽核資訊。
  - Tooltip 標題沿用 `audit_turnover_reset.member.action`，內文與兩個條列分別使用 Gate 4 的 `tooltip_description`／`tooltip_eligible`／`tooltip_ineligible`；即使 remote key 尚未下發，frontend 也須使用 spec 中文作 fallback，不能顯示 raw key。
  - Tooltip 綁在「更新稽核狀態」按鈕外部右側的 `info_outline` icon；icon 不可放進 `q-btn`，按鈕左側既有 refresh icon 保留。
  - Tooltip 視覺依 2026-07-24 需求方補充截圖：白底浮層、深色文字、粗體標題、說明段落與兩個圓點條列。
- 點擊後：
  - 立即呼叫 `POST /platform/v1/agent/member/{memberID}/wallet/audit-turnover-reset`，path `memberID` 必須是有效 integer；不帶 body，不在前端重做五項條件判斷。
  - request in-flight 時按鈕 loading／disabled，避免重複點擊。
  - 不新增需求未要求的 confirmation dialog。
  - 成功 response 為 `{ member_id, wallets }`；每個 wallet 提供 `reset`、`skip_reason`、`balance`、`turnover`、`audit_turnover`。
  - POST 成功後先呼叫既有 `refreshCurrentAuditRows()` 取得 `GET /member/:id/info`，刷新現金與贈金 wallet 的「當前稽核」表格，不自行改寫 0。
  - 若 response `wallets` 每一筆皆為 `reset=true`，顯示 `t("message.success")` Toast，不開啟結果 Modal。
  - 若 response `wallets` 任一筆為 `reset=false`，不顯示成功 Toast，改開啟「更新稽核狀態結果」Modal；依 backend response 原順序列出每一筆 wallet 的幣別、錢包類型與狀態，包含成功項目，不只列失敗項目。
  - Modal 的成功狀態顯示 `message.success`；失敗狀態依 `skip_reason` 對應 Gate 4 的 `audit_turnover_reset.member.skip_reason.*` key。未知／空白 `skip_reason` 不得造成 crash，fallback 顯示 backend 原始值；空白值使用既有 `common.unknow`。
  - `reset=false`／有 `skip_reason` 是成功檢查結果，不當成 request error。
  - API 失敗時不得把畫面數值清成 0，也不得顯示成功；沿用既有 error handling。

### C. API 與 TypeScript contracts

- Apifox 原始 server path 都含 `/platform/v1/agent`；Dashboard wrapper 不重複寫 `/platform/v1/agent`：
  - settings GET／PUT 在 `src/api/webSiteSetting.ts` 使用 relative path `/wallet/audit-turnover-reset-settings` 與 `{ usePlatform: true }`。
  - manual POST 在 `src/api/member.ts` 使用 relative path `/member/${memberID}/wallet/audit-turnover-reset` 與 `{ usePlatform: true }`。
  - `src/utils/request.ts` 會把 configured `/v1/agent` base 改寫為 `/platform/v1/agent`；不得同時使用 full platform path，避免重複 prefix。
- Central contracts additive 放在 `src/api/request.type.ts` 與 `src/api/response.type.ts`，建議語意如下；實際名稱可依 repo sibling naming 微調，但欄位不可偏離 Apifox：
  - `AuditTurnoverResetSettingItem`
    - `currency_id: number`
    - `wallet_type: 1 | 2 | 3`，Apifox 定義 `1=Cash / 2=Bonus / 3=Reward`。
    - `is_enabled: boolean`
    - `balance_threshold: string`（decimal string）。
  - settings GET payload：`{ list: AuditTurnoverResetSettingItem[] }`。
  - settings PUT body：`{ list: AuditTurnoverResetSettingItem[] }`；若 Gate 2 最終確認 changed-row partial update，再把 request item 的對應欄位改為 optional，不能讓 response item 也跟著不必要地 optional。
  - `WalletAuditResetResult`
    - `currency_id: number`
    - `wallet_type: number`
    - `reset: boolean`
    - `skip_reason: string`
    - `balance: string`
    - `turnover: string`
    - `audit_turnover: string`
  - manual POST payload：`{ member_id: number; wallets: WalletAuditResetResult[] }`。
- Standard request helper generic 必須是 unwrapped `data` payload；不可把 `{ code, message, data }` raw envelope 當成 `T`。
- Settings PUT response schema未定義；wrapper generic 可用 `undefined`／`unknown` 依實際 DEV response確認，但 caller 不讀 response data，成功後重新 GET。
- Permission constants：
  - settings frontend 不新增 permission constant；API 的 edit action `3520702` 由 backend 驗證。
  - manual reset 固定沿用會員列表頁 `permission.edit`，不改全域 member-list IDs。
- TypeScript／Vue edits 後逐一確認所有 touched files 的 imports／exports。

### D. 操作記錄驗證

- Backend 應寫入既有 `/operation_log/list` 所使用的資料來源；Dashboard 不另外呼叫「寫操作記錄」API。
- 既有 `src/pages/AccountManagement/UserActionLog/UserActionLog.vue` 已直接顯示 backend 的 `page_id` 與 `content`，預期不需修改。
- 需求方於 2026-07-24 由實際 response 確認，自動清除稽核設定的 operation log `page_id=31802`；frontend 在 `PAGE_LOG` 將其映射到既有 `menu.website_information_settings`，供操作記錄表格與頁面篩選使用。
- 2026-07-24 localhost 實測：`/HistoryRecord/UserActionLog` 已將 `page_id=31802` 顯示為 remote i18n 英文 `System Information Settings`，不再顯示 `Unknown`；同一筆記錄同時包含 enabled 與 threshold 異動內容。
- 驗證 backend 回傳以下內容能在「平台紀錄 → 歷史紀錄 → 操作記錄」查到：
  - 會員列表手動更新：`{Admin} updated audit status for {Player}`，頁面為會員列表。
  - 幣別 enabled 異動：`{Admin} updated auto audit reset setting for {Currency}: {Old Value} → {New Value}`，頁面為網站資訊設定。
  - threshold 異動：`{Admin} updated auto audit reset threshold for {Currency}: {Old Value} → {New Value}`，頁面為網站資訊設定。
  - Apifox 已確認 PUT 是單一 transaction upsert 多筆，同一次儲存只寫一筆 operation log（頁面：網站設定）；前端不拆成多個 PUT。
  - Apifox 已確認 manual POST 寫一筆 operation log（頁面：會員列表）。
- `page_id=31802` 已確認並以最小範圍補入 `PAGE_LOG`；不修改操作記錄表格或 filter component。

## 受影響範圍

- 端別：代理端 `Whitelabel_GSI_Dashboard`。
- 預期直接修改：
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteSettings.vue`
  - `src/pages/WebsiteSettings/ClientSideSettings/components/AutoAuditResetSettings.vue`（建議新增、feature-local）
  - `src/pages/MemberManagement/MemberList/Edit/Info.vue`
  - `src/api/member.ts`
  - `src/api/webSiteSetting.ts`
  - `src/api/request.type.ts`
  - `src/api/response.type.ts`
- 僅在正式 backend contract 需要時才修改：
  - `src/utils/constants/pageLog.ts`
- 預期不修改：
  - `src/router/routes.ts`
  - `src/api/common.ts`
  - `src/pages/AccountManagement/UserActionLog/UserActionLog.vue`
  - `src/pages/MemberManagement/MemberList/Edit/component/SingleAuditAdjustmentDialog.vue`
  - `src/stores/siteStore.ts`（除非正式 contract 證明其他現有 consumer 需要全域同步）
- 跨站影響：需求方已確認共用頁面應影響所有代理站台；此為預期行為。

## 參考實作 / 要遵循的現有 pattern

- 網站資訊 route 與 permission：`src/router/routes.ts` 的 `ClientSideSettings`／`A_F_WEB_SETTINGS`。
- 網站設定 load/save：`src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteSettings.vue` 的 `loadSettings()`、`applySettingsToForm()`、`setSettings()`。
- 站台幣別來源：同檔案的 `queryStore.getCurrencyList()`、`queryStore.currencyList` 與既有 per-currency input pattern。
- 贈金錢包開關：同檔案的 `form.wallet_type_list`、`BONUS_WALLET_TYPE` 與 `rewardWalletEnabled` pattern；正式顯示條件仍依本需求的 wallet type contract。
- 會員稽核 rows 更新：`src/pages/MemberManagement/MemberList/Edit/Info.vue` 的 `refreshCurrentAuditRows()` 與 `applyWalletBalances()`。
- Feature-level permission：manual reset 使用 `Info.vue` 既有 `permission.edit`；settings 使用 `ClientWebSiteSettings.vue` 既有 `permission.edit`。兩者都不新增 feature-local permission scan，也不得複用 audit-adjustment permission。
- Platform API rewrite：`src/utils/request.ts` 的 `usePlatform`；sibling 可參考 `src/api/email.ts`／`src/api/dns.ts`。
- API domain：manual endpoint 放 `src/api/member.ts`；獨立稽核歸零設定放 `src/api/webSiteSetting.ts`。
- 原始視覺來源：Notion 內「自動清除稽核設定」與「會員列表／當前稽核」兩張示意圖。

## 關鍵決策與理由 (Key decisions)

- Dashboard 只送設定與觸發檢查，不複製五項歸零條件：條件涉及提現、注單、供應商錢包、利息寶與交易鎖，必須由 backend 在同一 authoritative context 最終確認。
- 手動更新採 member-list edit permission，而不是 audit-adjustment permission：Notion 明確指定「會員列表編輯」，且兩個操作的業務意義不同。
- 不新增 route／menu、permission node、permission constants 或 permission-setting UI，也不改 page entry behavior；settings API 的 edit `3520702` 由 backend 驗證。
- 操作記錄由 backend 寫：前端自行寫 log 會造成漏記、重複記錄或被繞過。
- Threshold 用 decimal string：支援四位小數且避免 JavaScript number 對財務門檻造成格式／精度問題。
- 未設定設定預設 disabled：Apifox 已取代 Notion 中互相矛盾的「預設開啟」描述。
- 設定使用獨立 platform GET／PUT，不污染既有 `/settings` 大 payload；PUT 成功後重查 GET，因 PUT 無 response schema。
- Manual POST 的 result 用於 reset／skip feedback，畫面表格仍重查既有 member detail，避免把 `audit_turnover` 錯接成現有 `remaining_turnover` shape。
- 不實作歸零後因 Void／派彩重新補回「清除前稽核」：Notion 最新決議明確說此判斷已移除；頁面中較早的回補表格不是本次最終行為。
- 全站共用且不 hardcode NOV1：需求方已確認此功能對所有代理／站台開放。

## Out of scope

- Backend 的五項資格查詢、transaction／lock、provider balance query、最多等候 5 秒、雙向歸零、再次確認、audit log 寫入與 race-condition handling。
- 存款成功、提款成功、人工出入款、投注、結算、獎勵、利息寶、轉帳錢包等 backend system-event triggers；Notion 2026-06-18 的最新文字又將主要自動檢查時機收斂到充值前後，最終 backend scope 由 GSI-263 決定。
- 會員端進出款頁呼叫 `GET /platform/v1/player/wallet/audit-turnover-reset` 與「每一個版型」調整；應由會員端 repo 另開 spec。Apifox contract 為：
  - AuthJwt，無 permission code，不寫 operation log。
  - 進頁對該會員所有啟用中 wallet 做 best-effort 歸零；個別失敗不阻擋 response。
  - response data：`{ wallets: WalletAuditResetResult[] }`。
- 稽核歸零後依 Void／派彩補回清除前稽核。
- 新增或修改會員稽核調整 dialog、會員稽核調整獨立頁或其 permission。
- 修改操作記錄列表版面、filter、table 或 export；除非正式 page id 無法顯示且需求方另行確認。
- 新 route、menu entry、route-level permission、local locale files、與本需求無關的網站設定／會員列表整理。

## 驗收條件

### Gates

- [x] Gate 1 已確認為所有代理／所有站台共用，不需要 capability 或 site-specific 判斷。
- [ ] Gate 2 已依本 spec 在 DEV 網站完成 changed-row、未修改 row、關閉／重新開啟與 reload 測試，最終 PUT／threshold 語意及 raw evidence 已回填本 spec。
- [ ] Gate 3 已透過 DEV Network 確認 settings PUT 的 backend `3520702` 驗證與 PUT response behavior，結果已回填本 spec；manual POST 已確認回傳 `msg: "success"`；frontend settings／manual permissions 已確認分別沿用所在頁面的 `permission.edit`。
- [ ] Gate 4 的既有 key mapping 與建議 key／中英文已由需求方比對確認，且 remote i18n 已可使用。

### 網站資訊設定

- [ ] Feature 在所有代理／所有站台的共用頁面顯示，沒有 NOV1／hostname／agent id hardcode。
- [ ] 「自動清除稽核設定」位於「重置密碼文案模板」下方，內容與 Notion 原圖的 section hierarchy、順序、狀態及 desktop 兩欄幣別排列一致。
- [ ] 五項條件完整顯示，只有第 1 項可編輯；第 2–5 項不會改變 backend 規則。
- [x] 五項條件的 info icon hover 均顯示各自完整說明文案，不再重複條件標題；已在 localhost 逐項 hover 驗證。
- [ ] 現金錢包 tab 正常顯示；站台未啟用贈金錢包時不顯示贈金 tab。
- [ ] 幣別由站台 currency API 產生，只有已開通幣別，沒有 hardcode；新增／移除幣別後 reload 能正確反映。
- [ ] 每個幣別可切換 enabled 並輸入非負 threshold；允許最多 4 位小數，拒絕負數、非數字與第 5 位小數。
- [ ] Default／missing／toggle-off／toggle-on 行為逐項符合 Gate 2，不因前端 fallback 改變 backend business semantics。
- [ ] GET 未設定 row 時 UI 為 disabled；不得採用 Notion 舊文案的 enabled + `0.0000` business default。
- [ ] Settings 沿用網站資訊設定頁既有 `permission.edit` 控制 toggle／input／Save；frontend 不新增獨立 settings permission node、view 分支或 permission-setting UI，PUT 的 `3520702` 由 backend 驗證。
- [ ] GET／PUT wrappers 使用 `/wallet/audit-turnover-reset-settings` + `{ usePlatform: true }`，沒有重複 `/platform/v1/agent` prefix。
- [ ] PUT body 為 `{ list }`，每筆欄位與 wallet type mapping符合 Apifox；同一次儲存只有一次 PUT，送出期間不能重複提交。
- [ ] PUT 成功後重查 GET 並以 GET payload hydrate；失敗不顯示成功、不清掉使用者輸入，且不呼叫既有 `/settings` PUT。

### 會員列表更新稽核

- [ ] 「更新稽核狀態」位於會員資訊頁「當前稽核」標題列，既有「會員稽核調整」按鈕與 dialog 行為不變。
- [x] 「更新稽核狀態」按鈕外部右側具有獨立的 `info_outline` icon；hover 顯示白底卡片、粗體標題、說明段落與兩個圓點條列，文案符合本 spec。已於 localhost 對照 2026-07-24 補充截圖驗證；三個新 remote keys 尚未下發前顯示中文 fallback。
- [ ] 只有會員列表頁 `permission.edit=true` 的使用者可見／可用新按鈕；只有 audit-adjustment edit 而沒有 member-list edit 的使用者不能使用。
- [ ] Wrapper 使用 `/member/${memberID}/wallet/audit-turnover-reset` + `{ usePlatform: true }`；點擊只送一次無 body POST，loading 期間不能重複點擊，且沒有需求外 confirmation。
- [ ] Backend 成功回覆且所有 wallet `reset=true` 時顯示既有多國語 `message.success` Toast；再重查 member detail 更新現金／贈金 current-audit rows，不由前端直接寫 0。
- [ ] Backend 回覆任一 `reset=false` 時仍視為成功檢查；不顯示成功 Toast，開啟結果 Modal並列出 response 中每一筆 wallet 的幣別、錢包類型與成功／失敗狀態。
- [ ] 九種正式 `skip_reason` 皆對應 Gate 4 的 remote i18n key；空白／未知值有安全 fallback。
- [ ] Backend／provider 查詢失敗時保留原畫面值、顯示 error，不能誤報已歸零。
- [ ] Invalid／missing member id 不送 request，且不造成 runtime error。

### 操作記錄與回歸

- [ ] 手動更新後，既有操作記錄頁可查到會員列表 page 與 `{Admin} updated audit status for {Player}` 的實際替換值。
- [x] 修改 enabled／threshold 後可查到網站資訊設定 page 的 operation log；`page_id=31802` 已映射並於 localhost 顯示 `System Information Settings`，同一次操作的兩類異動在同一筆 backend record。
- [ ] 不新增前端 operation-log write request。
- [ ] 沒有修改 route entry、menu visibility、其他 member edit tabs、其他 website settings、會員端或其他站台行為。
- [ ] Notion 原圖與實作頁面的 Playwright／Chrome 截圖已比對；spacing、字級、尺寸、顏色、圓角、欄位排列、tooltip 與 button state 無明顯差異，或差異已逐項記錄並經需求方接受。

## 邊界情況 / 例外

- Currency API 尚未完成時顯示既有 loading／empty pattern，不建立假幣別。
- Backend 回傳未知 wallet type／currency id 時，不可讓整個 page crash；記錄 contract mismatch，且不得把未知資料錯配到其他幣別。
- Apifox 定義 settings wallet type `1=Cash / 2=Bonus / 3=Reward`；repo 對應為 `1=一般／現金`、`2=撲滿`、`3=贈金`。目前 UI 只編輯 type `1`／`3`，GET 若回 type `2` 不得誤顯示在贈金 tab，也不得在 PUT 無意覆蓋。
- Threshold `0` 與 disabled 是不同狀態：`enabled=true, threshold=0.0000` 代表餘額小於等於 0 時可進入其餘條件判斷；`enabled=false` 代表該幣別不參與。
- Cash／reward（現金／贈金）wallet 同幣別設定是兩筆獨立資料，切 tab 不得互相覆蓋。
- API 送出中 route change／component unmount 不得在已卸載畫面寫入 stale state。
- 會員同時發生 wallet change 時，前端只接受 backend 最新結果；不得以點擊前 snapshot 覆蓋後來的值。
- POST response `skip_reason` 可能是空字串或未知值；空字串顯示既有 `common.unknow`，未知值顯示 backend 原始值，且不得讓 page crash。
- 手動檢查可能耗時（含 provider 查詢）；timeout 與 error wording 依正式 backend contract，不在前端自行假定 5 秒即失敗。

## 測試計畫

- Repo 現況：`npm test` 只是 placeholder，沒有現成 spec/test runner；不得為本 feature 引入整套新測試框架。
- 仍須撰寫並執行最小 temporary test artifact（不納入 commit），覆蓋：
  - cash／bonus + currency key 不互相覆蓋；
  - GET missing row → disabled，以及 enabled／threshold normalize、PUT full／partial cases（依 Gate 2 結論）；
  - `0`、`0.0000`、四位小數接受，第五位小數／負數／非數字拒絕；
  - bonus-wallet disabled 時 tab visibility；
  - member-list edit permission 與 audit-adjustment permission 的交叉矩陣；
  - manual API 回覆 all-reset 時顯示成功 Toast；mixed／all-skipped 時開啟 Modal 並列出所有 wallet；九種正式 `skip_reason`、空白／未知 reason、error flow 皆有覆蓋。
- Temporary test 若因正式 code 與 repo toolchain無法執行，實作者必須在交付前回報精確限制，不能用 `npm test` placeholder 當成測試通過。
- Focused validation：
  - `git --no-pager diff --check -- <touched-files>`
  - 對 touched `.vue`／`.ts` 執行 focused Prettier check 與 focused ESLint；不修 unrelated lint。
  - 本 repo 不執行 `tsc --noEmit`。
- 手動 API／UI 驗證至少涵蓋：
  - 有／無贈金錢包；一個、兩個、奇數個與多個幣別。
  - website edit 有／無權限。
  - member-list edit 有／無權限，以及只有 audit-adjustment edit 的使用者。
  - GET missing default、threshold toggle、四位小數、PUT success→GET、PUT failure、reload round trip。
  - manual POST 的 all reset、all skipped、mixed reset/skip、error、double-click 與 invalid member id。
  - operation log 兩種 page／三種 content。
- 視覺驗證：用 Chrome 開本地頁，固定 desktop viewport，對照 Notion 兩張原圖截圖；回報 screenshot path 與所有仍存在的差異。
- 測試檔／temporary artifact 在 commit 前移除或 unstage；production code commit 不包含測試檔。

## Git Flow

- 基底分支：`main`。
- 工作分支：`feat/ns-257-wallet-audit-auto-reset`。
- 實作者開始前：
  1. 在 Dashboard repo 確認 worktree，不碰 `src/assets/env/environment.json`。
  2. 依 HTTPS token 規則先做 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` auth probe。
  3. 切到 `main`、pull 最新，再從最新 `main` 建立上述工作分支。
- 不可直接在 `main`、`develop`、`staging` 或其他共享分支實作。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（上線）；每階段測試通過才進下一關。
- Commit 前需取得使用者針對該次提交的明確確認；不得沿用先前確認自行 commit。
- 合併到任何分支前需使用者確認；若 merge conflict，停止並回報，不自行解 conflict 或改策略。

## 交接備註給實作者

- Backend 已更新，可直接建立／切換工作分支開始串接；Gate 2、3 在 DEV 網站完成連線測試後回填本 spec，不需要在實作前另等口頭答覆，但沒有 raw evidence 前不得宣告完成。
- 先讀本 spec、Notion 原文與兩張 UI 圖，再讀本 spec 列出的 repo reference files；不要把 Notion 裡較早的「Void 後補回稽核」表格當成最終需求。
- 實作前明確列出 `webSiteSetting.ts`／`member.ts` wrappers、central contracts、first callers、permission usage point 與新增 feature-local component；所有 platform wrapper 使用相對路徑 + `usePlatform`。
- 不搜尋、建立或修改 local locale JSON；不修改 `src/assets/env/environment.json`。
- 完成後由另一 context 對照本 spec 驗收條件逐條 review；若需求中途改變，先更新 spec 再繼續。
