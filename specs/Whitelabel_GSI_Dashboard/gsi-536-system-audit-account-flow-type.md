# GSI-536 帳變明細新增「系統異動稽核」類型與對象

> 交接合約：本 spec 是 `Whitelabel_GSI_Dashboard` 實作與 review 的單一依據。需求、backend contract 或 remote i18n 有變更時，先更新本 spec，再繼續實作。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-536-system-audit-account-flow-type.md`

## Background / 背景與目標

- 問題：系統自動清除稽核會建立特殊帳變，但代理端尚未識別 backend 新類型，導致「帳變類型」與「帳變對象」無可讀名稱。
- 預期結果：`wallet_trans_type_id = 27` 與 `28` 的帳變，在「平台紀錄 → 歷史紀錄 → 帳變明細」兩欄皆顯示正式翻譯，下拉可選取並沿用既有查詢。
- 目標端別與 repo：代理端、`Whitelabel_GSI_Dashboard`。
- 原始需求：[Jira GSI-536](https://gamingsoft.atlassian.net/browse/GSI-536)。

## Spec Governance / 規格治理

- Role: `CANONICAL`
- Canonical spec: `SELF`

## Scope / 範圍

- 新增 backend-confirmed enum `AUDIT_TURNOVER_RESET = 27`。
- 將該 enum 映射至需求方確認並已發布的 remote i18n key。
- 帳變明細的「帳變類型」與「帳變對象」使用同一 mapping 顯示「系統異動稽核」。
- 既有帳變類型下拉收到 ID `27` 時顯示同一翻譯，查詢沿用 `transaction_type_ids=27`。
- 依 2026-08-10 使用者擴充決議，同時新增 `CHECKIN_REWARD = 28`，重用後台既有 key `menu.checkin_reward`，讓帳變類型、帳變對象與下拉顯示「Daily Check-in Reward／每日簽到獎勵／每日签到奖励」。

## Out of Scope / 不在範圍

- 不修改 backend 自動清除稽核、流水／稽核歸零、log snapshot 或造資料邏輯。
- 不新增或修改 API endpoint、request／response shape、route、menu 或 permission。
- 不修改欄位、欄序、表格樣式、金額／稽核額度格式、pagination、sorting 或 export。
- 不加入 `AUDIT_RELATED_ACCOUNT_FLOW_TYPES`；Jira GSI-536 僅要求帳變類型與帳變對象名稱。若要擴充「稽核相關項目」快捷篩選，先更新本 spec。
- 不加入 `transCodeTypes` 或 `transCodeShow`，不顯示／連結 `trans_code`。
- 不修改 NS-257 設定、會員列表「更新稽核狀態」、操作記錄頁或會員端。
- 不建立或修改 local locale JSON，不以 hardcode 中文或自行發明翻譯繞過 remote i18n。
- 不修改 `src/assets/env/environment.json`，不處理無關 lint。

## Source Responsibilities / 來源職責與版本

| Source ID | Snapshot / Revision | Responsibility | Location |
| --- | --- | --- | --- |
| SRC-REQ-001 | 2026-08-10 | Scope / behavior | Jira GSI-536：帳變類型與帳變對象皆顯示「系統異動稽核」 |
| SRC-REQ-002 | 2026-08-10 | Scope / behavior | [Notion 前單](https://app.notion.com/p/wowgaming/37dfc5d788a9800e86eed341c42988ae)：自動歸零須建立特殊帳變並保留 Before／After 快照 |
| SRC-REQ-003 | 2026-08-10 | Display semantics | [Notion 稽核明細](https://app.notion.com/p/wowgaming/1bbfc5d788a980d29240cc35e272b952)：稽核調整與帳變綁定、帳變金額顯示 0 |
| SRC-API-001 | 2026-08-10 live dropdown response | API / enum | `GET /wallet_trans/wallet_trans_type/dropdown` 回傳 `{ id: 27, wallet_trans_type: "AUDIT_TURNOVER_RESET" }` |
| SRC-API-002 | 2026-08-10 live dropdown response | API / enum | 同 response 回傳 `{ id: 28, wallet_trans_type: "CHECKIN_REWARD" }` |
| SRC-CODE-001 | `main` snapshot 2026-08-10 | Implementation pattern | `src/utils/constants/accountFlowType.ts` |
| SRC-CODE-002 | `main` snapshot 2026-08-10 | Implementation pattern | `src/pages/Reports/AccountFlowReport.vue` |
| SRC-CODE-003 | `main` snapshot 2026-08-10 | Existing API integration | `src/components/query/selects/accountFlowType.vue`、`src/stores/queryStore.ts`、`src/api/report.ts` |
| SRC-DEC-001 | 2026-08-10 | User decision | remote i18n：key `account_flow_type.audit_turnover_reset`；繁中「系統異動稽核」；英文 `System Audit Adjustment` |
| SRC-LOCALE-001 | 2026-08-10 backstage full snapshot + post-write read-back | Remote i18n create / reuse | CREATED `account_flow_type.audit_turnover_reset`；REUSED `menu.checkin_reward`；兩者 en／zh-TW／zh-CN 均 read-back verified |
| SRC-DEC-002 | 2026-08-10 | User decision | 使用者要求 API 新增的 ID `27` 與 `28` 都處理，維持同一 GSI-536 工作分支 |

來源責任：Jira／Notion決定產品範圍與顯示語意；live API response 決定 enum ID；使用者決議確認 remote i18n key／翻譯；repo 只提供既有 pattern。

## Requirement Traceability Matrix / 需求追蹤矩陣

| REQ-ID | Source anchor / asset | UI surface | API / persistence | Status | Decision ID | Acceptance ID | Verification ID / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | SRC-REQ-001; SRC-API-001; SRC-CODE-001; SRC-DEC-001 | N/A — enum 與翻譯 mapping | dropdown ID `27`; remote i18n key `account_flow_type.audit_turnover_reset` | CONFIRMED | DEC-001; DEC-004 | AC-001; AC-002 | VT-001; VT-002 |
| REQ-002 | SRC-REQ-001; SRC-CODE-002; SRC-DEC-001 | 帳變明細「帳變類型」欄 | `wallet_trans_type_id = 27` | CONFIRMED | DEC-002; DEC-004 | AC-003; AC-005 | VT-002; VT-003 |
| REQ-003 | SRC-REQ-001; SRC-REQ-002; SRC-REQ-003; SRC-CODE-002; SRC-DEC-001 | 帳變明細「帳變對象」欄 | 同一 row；不新增 persistence | CONFIRMED | DEC-002; DEC-003; DEC-004 | AC-004; AC-005 | VT-002; VT-003 |
| REQ-004 | SRC-API-001; SRC-CODE-003; SRC-DEC-001 | 帳變類型下拉 | `GET /wallet_trans/wallet_trans_type/dropdown`; `transaction_type_ids=27` | CONFIRMED | DEC-001; DEC-004 | AC-006 | VT-004 |
| REQ-005 | SRC-REQ-001; SRC-API-002; SRC-CODE-002 | 既有稽核快捷篩選與交易碼顯示保持不變 | 不新增 API contract | CONFIRMED | DEC-003 | AC-007; AC-008 | VT-001; VT-005 |
| REQ-006 | SRC-API-002; SRC-LOCALE-001; SRC-DEC-002; SRC-CODE-001 | N/A — ID `28` enum 與既有 key mapping | dropdown ID `28`; reuse `menu.checkin_reward` | CONFIRMED | DEC-005 | AC-009 | VT-006 |
| REQ-007 | SRC-API-002; SRC-LOCALE-001; SRC-DEC-002; SRC-CODE-002; SRC-CODE-003 | 帳變類型、帳變對象與下拉 | `wallet_trans_type_id = 28`; `transaction_type_ids=28` | CONFIRMED | DEC-005 | AC-010 | VT-006; VT-007 |

## Source Conflicts / 未決與來源衝突

- 無。
- Remote i18n 已完成 API read-back；DEV 畫面仍需在登入後重新載入驗證。

## Affected Area / 受影響範圍

- 端別、repo、route：代理端 `Whitelabel_GSI_Dashboard`、`/HistoryRecord/AccountFlowReport`。
- 預期直接修改：`src/utils/constants/accountFlowType.ts`、`src/pages/Reports/AccountFlowReport.vue`。
- 預期只驗證：`src/components/query/selects/accountFlowType.vue`、`src/stores/queryStore.ts`、`src/api/report.ts`。
- 跨站／共用程式影響：全站共用；Jira 的版型／客戶專案為全站，因此不做 siteKey 隔離。
- 不得碰的使用者既有 local changes：工作樹開始時無未提交變更；持續排除 `src/assets/env/environment.json`。

## Existing Patterns / 參考實作

- `src/utils/constants/accountFlowType.ts`：enum 與 `Record<Enums, string>` remote key mapping。
- `src/pages/Reports/AccountFlowReport.vue`：`accountFlowTypeFormat()`、`transactionTypes`、`transCodeTypes`、`transCodeShow`。
- `src/components/query/selects/accountFlowType.vue`：dropdown ID 經同一 `I18nKeys` 顯示翻譯。
- `src/api/report.ts`：`getAccountFlowType()` 與 `getAccountFlowList()`，本需求不新增 wrapper。
- `origin/develop`：已使用 `24` 錢包轉入、`25` 錢包轉出、`26` 兌換碼獎勵；實作時保留 additive entries，避免未來 promotion conflict。

## Decision Log / 關鍵決策與理由

| Decision ID | Date | REQ-ID | Decision + reason | Approval / source |
| --- | --- | --- | --- | --- |
| DEC-001 | 2026-08-10 | REQ-001; REQ-004 | frontend 採 backend 正式名稱與精確值 `AUDIT_TURNOVER_RESET = 27` | SRC-API-001 |
| DEC-002 | 2026-08-10 | REQ-002; REQ-003 | 帳變類型與帳變對象共用同一 `accountFlowTypeFormat()` 與 remote key，避免文案漂移 | SRC-REQ-001 |
| DEC-003 | 2026-08-10 | REQ-003; REQ-005 | 不擴充快捷篩選、交易碼或跳轉；GSI-536 僅交付兩欄可讀名稱 | SRC-REQ-001 |
| DEC-004 | 2026-08-10 | REQ-001; REQ-002; REQ-003; REQ-004 | remote key 使用 `account_flow_type.audit_turnover_reset`；繁中「系統異動稽核」；英文 `System Audit Adjustment` | SRC-DEC-001 |
| DEC-005 | 2026-08-10 | REQ-006; REQ-007 | 依使用者擴充決議處理 `CHECKIN_REWARD = 28`；remote i18n 重用語意相容的 `menu.checkin_reward`，不建立重複 key | SRC-DEC-002; SRC-LOCALE-001 |

## Acceptance Criteria / 驗收條件

- [x] AC-001: `src/utils/constants/accountFlowType.ts` 定義 `AUDIT_TURNOVER_RESET = 27`，且 `I18nKeys` 仍是完整 `Record<Enums, string>`。
- [x] AC-002: ID `27` 映射至需求方確認、已發布的正式 remote i18n key；繁中精確顯示「系統異動稽核」，不含 hardcode 或自行發明翻譯。
- [ ] AC-003: 收到 `wallet_trans_type_id = 27` 的 row 時，「帳變類型」顯示正式翻譯，不顯示空字串或 Unknown。
- [ ] AC-004: 同一 row 的「帳變對象」顯示同一正式翻譯。
- [ ] AC-005: 此類型不附加 `trans_code`、連結、跳轉或第二行未要求資訊；切換 locale 後兩欄同步更新。
- [ ] AC-006: dropdown 回傳 ID `27` 時，下拉顯示正式翻譯；選取後 request 沿用 `transaction_type_ids=27`。
- [x] AC-007: `AUDIT_RELATED_ACCOUNT_FLOW_TYPES`、`transCodeTypes`、`transCodeShow` 未加入 ID `27`。
- [x] AC-008: route、permission、API wrappers、central contracts、會員端與 `src/assets/env/environment.json` 均未修改。
- [x] AC-009: `src/utils/constants/accountFlowType.ts` 定義 `CHECKIN_REWARD = 28` 並映射至既有 `menu.checkin_reward`，未建立重複 remote key。
- [ ] AC-010: ID `28` 的帳變類型、帳變對象與下拉皆顯示 `menu.checkin_reward` 的 locale 文案；選取後沿用 `transaction_type_ids=28`，不附加交易碼或連結。

## Edge Cases / 邊界與狀態

- loading：沿用既有 dropdown／table loading，不新增狀態。
- empty：列表查無 ID `27` 資料時維持「查無資料」；不得新增 mock 或 production 資料。
- error / API unavailable：dropdown 未回傳 ID `27` 時不硬塞 UI option；回 backend 修正 contract。
- remote i18n unavailable：列表與下拉驗收受阻；不得 hardcode 中文補救。
- permission：沿用既有 route permission，不新增 feature permission。
- unknown IDs：除 `27` 外維持既有 fallback；本需求不重構 global unknown handling。
- localization：至少驗證繁中與英文；其他語系依需求方核准清單抽查。

## Verification Plan / 驗證計畫

- [x] VT-001: focused static assertion 確認 enum `27`／`28`、`I18nKeys` mappings 存在，且未加入 audit quick filter／trans-code sets；Evidence: 2026-08-10 Node focused assertions 8/8 PASS。
- [x] VT-002: `git --no-pager diff --check -- src/utils/constants/accountFlowType.ts src/pages/Reports/AccountFlowReport.vue`，並 read-back imports／exports；Evidence: 2026-08-10 PASS，diff 僅兩個預期檔案。
- [ ] VT-003: 在 DEV 準備或查找 ID `27` row，確認兩欄顯示同一翻譯且無交易碼；繁中／英文各驗證一次；Evidence: 待執行。
- [ ] VT-004: 開啟帳變類型下拉確認 ID `27` 的正式翻譯，選取後確認 URL／Network request 使用 `transaction_type_ids=27`；Evidence: 2026-08-10 已確認 backend dropdown 含 ID `27` 與既有查詢值，翻譯待 Gate 2 後重驗。
- [x] VT-005: 對兩個 touched files 執行 focused Prettier check 與 focused ESLint；不執行 `tsc --noEmit`，不修無關 lint；Evidence: 2026-08-10 `prettier --check` 與 focused ESLint 均 PASS。
- [x] VT-006: focused static assertion 確認 enum `28`、`menu.checkin_reward` mapping、`transactionTypes` membership，且未加入 trans-code sets；Evidence: 2026-08-10 PASS，並確認 Locale Manager key 為 REUSED、三語系 read-back verified。
- [ ] VT-007: DEV 下拉選取 ID `28`，確認正式翻譯、帳變兩欄與 `transaction_type_ids=28`；Evidence: 待執行。

臨時 assertion／測試檔不得進 commit；repo 現有 `npm test` 無實際 runner，不為本需求導入測試框架。

## Git Flow

- 基底分支：`main`；開始前先做非互動 HTTPS auth probe 並更新本地 `main`。
- 工作分支：`feat/gsi-536-system-audit-account-flow-type`。
- 推進路徑：工作分支 → `develop` → `staging` → `main`。
- 不可直接在共享或其他 ticket 分支實作；每次 commit／merge 都要先取得使用者針對該次操作的明確確認。
- 不 rebase；遇 conflict 停止並請使用者決定，不把 target branch 反向 merge 回工作分支。

## Handoff Readiness

- Status: `READY`
- User confirmation: CONFIRMED — 2026-08-10 使用者確認 27／28 都處理，記錄於 SRC-DEC-001、SRC-DEC-002、DEC-004、DEC-005。
- Active REQ IDs: `REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007`
- Structural check: `node ~/wow/ai-config/scripts/check-spec.js ~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-536-system-audit-account-flow-type.md`
- Ready check: `node ~/wow/ai-config/scripts/check-spec.js --ready ~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-536-system-audit-account-flow-type.md`

雙向 read-back 已完成；REQ-001～REQ-007 均有來源、AC 與 VT。ID `28` scope expansion 由 SRC-DEC-002 授權；remote key 發布屬 live 驗證依賴，不阻擋實作。

## Feature Completion Gate

- Status: `INCOMPLETE`
- Remaining / blocked REQ IDs: `REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007`
- Complete check: `node ~/wow/ai-config/scripts/check-spec.js --complete ~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-536-system-audit-account-flow-type.md`

## Implementation Handoff / 交接給實作者

- Spec path：`/Users/kenyu/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-536-system-audit-account-flow-type.md`
- Target repo / branch：`/Users/kenyu/wow/Whitelabel_GSI_Dashboard` / `feat/gsi-536-system-audit-account-flow-type`。
- Known blockers：無 locale blocker；localhost 目前停在登入頁，REQ-002～REQ-004 與 REQ-007 的 live row／下拉驗證待登入後完成。
- Report format：逐條回報 AC／VT 結果、實際 evidence、未驗證項；只宣稱 active REQ 完成。
