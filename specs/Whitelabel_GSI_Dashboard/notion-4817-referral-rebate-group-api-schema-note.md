# Implementation Note：4817 Platform API 實際契約與缺口

- 主要來源：`/Users/kenyu/Downloads/4817-api-spec-fe.pdf`
- Code 來源：`whitelabel_platform @ PRE-4817-referral-event-notnull-simon-develop`，port `fc3457ec`
- 整理日期：2026-08-03
- 對應：[群組 CRUD](./notion-4817-referral-rebate-group-management.md)、[condition sets](./notion-4817-referral-rebate-condition-sets.md)、[agent bindings](./notion-4817-referral-rebate-agent-bindings-permissions.md)

> 本 PDF 直接依 backend branch code 整理，優先於先前不完整的 Apifox schema。不得再以「POST／PUT 沒有 body schema」阻擋 request types 或 create-only flow。

## 已確認 contract

- Platform base：`/platform/v1/agent/referral_rebate`；統一 envelope `{ code, message, data }`。
- Group endpoints：list、detail、create、update、copy、delete、enabled 共 7 支。
- List query：`name`、`dispatch_type`、`wallet_type`、`calculate_type`、`enabled`、`offset`、`size`。
- Group POST／PUT body 可帶：`name`、群組基本設定、`agent_eligibility`、門檻／上限、`binding_levels`、`condition_sets`。2026-08-05 bindings 契約宣告 `bindings` 欄位廢棄，不得再送。
- POST 只有 `name` 必填；PUT 全部選填，不帶表示不更新。
- `agent_eligibility.deposit.mode`：`accumulated`／`single`；存款／投注各自以 `currency_threshold` 保存每幣別金額。
- `condition_sets`：`layer × set_order`，四種門檻同組 AND；同線同層活躍會員數值加總；多組取最高比例；不同推薦線獨立。
- NGR 單一比例使用 `game_type: 0`；calculate type 1／2 依 game type 各一筆。
- `binding_levels` 是 VIP level IDs，維持 group 契約；代理 member 名單改由 `/referral_rebate/bindings` 分頁／CRUD endpoints 管理，group Detail 刻意不回 `bindings`。
- `condition_sets` 也是整包覆蓋，但空陣列代表不更新，不能用空陣列清空。

## 後端 G1–G10

| #   | 缺口                                                       | 前端影響                                                                  |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------- |
| G1  | Detail 缺 `id/name/condition_sets/binding_levels`          | ✅ 2026-08-05 DEV 實測已修；`bindings` 不返回是刻意拆分，不屬缺口          |
| G2  | POST／copy 不回 id                                         | 成功後只能回列表，不能導向新 detail                                       |
| G3  | PUT 不能改 name                                            | 群組名稱無法編輯                                                          |
| G4  | `game_type: 0` 被 required validation 擋住                 | ✅ 2026-08-05 DEV 實測 PUT／Detail round-trip 已修                         |
| G5  | `rate: 0` 被 required validation 擋住                      | ✅ 2026-08-05 DEV 實測 PUT／Detail round-trip 已修                         |
| G6  | enabled=false 被 required validation 擋住                  | 停用 toggle 會 400                                                        |
| G7  | 無 bindings list／CRUD／batch endpoints                    | ✅ `4817-api-spec-fe-bindings.pdf` 已提供 6 支正式 endpoints                |
| G8  | List 無 `rebate_target` query／欄位                        | 搜尋與欄位缺一項                                                          |
| G9  | name 為 LIKE、排序 created_at DESC                         | 與精確搜尋／舊到新需求相反                                                |
| G10 | 無代理設定詳情 permission node/actions                     | ✅ legacy 3190300/1/2、current 3360300/1/2 已提供                           |

## 前端可先做

- List 現有 5 個 filters、pagination、可用欄位、copy/delete 成功路徑。
- 啟停目前只能安全呼叫 `enabled: true`；前端需攔截 `false`，避免送出已知必定失敗的 request。
- Group POST／PUT request contracts 與 wrappers。
- Create-only 群組表單：只送已確認欄位；成功後回列表，不依賴 id。
- `agent_eligibility` 與 `condition_sets` create serializer；需在 UI 明示 G4/G5 限制或避開無法成功的值。
- `agent_count` 列表欄位可直接顯示。

## 暫不可宣稱完成

- 完整 edit/detail hydration、群組名稱更新、停用流程。
- `rebate_target` 列表／搜尋、精確 name、ASC 排序。
- 代理設定詳情的正式資料／mutation、CSV compare／apply、獨立權限；route、查詢／列表 UI 與 modal 殼層不受此缺口阻擋。
- STG／Prod 整合；PDF 記載 DDL／platform MRs 尚未部署。
