# 子 Spec 3：代理設定詳情頁、批量新增與權限

> 交接合約：實作者或 Codex 原生 subagent 依本 spec 實作；主 agent 對照「驗收條件」逐項整合與 review。除非使用者當回合明確指定，禁止呼叫外部 Claude Code。

- Parent：[Notion 4817 總覽](./notion-4817-referral-rebate-multi-bonus-conditions.md)
- 需求來源：Notion「需求詳情－上級反佣設定－代理設定詳情」、`/Users/kenyu/Downloads/4817-api-spec-fe-bindings.pdf` 與本 spec 下列視覺素材
- 端別／Repo：代理端，`Whitelabel_GSI_Dashboard`
- 同一張 4817 單的既有工作分支：`feat/referral-rebate-group-crud-agent-setting-detail`
- 後續修改、review 與 QA 都沿用此 branch／既有 referral worktree，不另開 child branch

## 背景與修正理由

「代理設定詳情」是上級返佣功能的第三個正式頁面，不是上級返佣設定列表中某一筆 group 的附屬 modal，也不是既有「上級返佣明細」events／entries 頁。

2026-08-05 後端補交 `4817-api-spec-fe-bindings.pdf`，正式提供 bindings 列表、單筆新增／編輯／刪除、批量 preview／confirm、錯誤碼與新舊權限 ID。先前「API unavailable」限制全部解除，第三頁必須改接正式資料與 mutation，不得再顯示 pending／unavailable 文案。

相容性變更：group POST／PUT 的 `bindings` 欄位已廢棄，設定 Detail 刻意不回傳大筆代理名單。代理名單一律使用本 spec 的分頁 bindings endpoints 查詢與維護；`binding_levels` 仍由 group 契約管理。

## 目標

- 在上級返佣模組新增第三個功能分頁「代理設定詳情」。
- 讓使用者依會員帳號與配置精確查詢代理配置。
- 顯示代理帳號所屬配置、會員層級、下級總人數與配置的結算資訊。
- 提供單筆新增、批量新增、編輯與刪除確認流程。
- 完整串接正式 bindings API、錯誤處理、權限與批量兩段式流程。

## 來源優先順序與欄位決策

1. 本次使用者提供的需求表格決定功能、查詢語意、必備欄位與操作。
2. `10-agent-settings-detail-list.png` 至 `18-agent-setting-detail-permission.png` 決定資訊架構、控制項、彈窗與視覺排列。
3. 後端 PDF／實際 API contract 決定 endpoint、method、request／response、檔案格式與 error code；沒有 contract 時禁止推測。
4. 需求表格的「配置」在視覺稿呈現為「上級返佣名稱」，兩者是同一資料：filter label 使用「配置」，列表 header 使用「上級返佣名稱」。
5. 視覺稿額外顯示「會員層級」，此欄位納入列表；需求表格列出的其他欄位不得因此刪減。

## 頁面與路由

- 在全域上級返佣功能分頁列新增第三個 tab：「代理設定詳情」。
- 它與「上級返佣設定」「上級返佣明細」並列，必須能直接進入，不依賴先選某一個 group。
- 建議 route：`/ReferralCommissionManagement/AgentSettingDetail`。
- route name：`ReferralCommissionAgentSettingDetail`。
- 建議 page folder：`src/pages/ReferralCommissionManagement/AgentSettingDetail/`，沿用 `Index.vue` + `List.vue` 或同 repo 最接近的 page pattern。
- page title、card title：`代理設定詳情`。
- breadcrumb：`代理設定 / 詳情`；不得顯示「群組管理」。
- 不得修改或取代既有 `/ReferralCommissionManagement/CommissionDetail`；目前 Chrome 所見的「上級返佣明細」仍是獨立第二分頁。
- 2026-08-05 使用者已取消「幣種 UI 展示」功能；本頁表格無幣別欄位，頁首與表單 card 都不得顯示幣種 selector。

## 查詢區

使用 Dashboard 既有 `query`／`useSearch`／pagination pattern，不另造全域 query component。

| 名稱     | 格式   | 行為                                                                 |
| -------- | ------ | -------------------------------------------------------------------- |
| 會員帳號 | Text   | 會員登入帳號；預設空值；只允許精確查詢，不做前端 contains／模糊比對  |
| 配置     | Select | 預設空值；選項為站點所有上級返佣配置名稱；option value 使用 group id |

- 配置 options 使用既有 `getReferralRebateGroupList`，不可 hardcode `配置1`。
- options 要能取得站點全部配置；如果既有 endpoint 分頁，必須依 contract 取得完整 option set，不得只取目前列表第一頁後假裝完整。
- Search 時排序固定為添加名單時間 DESC；正式 API 接入後 query 必須帶 exact backend sort contract。
- query state 與 route query 同步 offset／size；會員帳號與配置改變後搜尋從第一頁開始。
- 提供展開／隱藏篩選、loading、empty state、API error state與 pagination。

## 列表欄位

欄位順序依視覺稿：

1. 會員帳號：上級返佣代理的登入帳號。
2. 會員層級：該代理目前會員／VIP 層級；視覺稿要求，若後端尚未回傳不得自行猜預設層級。
3. 上級返佣名稱：需求中的「配置」，即該代理所屬配置名稱。
4. 人數：直接顯示 bindings list 的 `downline_count`。目前後端預設語意為該會員的直屬下級人數（`member_hierarchy.next_level_count`）；若 PM 改成整條下線總人數，後端維持欄位名並調整統計，前端不得自行計算。
5. 結算週期：取該配置的 `period_type`。
6. 計算模式：取該配置的 `calculate_type`。
7. 錢包類型：取該配置的 `wallet_type`。
8. 添加名單時間：加入該配置的時間，顯示完整日期與時間；列表排序 DESC。
9. 操作：編輯與刪除 icon buttons。

- 「人數」必須由 binding list response 或專用統計 endpoint 提供；禁止前端抓整棵代理樹計算。
- enum 顯示沿用 `SETTLEMENT_CYCLE`、`CALCULATE_TYPE`、`BONUS_WALLET_TYPE` constants 與既有 `$t(...)`。
- 無資料沿用 repo 的 no-data pattern；不得放視覺稿中的 TEST1～TEST5 假 rows。

## 頁面操作按鈕

- `新增`：開啟單筆新增 modal。
- `批量新增`：開啟批量新增 modal。
- `編輯`：開啟編輯 modal。
- `刪除`：開啟刪除確認 modal。
- 按鈕位置、樣式與 icons 依 `10-agent-settings-detail-list.png`；不得用 pending note 取代按鈕。
- mutation 期間按鈕 loading／disabled，成功後重新查詢正式列表；失敗不得本地假 mutation。

## 單筆新增 modal

依 `15-agent-setting-add-dialog.png`：

- 欄位：會員帳號 Text、配置 Select。
- 兩欄預設空值且必填。
- 配置 options 與查詢區共用站點全部配置來源。
- POST body：`{ member_account, group_id, replace: false }`。
- `301001` 表示帳號已在其他設定：顯示確認框；使用者確認後以相同 payload 加 `replace: true` 重送，取消則不變更。
- `500` 表示已綁同一設定，顯示 exact 文案：`不可重複添加代理名單`。
- `301002` 表示帳號不存在，顯示 exact 文案：`會員帳號有誤`。
- 取消／關閉清空欄位、validation 與 loading，不發 request。

## 編輯 modal

依 `14-agent-setting-edit-dialog.png`：

- 顯示會員帳號，編輯時不可改帳號 identity。
- 配置 Select 預設目前配置，可改成站點其他配置。
- PUT `/bindings/:binding_id` body 只送 `{ group_id }`；只能換設定，不可換會員。
- 選擇原配置且資料未變時，不發 mutation或顯示成功假象。
- 取消／關閉不改本地 row。

## 刪除確認 modal

依 `11-agent-setting-delete-confirm.png`：

- title：`刪除`。
- body：`請問確認刪除此配置？`
- actions：`取消`、`確認`。
- 只有確認才可發 delete；取消／關閉不改列表。
- 成功後重查目前頁；若刪除末頁最後一筆，offset 回退到最後有效頁。
- DELETE `/bindings/:binding_id` 無 body。

## 批量新增 modal 與比對結果

依 `12-agent-batch-add-dialog.png`、`13-agent-batch-add-result.png`：

- title：`批量新增`；比對後可顯示 `批量新增代理設定`。
- modal 使用寬版版型，頂部同時提供可切換的 `Manual` 與 `Upload` 兩種模式；不得移除、隱藏、disable 或 lock 任一模式。舊 `12-agent-batch-add-dialog.png` 只定義 Upload 排列，不得用它推翻 2026-08-10 使用者新增的 Manual 模式。
- `Manual`：顯示可直接輸入／貼上的多行帳號欄位，每行一個會員帳號；解析時 trim 每行並移除空白行，保持輸入順序，不自行去重或改寫帳號。
- `Upload`：保留檔案上傳、右下方 `範例下載` 與既有 CSV／XLSX／TXT parser，把第一欄非空帳號依檔案順序轉成 `member_accounts`。
- 兩種模式共用配置 Select、單次最多 1000 筆，以及相同的 preview → confirm → result 流程。切換模式時保留兩邊尚未送出的原始輸入，但清除舊 preview；只有目前模式沒有有效帳號、超過 1000 筆或未選配置等客觀無效狀態，footer `確認` 才可 disabled，不得因 API／backend 尚未部署而預先停用。
- 第一次按 footer `確認` 執行 preview：POST `/bindings/batch/preview` body `{ group_id, member_accounts }`。
- preview 後依 `13-agent-batch-add-result.png` 顯示兩欄 table：`會員帳號`、`比對結果`；row 順序完全沿用 response，不自行排序。
- `ok` 在比對結果欄顯示綠色勾；`duplicate`／`not_found` 顯示紅色叉。`conflict` 因 API 要求明確同意覆蓋，於比對結果欄顯示可勾選控制，預設不勾；不得因此新增獨立 checkbox 欄。
- preview 成功且輸入未變更時，第二次按 footer `確認` 執行 POST `/bindings/batch`；送出所有 `ok` 與使用者已同意的 `conflict` 帳號。成功後關閉 modal，以通知顯示 `created`、`replaced` 與 `failed`，再重查列表。
- preview 後若修改 Manual 文字、更換 Upload 檔案、切換模式或更換配置，立即清除舊比對結果，下一次 `確認` 必須重新 preview。
- 關閉後清空 Manual 文字、Upload 檔案、目前模式、配置、比對結果、validation 與 loading。
- PDF 未提供範例下載 endpoint；不得呼叫猜測 API。若保留「範例下載」，使用前端產生只含 `member_account` header 的 CSV 範例，並清楚標示為前端範例。

## API 契約

所有 wrapper 放在 `src/api/commissionManagement.ts`，使用 relative path + `{ usePlatform: true }`；standard helper generic 是 unwrapped `data`。

| 行為     | Method / relative path                         |
| -------- | ---------------------------------------------- |
| 列表     | `GET /referral_rebate/bindings`                |
| 單筆新增 | `POST /referral_rebate/bindings`               |
| 編輯     | `PUT /referral_rebate/bindings/:binding_id`    |
| 刪除     | `DELETE /referral_rebate/bindings/:binding_id` |
| 批量預覽 | `POST /referral_rebate/bindings/batch/preview` |
| 批量確認 | `POST /referral_rebate/bindings/batch`         |

- list query：`member_account`（精確）、`group_id`、`offset`、`size`，皆選填；後端按 `created_at DESC`。
- list data：`{ list, pagination: { offset, size, total } }`；row 完整欄位依 PDF 第 3 節。
- `member_level_titles` 是多語系 JSON，顯示邏輯與會員列表的 `level_titles` 一致。
- error code：`301002` 帳號不存在、`500` 同設定重複、`301001` 其他設定衝突、`400` 設定／綁定不存在、`902004` 不屬於本代理、`100` 參數錯誤。
- 禁止再從 group detail 讀 `bindings`，也禁止在 group POST／PUT body 送 `bindings`。

## 權限

- 在「系統設定 → 權限設定 → 上級返佣」顯示「代理設定詳情」，含查看／編輯。
- legacy：feature `3190300`、view `3190301`、edit `3190302`。
- current：feature `3360300`、view `3360301`、edit `3360302`。
- route meta 同時接受 legacy/current feature ID；view 控制第三 tab 與 direct route，edit 控制新增、批量新增、編輯、刪除及所有 mutation。
- 無 edit 時隱藏 mutation buttons，handler 也必須阻擋 request。

## Remote i18n

- `Manual`、`Upload`、批量新增、解析／驗證與未儲存提醒等文案，先搜尋 consumer repo、shared／legacy 與 backstage/agent remote dataset，重用語意與三語值相符的既有 key。
- 找不到相容 key 時，依相鄰 namespace／key naming 透過 Locale Manager API 建立並 read-back；不得以 hardcode、local locale JSON 或自創不合規 key 當正式替代。
- 交付時提供每個文案的 target dataset、key、`en`、`zh-TW`、`zh-CN`、read-back evidence，以及 `REUSED`／`CREATED`／`BLOCKED` 狀態。

## 視覺參考

素材目錄：`notion-4817-referral-rebate-multi-bonus-conditions-assets/`

- `10-agent-settings-detail-list.png`：第三 tab、查詢區、按鈕、列表與 pagination。
- `11-agent-setting-delete-confirm.png`：刪除確認。
- `12-agent-batch-add-dialog.png`：批量新增初始 modal。
- `13-agent-batch-add-result.png`：批量比對結果。
- `14-agent-setting-edit-dialog.png`：編輯 modal。
- `15-agent-setting-add-dialog.png`：新增 modal。
- `16-agent-setting-duplicate-error.png`：重複配置錯誤。
- `17-agent-setting-invalid-account-error.png`：帳號錯誤。
- `18-agent-setting-detail-permission.png`：未來新權限節點位置。

實作者必須用 Chrome／Playwright 在 `localhost:9000` 截圖比對；完成時列出原圖、實作截圖與剩餘差異。

## 受影響範圍

- `src/router/routes.ts`：新增第三個 sibling route／tab。
- `src/pages/ReferralCommissionManagement/AgentSettingDetail/*`：page、filter/list 與 feature-local dialogs。
- `src/layouts/MainLayout.vue`：只在現有 tab 產生機制不能自然顯示第三 tab 時做最小修改。
- `src/api/commissionManagement.ts`、`src/api/request.type.ts`、`src/api/response.type.ts`：新增 PDF 定義的 6 支 bindings contracts。
- `src/utils/constants/permission.ts`／route：接入 PDF 定義的 legacy/current feature IDs。
- 跨站影響：Dashboard agent side 共用功能，非單一 siteKey；不得碰會員端 repo 或 site-specific config。
- `src/assets/env/environment.json` 是使用者 local-only 變更，禁止檢查、格式化、修改或納入交付。

## 參考實作

- route／tab：`src/router/routes.ts` 的 `ReferralCommissionManagement` branch。
- query／table／pagination：`src/pages/ReferralCommissionManagement/CommissionSetting/List.vue` 與 `CommissionDetail/List.vue`。
- dialog：`src/components/dialogs/index.vue`、`src/hook/useDialog.ts` 及同 module CRUD dialogs。
- enum：`SETTLEMENT_CYCLE`、`CALCULATE_TYPE`、`BONUS_WALLET_TYPE`。
- API options：`getReferralRebateGroupList`。
- permission：`src/hook/usePermission.ts`；正式新 IDs 前不可挪用舊明細 permission。

## Out of scope

- 不修改 group CRUD、condition sets、返水 events／entries。
- 不在前端計算代理樹人數。
- 不修改 bindings 以外的 events／entries／dispatch API。
- 不在前端計算 `downline_count`。
- 不建立 local i18n JSON。
- 不調整與第三頁無關的其他 Dashboard UI。

## 驗收條件

### 本輪前端可完成

- [x] 上級返佣功能分頁列新增第三個「代理設定詳情」，可由 tab 與 direct URL 進入；既有兩頁不受影響。
- [x] page title、breadcrumb、查詢 card、操作按鈕、列表 card、欄位順序與 pagination 依 `10-agent-settings-detail-list.png` 呈現。
- [x] 會員帳號預設空值且保持精確查詢語意；配置預設空值並使用實際站點上級返佣配置 options。
- [x] 列表欄位完整包含會員帳號、會員層級、上級返佣名稱、人數、結算週期、計算模式、錢包類型、添加時間與操作。
- [x] 不顯示 TEST1～TEST5 mock rows；正式 list 無資料時顯示 no-data。
- [x] 新增 modal 有會員帳號、配置、取消、確認；關閉後完整 reset。
- [x] 編輯 modal 顯示唯讀會員帳號與配置 dropdown；關閉不改 row。
- [x] 刪除 modal exact 顯示「刪除」「請問確認刪除此配置？」「取消」「確認」。
- [ ] 批量新增 modal 同時提供可操作的 `Manual` 與 `Upload`；Manual 每行一個帳號，Upload 可解析 XLSX／CSV／TXT，兩者第一次確認 preview、第二次確認送出，並提供可用的 CSV 範例。
- [ ] 切換 Manual／Upload 或修改任一來源會清除舊 preview，但不丟失兩個模式尚未送出的原始輸入；兩種來源都產生相同 `member_accounts` contract 與結果 table。
- [x] 頁面不再顯示 API unavailable／pending 文案，正式資料與 mutation 全部走 PDF 指定端點。
- [x] route、tab、buttons 與 handlers 同時支援 legacy `3190300` 與 current `3360300` 權限組。
- [ ] responsive／narrow viewport 無欄位重疊或操作按鈕裁切；桌面寬度與原圖無明顯差異。

- [x] list request 支援帳號／配置／pagination／添加時間 DESC，response 提供所有 row 欄位與 total。
- [x] create／edit／delete 成功、失敗、重複與無效帳號依正式 error code 呈現。
- [x] 刪除末頁最後一筆後回到有效頁。
- [x] 批量 preview、checkbox 預設狀態、confirm、部分成功與逐列原因符合正式 contract。
- [ ] 新 view/edit permission IDs 接入 route、tab、buttons 與 handlers；以 no-view／view-only／edit 三種角色驗證。

## 邊界情況

- 配置列表為空：select 顯示 no options，新增／批量確認不可送出。
- query 重複提交：沿用 query component loading／allowSameSubmit pattern，避免平行 mutation。
- row 缺可選顯示欄位：顯示 `-`，不得推測 enum 或層級。
- modal 快速重開：不得殘留上一筆 account、配置、Manual 文字、Upload 檔案、模式、比對結果或 validation。
- API 未部署／錯誤：送出前 Manual／Upload 與確認動作保持可用；request 失敗後顯示 backend error 與明確未儲存提醒，保留目前模式、原始輸入、配置及可安全保留的 preview，不做本地假成功。

## 測試與驗證

- temporary focused tests 至少驗證：route/tab、filter reset、modal reset、刪除文案、錯誤碼 mapping、Manual 每行解析、Upload parser、模式切換／preview invalidation、失敗後狀態保留、batch checkbox 預設狀態與 enum display helper；測試不可省略，但 commit 前移除或 unstage temporary test files。
- focused Prettier／ESLint、`git diff --check`；本 repo 禁止 `tsc --noEmit`。
- `npx quasar build` 必須通過。
- Chrome 手動驗證：第三 tab、query、配置 options、四種 modal、list/CRUD/batch Network、no-data、responsive，並截圖比對視覺稿。
- 正式 endpoints 到位後追加 Network method/path/payload/response 與 pagination／權限驗證。

## Git Flow

- 繼續使用目前 4817 ticket branch `feat/referral-rebate-group-crud-agent-setting-detail`；不得因 follow-up、skill、原生 subagent、review 或 QA 另開 branch／worktree。
- 不可直接在 `main`、`develop`、`staging` 或其他共享／其他 ticket branch 實作；目前產品主目錄屬另一張單且有 local changes，不得切換或覆寫。
- 推進 `develop` → `staging` → `main` 前仍需逐次取得使用者確認。
- 不得自行 commit、push、merge；每次都需使用者針對該動作明確確認。

## 交接給實作者／Codex 原生 subagent

- 先讀本 spec、repo `AGENTS.md`／`AGENTS.override.md` 與適用 repo skills。
- 在既有 referral worktree 確認目前 branch 為 `feat/referral-rebate-group-crud-agent-setting-detail`；不要建立或切換到新 branch。
- 只完成「本輪前端可完成」驗收項；不得因後端缺口停止整頁，也不得把 pending note 當主要內容。
- 不得猜 endpoint、permission ID、檔案格式或用 mock row 假裝完成。
- 完成後回報：touched files、逐條驗收結果、執行的驗證、Playwright 截圖位置、後端／權限剩餘缺口；不要 commit。
