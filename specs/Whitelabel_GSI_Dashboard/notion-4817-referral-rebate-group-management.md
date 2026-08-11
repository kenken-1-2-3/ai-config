# 子 Spec 1：上級返佣設定列表與 CRUD

- Parent：[Notion 4817 總覽](./notion-4817-referral-rebate-multi-bonus-conditions.md)
- 依賴：POST／PUT body 已由後端 PDF 確認；完整 edit flow 仍依賴 G1–G3 修正
- 既有 ticket work branch：`feat/referral-rebate-group-crud-agent-setting-detail`；本修正不得另開 child branch

## 目標

把目前直接進入單例 `Edit.vue` 的「上級返佣設定」改成需求單定義的設定列表，提供搜尋、建立、編輯、摘要、複製、刪除與啟停，並建立後續 condition sets 與 agent bindings 所需的 `group_id` route 基礎。`group` 是後端資料模型名稱；前端不得新增另一個名為「群組列表／群組管理」的 menu、頁面標題或產品概念。

## 使用者流程

1. 進入「代理管理 → 上級返水 → 上級返佣設定」先看到「上級返佣設定列表」。
2. 可依條件查詢；結果按新增順序由舊到新。
3. 點「新增」進入建立頁；點鉛筆進入指定 `group_id` 的編輯頁。
4. 「上級返佣」摘要按鈕與完整 modal 由子 spec 2 在 condition data 可用後交付。
5. 點複製建立副本；點刪除先確認；toggle 可啟用／停用。
6. 列表可直接顯示 API 已回傳的「代理數量」；代理列表 navigation 由子 spec 3 在 bindings contract 可用後交付。

## 搜尋條件

| 欄位         | API query         | 規則                                         | 狀態            |
| ------------ | ----------------- | -------------------------------------------- | --------------- |
| 上級返佣名稱 | `name`            | 精確查詢，不允許模糊查詢                     | ✅ 可實作       |
| 返水對象     | —                 | 空值／全部／會員／代理                       | ⛔ **契約阻擋** |
| 派發方式     | `dispatch_type`   | 空值／自動派發／手動派發                     | ✅ 可實作       |
| 錢包類型     | `wallet_type`     | 空值／一般錢包／贈金錢包／撲滿錢包           | ✅ 可實作       |
| 返水計算模式 | `calculate_type`  | 空值／有效投注額／盈虧（GGR）／淨盈利（NGR） | ✅ 可實作       |
| 啟／停用     | `enabled`（0／1） | 空值／停用／啟用                             | ✅ 可實作       |

所有 enum 值必須沿用 backend／既有 constants，不可從顯示順序猜數字。

### ⛔ 契約阻擋：返水對象（`rebate_target`）

2026-08-03 對 Apifox 與 DEV 實機雙重確認：

- `GET /platform/v1/agent/referral_rebate/groups` **沒有 `rebate_target` query 參數**。
- 列表 response 的 list item **也沒有 `rebate_target` 欄位**，因此該欄既無法篩選也無法顯示。
- 對照：單一群組 detail（`GET .../groups/{group_id}`）**有** `rebate_target`，可見後端只是未把它帶進列表 API。

處置：

- 前端**不得**自行以 detail 逐筆補撈來偽造此欄位或篩選，也不得靜默省略需求。
- 後端需在列表 API 補上 `rebate_target` query 與 list item 欄位；補上後前端再補實作與驗收。
- 在後端補齊前，「六種搜尋條件」與列表的「返水對象」欄視為**未完成**，不得判定為驗收通過。

細節見 [API schema note](./notion-4817-referral-rebate-group-api-schema-note.md) 缺口 E。

## 列表欄位與操作

- 上級返佣名稱、返水對象、結算週期、返水計算模式、派發方式、錢包類型。
- 上級返佣摘要欄是子 spec 2 的 integration point；本子 spec 不驗收 modal 內容或互動。
- 代理數量直接顯示列表 API 的 `agent_count`；不可由前端另行推算。代理列表 navigation 是子 spec 3 的 integration point。
- 開啟／停用：toggle；失敗時回復原狀態並顯示後端錯誤。
- 功能：編輯、複製、刪除；刪除一定要有確認 modal。
- 支援既有 Dashboard pagination pattern；exact query names 以 API schema 為準。

## 建立／編輯的設定基本資料

- 新增「上級返佣名稱」欄位；名稱是列表、搜尋、配置 dropdown 與摘要辨識設定的主要文案，validation 與唯一性以 final API contract 為準。
- 依整合 mock 完整顯示：啟停、返水對象、派發方式、結算週期、稽核倍數 stepper、計算模式、錢包類型、會員層級與會員帳號。不可只留下部分 radio/input。
- 會員層級與會員帳號必須連動：未選會員層級時帳號下拉顯示全部會員；選擇一個或多個層級後，帳號下拉只顯示所選層級的會員；層級變更時移除已不符合目前層級的已選帳號。`binding_levels` 維持由 group POST／PUT 保存；2026-08-05 bindings PDF 宣告 group body 的 `bindings` 廢棄，會員帳號名單必須改由 `/referral_rebate/bindings` 分頁／CRUD endpoints 查詢與維護，不得再隨 group POST／PUT 送出。
- 2026-08-05 使用者取消「幣種 UI 展示」控制；全域頁首與表單內都不得再顯示幣種數量 selector。派發門檻、活躍會員條件與比例 editor 直接顯示站點所有可用幣別，幣別輸入格每行最多 4 格，超過 4 種時自動換至下一行；所有幣別仍依既有契約序列化到 POST／PUT。
- 派發門檻區完整顯示 `dispatch_threshold`、`dispatch_amount_limit`、計算依據與 GGR/NGR 說明；產品 GGR／總 GGR 的比例資料規則由子 spec 2 驗收。
- 計算模式中的淨盈利（NGR）在 create／edit 都必須可選；後端 G4 只影響送出結果，不得用來 disable、lock、隱藏 NGR 或把使用者選擇自動改回其他模式。
- 活躍會員條件區完整顯示存款累計／單次，以及站點各幣別的存款與有效投注門檻；序列化到 `agent_eligibility.deposit`／`valid_bet_amount` 的 `currency_threshold`。左右兩欄標題區必須共用相同高度，使兩側幣別名稱與輸入框水平對齊，不得因左欄多出累計／單次控制而錯位。
- 啟停 switch 必須存在，建立時「啟用」與「停用」都可選，POST 送出使用者實際選擇的 `enabled`。若 G6 拒絕 `false`，保留 `enabled: false` 與其餘表單輸入，顯示「停用狀態未儲存」及後端原因；不得預先 disable／lock「停用」、固定為啟用或失敗後自動改回啟用。
- 移除會員標籤欄位；`label_ids` 的完整資料流清理由子 spec 2 驗收，但子 spec 1 的新 create/edit shell 不得再把它當必要基本設定。
- create 使用後端定義的 defaults；edit 以 detail GET 回填。不可沿用舊單例的本地預設覆蓋既有設定值。
- basic settings 的 enum、日期／週期欄位、conditional fields 與 request names 全部以 final group schema 為準；既有 UI 可重用，但不能因此沿用已廢棄 payload。稽核倍數的 `−／輸入／＋` stepper 中間輸入區不得顯示空白驗證預留列或額外水平線，錯誤訊息只在驗證失敗時出現。

## Routes 與頁面

在 `src/router/routes.ts` 的 `CommissionSetting` parent 下建立清楚的 list/create/edit/detail children。建議 route shape：

| Path               | Name                              | Page                           |
| ------------------ | --------------------------------- | ------------------------------ |
| `""`               | `ReferralCommissionSettingList`   | `CommissionSetting/List.vue`   |
| `"Create"`         | `ReferralCommissionSettingCreate` | `CommissionSetting/Create.vue` |
| `"Edit/:group_id"` | `ReferralCommissionSettingEdit`   | `CommissionSetting/Create.vue` |

- List/create/edit 僅對 agent side 顯示，維持 parent menu/function，不改 page entry 的大層權限。
- create 與 edit 共用新版 `Create.vue` 表單；不得直接復活舊單例 `Edit.vue` 的 payload 與資料生命週期。
- `Index.vue` 保留 router-view 容器責任。
- 2026-08-04 使用者已決定立即將 `""` 切為 `ReferralCommissionSettingList`；不得保留舊單例 `Edit.vue` 作為正常入口或後端缺口的 fallback。
- 2026-08-05 使用者確認目前是測試環境，鉛筆編輯入口需直接進入新版編輯表單。註冊 `Edit/:group_id` 並用 detail 實際回傳欄位回填；名稱可由列表 route query 帶入作為舊資料 fallback。PUT 依新版表單狀態完整送出 `condition_sets`、`binding_levels` 等 group 欄位，但不得送已廢棄的 `bindings`。會員帳號以 bindings list 依 `group_id` 分頁查詢回填，名單增刪走 bindings endpoints。不得因此把入口切回舊頁。

## Platform APIs

所有 wrapper 放在 `src/api/commissionManagement.ts`，使用下列 relative path 並傳 `{ usePlatform: true }`：

| 行為 | Method / relative path                            |
| ---- | ------------------------------------------------- |
| 列表 | `GET /referral_rebate/groups`                     |
| 建立 | `POST /referral_rebate/groups`                    |
| 詳情 | `GET /referral_rebate/groups/:group_id`           |
| 更新 | `PUT /referral_rebate/groups/:group_id`           |
| 刪除 | `DELETE /referral_rebate/groups/:group_id`        |
| 複製 | `POST /referral_rebate/groups/:group_id/copy`     |
| 啟停 | `PATCH /referral_rebate/groups/:group_id/enabled` |

### 契約確認與可先做範圍

2026-08-03 group PDF 已提供 POST／PUT body；2026-08-05 bindings PDF 進一步廢棄其中的 `bindings`。group POST／PUT 可帶 `name`、群組基本設定、`agent_eligibility`、`dispatch_threshold`、`dispatch_amount_limit`、`binding_levels`、`condition_sets`，不可再帶 `bindings`。

- 可以先完成 request types、POST／PUT wrappers 與 create-only flow；POST 成功後回列表，不依賴 response id。
- 測試環境 edit flow 依正常完整 payload 處理：detail 有回的 group 欄位照常回填，名稱以 detail 優先、列表 route query fallback；PUT 送出表單序列化後的 `condition_sets`、`binding_levels`，不得送 `bindings`。代理名單另以 bindings list／CRUD round-trip。
- 建立為停用的 UI 與 request 可完成，但 persistence 仍受 G6 影響：送出 `enabled: false` 後若 API 拒絕，不得宣稱已儲存；須保留表單與停用選擇並提示未儲存。
- POST／copy 目前不回 id（G2），不得寫成必定回 `{ id }`。
- List 的 `name` 目前是 LIKE 且排序 `created_at DESC`，與需求的精確／ASC 不一致（G9）。

- request types 放 `src/api/request.type.ts`，response types 放 `src/api/response.type.ts`。
- standard helper generic 是 unwrapped `data` payload，不要再包一次 backend envelope。
- API wrapper 命名修正既有 `Commssion` 拼字時，只限此次實際改用的 wrappers；不要清理 events/entries wrappers。
- delete helper 若現有 request utility 沒有匹配 pattern，先找 repo sibling API；不要用 raw axios 另開一套。

## 權限

- 查看列表／詳情：`A_A_REFERRAL_REBATE_SETUP_VIEW`（新制 `3360101`）。
- 新增／編輯／複製／刪除／啟停：`A_A_REFERRAL_REBATE_SETUP_EDIT`（新制 `3360102`）。
- route-level parent permission 仍是 `A_F_REFERRAL_REBATE_SETUP`；按鈕可見性與操作能力使用 `usePermission()`。
- 沒有 edit 權限時不得只做 CSS disabled；不得發出 mutation request。

## Remote i18n

- 本子 spec 的 NGR、啟用／停用與未儲存提醒文案都繼承 canonical 的 remote-i18n 流程：先搜尋 consumer repo、shared／legacy 與 backstage/agent remote dataset；相容 key 直接重用，缺 key 才依既有 namespace／命名規則透過 Locale Manager API 建立。
- 完成時提供每個文案的 key、`en`、`zh-TW`、`zh-CN`、目標 dataset 與 read-back evidence，狀態只能是 `REUSED`、`CREATED` 或 `BLOCKED`；不得以 local locale JSON 或 hardcode 當正式替代。

## 視覺參考

- `01-referral-rebate-list.png`
- `03-referral-rebate-form-overview.png`（只供 create/edit shell；條件區由子 spec 2 定義）

## Out of scope

- 不實作 condition tab、`condition_sets` 詳細欄位或摘要 modal；由子 spec 2 處理。
- 不實作 agent binding route、count 的自行推算、navigation 或 mutation；由子 spec 3 處理。列表 API 已回傳的 `agent_count` 可顯示。
- 不改 events、entries、dispatch 與既有 CommissionDetail routes。

## 受影響範圍

- `src/router/routes.ts`
- `src/pages/ReferralCommissionManagement/CommissionSetting/Index.vue`
- `src/pages/ReferralCommissionManagement/CommissionSetting/List.vue`（新增）
- `src/pages/ReferralCommissionManagement/CommissionSetting/Create.vue`（新增）
- `src/pages/ReferralCommissionManagement/CommissionSetting/Edit.vue`
- `src/api/commissionManagement.ts`
- `src/api/request.type.ts`
- `src/api/response.type.ts`
- `src/utils/constants/*`（僅在 backend enum 已確認且現有 constants 無對應時）

## 驗收條件

- [ ] 進入上級返佣設定先看到需求單定義的「上級返佣設定列表」，不再直接打開單例 Edit，也沒有額外的「群組管理」頁面或 menu。此入口切換不再受 G1／G3 阻擋；edit 功能可暫不提供，但不可 fallback 到舊頁。
- [ ] 六種搜尋條件依需求運作；名稱為精確查詢；預設依新增順序舊到新。
      ⛔ 目前阻擋：「返水對象」列表 API 未提供，見上方「契約阻擋」一節。
- [ ] 本子 spec 所有的設定基本欄位、toggle 與編輯／複製／刪除操作符合參考圖與權限；摘要與代理欄位留待各自子 spec 驗收。
- [ ] create page 的基本設定、會員層級／帳號、派發門檻與活躍會員條件區塊完整存在；會員層級未選時可選全部會員，選層級後帳號選項只保留符合層級的會員，切換層級會清除不相容的已選帳號；不得把整合 mock 中的區塊改成空白、pending note 或省略。
- [ ] create 的「啟用」與「停用」都能選，選停用時 request 帶 `enabled: false`；G6 失敗後仍保留停用選擇與所有表單值，並明確提示本次未儲存。
- [ ] create／edit 的淨盈利（NGR）選項可選且不會因 G4 預先 disabled、locked、隱藏或自動切回其他模式。
- [x] 頁面不顯示「幣種 UI 展示」或幣種數量 selector；派發門檻、活躍會員條件與比例 editor 顯示全部站點幣別，每行最多 4 個幣別輸入格，超過時自動換行。
- [ ] create、detail、update 均使用正確 `group_id` route 與 platform endpoint。
- [ ] copy、delete、enabled 使用指定 platform endpoint；mutation 失敗不留下錯誤 UI 狀態。
- [ ] 所有 platform wrappers 都是 relative path + `{ usePlatform: true }`。
- [ ] view-only 使用者看不到或無法觸發新增、編輯、複製、刪除與啟停。
- [ ] events／entries／派發 API 與頁面沒有功能性變更。

## 驗證

- 對 touched files 執行 focused Prettier／ESLint、`git diff --check`；本 repo 不執行 `tsc --noEmit`。
- 以 view-only 與 edit 兩種權限登入手動驗證。
- Network 逐一核對 list/create/detail/update/delete/copy/enabled 的 method、platform URL、`group_id`、query/body 與 response mapping。
- 若寫 temporary tests，完成驗證後不得納入 commit。

## Git Flow

- 本子 spec 與其後續修正都繼續使用同一張 4817 單的既有 branch：`feat/referral-rebate-group-crud-agent-setting-detail`。
- 不得因切換子 spec、skill、review 或 QA 而新建／切換 branch 或 worktree；主產品目錄目前屬另一張單，不得碰其 branch 與 local changes。
- commit、push、merge 與環境推進都需使用者針對該次動作明確確認。
