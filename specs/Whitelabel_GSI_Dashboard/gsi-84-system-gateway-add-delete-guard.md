# Spec: GSI-84 系統預設金流不可新增／刪除

> 交接合約：本 spec 是 Claude / Codex 實作與 reviewer 驗收此子需求的單一依據；若 API contract 或需求變更，先更新本 spec，再繼續實作。
>
> 正式位置：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-84-system-gateway-add-delete-guard.md`

## 需求來源

- Jira：[GSI-84](https://gamingsoft.atlassian.net/browse/GSI-84)「[需求 總單]新增 GSI Pay 為預設金流」。
- 使用者於 2026-07-20 補充：代理端「金流管理」中的 GSI Pay 不可由前端再次新增，也不可刪除；backend 已有刪除防護，frontend 仍需阻擋。
- Backend 新增控制欄位：`is_system`。
- 已確認的新增選項 API：`GET v1/agent/payment/gateway/setting`；目前 frontend wrapper 為 `getGatewaySetting()`，relative path `payment/gateway/setting`。
- 父整合規格：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-84-gsi-pay-integration.md`。
- 端別：代理端 `Whitelabel_GSI_Dashboard`。

## 背景 / 目標

GSI Pay 是 backend 為各站點建立及維護的系統預設金流。現在代理端仍可能在新增流程看見對應的 gateway setting，也會在金流列表顯示刪除垃圾桶，造成使用者重複新增或嘗試移除系統資料。

本需求以前後端雙層防護處理：backend 保留最終寫入／刪除保護；frontend 依 backend 的 `is_system` 明確隱藏系統金流的新增選項及刪除入口，避免讓使用者進入必定失敗或不允許的操作流程。

## 範圍

1. 擴充 frontend response contract，使 gateway setting item 可讀取 backend 回傳的 `is_system: boolean`。
2. 金流新增 Step 2 載入 `payment/gateway/setting` 後，不渲染 `is_system === true` 的 setting，因此 GSI Pay 不可被手動選取及新增。
3. 金流列表對 `is_system === true` 的 row 隱藏刪除垃圾桶；同一 row 的既有編輯、重置額度、更新餘額、前台顯示 toggle 等功能維持原行為，除非另有獨立需求。
4. 刪除 handler 增加相同的 `is_system` guard，避免即使事件被程式方式觸發仍開啟確認 dialog 或呼叫 delete API。
5. 舊版與新版金流 UI 都需套用，因正式 route 經 `src/pages/CashFlowVersion/*` 依 `siteStore.isNewPaymentVersion` 動態切換 `CashFlow`／`CashFlowV2`。
6. 非系統金流（`is_system === false`）維持可新增、可刪除，並繼續受現有 `permission.edit` 控制。

## Out of scope

- 不隱藏整個「新增」按鈕；使用者仍可新增其他非系統金流。
- 不禁止 GSI Pay 的編輯、啟用／停用、前台顯示、重置每日額度或更新第三方餘額；本次只限制「新增」與「刪除」。
- 不修改 route、menu、route permission 或 page entry behavior。
- 不修改 backend 的建立、刪除或授權邏輯；frontend guard 不能取代 backend 防護。
- 不以 gateway 顯示名稱、`payment_gateway_name`、channel code、站點、幣別或固定字串辨認 GSI Pay。
- 不限制客戶自行開立的 Ultrapay；GSI Pay 與 Ultrapay 必須可共存，只有 backend 標記 `is_system === true` 的資料受保護。
- 不修改金流商戶管理、GSI Pay 帳戶費率／計費中心／交易報表、會員端或 `src/assets/env/environment.json`。
- 不新增提示文案、toast、tooltip 或 local locale files；刪除垃圾桶直接不顯示。
- 不自行 commit、merge、push或建立 MR／PR。

## API / 資料契約

### 新增選項

`GET v1/agent/payment/gateway/setting` 的每筆 setting response 至少包含既有欄位及：

```ts
type GatewaySettingItem = {
  max_amount?: string
  min_amount?: string
  name?: string
  payment_gateway_channel_code?: string
  payment_gateway_name?: string
  is_system: boolean
}
```

語意：

- `is_system === true`：backend 管理的系統預設金流；不得出現在人工新增可選清單。
- `is_system === false`：一般可由使用者管理的金流；維持既有新增流程。
- Frontend 不把名稱含 `GSI Pay`／`GSIPAY` 當作 system 判斷條件。

### 刪除按鈕的必要 contract gate

> 2026-07-20 更新：使用者確認 backend 已在 `payment/gateway/list` 加上 `is_system`，此 gate 已滿足，刪除 UI guard 已實作。

目前刪除垃圾桶渲染所使用的 row 來自 `GET payment/gateway/list`，型別是 `Response.GatewayItem`；使用者目前只明確指出 `payment/gateway/setting` 新增 `is_system`。僅有 setting response 的欄位不足以在列表可靠判斷每一列是否可刪除。

實作刪除 UI guard 前必須確認並滿足以下 contract：

```ts
type GatewayItem = {
  // existing fields...
  is_system: boolean
}
```

- `GET payment/gateway/list` 必須對每一列回傳 `is_system`，且語意與 setting endpoint 一致；或 backend 提供另一個可直接對應每一個 list row、無需名稱 hardcode、無 N+1 request 的等價欄位。
- 若測試環境的 list response 尚未提供此欄位，停止刪除 UI 實作並回報 backend contract gap；不得用 `payment_gateway_name === "GSIPAY"`、顯示名稱、幣別或 channel code 當暫時解法。
- Frontend type 中 `is_system` 應為 required boolean，避免 system protection 在 contract 漂移時靜默失效。
- Backend 的 delete endpoint 仍須拒絕刪除 system gateway；即使 frontend 欄位缺失、舊 bundle、手動 request 或 DOM 操作繞過 UI，資料仍不可被移除。

## 受影響範圍

- 端別：代理端 `Whitelabel_GSI_Dashboard`。
- 預期修改：
  - `src/api/response.type.ts`
    - `GatewaySettingItem.is_system`
    - 確認 list contract 後新增 `GatewayItem.is_system`
  - `src/pages/CashFlow/Add/Step2.vue`
  - `src/pages/CashFlowV2/Add/Step2.vue`
  - `src/pages/CashFlow/components/CashFlowTableAgent.vue`
  - `src/pages/CashFlowV2/components/CashFlowTableAgent.vue`
- 預期只驗證、不需修改：
  - `src/api/paymentGateway.ts` 的 `getGatewaySetting()`、`getGatewayList()`、`deletePaymentGateway()` wrappers
  - `src/pages/CashFlowVersion/List.vue`、`src/pages/CashFlowVersion/Add.vue` 的版本切換
  - `src/router/routes.ts` 的既有 CashFlow route
- 跨站影響：這是全站點共用的代理端行為，不做單一 siteKey hardcode。所有 backend 標記為 system 的 gateway 都受相同 UI 規則保護。

## 參考實作 / 要遵循的現有 pattern

- 新增選項載入：
  - `src/pages/CashFlow/Add/Step2.vue` 的 `loadGatewaySettings()`／`loadCryptoGatewaySettings()`。
  - `src/pages/CashFlowV2/Add/Step2.vue` 的同名流程。
  - 沿用既有在 assignment 前以 response item filter 產生可選清單的方式，不另建 API 或 shared store。
- 列表刪除：
  - `src/pages/CashFlow/components/CashFlowTableAgent.vue` 的 delete button、`onDelete()`、`handleDelete()`。
  - `src/pages/CashFlowV2/components/CashFlowTableAgent.vue` 的同名流程。
- 權限：維持 `permission.edit` 現有 action column 與按鈕控制；`is_system` 是 feature data rule，不是 route／permission bit。
- API wrapper：沿用 `src/api/paymentGateway.ts` 的 standard helper 與 unwrapped payload generic，不建立新 endpoint wrapper。

## 詳細行為

### 不可新增

- `getGatewaySetting(params)` 成功且 `code === 0` 時，先從 response `data` 排除所有 `is_system === true` items，再 assign 給畫面使用的 `gatewaySettings`／`cryptoGatewaySettings`。
- Filter 套用於舊版與 V2，也套用一般第三方與 crypto third-party setting 流程；判斷只看 `is_system`，不另外判斷 GSI Pay 名稱。
- `is_system === false` 的 options 保持既有 key、label、選取、form mapping 與 submit behavior。
- 若 response 全部是 system items，該 setting 區塊呈現沒有可選 radio 的既有空狀態，不自動選取 system item、不自行建立替代 option，也不新增文案。
- API error handling 維持現有行為；不把 API error 當成 system item，也不改全頁 submit/error flow。

### 不可刪除

- 在 agent mode 的金流列表，`is_system === true` row 不 render delete `<q-btn>`／垃圾桶 icon。
- Action column 本身仍依 `permission.edit` 顯示，system row 的其他既有 actions 不受影響。
- `onDelete(row)` 在任何 dialog state mutation 前先檢查 `row.is_system`；為 `true` 時直接 return。
- Dialog state 應保留足以在 `handleDelete()` 再次驗證 system 狀態的資料；`handleDelete()` 對 system row 必須關閉／不開啟 loading，且不得呼叫 `deletePaymentGateway()`。
- 非 system row 維持既有確認 dialog、loading、成功通知與 re-search 行為。
- Admin／master table 現況沒有此 agent-side delete action，本次不新增或更動。

## 關鍵決策與理由

- 以 `is_system` 作唯一識別：GSI Pay 與客戶自行開立的 Ultrapay 可以同時存在，名稱或 provider code 判斷容易誤傷並會隨命名調整失效。
- 隱藏特定新增 options，不隱藏全域 Add：需求只禁止重複建立 system gateway，其他 gateway 的 CRUD 能力必須保留。
- 同時處理 `CashFlow` 與 `CashFlowV2`：正式 route 是 runtime wrapper，只有改其中一版會造成站點間行為不一致。
- 刪除按鈕與 handler 雙重 guard：隱藏 icon 滿足操作介面要求，handler guard 避免 component event 被非預期方式觸發；backend 仍是最終安全邊界。
- 不從 setting endpoint為列表逐列補查：list row 可能很多，依 currency／type／method 發出額外 requests 會形成 N+1、loading race與contract拼接問題；列表應直接回傳刪除所需的 `is_system`。
- `is_system` 是資料層級限制，不改權限：route access與 edit permission維持既有語意，避免把 feature-level visibility誤改成 page access。

## 驗收條件

> Reviewer 必須逐條判斷；任一條不符合即不通過。

- [ ] `GatewaySettingItem` 已宣告 required `is_system: boolean`，且 `getGatewaySetting()` 保持回傳 callers 使用的 unwrapped setting array。
- [ ] 舊版與 V2 新增 Step 2 都不渲染任何 `is_system === true` 的 gateway setting option。
- [ ] `is_system === false` 的一般金流仍可依既有流程選取、填寫並新增。
- [ ] Frontend 沒有使用 `GSIPAY`、`GSI Pay`、Ultrapay、gateway name、channel code、幣別或 siteKey hardcode 判斷 system gateway。
- [ ] `payment/gateway/list` 已確認能對每個 row 提供 required `is_system`（或 spec 已先更新為 backend 確認的等價 row-level contract）；未滿足時不得宣稱刪除 UI 已完成。
- [ ] 舊版與 V2 agent table 的 `is_system === true` row 都不顯示刪除垃圾桶。
- [ ] System row 的 edit、toggle，以及 V2 既有 reset／balance refresh actions維持原行為。
- [ ] 非 system row 在有 `permission.edit` 時仍顯示刪除垃圾桶，確認 dialog、delete request、成功通知與重新查詢維持正常。
- [ ] 直接觸發 system row 的 delete handler 不會開 dialog，也不會呼叫 `deletePaymentGateway()`。
- [ ] Backend delete endpoint 對 system gateway 的拒絕已在目標環境驗證，frontend 未把隱藏按鈕當成唯一安全措施。
- [ ] `siteStore.isNewPaymentVersion` 為 `false`／`true` 的兩套 runtime path 均完成驗證。
- [ ] CashFlow route、permission、其他金流 CRUD、GSI Pay／Ultrapay共存行為及其他站點未被改動。
- [ ] Touched files 通過 focused diff／format／lint／build checks，沒有缺少 imports／exports；未執行 `tsc --noEmit`。
- [ ] 驗證用暫存 test／fixture 檔未納入 commit。

## 邊界情況 / 例外

- `data` 為空陣列：維持沒有 gateway options；不報錯、不自動 fallback。
- 同一 response 同時包含 system 與非 system settings：只排除 system items，其餘順序與內容不變。
- GSI Pay 與客戶 Ultrapay 同時存在：只有 `is_system === true` 的 GSI Pay 受限制；`is_system === false` 的 Ultrapay仍可新增／刪除。
- 使用者沒有 `permission.edit`：維持現況，不顯示 action column／Add；不得因 `is_system` 額外改 permission behavior。
- System row 可能仍可編輯或切換顯示：這是本次明確保留的既有行為，不得順手鎖定。
- Frontend 與 backend rollout 不同步：若 setting/list 缺 `is_system`，不得 hardcode fallback。先確認 backend contract與部署狀態；delete endpoint仍應保護 system data。
- Backend delete回傳 system protection error：frontend沿用既有 request error flow，不新增未提供 remote i18n key 的文案。

## 測試計畫

### Deterministic verification

Repo目前沒有實際 test runner（`package.json` 的 `test` script只回報 `No test specified`），不要為本需求引入 test framework。實作者仍需建立不進 commit 的暫存測試／fixture或等價 deterministic check，至少覆蓋：

1. Setting fixtures混合 `is_system: true`／`false`：兩套 Add頁結果只保留非system option。
2. Setting fixtures全部為system：兩套 Add頁沒有可選radio，且form未被填入system gateway。
3. List fixtures混合 system／non-system rows：兩套 table只在non-system row渲染delete button。
4. 直接呼叫／觸發system row刪除流程：delete API mock／spy呼叫次數維持0。
5. Non-system row刪除流程：dialog與delete API仍各觸發一次，成功後仍re-search。

完成驗證後刪除或un-stage暫存 test／fixture；commit不得包含測試檔。

### Focused validation

- 使用 `.nvmrc` 的 Node 22。
- `git --no-pager diff --check -- <touched files>`。
- 對 touched `.vue`／`.ts` 執行 focused Prettier check與focused ESLint；不處理不阻塞本需求的既有lint問題。
- 執行最小可行 Quasar build，確認兩套lazy-loaded CashFlow components均可編譯。
- 不執行 `tsc --noEmit`／`vue-tsc --noEmit`。

### Chrome 手動驗證

依 repo規則用Chrome extension開啟本機app，分別驗證`siteStore.isNewPaymentVersion`的舊版與V2 path：

1. 有edit權限的agent進入`/CashFlow/List/`，確認system GSI Pay row沒有垃圾桶；non-system Ultrapay／其他gateway仍有垃圾桶。
2. 進入`/CashFlow/List/Add`，切換GSI Pay支援的currency／method／type，確認Network的`payment/gateway/setting` response含system item，但畫面不顯示該option。
3. 確認非system option仍可選取並完成既有新增流程。
4. 直接對system gateway呼叫backend delete endpoint，確認backend拒絕；記錄HTTP status／business error code供review，但不得把token或response中的敏感資訊寫入spec、log或commit。
5. 驗證GSI Pay與客戶自行開立的Ultrapay同時存在時，只有system row受限制。

## Git Flow

> 2026-07-20 更新（使用者決定）：`CashFlowV2`／`CashFlowVersion` 只存在 `feat/cashflow-group-management`（commit 73db1e1d「split cash flow by payment version」）及其下游（如 `develop`），尚未上 `main`；`feat/gsi-pay` 是 main-based 所以沒有 V2 檔案。改為單一分支從 V2 源頭 `feat/cashflow-group-management` 開出 `feat/gsi-pay-system-gateway-guard`，同時涵蓋 `CashFlow` 與 `CashFlowV2` 兩套修改，不再拆分。
>
> 影響：本分支的推進路徑不經 `feat/gsi-pay`；GSI-84 整合鏈另行協調。`response.type.ts` 的 `GatewayItem` 區塊上此分支已含 `max_amount_per_cycle` 等 develop-only 欄位，合進 `develop` 通常乾淨；合進其他 main-based 線時該區塊會有 conflict，屆時依規則停下回報。

- 整合父分支（原設計，本次已改變）：`feat/gsi-pay`。
- 實際基底分支：`feat/cashflow-group-management`。
- 工作分支名稱：`feat/gsi-pay-system-gateway-guard`。
- 實作者開始前先確認`feat/gsi-pay`已包含所有已獲批准的前置整合結果，切換到該父分支並取得使用者同意的最新狀態，再由父分支建立工作分支；不可從`develop`、其他GSI sibling branch或未批准的diff直接開發。
- 本需求完成並review通過後，只有在使用者明確批准時才能merge回`feat/gsi-pay`；不得自行merge或把父分支反向merge進工作分支。
- GSI-84整合完成後推進：`feat/gsi-pay` → `develop`（dev測試）→ `staging`（staging測試）→ `main`（production），每階段測試通過且取得使用者批准才進下一關。
- Commit前需取得使用者針對該次提交的明確確認；不得沿用先前確認。
- Merge conflict必須停止並回報，不自行resolve、rebase或改策略。

## 交接備註給實作者

- 先讀本spec、父整合spec與repo `AGENTS.md`，依Git Flow建立／切換到工作分支後才開始實作。
- 開始前用實際API response確認`is_system`型別與setting/list兩個consumer的可用性；只記錄必要schema，不保存敏感資料。
- 若list endpoint沒有row-level `is_system`，這是blocking contract gap：停止刪除UI部分並回報，不得猜名稱或發出N+1 setting requests。
- 嚴格只做system gateway的新增／刪除guard；若產品要連edit、toggle或其他actions一起鎖定，先更新本spec。
- 完成後由另一context逐條對照「驗收條件」review；若需求或contract需調整，先更新spec再繼續。
