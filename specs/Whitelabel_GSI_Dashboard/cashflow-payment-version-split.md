# Spec: 金流管理依 payment_version 拆分舊版 / 新版

> 交接合約：Spec 作者產出，指定實作者依此實作，reviewer 對照「驗收條件」review。Claude 與 Codex 的角色可以互換。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/cashflow-payment-version-split.md`

## 背景 / 目標

後端 `/v1/agent/settings` 會回傳：

| 欄位 | 型別 | 說明 |
|---|---|---|
| `payment_version` | number | `1` = 舊版金流；`2` = 新版金流 |

目前後台金流已經加入新版金流群組、分類、排序、單次週期上限等能力。但部分站仍需要維持舊版金流行為，因此前端需依 `payment_version` 同時支援兩套金流管理。

目標：

- `payment_version = 1`：顯示舊版金流管理與舊支付類型管理。
- `payment_version = 2`：顯示新版金流管理與金流群組管理。
- 金流商戶管理不屬於本次新版金流分流，不需依 `payment_version` 改變。

## 範圍

### 1. Settings 接入 payment_version

- 現有 `getSettings()` 已會打 `/v1/agent/settings`：
  - Dashboard wrapper：`src/api/common.ts` 的 `getSettings() -> "/settings"`。
  - 既有 base path 為 `/v1/agent`，因此實際為 `/v1/agent/settings`。
- 在 `src/api/response.type.ts` 的 `GetSettings` 補上 `payment_version?: 1 | 2`。
- 在 `src/stores/siteStore.ts` 保存 `paymentVersion`。
- 預設值必須是 `1`，避免 settings 尚未載入或後端未回欄位時誤開新版。
- 加 getter：
  - `isOldPaymentVersion`: `paymentVersion !== 2`
  - `isNewPaymentVersion`: `paymentVersion === 2`

### 2. 金流管理拆兩套頁面

不要在同一套金流管理頁面大量用 `v-if payment_version` 切欄位；要直接拆成兩套頁面。

建議實作方式：

1. 先把目前新版金流管理整套複製到 `src/pages/CashFlowV2/`。
2. 原本 `src/pages/CashFlow/` 還原為舊版金流管理。
3. Route 依 `payment_version` 決定使用舊版或新版頁面。

建議複製到新版的頁面 / 元件：

| 現有檔案 | 新版建議目標 |
|---|---|
| `src/pages/CashFlow/List.vue` | `src/pages/CashFlowV2/List.vue` |
| `src/pages/CashFlow/Add/Index.vue` | `src/pages/CashFlowV2/Add/Index.vue` |
| `src/pages/CashFlow/Add/Step1.vue` | `src/pages/CashFlowV2/Add/Step1.vue` |
| `src/pages/CashFlow/Add/Step2.vue` | `src/pages/CashFlowV2/Add/Step2.vue` |
| `src/pages/CashFlow/Add/Step3.vue` | `src/pages/CashFlowV2/Add/Step3.vue` |
| `src/pages/CashFlow/Edit.vue` | `src/pages/CashFlowV2/Edit.vue` |
| `src/pages/CashFlow/components/CashFlowTableAgent.vue` | `src/pages/CashFlowV2/components/CashFlowTableAgent.vue` |
| `src/pages/CashFlow/components/CashFlowTableAdminMaster.vue` | `src/pages/CashFlowV2/components/CashFlowTableAdminMaster.vue` |

可共用的元件如 quick amount 相關檔案，若未因版本分流產生差異，可維持共用；若 import path 變複雜，允許複製到 `CashFlowV2/components/`，但不得改變行為。

新版 `CashFlowV2` 必須保留目前已實作的新欄位與 API 行為：

- 金流管理新增/編輯的分類下拉 `group_id`。
- 分類下拉等選擇支援幣別 `currency` 後才打 `getPaymentGroupList`。
- 分類下拉 request 可送 `offset / size / currency / payment_method`。
- 分類下拉 response 仍需以前端依 `currency / payment_method` 二次過濾。
- 新增/編輯的單次週期上限 `max_amount_per_cycle`。
- 新增/編輯的排序權重 `sort_priority`。
- 列表的單次週期上限、排序權重、分類欄位。
- 新版送出 payload 包含 `group_id / max_amount_per_cycle / sort_priority`。

### 3. 舊版 CashFlow 還原規格

`src/pages/CashFlow/` 作為舊版頁面，必須恢復到「新版金流群組改動前」的金流管理行為。

舊版金流管理必須符合：

- 不顯示分類下拉。
- 不打 `getPaymentGroupList` / `payment/group/list`。
- 不顯示 / 不送 `group_id`。
- 不顯示 / 不送 `max_amount_per_cycle`。
- 不顯示 / 不送 `sort_priority`。
- 列表不顯示分類、單次週期上限、排序權重欄位。
- 新增 / 編輯 payload 不包含新版欄位。

建議還原參考：

- `git show 1b7801e9^:src/pages/CashFlow/Add/Step2.vue`
- `git show 1b7801e9^:src/pages/CashFlow/Edit.vue`
- `git show 1b7801e9^:src/pages/CashFlow/components/CashFlowTableAgent.vue`
- `git show 1b7801e9^:src/stores/cashflowStore.ts`

注意：

- 不要用破壞式 git checkout 直接覆蓋整個工作區。
- 若舊檔與目前 develop 有其他非本需求改動，需人工比對後只移除新版金流欄位，不可回退 unrelated 修正。
- Shared API types 可以保留新版欄位，但舊版頁面不得使用或送出。

### 4. 支付類型管理 / 金流群組管理依版本互斥

舊版與新版 menu / route 需互斥：

| payment_version | 顯示 | 隱藏 |
|---|---|---|
| `1` | 支付類型管理 | 金流群組管理 |
| `2` | 金流群組管理 | 支付類型管理 |

#### 舊版：復原支付類型管理

目前支付類型管理在 commit `1b7801e9` 被移除，需復原：

- `src/pages/CashFlow/PaymentTypeManagement.vue`
- route：`/CashFlow/PaymentTypeManagement/`
- route name：`PaymentTypeManagement`
- i18n key：`menu.payment_type_management`
- 權限：
  - `A_F_PAYMENT_TYPE_SETTING = 3330500`
  - `A_A_PAYMENT_TYPE_SETTING_VIEW = 3330501`
  - `A_A_PAYMENT_TYPE_SETTING_EDIT = 3330502`
- API wrappers：
  - `getAvailableTypeSettings() -> GET /payment/available_type/setting`
  - `putAvailableTypeSettings(payload) -> PUT /payment/available_type/setting`

復原參考：

- `git show 1b7801e9^:src/pages/CashFlow/PaymentTypeManagement.vue`
- `git show 1b7801e9^:src/router/routes.ts`
- `git show 1b7801e9^:src/utils/constants/permission.ts`
- `git show 1b7801e9^:src/api/common.ts`

#### 新版：保留金流群組管理

`payment_version = 2` 時顯示現有金流群組管理：

- `src/pages/CashFlow/PaymentGroupManagement/Index.vue`
- `src/pages/CashFlow/PaymentGroupManagement/List.vue`
- `src/pages/CashFlow/PaymentGroupManagement/Edit.vue`
- route：`/CashFlow/PaymentGroupManagement/`
- 權限維持現況：
  - `A_F_PAYMENT_GATEWAY_GROUP_NEW = 3330600`
  - `A_A_PAYMENT_GATEWAY_GROUP_VIEW_NEW = 3330601`
  - `A_A_PAYMENT_GATEWAY_GROUP_EDIT_NEW = 3330602`

### 5. Route / menu 分流

需要讓側邊選單與進入頁面都依 `siteStore.paymentVersion` 切換。

可接受的實作方向：

1. 在 routes meta 加版本條件，例如：
   - `meta.paymentVersion: 1`
   - `meta.paymentVersion: 2`
2. 在 menu / permission 產生處統一過濾版本條件。
3. Route guard 或 redirect 補防呆：
   - 舊版站直接打新版 route 時，導回舊版金流管理或顯示無權限。
   - 新版站直接打舊支付類型管理 route 時，導回新版金流管理或顯示無權限。

需要先找現有 menu 產生與 permission filter 的實作點，不要在多個頁面硬塞散落判斷。

金流管理主入口建議：

- URL 若要保持相容，仍可保留 `/CashFlow/List/`，但其 component 或 redirect 依 `payment_version` 指向舊 / 新頁。
- 若新增明確新版 route，例如 `/CashFlow/V2/List/`，也必須確保 menu 只顯示正確版本，且舊 URL 有合理 redirect。

### 6. 金流商戶管理不分流

以下功能不屬於本次版本切換範圍，不需依 `payment_version` 改動：

- `/CashFlow/CashFlowMerchantManagement/`
- `src/pages/CashFlow/CashFlowMerchantManagement.vue`
- `src/pages/CashFlow/CashFlowMerchantManagement/Setting.vue`
- `payment/gateway/connection*` 相關 API

## Out of scope

- 不改會員端。
- 不改後端 API。
- 不改金流商戶管理。
- 不新增或改動遠端 i18n key；若舊頁已有 `$t(...)` key，直接沿用。
- 不重新設計 UI。
- 不更動非金流版本分流相關的權限、route、table、filter、modal。
- 不合併 develop / staging / main；合併需使用者另行確認。

## 受影響範圍

- 端別：代理端 `Whitelabel_GSI_Dashboard`。
- 預期影響檔案 / 模組：
  - `src/api/common.ts`
  - `src/api/response.type.ts`
  - `src/stores/siteStore.ts`
  - `src/router/routes.ts`
  - `src/utils/constants/permission.ts`
  - `src/pages/CashFlow/**`
  - `src/pages/CashFlowV2/**`（新增）
  - menu / route permission filter 所在檔案（實作者需搜尋現有實作點）
- 跨站影響：
  - 這是共用 Dashboard 功能，會影響所有代理站。
  - 行為由後端 `payment_version` 控制；缺值或非 2 時一律視為舊版。

## 參考實作 / 要遵循的現有 pattern

- Settings 載入：
  - `src/api/common.ts` 的 `getSettings()`
  - `src/composables/useLanguage.ts` 的 `getAgentSetting()`
  - `src/stores/siteStore.ts` 的 `updateSiteSetting()`
- 金流管理現況：
  - `src/pages/CashFlow/List.vue`
  - `src/pages/CashFlow/Add/Step2.vue`
  - `src/pages/CashFlow/Edit.vue`
  - `src/pages/CashFlow/components/CashFlowTableAgent.vue`
- 新版金流群組管理：
  - `src/pages/CashFlow/PaymentGroupManagement/List.vue`
  - `src/pages/CashFlow/PaymentGroupManagement/Edit.vue`
- 舊支付類型管理復原來源：
  - `git show 1b7801e9^:src/pages/CashFlow/PaymentTypeManagement.vue`
  - `git show 1b7801e9^:src/api/common.ts`
  - `git show 1b7801e9^:src/router/routes.ts`
  - `git show 1b7801e9^:src/utils/constants/permission.ts`

## 關鍵決策與理由 (Key decisions)

- 決定將金流管理拆成舊版 `CashFlow` 與新版 `CashFlowV2` 兩套，而不是在同一套頁面大量加條件判斷；理由是新版金流後續仍可能增加欄位與 API，拆分後舊版穩定、互相影響較小。
- 決定 `payment_version` 缺值時視為舊版；理由是舊版是保守 fallback，避免 settings 尚未載入時誤顯示新版入口或打新版 API。
- 決定金流商戶管理不分流；理由是使用者確認金流商戶管理沒有改到這次新版金流需求。
- 決定舊版恢復支付類型管理，新版顯示金流群組管理；理由是支付類型管理原本在舊版存在，後來才由金流群組管理取代。
- 決定先複製目前新版金流管理到 `CashFlowV2`，再清理原 `CashFlow`；理由是目前工作分支上的金流管理已包含新版行為，先保存可避免還原舊版時遺失新版成果。

## 驗收條件

- [ ] `/v1/agent/settings` 回 `payment_version = 1` 時，`siteStore.paymentVersion` 為 `1`，`isOldPaymentVersion` 為 true。
- [ ] `/v1/agent/settings` 回 `payment_version = 2` 時，`siteStore.paymentVersion` 為 `2`，`isNewPaymentVersion` 為 true。
- [ ] `/v1/agent/settings` 未回 `payment_version` 或回非 2 值時，前端以舊版處理。
- [ ] 舊版站 menu 顯示「支付類型管理」，不顯示「金流群組管理」。
- [ ] 新版站 menu 顯示「金流群組管理」，不顯示「支付類型管理」。
- [ ] 金流商戶管理在舊版與新版都維持現有顯示與權限邏輯。
- [ ] 舊版金流管理新增/編輯頁不顯示分類、單次週期上限、排序權重。
- [ ] 舊版金流管理新增/編輯頁不打 `payment/group/list`。
- [ ] 舊版金流管理新增/編輯送出 payload 不包含 `group_id / max_amount_per_cycle / sort_priority`。
- [ ] 舊版金流管理列表不顯示分類、單次週期上限、排序權重欄位。
- [ ] 新版金流管理頁由 `CashFlowV2` 承載，保留目前分類、單次週期上限、排序權重等新版行為。
- [ ] 新版金流管理分類下拉必須在選擇支援幣別 `currency` 後才打 `payment/group/list`。
- [ ] 新版金流管理分類下拉 request 帶 `offset / size / currency / payment_method`，且 response 仍依 `currency / payment_method` 做前端過濾。
- [ ] 舊版支付類型管理可讀取 `GET /payment/available_type/setting` 並顯示存款/取款允許類型 checkbox。
- [ ] 舊版支付類型管理可用 `PUT /payment/available_type/setting` 保存設定。
- [ ] 直接輸入不屬於目前版本的 route 時，不會進入錯版頁面；需導回對應版本頁面或顯示既有無權限頁。
- [ ] 實作沒有改動 `src/assets/env/environment.json`。

## 邊界情況 / 例外

- Settings 載入前 menu 若已 render，應先以舊版或 loading-safe 狀態處理，不能短暫顯示新版再消失。
- 若使用者從舊版切到新版後瀏覽器仍記住舊版 route，需要有防呆 redirect。
- 若使用者從新版切回舊版後瀏覽器仍記住新版 route，也需要防呆 redirect。
- 舊版 route 復原時要保留現有權限系統，不可讓無 edit 權限者可修改支付類型。
- 若後端仍回新版欄位給舊版 list/detail，舊版 UI 可以忽略，不需主動清除 response。

## 測試計畫

最小驗證：

- `git --no-pager diff --check -- <touched files>`
- focused ESLint：針對 touched `.ts/.vue` files 執行 `npx eslint -c ./eslint.config.js ...`
- 不執行 `tsc --noEmit`，依 repo 規則避免。

建議手動驗證：

1. Mock 或暫時攔截 `/v1/agent/settings` 回 `payment_version: 1`。
2. 確認 menu 顯示支付類型管理、不顯示金流群組管理。
3. 進入金流管理新增 / 編輯，確認沒有新版欄位且 network 不打 `payment/group/list`。
4. 保存舊版金流，確認 payload 不含 `group_id / max_amount_per_cycle / sort_priority`。
5. 進入支付類型管理，確認可讀取與保存。
6. Mock 或暫時攔截 `/v1/agent/settings` 回 `payment_version: 2`。
7. 確認 menu 顯示金流群組管理、不顯示支付類型管理。
8. 進入新版金流管理新增 / 編輯，確認分類、單次週期上限、排序權重存在。
9. 確認分類下拉在未選支援幣別時不打 API；選幣別後才打 `payment/group/list`。
10. 確認金流商戶管理在兩個版本都維持可見性與既有功能。

測試檔：

- 若新增臨時測試或 mock 輔助檔，驗證後不要 commit 測試檔，或 commit 前 unstage / 移除。

## Git Flow

- 基底分支：`main`（實作者開始前先 pull 最新）。
- 工作分支名稱：`feat/cashflow-payment-version-split`。
- 實作者開始前必須先從 `main` 開出上述工作分支；不可直接在 `main`、`develop`、`staging` 或其他共享分支上實作。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（上線），每階段測試過才進下一關。
- Commit 前需取得使用者針對該次提交的明確確認；不得沿用先前確認自行 commit。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

- 先依 Git Flow 從 `main` 開出 `feat/cashflow-payment-version-split`。
- 實作第一步先保存目前新版金流管理到 `CashFlowV2`，避免還原舊版時遺失新版成果。
- 復原舊支付類型管理時，以 `1b7801e9^` 的檔案內容作為來源，但要人工合併到目前 develop/main 結構，不可直接覆蓋 unrelated 新改動。
- 若發現支付類型管理的 i18n key 在遠端缺失，不要自行新增 local locale；先回報使用者確認文案。
- 若實作過程發現 menu / route filter 無法在 settings 載入後動態更新，需回報並更新本 spec，再繼續。
