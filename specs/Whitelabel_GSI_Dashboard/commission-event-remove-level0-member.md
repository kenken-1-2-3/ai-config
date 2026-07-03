# 會員代理返水事件：編輯頁可刪除未有下級的 0 級會員

> 交接合約：Spec 作者產出，指定實作者依此實作，reviewer 對照「驗收條件」review。Claude 與 Codex 的角色可互換。
> 狀態：**草稿 — 「待確認事項」全數釐清前不可開工。**

## 背景 / 目標

- 會員代理功能初規劃時即設定：返水事件中，若 0 級會員**未有下級會員**，應可於事件（編輯頁）中刪除該 0 級會員帳號。2026-04-19 測試發現此環節未實作，PM 提出需求調整。
- 現況：編輯頁中既有成員（`initialMembers`）被前端多層鎖死，完全沒有移除入口（無論有無下級）。
- 來源需求：
  - 技術工單 4855：https://app.notion.com/p/wowgaming/_-0-347fc5d788a9808a8e72c0be95edf42d
  - GSI 後端卡片 GSI-257（狀態 develop testing，內容空白）：https://app.notion.com/p/381fc5d788a9801ea3eee65b29493a9e
  - 企劃書（Axure）：https://hxlhn5.axshare.com/#id=audtwl&p=%E4%BB%A3%E7%90%86%E4%BD%A3%E9%87%91%E8%A8%AD%E5%AE%9A&g=1
- stg 驗證資訊：後台 https://agent-gsi1.gsiwl.com/ 、已建立事件「KATEST1025 返水事件」、會員端 https://gsi1.gsiwl.com/ 、測試帳號 KATEST1025/KATEST1025。

## 範圍

1. 返水事件**編輯頁**（`src/pages/AgentMemberManagement/AgentMemberCommissionSetting/Edit.vue` + 共用元件 `component/EventInfo.vue`）：
   - 未有下級會員的 0 級會員，可從事件成員中移除。
   - 有下級會員的 0 級會員，維持不可移除（互動細節見待確認 Q4）。
2. 解除/調整現有的三層鎖定邏輯（`EventInfo.vue` 的 `isLockedMemberId`、`memberIdsModel` setter 強制合併、`Edit.vue` `onSubmit` 的 `missingLockedIds` 攔截），改為「僅鎖定有下級會員者」。
3. 串接後端刪除成員能力（API 形式見待確認 Q1），並更新 `src/api/agentMemberManagements.ts` 與 request/response 型別。
4. 移除操作的二次確認彈窗與成功/失敗訊息（沿用 `useDialog` + 既有 i18n pattern；新增文案見待確認 Q6）。

## Out of scope

- 列表頁（`List.vue`）被註解掉的「刪除整個事件」按鈕與其未串接的 `handleDelete`——本需求只處理「事件內移除單一 0 級會員」，不復活刪除事件功能。
- 新增頁（`Settings/Add/`）流程：create 模式本來就可移除未送出的選取項，不改動。
- `Level0Detail.vue` / `SubordinateDetail.vue` 唯讀明細頁：不加刪除入口（除非待確認 Q3 的答案要求）。
- 會員端（Multiverse）任何改動。
- 其他頁面的表格、篩選、版面、互動優化。
- 既有 lint 問題清理（含 `Edit.vue:247-258` 寫死中文「既有會員不可移除」——僅在本需求邏輯改寫必然觸及該段時一併走 i18n，不做額外掃除）。

## 受影響範圍

- 端別：**代理端** `Whitelabel_GSI_Dashboard`。
- 預期改動檔案：
  - `src/pages/AgentMemberManagement/AgentMemberCommissionSetting/Edit.vue`
  - `src/pages/AgentMemberManagement/AgentMemberCommissionSetting/component/EventInfo.vue`
  - `src/api/agentMemberManagements.ts`
  - `src/api/request.type.ts` / `src/api/response.type.ts`（型別擴充）
  - i18n 語系檔（新增確認文案 key）
- 跨站影響：工單標記「站台 ALL／全站」，此為後台共用功能頁，**所有代理站台的後台都會生效**，不屬單站需求，無隔離問題。但 `EventInfo.vue` 為新增/編輯共用元件，改動時必須確保 create 模式行為不變。

## 參考實作 / 要遵循的現有 pattern

- 成員 chip 可移除性控制：`EventInfo.vue:50`（`:removable="!isLockedMemberId(scope.opt)"`）——沿用同一機制，把判斷條件從「是否為既有成員」改為「是否有下級會員」。
- 二次確認彈窗：`List.vue:233-242` 的 `DialogType.EDIT` + `useActions: true` + `submitFunction` pattern（`src/components/dialogs/index.vue` + `src/hook/useDialog.ts`）。
- i18n 命名慣例：確認文案照 `common.sure_to_delete_commission`（`List.vue:96`）的 `common.sure_to_delete_*` 命名；成功訊息沿用 `message.delete_success` 或 `message.edit_success`。
- API service 寫法：照 `agentMemberManagements.ts:122-144`（`getAgentCommissionDetail` / `updateAgentCommission`，usePlatform）的既有風格。

## 關鍵決策與理由 (Key decisions)

- **在編輯頁既有的 q-select chip 介面上做移除**（除非 Q3 企劃書另有指示）：編輯頁成員呈現是 `q-select` multiple + chips，非表格；chip 的 X 是既有的移除互動，成本最低且與新增頁行為一致。
- **「有無下級」以後端回傳欄位為準，不在前端另外打 API 逐一查詢**：`Level0Detail.vue` 已示範 `next_level_count > 0` 的判斷模式；編輯頁應由 `GET commission/:id` 的 members 直接帶回同等欄位（待 Q2 確認後端支援）。前端自行輪詢每個成員的下級數會造成 N+1 請求。
- **保留「有下級者不可移除」的前端鎖 + 送出前檢查雙層防呆**：現有三層鎖是好的防呆結構，只改判斷條件、不拆架構；後端仍為最終防線（Q1 需含錯誤回應約定）。
- 現況 `updateAgentCommission` 的 payload 僅有 `new_members?: number[]`（`request.type.ts:2385-2389`），語意 append-only，**無法表達刪除**——API 合約必須先由後端定案（Q1），前端不得自行猜測欄位。

## 待確認事項（開工前必須全數釐清）

> 這些是 Notion 需求單與後端卡片都沒有寫的缺口。

- **Q1（後端 API 合約）**：刪除事件成員走哪個接口？
  - (a) `PUT /platform/v1/agent/commission/:id` 擴充 `removed_members: number[]`（隨表單送出），或
  - (b) 新開 `DELETE` 專用 endpoint（點擊即刪）？
  - 含：對「有下級會員」的成員請求刪除時，後端回應的錯誤碼/訊息格式。後端卡片 GSI-257 已在 develop testing，實際合約請直接向後端要 swagger/文件。
- **Q2（資料欄位）**：`GET commission/:id` 回傳的 `members` 是否包含 `next_level_count`（或等價的「有無下級」欄位）？目前前端 `CommissionMemberInitial` 只有 `account` + `member_id`，且 `GetPromotionDetail` 型別（`response.type.ts:2118-2156`）根本沒宣告 `members` 欄位——需要後端確認實際回傳結構後補齊型別。
- **Q3（UI 依據）**：企劃書 Axure 頁面中，編輯頁刪除的互動樣式為何（chip X？列表＋刪除按鈕？）？需求單截圖僅顯示現況無法刪除，未給目標 UI。若企劃書與現行 chip 介面不一致，以企劃書為準並更新本 spec。
- **Q4（有下級者的呈現）**：有下級會員的 0 級會員在編輯頁應如何呈現——隱藏移除鈕（現行 removable=false 模式）、disable 加 tooltip 說明、或可點擊但彈錯誤提示？
- **Q5（生效時機）**：移除是「點擊即呼叫 API 立即生效」還是「標記移除、隨表單一起送出」？（與 Q1 的 API 形式連動。）
- **Q6（多語文案）**：移除確認彈窗與成功/失敗訊息的各語系文案（正/簡/英…）需 PM 或使用者提供，**不得自行翻譯**。建議新 key：`common.sure_to_delete_commission_member`。
- **Q7（刪除後行為）**：被移除的會員是否應立即回到 `GET /commissions/no_event_members` 可選清單（可被重新加入本事件或其他事件）？列表頁 `zero_level_count` 是否即時更新即可、無其他連動？

## 驗收條件

> 逐條、可勾選、可客觀判斷。Review 依此判斷過／不過。（標 ⏸ 者依待確認事項答案定稿後生效。）

- [ ] 編輯頁中，`next_level_count = 0`（或 Q2 定案之等價欄位）的既有 0 級會員，可透過 UI 移除出事件成員。
- [ ] ⏸(Q4) 有下級會員（`next_level_count > 0`）的既有 0 級會員，無法被移除，且呈現方式符合 Q4 定案。
- [ ] 移除前跳出二次確認彈窗，取消則不變動；確認後依 Q1/Q5 定案呼叫 API。
- [ ] 移除成功後，該成員自編輯頁成員清單消失；重新整理/重進編輯頁後仍不存在（以 `GET commission/:id` 回傳為準）。
- [ ] 後端回傳「該成員有下級、不可刪除」錯誤時，前端顯示對應錯誤訊息且不變動成員清單。
- [ ] create 模式（新增頁 Step1）行為不變：選取中的成員 chip 仍可自由移除，送出流程不受影響。
- [ ] 編輯頁其他既有功能（成員新增、返水比例設定、事件名稱等欄位編輯與送出）行為不變。
- [ ] 新增/變更的 API 呼叫已在 `agentMemberManagements.ts` 與 request/response 型別中補齊型別定義。
- [ ] ⏸(Q6) 新增文案全部走 i18n key，各語系值採用 PM 提供之定稿，無寫死字串。
- [ ] 僅改動「受影響範圍」列出的檔案類別；未觸碰 Out of scope 項目。

## 邊界情況 / 例外

- 事件成員被移除到僅剩 0 名：後端是否允許事件無成員？（若不允許，前端需在最後一名成員移除時攔截——併入 Q1 向後端確認。）
- 併發：編輯頁停留期間，該會員在別處新增了下級 → 前端判斷可刪、後端拒絕。此即「後端錯誤回應」驗收條之情境，前端以後端結果為準並提示。
- 同一成員重複操作（連點移除）：確認彈窗與請求進行中狀態需防重複送出。
- 事件為停用狀態時是否仍可移除成員：依現行編輯頁可否編輯的既有邏輯，不另行放寬或收緊。

## 測試計畫

- 元件測試（驗證後移除、不進 commit）：`EventInfo.vue` 的鎖定判斷——`next_level_count = 0` 者 removable、`> 0` 者不可；create 模式全部 removable。
- 手動驗證（stg 或 dev 環境）：
  1. 進入後台「會員代理」→ KATEST1025 返水事件 → 編輯。
  2. 移除無下級的 0 級會員（KATEST1025）→ 確認彈窗 → 成功 → 重整後確認已不在名單。
  3. 對有下級的 0 級會員驗證不可移除（依 Q4 定案的呈現）。
  4. 驗證移除後該帳號重新出現在成員新增下拉（Q7 定案後）。
  5. 新增頁走完整流程一次，確認 create 模式無回歸。
- 最小驗證指令：`npx vue-tsc --noEmit`（或專案既有 typecheck/build 指令）針對觸及檔案通過。

## Git Flow

- 基底分支：`main`（實作者開始前先 pull 最新）。
- 工作分支名稱：`feat/commission-event-remove-level0-member`。
- 實作者開始前必須先從 `main` 開出上述工作分支；不可直接在 `main`、`develop`、`staging` 或其他共享分支上實作。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（上線），每階段測試過才進下一關。
- Commit 前需取得使用者針對該次提交的明確確認；不得沿用先前確認自行 commit。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

- 先依上方 Git Flow 從 `main` 開出工作分支，再開始實作。
- **「待確認事項」未全數定稿前不可開工**；定稿後先回填本 spec（移除 ⏸ 標記、補上定案內容）再實作。
- 後端 GSI-257 已在 develop testing：實作前先向後端拿到實際 API 合約，以合約為準更新本 spec 的 Q1/Q2 段落。
- 實作中若發現 spec 有缺漏或矛盾，先回報 / 更新 spec 再繼續。
