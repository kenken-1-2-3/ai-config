# Spec: 會員代理返水事件 — 編輯頁可刪除「未有下級會員的 0 級會員」

- 需求單：ID 4855「[需求 代理端] 會員代理_未有下級會員的0級會員，可於會員代理返水事件中刪除帳號」
  https://app.notion.com/p/wowgaming/_-0-347fc5d788a9808a8e72c0be95edf42d
- 後端卡片：GSI-257（狀態 develop testing，後端由平台組處理）
  https://app.notion.com/p/381fc5d788a9801ea3eee65b29493a9e
- 企劃書：包網代理功能（Axure）https://hxlhn5.axshare.com/#id=audtwl&p=代理佣金設定&g=1
- 端別：代理端 = `Whitelabel_GSI_Dashboard`（本 repo）
- 目標頁：`/AgentMemberManagement/AgentMemberCommissionSetting/Edit/:id`（會員代理 → 代理佣金設定 → 事件編輯）
- 主檔案：
  - `src/pages/AgentMemberManagement/AgentMemberCommissionSetting/Edit.vue`
  - `src/pages/AgentMemberManagement/AgentMemberCommissionSetting/component/EventInfo1.vue`（僅 Edit.vue 使用，可放心改）
  - `src/api/agentMemberManagements.ts`（如需補 API 或型別）

## Git Flow（實作前必做）

- Base branch：`main`（先 `git pull` 更新 main 再開分支）
- 工作分支：`feat/agent-commission-event-delete-level0-member`
- 建立並切到工作分支後才開始實作。完成後不主動 merge、不主動開 MR。

## 背景 / 現況（實作前必讀）

1. 需求緣由：會員代理返水事件原規劃中，若 0 級會員**沒有下級會員**，應可在事件編輯頁中把該帳號從事件移除；4/19 測試發現未實作。現況是編輯頁的返水對象完全無法刪除。
2. 現況成因：`Edit.vue:8` 渲染 `<EventInfo :readOnly="true" ...>`（實為 `EventInfo1.vue`），而 `EventInfo1.vue:52` 的返水對象 `q-select` 綁了 `:disable="readOnly"` → 整個 select（含 chips 的 × 移除鈕）都被 disable。
3. 資料流：
   - 進頁面打 `GET commissions/settings/{id}`（`getAgentMemberCommissionSettingDetail`，`agentMemberManagements.ts:93`），回傳 `members`（含 `member_id`、`account`）。`Edit.vue:74` 把它 map 成 `form.member_ids`，`Edit.vue:96` 存成 `accountOption` 傳給 EventInfo1 顯示 chips。
   - 按「確定」打 `PUT commissions/settings/{id}`（`updateAgentMemberCommissionSetting`，`agentMemberManagements.ts:100`），payload 內含 `member_ids: number[]` → **刪除 = 把該會員從 `member_ids` 移除後照原本流程送出**，不需要新的刪除 API。
4. 「是否有下級」的資料來源（實作時先調查，擇一）：
   - **優先**：確認 dev 環境 `GET commissions/settings/{id}` 回傳的 `members` 是否已含 `next_level_count`（後端 GSI-257 在 develop testing，可能已補）。有的話直接用。
   - **備援**：`GET /commissions/settings/detail/{id}`（`getAgentMemberCommissionSettingListDetail`，`agentMemberManagements.ts:40`，列表 0 級會員詳細用）回傳每個會員的 `account`、`next_level_count`（見 `Level0Detail.vue` 用法）。Edit 頁掛載時多打這支，建 `member → next_level_count` 對照表。
   - 調查結果與採用方案記錄在後端卡片對應的「開發分支紀錄」或回報給 Ken。

## 變更需求

### 1) 返水對象 chips：無下級者可移除（`EventInfo1.vue`）

- 判斷規則：該會員 `next_level_count === 0` → chip 可移除（顯示 × 且可點）；`next_level_count > 0` → chip 不可移除（不顯示 ×）。
- 實作方向：返水對象 `q-select` 改用 `selected-item` slot 自訂 chip，`<q-chip :removable="isRemovable(opt)" @remove="...">`；移除時同步從 `form.member_ids` 剔除該 `member_id`。
- **僅開放「移除」**：編輯頁不得因此變成可新增返水對象 —— 下拉選單不可展開、不可輸入新增（維持現況只能看）。不能單純把 `:disable="readOnly"` 拿掉了事。
- 需要有下級人數資料才能判斷；資料來源見「背景 4」。

### 2) 送出（`Edit.vue`，預期不動或極小改動）

- 移除 chip 後按「確定」，沿用既有 `onSubmit()` → `PUT commissions/settings/{id}`，`member_ids` 為移除後的清單。
- 後端若驗證失敗（例如不允許清空所有成員、或該會員實際有下級），沿用既有錯誤處理：`$q.notify` 顯示後端回傳 `msg`。前端不自行發明驗證規則。

### 3) i18n

- 本次以「不新增任何 UI 文案」為目標（有下級者直接不顯示 × 即可，不需提示文字）。
- 若實作中發現必須新增任何多語系文案（例如 hover 提示「該會員有下級，無法刪除」），**先停下來向 Ken 確認各語系用詞**，不得自行翻譯。

## 不在本次範圍 / 不要動

- 新增流程（`Settings/Add/*`、`EventInfo.vue`）不動。
- 編輯頁其他欄位（事件名稱、結算週期、計算方式、錢包類型、派彩方式、返水比例、資格門檻）的唯讀/可編輯行為不動。
- 列表頁、Detail/Level0Detail/NestedDetail 等檢視頁不動。
- 後端 API 行為與驗證（GSI-257 範圍）不碰。
- `src/assets/env/environment.json` 不碰。
- 不主動修 ESLint（除非阻擋 build）。

## 驗收標準（review 逐項對）

- [ ] 編輯頁返水對象中，`next_level_count === 0` 的會員 chip 顯示可點的 × 移除鈕。
- [ ] 點 × 後 chip 消失，且該 `member_id` 從 `form.member_ids` 移除；按「確定」後 `PUT commissions/settings/{id}` 的 `member_ids` 不含該會員。
- [ ] `next_level_count > 0` 的會員 chip 不顯示 ×、無法移除。
- [ ] 編輯頁仍**無法新增**返水對象（不可展開下拉、不可輸入搜尋新增）。
- [ ] 移除後未按「確定」直接取消/離開，不會產生任何變更（無 API 呼叫）。
- [ ] 送出成功顯示既有 `message.edit_success` 通知並返回列表；後端回錯誤時顯示後端 `msg`。
- [ ] 新增流程（Add Step1–4）與編輯頁其他欄位行為不受影響。
- [ ] 未新增任何未經確認的多語系文案。

## 驗證方式

- dev 環境或本機連 dev API → 會員代理 → 代理佣金設定 → 找一個同時含「有下級」與「無下級」0 級會員的事件進編輯頁核對上述行為。
- stg 參考情境（需求單提供）：後台 agent-gsi1.gsiwl.com、事件「KATEST1025 返水事件」、0 級會員 KATEST1025（無下級，應可刪除）。
- 用瀏覽器 DevTools 確認 PUT payload 的 `member_ids` 正確。
- 測試檔不要進 commit。
