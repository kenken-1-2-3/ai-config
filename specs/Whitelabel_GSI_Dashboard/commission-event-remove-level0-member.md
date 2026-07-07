# 會員代理返水事件：編輯頁可刪除未有下級的 0 級會員

> 交接合約：Spec 作者產出，指定實作者依此實作，reviewer 對照「驗收條件」review。Claude 與 Codex 的角色可互換。
> 狀態：**已定案，可開工。**（2026-07-07 實測解掉 Q8：只需前端把 detail GET 切成 PLATFORM 版即可，無需後端改動。）

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
- **「可否移除」以後端 `removable_member_ids` 白名單為準**：不在前端另外計算下級或打其他 API；`Level0Detail.vue` 的 `next_level_count > 0` 判斷是唯讀明細用途，不移植到編輯頁。
- **保留前端鎖 + 送出前檢查雙層防呆**：現有三層鎖是好的防呆結構，只改判斷條件（從「既有成員一律鎖」改為「不在 `removable_member_ids` 內的既有成員鎖」）、不拆架構；後端仍為最終防線。
- **刪除走 PUT 的 `remove_members` 欄位、隨表單送出**：後端已在 `PUT /platform/v1/agent/commission/{commission_id}` 增加 `remove_members: integer[]`；前端在送出時以 `initialMembers - 現存選取` 計算，不另開 DELETE 請求。

## 已定案事項（依 Apifox 後端合約回填；來源：Apifox project/4860774 → 代理端 → 會員代理 → 代理佣金設定）

- **Q1（PUT 合約）— 已定案（2026-07-06）**：走既有 `PUT /platform/v1/agent/commission/{commission_id}`（Apifox api id 482650029，7/06 重建版，已发布，接口說明 "update agent commission settings, partial update supported"），body 新增欄位：
  - `remove_members: integer[]` —「移除會員ID列表」，與既有 `new_members: integer[]` 並列。
  - 前端對應改動：`UpdateAgentCommissionItem`（`request.type.ts:2385-2389`）補上 `remove_members?: number[]`。
- **Q2（GET 回傳「可刪除」判斷）— 已定案（2026-07-07）**：`GET /platform/v1/agent/commission/{commission_id}`（Apifox api id 470278245，2026-07-06 15:37 更新）`data` 新增 `removable_member_ids: integer[]`，與 `members`（仍為 `{member_id, account}[]`）並列，語意為**白名單**——`removable_member_ids` 內的 `member_id` 才能顯示移除鈕。**由後端判斷 `hierarchy_level=0 && next_level_count=0`**，前端不再自算下級。
  - 前端對應改動：`response.type.ts` 對應 detail 型別（目前 `GetPromotionDetail` 沒宣告 `members`，一併補齊 `members` 與 `removable_member_ids`）。
- **Q5（生效時機）— 已定案（2026-07-06）**：合約為 PUT 隨表單送出（`remove_members` 是 update payload 的一部分），即「標記移除、按確認鈕隨表單一起送出」，非點擊即刪。UI 上 chip 移除只改本地狀態，送出時計算 `remove_members = initialMembers - 現存選取`。

## 已知殘留（不阻塞開工，可先實作，事後追）

- 7/06 PUT 文件重建時，舊版接口說明中「僅能移除 `hierarchy_level=0` 且 `next_level_count=0` 的帳號」這句限制與各欄位中文描述**全數遺失**。功能語意由 GET 的 `removable_member_ids` 承擔，不影響實作，但建議請後端把限制說明補回 PUT 接口說明。
- PUT 僅定義 200 回應，**未文件化「移除了有下級會員的帳號」時的錯誤碼/訊息格式**。實作時前端以「非 0 的 code 顯示 msg」通用錯誤處理兜底；理論上前端只送 `removable_member_ids` 白名單內的 id，這條錯誤路徑不該被觸發。

## Q8：GET/PUT endpoint 前綴不對稱（2026-07-07 dev 實測發現並解決）

**症狀**：Codex 交付第一版進 dev 環境實測，所有既有成員 chip 一律無 X 按鈕、無法移除，功能沒生效。

**根因**：編輯頁 GET 與 PUT 打不同前綴。
- **編輯頁取資料**（`agentMemberManagements.ts:96-100`，`getAgentMemberCommissionSettingDetail`）→ 打 `GET /v1/agent/commissions/settings/{id}`（**非 PLATFORM**）。這支 response 沒有 `removable_member_ids`。
- **編輯頁送出**（`agentMemberManagements.ts:102-119`，`updateAgentMemberCommissionSetting`）→ 打 `PUT /platform/v1/agent/commission/{id}`（**PLATFORM**）。

因為 GET 取不到 `removable_member_ids`，前端 `removableMemberIds.value` 恆為 `[]`，所有既有成員被判定 lock，chip removable=false → 完全沒 X。

**解法（實測驗證通過）**：前端把 `getAgentMemberCommissionSettingDetail` 切成 PLATFORM GET (`/commission/{id}` + `usePlatform: true`)，對應後端 `GET /platform/v1/agent/commission/{commission_id}`，跟 PUT 對齊。

**為什麼可以直接切**（Apifox schema 誤導的排除）：
- Apifox 上 PLATFORM GET (api id 470278245) 的 response schema **只文件化 4 個 data 欄位**：`currency_limit, members, removable_member_ids, eligibility`。字面上看起來缺一堆表單欄位，會讓人以為要請後端補。
- 2026-07-07 用 dev 環境（登入帳號 dobt）實際打該 endpoint 攔截 response，實測 `data` 回傳這些欄位：
  ```
  id, name, billing_type, enabled, calculation_type, payout_method, wallet_type,
  currency_limit, eligibility, qualified_member_eligibility, cpa_eligibility,
  qualified_member_count, cpa_qualified_member_count, reward_mode,
  cpa_reward_by_currency, members, removable_member_ids
  ```
- **Apifox 文件與後端實際不同步**——實際 PLATFORM GET 已經回齊了所有欄位、還多 6 個獎勵/資格相關欄位。**不需要請後端補欄位**。建議請後端把 Apifox schema 更新，但這不阻塞前端。

**驗收（實測）**：切成 PLATFORM GET 後，事件 id=10 的 members `[31, 161, 293]` 對應 `removable_member_ids: [161, 293]`——UI 上 seasontest(31) 沒 X、9122333444(161) 有 X、test1849(293) 有 X，與後端白名單完全一致。

**前端要納入本 branch 的改動**：
- `src/api/agentMemberManagements.ts` 的 `getAgentMemberCommissionSettingDetail`：路徑改為 `/commission/${id}`，config 加 `usePlatform: true`。

**已知殘留（非阻塞，可請後端事後追）**：
- Apifox 上 PLATFORM GET 的 schema 沒寫齊實際回傳的欄位。建議請後端補文件（或引用非 PLATFORM 版 detail schema 對齊）。

## 使用者定案（2026-07-07）

- **Q3（UI 樣式）**：沿用編輯頁現行的 `q-select` multiple + chip 介面，透過 chip 的 X 按鈕移除成員。不改成列表或其他樣式。
- **Q4（不可移除者的呈現）**：`member_id` 不在 `removable_member_ids` 內的既有成員，**完全隱藏移除鈕**（即 `removable=false`），不加 tooltip、不加點擊提示。
- **Q7（刪除後行為）**：沿用現行下拉選單邏輯——已選擇的成員本來就會出現在下拉裡（反藍、不可再點選），移除後只是狀態從「已選（反藍）」變回「可選」，行為與現行「取消勾選」一致。PUT 成功後前端重新 fetch `GET /v1/agent/commissions/no_event_members` 更新可選清單即可，不需特別處理「加回下拉」的邏輯。

- **Q6（多語文案）— 已定案（2026-07-07，由團隊決定，不走 PM）**：

  | Key | 繁中 | 英文 |
  |---|---|---|
  | `common.sure_to_delete_commission_member` | 確定移除此會員？ | Are you sure you want to remove this member? |
  | `common.sure_to_delete_commission_member_desc` | 移除後，該會員將不再屬於此返水事件，且此變更於儲存後生效。 | Once removed, this member will no longer belong to this rebate event. Changes take effect after saving. |
  | `message.remove_member_success` | 移除成功 | Removed successfully |
  | `message.remove_member_failed` | 移除失敗 | Failed to remove member |

  簡中及其他語系比照專案現有 i18n 語系檔的既有翻譯風格填入（實作者依專案語系檔清單一併補齊，不再另行送審）。


## 驗收條件

> 逐條、可勾選、可客觀判斷。Review 依此判斷過／不過。（標 ⏸ 者依待確認事項答案定稿後生效。）

- [ ] 編輯頁中，`member_id` 在 `data.removable_member_ids` 內的既有 0 級會員，可透過 UI 移除出事件成員。
- [ ] `member_id` 不在 `data.removable_member_ids` 內的既有成員，無法被移除，且完全隱藏移除鈕（不加 tooltip、不加點擊提示）。
- [ ] 移除前跳出二次確認彈窗，取消則不變動；確認後標記移除，送出時 `PUT /platform/v1/agent/commission/{commission_id}` 的 payload 含 `remove_members`（僅含被移除者的 member_id，且每個 id 均屬於 `removable_member_ids`）。
- [ ] 移除成功後，該成員自編輯頁成員清單消失；重新整理/重進編輯頁後仍不存在（以 `GET commission/:id` 回傳為準）。
- [ ] 後端回傳「該成員有下級、不可刪除」錯誤時，前端顯示對應錯誤訊息且不變動成員清單。
- [ ] create 模式（新增頁 Step1）行為不變：選取中的成員 chip 仍可自由移除，送出流程不受影響。
- [ ] 編輯頁其他既有功能（成員新增、返水比例設定、事件名稱等欄位編輯與送出）行為不變。
- [ ] 新增/變更的 API 呼叫已在 `agentMemberManagements.ts` 與 request/response 型別中補齊型別定義。
- [ ] 新增文案全部走 i18n key（`common.sure_to_delete_commission_member`、`common.sure_to_delete_commission_member_desc`、`message.remove_member_success`、`message.remove_member_failed`），繁中/英文依本 spec 定稿，簡中及其他語系比照專案語系檔既有翻譯風格填入，無寫死字串。
- [ ] 僅改動「受影響範圍」列出的檔案類別；未觸碰 Out of scope 項目。

## 邊界情況 / 例外

- 事件成員被移除到僅剩 0 名：後端是否允許事件無成員？（若不允許，前端需在最後一名成員移除時攔截——併入 Q1 向後端確認。）
- 併發：編輯頁停留期間，該會員在別處新增了下級 → 前端判斷可刪、後端拒絕。此即「後端錯誤回應」驗收條之情境，前端以後端結果為準並提示。
- 同一成員重複操作（連點移除）：確認彈窗與請求進行中狀態需防重複送出。
- 事件為停用狀態時是否仍可移除成員：依現行編輯頁可否編輯的既有邏輯，不另行放寬或收緊。

## 測試計畫

- 元件測試（驗證後移除、不進 commit）：`EventInfo.vue` 的鎖定判斷——edit 模式下，`member_id` ∈ `removable_member_ids` 者 removable、其餘既有成員不可；create 模式全部 removable。
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
