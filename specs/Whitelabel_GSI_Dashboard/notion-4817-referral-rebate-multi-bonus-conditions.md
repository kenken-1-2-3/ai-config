# Spec 總覽：Notion 4817 上級返佣設定與多加成條件

- 來源：[Notion 4817](https://app.notion.com/p/wowgaming/343fc5d788a980528349fdf1902c56da)、`/Users/kenyu/Downloads/rebate-rule-integrated-mock.html`、`/Users/kenyu/Downloads/4817-api-spec-fe.pdf`
- 專案：`Whitelabel_GSI_Dashboard`（代理端）
- 狀態：實作中；2026-08-10 依使用者實測修正互動與驗證規則
- 規格日期：2026-08-10

## 結論

需求單沒有名為「群組列表」或「多群組管理」的獨立產品功能。需求單中的正式畫面名稱是「上級返佣設定」，並在該段明確定義查詢條件、`【List 欄位】`、新增、編輯、複製、刪除、啟停與代理列表操作；本 spec 統一稱為「上級返佣設定列表」。

後端 API 將每筆上級返佣設定稱為 `group`，因此 `group`／`group_id` 只作為資料契約與 route identity 的技術名稱，不得轉成另一個使用者可見的「群組管理」概念。Notion 留言中的 GSI-274 是後端 `whitelabel_platform`／DDL 工作，提供設定 CRUD、`condition_sets` 與 bindings 能力，不是需要先合併的 Dashboard 前端功能，也不是本單的停止條件。目前 Dashboard `main`、`develop`、`staging` 都仍是舊的單例頁，正是 4817 要改造的基線。

2026-08-04 使用者決策：進入「上級返佣設定」必須直接顯示新版設定列表，不得因 G1／G3 尚未修正而保留舊單例 `Edit.vue` 作為預設入口；不可退回舊畫面。2026-08-05 補充確認：目前測試環境的鉛筆編輯入口需直接進入新版表單；detail 有回的欄位照常回填，PUT 一律依表單目前狀態完整送出 `condition_sets`、`bindings`、`binding_levels`，不得因舊 detail 未回傳而省略。G1／G3 未修正前仍不可宣稱完整 edit round-trip 已驗收。2026-08-10 使用者實測再確認：不得用 API、schema、尚未串接或後端 validation 缺口把需求控制項預先停用、鎖定或隱藏；使用者要先能完成輸入／選擇並觸發動作，失敗後保留表單狀態並明確提醒哪些內容尚未儲存，不得顯示假成功或靜默丟值。

需求拆成三個可獨立實作與驗收的單位：

1. [上級返佣設定列表與 CRUD](./notion-4817-referral-rebate-group-management.md)
2. [各層 condition sets 與 rate editor](./notion-4817-referral-rebate-condition-sets.md)
3. [代理綁定、批次新增與權限](./notion-4817-referral-rebate-agent-bindings-permissions.md)

## 2026-08-10 使用者驗收修正

本節是最新使用者決策，優先於舊 mock、參考圖與既有實作：

| 項目 | 必須行為 | 已知 persistence 缺口的處理 |
| --- | --- | --- |
| 新增時啟／停用 | 「啟用」與「停用」都能選；不得把停用鎖住或自動改回啟用 | 送出使用者選擇的 `enabled`；若 G6 拒絕 `false`，保留整份表單與停用選擇，提醒「停用狀態未儲存」及後端原因 |
| 門檻輸入 | 活躍人數、總投注、總存款、總淨盈利只接受非負整數；`0` 代表不限制；`1.5`、負數與其他小數無效 | 這是客觀輸入驗證，可在送出前標錯並阻止無效 request；不得只依賴 `type=number`／`step=1` |
| 加成條件名稱 | `set_order = 1` 的「初始條件」固定且不可編輯；新增的 `set_order = 2..5` 預設為「加成條件 N」但名稱可編輯 | 後端補 name 欄位前仍保留編輯能力；儲存後清楚提醒名稱未持久化、保留目前輸入，不得假裝 reload 後仍存在或靜默改回固定名稱 |
| 批量新增 | 同時提供 `Manual` 與 `Upload` 兩種模式，兩者走相同 preview → confirm → result 流程 | API 已接受 `member_accounts`；來源模式只影響前端收集名單，不得只保留 Upload |
| NGR 模式 | 淨盈利（NGR）選項必須可選且 editor 可操作 | 依正式 contract 送 `game_type: 0`；若 G4 拒絕，保留 NGR 選擇與輸入並提醒本次未儲存，不得預先 disable NGR |

權限、破壞性操作確認、mutation 期間防重複／loading，以及上述客觀無效輸入仍可合法阻擋操作；不得拿這些例外包裝一般 API 缺口。

## 來源優先順序與完整畫面範圍

三份來源用途不同，不能只用後端缺口反推並刪除需求畫面：

1. Notion 決定功能範圍、欄位語意、規則與驗收行為。
2. `rebate-rule-integrated-mock.html` 與已下載參考圖決定新版建立／編輯頁的資訊架構、區塊、控制項與視覺排列。
3. 後端 PDF 決定 API endpoint、enum、request／response shape 與目前已知缺口。

新版建立／編輯頁必須完整包含以下區塊。任一欄位受後端限制時，需求控制項仍須保持 enabled、selectable、editable；不得因 API／schema／尚未串接／後端 validation 缺口預先 disabled、lock 或隱藏。使用者觸發動作後若後端拒絕或欄位無法持久化，保留表單狀態並明確提醒哪些值未儲存及原因，不得顯示成功或靜默丟值：

- 上級返佣基本設定：名稱、啟停、返水對象、派發方式、結算週期、稽核倍數、計算模式、錢包類型、會員層級、會員帳號。
- 派發門檻：派發門檻、單次結算派發上限、產品 GGR／總 GGR 計算依據與 GGR/NGR 設定說明。
- 活躍會員條件：存款累計／單次、各幣別存款門檻、各幣別有效投注門檻與 tooltip。
- 初始條件與加成條件 tabs：初始條件固定存在且名稱不可編輯；可新增加成條件 2–5，預設名稱為「加成條件 N」且可編輯；加成條件可用 `×` 刪除，刪除後右側條件依原順序往前補，payload `set_order` 重新編成連續序號，但已輸入的自訂名稱跟著原條件移動、不得被固定名稱覆寫；旁邊的新增按鈕固定為 44 × 44 px、3 px 外框，並移除 Quasar 預設最小寬度造成的放大，不可高於條件 tab 列。
- 每層條件與返佣比例：活躍人數、會員總投注量、會員總存款金額、會員總淨盈利，以及依遊戲類型／幣別設定的比例 editor。四個門檻都只接受非負整數，`0` 代表不限制，`1.5` 必須判定為無效；三個金額欄位即使 payload 使用 string，也只能序列化整數字串。活躍人數單位「人」位於輸入框右側同列，其後、會員總投注量前顯示規則 info icon 與需求圖定義的 hover 說明。
- 2026-08-05 使用者取消幣種 UI 展示控制：頁首與表單都不顯示幣種數量 selector；派發門檻、活躍會員條件與比例 editor 直接列出站點全部可用幣別，每行最多 4 個幣別輸入格，超過時換行，並依既有契約完整序列化。
- 返佣計算說明與「查看範例」。

## 目標

- 把「上級返佣設定」由全站單例表單改為設定列表、建立、編輯、複製、刪除與啟停；不得另外建立名為「群組管理」的使用者介面或 menu。
- 每筆上級返佣設定可依下線層級設定初始條件及最多四組加成條件。
- 各條件支援活躍人數、總存款、總有效投注、總 NGR 與返佣比例。
- 提供上級返佣設定與代理帳號的一對一配置管理，含單筆、`Manual` 與 `Upload` 批次新增。
- 新增「代理設定詳情」查看／編輯權限，不挪用既有「上級返佣明細」權限。
- 移除上級返佣設定表單中的會員標籤及舊 `label_ids`／舊 rate payload。

## 2026-08-04 工作樹現況

- `src/router/routes.ts` 已將 `CommissionSetting` 預設入口切到新版 `List.vue`，並有 `Create.vue` route；舊單例 `Edit.vue` 已解除 route 接線但檔案仍保留。
- `src/api/commissionManagement.ts` 已新增 platform group list/create/detail/update/delete/copy/enabled wrappers，request／response types 也已有新版基礎契約。
- `Create.vue` 目前只有部分基本設定、活躍會員條件與派發門檻；仍缺啟停、會員層級／帳號、完整 GGR/NGR 計算依據、condition tabs、每層門檻、rate editor、tooltip 與查看範例。
- `Create.vue` 目前以 pending note 取代整個 `condition_sets` 區塊，且註解仍引用已被本次核對推翻的「單一遊戲／scalar 幣別 blocker」；這是必須修正的實作，不是可接受的暫態成品。
- `List.vue` 與 create-only API shell 可保留並繼續補齊；edit、代理設定詳情及個別後端缺口依本 spec 的局部狀態處理。
- `src/assets/env/environment.json` 是使用者既有 local-only 變更，不屬於本單，也不得納入檢查或交付。
- 既有 events、entries、statements、dispatch、cancel 畫面及 API 不屬於本次改造。

## 實作順序

1. 先完成子 spec 1 的 list/create/edit routes、可用 CRUD 與 platform API 基礎；測試環境 edit 直接接新版表單，G1／G3 只保留為完整 round-trip 的後端缺口。
2. 子 spec 2 以子 spec 1 的群組新增／編輯表單為基礎，替換條件與 rate payload。
3. 子 spec 3 的第三分頁 route、查詢／列表 UI、四種 modal、正式 bindings CRUD／batch／權限整合依 2026-08-05 bindings PDF 實作；批量新增需補齊 `Manual` 與 `Upload` 兩種來源模式。
4. 三份 legacy 子 spec 都屬同一張 4817 單的 execution slice；後續修正沿用既有 ticket work branch，不因切換 slice／skill／review 另開 child branch。

## 契約事實與局部阻擋

### 已確認

- 上級返佣設定 API base 已遷移到 `/platform/v1/agent/referral_rebate`；後端契約內仍使用 group 命名。
- 設定 endpoints：list、create、detail、update、delete、copy、enabled 均已由後端 GSI-274 提供。
- 4817 只改 group create/update/detail 的 `condition_sets` shape；events／entries／派發不受影響。
- POST／PUT body、enum、`agent_eligibility`、`condition_sets` 與整包覆蓋語意以 2026-08-03 後端 PDF 為準；PDF 直接讀 `whitelabel_platform` branch code。
- NGR 單一比例使用 `game_type: 0` 哨兵；calculate type 1／2 則每個 `game_type` 各一筆。
- 同一推薦線、同一層的活躍會員數值採加總；不同線與不同層不合併。
- `rates[].layer`、舊 `label_ids`、舊 `rebate_rate_config`／`rate_rate_config` 不再送出。

### 只阻擋對應子 spec，不是全單停止條件

| 未決事項                                                                                                    | 影響範圍                      | 所需確認                                                                    |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| Detail 缺 `id/name/condition_sets/bindings/binding_levels`，POST/copy 不回 id，PUT 不能改 name              | 子 spec 1／2                  | 後端修正 G1–G3；create-only 可先做，edit 不可假裝完成                       |
| 加成 tab 的拖曳／自訂排序規則尚未定義；刪除後往前補號已於 2026-08-04 確認                                   | 子 spec 2 tab reorder         | 刪除照已確認規則實作；拖曳／自訂排序等待產品確認                            |
| 後端以 `game_type: 0` 表示 NGR 單一比例，但目前 validation 拒絕 0；視覺稿的「總 GGR」也需要單一統一比例契約 | 子 spec 2 的 NGR／總 GGR persistence | 後端修正 G4，並確認總 GGR 的 request mapping；NGR／GGR 選項與 editor 都保持可操作，失敗後提醒未儲存 |
| `game_type: 0`、`rate: 0` 與 enabled=false 被 Go required validation 擋住                                   | 子 spec 1／2 mutation persistence | 後端修正 G4–G6；不得因此預先 disable／lock NGR、0% 或停用選項 |
| `condition_sets` 尚無可 round-trip 的加成條件名稱欄位                                                     | 子 spec 2 名稱 persistence    | 後端新增 name 欄位；初始條件名稱固定、加成條件 2–5 仍可編輯，動作後明示名稱未儲存 |

### 2026-08-04 重新對稿後的可交付範圍

| 功能                                    | 現在是否可做 | 說明                                                                                                                                          |
| --------------------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 新版列表入口與 create route             | ✅           | 不依賴 detail；舊單例頁不可作 fallback                                                                                                        |
| 建立頁基本設定、派發門檻、活躍會員條件  | ✅           | 依 POST body 與 `agent_eligibility` 實作                                                                                                      |
| 會員層級／會員帳號選擇                  | ✅ 前端可做  | POST 已有 `binding_levels`／`bindings`；帳號選項須隨所選層級過濾，未選層級時顯示全部會員，切換層級清除不相容帳號；不受 G7 專用管理頁 API 阻擋 |
| 初始條件、加成條件 2–5、四種門檻        | ✅           | `condition_sets` shape 已確認                                                                                                                 |
| 有效投注／產品 GGR 的供應商與幣別比例   | ⚠️ 局部      | UI 由 `/product/dropdown` 列全部供應商；`rates[]` 缺 `product_code`，不同供應商比例暫不可送出                                                 |
| 計算說明、tooltip、查看範例             | ✅           | 純前端需求，依 mock／參考圖完成                                                                                                               |
| 編輯既有設定                            | ⚠️ 測試可用  | detail 有回欄位先回填；PUT 依表單狀態完整送出 condition／binding 欄位，完整 round-trip 仍等 G1／G3                                            |
| NGR／總 GGR 的單一比例儲存              | ✅ UI／⚠️ persistence | NGR 必須可選且 editor 可操作；依 contract 嘗試送出，G4／mapping 失敗時保留輸入並提醒未儲存                                                    |
| 儲存 0% 比例、建立為停用                | ✅ UI／⚠️ persistence | 0% 與停用都可選；依 contract 嘗試送出，G5／G6 失敗時保留整份表單並提醒未儲存                                                                |
| 加成 tab 刪除與自動補號                 | ✅           | `set_order = 2..5` 可刪除；後續 tab 與 payload `set_order` 依原順序連續補號                                                                   |
| 加成 tab 拖曳／自訂排序、自訂名稱持久化 | ✅ 名稱 UI／⚠️ persistence | 拖曳仍待產品規則；初始名稱不可編輯、加成條件 2–5 名稱可編輯；後端 name 缺口只能在動作後提醒，不能關閉編輯能力                                 |
| 代理設定詳情 route／頁面／modal         | ✅           | 2026-08-05 bindings PDF 已提供正式列表、CRUD、batch 與 legacy/current 權限 contract                                                           |
| 代理設定詳情批量來源模式                | ⚠️ follow-up | 現有 Upload 與正式 preview／confirm 可沿用；2026-08-10 需補 Manual，兩種來源共用 `member_accounts` flow                                       |

## Remote i18n mapping（backstage/agent）

下表已比對 consumer repo 與 `data/translations/gsi-backend-translations.csv` 本地 snapshot；本輪未執行 live API write／read-back。既有 key 可重用，缺 key 只能標 `BLOCKED` 並交付精確 delta，不能宣稱 `CREATED`。

| UI copy | Status | Key | en | zh-TW | zh-CN | Evidence / note |
| --- | --- | --- | --- | --- | --- | --- |
| 啟用／停用 | `REUSED` | `common.enable`／`common.disable` | Enable / Disable | 啟用／停用 | 启用／停用 | 現有 create options 與 backstage snapshot |
| NGR | `REUSED` | `table_header.net_gaming_revenue` | Net Gaming Revenue | 淨盈利(NGR) | 净盈利(NGR) | `CALCULATE_TYPE.I18nKeys` 與 snapshot |
| 活躍人數 | `REUSED` | `edit_form.active_member_count` | Active Player Count | 活躍會員人數 | 活跃会员人數 | 現有 create form 與 snapshot |
| 總投注 | `REUSED` | `table_header.total_bet_amount` | Total Bet Amount | 總投注金額 | 总投注金额 | 現有 create form 與 snapshot |
| 總存款 | `REUSED` | `table_header.total_deposit_amount` | Total Deposit Amount | 總存款金額 | 总存款金额 | 現有 create form 與 snapshot |
| 總淨盈利 | `REUSED` | `edit_form.net_profit` | Net Profit | 淨盈利 | 净盈利 | 現有 create form 與 snapshot |
| Manual | `REUSED` | `send_type.manual` | Manual | 手動 | 手动 | snapshot 有 exact copy；本模式只取通用顯示值，不沿用 dispatch enum |
| Upload | `BLOCKED` | proposed `common.upload` | Upload | 上傳 | 上传 | 無 generic exact key；待 Locale Manager create + read-back |
| 初始條件 | `BLOCKED` | proposed `edit_form.initial_condition` | Initial Condition | 初始條件 | 初始条件 | 目前 hardcode；無 exact key |
| 加成條件 N | `BLOCKED` | proposed `edit_form.bonus_condition_num` | Bonus Condition {num} | 加成條件 {num} | 加成条件 {num} | 目前 hardcode；`{num}` 為顯示序號 |
| 條件名稱 | `BLOCKED` | proposed `edit_form.condition_name` | Condition Name | 條件名稱 | 条件名称 | 使用者輸入的自訂名稱是資料，不是 locale key；本 key 只用於欄位 label |
| 非負整數驗證 | `BLOCKED` | proposed `error_msg.must_be_non_negative_integer` | Please enter an integer greater than or equal to 0 | 請輸入大於或等於 0 的整數 | 请输入大于或等于 0 的整数 | `must_be_positive_integer` 不允許 0，amount-only key 不適用活躍人數 |
| 欄位未儲存提醒 | `BLOCKED` | proposed `message.referral_rebate_fields_not_saved` | The following fields were not saved: {fields}. Your input has been retained. Reason: {reason} | 以下欄位尚未儲存：{fields}。已保留目前輸入。原因：{reason} | 以下字段尚未保存：{fields}。已保留当前输入。原因：{reason} | 現有 add/edit failure key 無法指出未儲存欄位與已保留狀態 |

可直接續跑的 missing-key delta：`common.upload`、`edit_form.initial_condition`、`edit_form.bonus_condition_num`、`edit_form.condition_name`、`error_msg.must_be_non_negative_integer`、`message.referral_rebate_fields_not_saved`。後續 live run 必須先重查 backstage/agent dataset，仍缺少才分批建立，逐批 read-back 三語完全一致後才改成 `CREATED`。

## 視覺素材

素材目錄：[`notion-4817-referral-rebate-multi-bonus-conditions-assets`](./notion-4817-referral-rebate-multi-bonus-conditions-assets/)

| 檔案                                                                                 | 用途                                                                |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `01-referral-rebate-list.png`                                                        | 上級返佣設定列表／搜尋／操作                                        |
| `02-layer-condition-summary-modal.png`                                               | 上級返佣摘要 modal                                                  |
| `03-referral-rebate-form-overview.png`                                               | 建立／編輯整頁                                                      |
| `04-layer-condition-editor.png`                                                      | 分層條件與加成 tab                                                  |
| `05-condition-editor-deposit-tooltip.png`                                            | 存款條件說明；`agent_eligibility.deposit.mode` 已確認支援累計／單次 |
| `06-condition-editor-rule-tooltip.png`                                               | 規則說明                                                            |
| `07-calculation-example-modal.png`                                                   | 計算範例                                                            |
| `08-calculation-tree-agent-a.png`、`09-calculation-tree-agent-b1.png`                | 上下級樹範例                                                        |
| `10-agent-settings-detail-list.png`                                                  | 代理設定詳情列表                                                    |
| `11-agent-setting-delete-confirm.png`                                                | 刪除確認                                                            |
| `12-agent-batch-add-dialog.png`、`13-agent-batch-add-result.png`                     | 舊稿的 Upload 與比對結果；2026-08-10 使用者決策另要求並列 `Manual`，模式可用性以最新決策為準 |
| `14-agent-setting-edit-dialog.png`、`15-agent-setting-add-dialog.png`                | 單筆編輯／新增                                                      |
| `16-agent-setting-duplicate-error.png`、`17-agent-setting-invalid-account-error.png` | 錯誤提示                                                            |
| `18-agent-setting-detail-permission.png`                                             | 權限設定                                                            |

## 全域 Out of scope

- 不改 `CommissionDetail`、events、entries、statements、批量派發、單一派發或取消流程。
- 不改會員端 referral rebate endpoints 或畫面。
- 不自行修改後端、資料庫 migration、計算引擎或 permission seed。
- 不新增／修改本 repo 不存在的 locale JSON。每個新文案先搜尋 consumer repo、shared／legacy 與目標 remote dataset；有相容 key 就重用，沒有就依既有 namespace／命名規則透過 Locale Manager API 新增，read-back 後提供 `REUSED`／`CREATED`／`BLOCKED` mapping。
- 不順手重構其他佣金、返水或代理管理頁。

## Git Flow

- 本張 4817 單既有 ticket work branch：`feat/referral-rebate-group-crud-agent-setting-detail`；後續驗收修正繼續在同一 branch／既有 referral worktree 完成。
- 不得因從 canonical 切到子 spec、從實作切到 review／QA，或使用不同 skill／原生 subagent 而另開 branch 或 worktree。
- 目前 `Whitelabel_GSI_Dashboard` 主目錄在另一張單的 branch 且有使用者變更；不得切換或覆寫該 worktree。
- 推進 `develop` → `staging` → `main`、commit、push 或 merge 前，都需取得使用者針對該次動作的明確確認。

## 全域驗收清單

- [ ] 不再把 GSI-274 當成前端先決條件，也不新增獨立的「群組管理」產品概念；本單依需求交付「上級返佣設定列表」及其操作。
- [ ] 「上級返佣設定」正常 menu／parent route 直接進入新版列表；舊單例 `Edit.vue` 不再是預設入口或 fallback。
- [ ] 三份子 spec 各自完成其 acceptance checklist。
- [ ] route、API wrapper、request／response types、page components 與權限切分一致。
- [ ] 建立頁完整呈現「基本設定 → 派發門檻 → 活躍會員條件 → condition tabs → 各層門檻與 rate editor → 查看範例」，不得以局部 API 缺口刪掉整段 UI。
- [ ] 建立頁的「啟用」與「停用」都可選；NGR 模式可選且 editor 可操作；不得因 G4／G6 預先 disable、lock 或自動改值。
- [ ] 活躍人數、總投注、總存款、總淨盈利只接受非負整數與 `0`；四欄輸入 `1.5` 都顯示無效且不能送出。
- [ ] 初始條件名稱不可編輯；加成條件 2–5 預設有名稱且可編輯，刪除／補號不覆寫已輸入名稱。
- [ ] 批量新增同時提供 `Manual` 與 `Upload`，兩種來源都能進入同一 preview → confirm → result 流程。
- [ ] 後端拒絕或欄位無法持久化時，保留目前表單、選項與名稱，明確提醒未儲存範圍；不得顯示成功或靜默清空／回復預設。
- [ ] 所有群組 API 使用 relative path + `{ usePlatform: true }`。
- [ ] events／entries／派發相關功能沒有非必要變更。
- [ ] 18 張參考圖均已放入 spec assets 目錄，可供實作者離線比對。
- [ ] focused validation、手動 Network 驗證及權限驗證均有紀錄。
