# Spec: GSI-67 金流管理新增「總覽」儀表板

> 交接合約：本 spec 是 Claude / Codex 實作與 review 的單一依據；若需求在實作中變更，先更新本 spec，再繼續實作。
>
> 正式位置：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-67-cashflow-overview-dashboard.md`

## 需求來源

- Jira：[GSI-67](https://gamingsoft.atlassian.net/browse/GSI-67)「[需求 代理端]金流管理新增『總覽』的儀表板頁面」
- 端別：代理端 `Whitelabel_GSI_Dashboard`
- Jira 附件：
  - `image-20260708-091437.png`（版面參考）
  - `GSI_Pay_管理中心_v7_11.html`（AI 產出的概念稿，只作視覺參考，不直接複製進專案）
- Jira 後端留言（2026-07-08）：
  - `GET /platform/v1/agent/payment/overview?currency_id={id}`
  - `currency_id`：integer、required

## 背景 / 目標

原 GSI Pay 設計中已有金流儀表板概念，現調整為各站點皆可使用的「全金流總覽」，不得只統計 GSI Pay 渠道。

本次要在「金流管理」下新增「總覽」頁面，讓營運人員查看：

- 依站點時區計算的今日即時代收、代付、淨流向與成功率。
- 不含今日的最近 7 個完整日之代收 / 代付趨勢。
- 今日代收 / 代付佔比。
- 今日交易狀態統計。
- 最近 7 天相較前一個 7 天的趨勢摘要。
- 今日成功交易量的幣別分佈。

## 全局資料規則

- 「今日」一律由後端按站點指定時區計算，區間為當日 `00:00:00` 到目前時間。
- 前端不得以瀏覽器時區重新計算、切日、重算金額、成功率、佔比或成長率；前端只負責顯示 API 結果。
- 最近 7 天不含今日。例如站點日期為 07/08，圖表範圍為 07/01～07/07。
- 所有金額、筆數、比例均以 API 回傳值為準；前端不得自行由其他既有列表 API 拼湊統計。
- 本頁統計範圍是該站點所有金流渠道，不限 GSI Pay。

## 頁面入口 / Route / 權限

### Route

在既有 `src/router/routes.ts` 的 `/CashFlow` children 內新增一個頁面 route：

- 建議 URL：`/CashFlow/Overview/`
- 建議 route name：`CashFlowOverview`
- 建議頁面：`src/pages/CashFlow/Overview.vue`
- breadcrumb / menu 顯示名稱：`總覽`（必須使用 i18n key，不可 hardcode）
- 在金流管理子選單中排在現有金流列表之前。

本 spec 不要求改變 `/CashFlow` 目前 redirect `/CashFlow/List/`，避免未經確認改變既有使用者入口。若產品明確要求點擊「金流管理」預設進總覽，須先更新 spec，再把 redirect 改為 `/CashFlow/Overview/`。

### 可見角色與權限

Jira 尚未提供新的 overview permission code。實作前需由產品 / 後端確認以下二選一：

1. 新增「金流總覽」專屬 Function / View permission；或
2. 沿用既有金流管理 Function / View permission。

在 permission code 未確認前，不得自行發明數字。若確認沿用既有權限，route 可沿用：

- Function：`S_F_CASH_FLOW`、`M_F_CASH_FLOW`、`A_F_CASH_FLOW`
- View action：依登入角色沿用 `S_A_CASH_FLOW_VIEW`、`M_A_CASH_FLOW_VIEW`、`A_A_CASH_FLOW_VIEW`

但後端 endpoint 位於 `/platform/v1/agent/...`，是否支援 admin / general agent 必須一併確認；不支援的角色不得顯示可進入但必定失敗的 menu。

## API 串接

### Request wrapper

建議新增 `src/api/paymentOverview.ts`，或放入團隊確認的既有金流 API 模組；不要把 overview API 塞進不相干的 report API。

API wrapper：

```ts
getPaymentOverview(params: { currency_id: number })
```

實際呼叫：

```text
GET /platform/v1/agent/payment/overview?currency_id={id}
```

依現有 `src/utils/request.ts` 規則，wrapper 應以：

- path：`/payment/overview`
- params：`{ currency_id }`
- config：`{ name: "getPaymentOverview", usePlatform: true }`

避免在 path 重複寫入 `/platform/v1/agent`。

### Response type

在 `src/api/response.type.ts` 新增明確型別，不使用 `any`：

```ts
export type PaymentOverview = {
  today: {
    collection_total: number | string
    payout_total: number | string
    net_flow: number | string
    success_rate: number | string
    success_count: number
    total_count: number
    processing_count: number
    failed_count: number
  }
  last_7_days_trend: Array<{
    date: string
    collection: number | string
    payout: number | string
  }>
  ratio: {
    collection_pct: number | string
    payout_pct: number | string
  }
  trend_summary: {
    collection_growth: number | string | null
    payout_growth: number | string | null
  }
  currency_distribution: Array<{
    currency_id: number
    currency_code: string
    count: number
  }>
}
```

金額 / 比例的實際 JSON 型別需以後端 Swagger 或真實 response 為準；後端若保證 number，實作時應收斂為 number。不得因型別不確定而在整頁使用 `any`。

### API 欄位與 UI 對應

| API 欄位 | UI |
|---|---|
| `today.collection_total` | 今日代收總額 |
| `today.payout_total` | 今日代付總額 |
| `today.net_flow` | 今日金流淨流向 |
| `today.success_rate` | 今日成功率 |
| `today.success_count` | 成功筆數、成功率卡片明細 |
| `today.total_count` | 成功率卡片明細總筆數 |
| `today.processing_count` | 處理中筆數 |
| `today.failed_count` | 失敗筆數 |
| `last_7_days_trend[]` | 最近 7 天雙柱狀圖 |
| `ratio.collection_pct` | 代收佔比 |
| `ratio.payout_pct` | 代付佔比 |
| `trend_summary.collection_growth` | 最近 7 天代收總趨勢 |
| `trend_summary.payout_growth` | 最近 7 天代付總趨勢 |
| `currency_distribution[]` | 今日交易量分佈（按幣種） |

## 幣別選擇與載入流程

- 使用既有 `useQueryStore().getCurrencyList()` 取得站點開通幣別。
- 幣別 options 沿用 `queryStore.currencyList` 的 `{ label, value }`，label 以既有 currency i18n key 顯示。
- 頁面初始化順序：
  1. 載入 currency list。
  2. 若有幣別，選擇第一個有效幣別作為預設值。
  3. 以其 `currency_id` 呼叫 overview API。
- 站點只有 1 個幣別時，不顯示幣別下拉，但仍以該幣別呼叫 API。
- 站點有 2 個以上幣別時，顯示單選 `q-select`。
- 切換幣別後重新呼叫整份 overview API；由於 response 包含整頁資料，除非後端另有說明，整頁所有區塊都必須同步更新，不只四張今日指標卡。
- 切換時保留目前頁面骨架並顯示 loading，避免不同幣別資料短暫混用。
- 若快速連續切換幣別，畫面最終只能顯示最後一次選擇的 response；需避免較慢的舊 request 覆蓋新 request。
- 不要求將頁面幣別與 `useCurrencyStore` 的全站 header 幣別雙向同步；若產品要求同步，先更新 spec。

## UI 結構與版面

以 Jira PNG 的資訊層級為準，使用既有 Quasar card / spacing / responsive pattern 實作，不逐像素複製 AI HTML。

### 第一列：標題、幣別與 4 張即時指標卡

- 區塊標題：`今日即時營運指標`。
- 幣別下拉位於區塊右上方；只有一個幣別時整個控制項（含 label）不顯示。
- 4 張卡片順序：
  1. 今日代收總額
  2. 今日代付總額
  3. 今日金流淨流向
  4. 今日成功率
- 代收、代付、淨流向顯示格式：`[格式化金額] [幣別代碼]`。
- 金額格式沿用專案既有 money / decimal formatter，不自行用 `toFixed()` 截斷後端精度。
- 淨流向卡片補充文字：`代收 − 代付`。
- 成功率顯示 `%`；若 API 已回傳含 `%` 的字串，不可重複附加。
- 成功率卡片補充文字：`成功 [success_count] / 總計 [total_count] 筆`。

### 第二列：圖表

左側（桌面寬版）為「最近 7 天代收 / 代付趨勢」：

- ECharts 雙柱狀圖；沿用專案已安裝的 `echarts`，不新增另一套 chart dependency。
- X 軸依 API 陣列順序顯示 7 個日期，格式 `MM/DD`。
- series：代收、代付。
- Y 軸顯示金額，可使用 K 等易讀縮寫；tooltip 必須顯示未縮寫的完整格式化金額與幣別。
- chart 容器寬度改變時必須 resize；component unmount 時 dispose instance。

右側為「金流代收付佔比」：

- ECharts donut chart。
- 顯示代收與代付兩個 legend，以及 `collection_pct` / `payout_pct`。
- API 百分比直接顯示，不由前端再用今日金額重算。

桌面版趨勢圖寬、donut 圖窄；中小尺寸可改為上下堆疊，兩張卡不可水平溢出。

### 第三列：今日摘要與分佈

三張卡片：

1. 今日交易狀態統計
   - 成功筆數：`today.success_count`
   - 處理中筆數：`today.processing_count`
   - 失敗筆數：`today.failed_count`
2. 最近 7 天趨勢摘要
   - 代收總趨勢：`trend_summary.collection_growth`
   - 代付總趨勢：`trend_summary.payout_growth`
   - 正值顯示 `+`，負值保留 `-`，並依既有成功 / 警示色呈現；0 不加正號。
3. 今日交易量分佈（按幣種）
   - 顯示 `currency_code` 與 `count`。
   - 僅顯示 `count > 0`。
   - 依 count 由大到小；原則上後端應排序，前端可為防禦性顯示排序副本，但不得改動 response 原物件。
   - 最多同時露出 3 列；第 4 列起在卡片內容區內垂直捲動，卡片本身不可被撐高造成版面跑版。

## Loading / 空資料 / 錯誤與邊界條件

### Loading

- 初次載入與幣別切換時，整個 overview 資料區需有清楚 loading 狀態。
- loading 期間不得顯示前一個幣別的數值搭配新幣別代碼。

### 無幣別

- currency API 回空物件 / 空陣列時，不呼叫 overview API。
- 顯示專案既有 no-data 狀態，不讓 `currencyList[0]` 造成 runtime error。

### API 失敗

- 依專案既有 error handler / notification pattern 顯示錯誤。
- 不以全 0 假裝成功 response。
- 提供既有 pattern 可支援的重新載入方式（例如 retry button 或重新進頁）；不得造成無限重試。

### 空資料與 0 值

- 合法數值 `0` 必須顯示為 `0` / `0%`，不可被 `|| "-"` 誤判為缺值。
- `last_7_days_trend` 為空時，趨勢卡顯示 no-data，不製造假的 7 天 0 值。
- `currency_distribution` 過濾 0 後為空時，該卡顯示 no-data。
- 今日代收與代付皆為 0 時，donut chart 不得出現 `NaN`；若 API 回兩個 0，顯示空 donut / no-data，百分比顯示 `0%`。
- `total_count = 0` 時成功率顯示 API 的有效值；API 若回 null / 空值則顯示 `-`，前端不自行除以 0。
- 成長率的基期為 0 時，後端可能回 `null`。前端以 `-` 顯示，不得顯示 `Infinity%` 或 `NaN%`。
- 淨流向允許負值，負號與精度需完整保留。

## 後端統計定義（供 API 驗收，不由前端重算）

- 今日代收總額：今日所有成功充值 / 存款訂單金額總和；排除處理中、失敗、退款。
- 今日代付總額：今日所有成功提款 / 出款訂單金額總和。
- 今日金流淨流向：今日代收總額 − 今日代付總額。
- 今日成功率：`(充值成功筆數 + 提現成功筆數) / (充值總申請筆數 + 提現總申請筆數) * 100%`。
- 今日成功筆數：今日 `SUCCESS` 的代收 + 代付總筆數。
- 今日處理中筆數：今日 `PROCESSING` / `PENDING` 的代收 + 代付總筆數。
- 今日失敗筆數：今日 `FAILED` / `REJECTED` 的代收 + 代付總筆數。
- 最近 7 天代收 / 代付：不含今日，按站點時區逐日統計成功金額。
- 代收 / 代付佔比：各自除以今日代收加代付總額。
- 最近 7 天成長率：`(最近7天總額 - 前一個7天總額) / 前一個7天總額 * 100%`。
- 今日交易量幣別分佈：Jira 寫明「成功的單數為主」，本 spec 解讀為今日成功交易筆數（代收 + 代付）按幣別統計；後端需確認並在 API 文件固定此定義。

## i18n

翻譯檔不在本 repo 時，本 repo 僅引用遠端 i18n key。不得 hardcode UI 文字，也不得由實作者自行發明 en / zh-CN 翻譯。

需新增或確認的語意 key 至少包含：

- menu：總覽
- 今日即時營運指標
- 幣別切換
- 今日代收總額
- 今日代付總額
- 今日金流淨流向
- 今日成功率
- 代收 − 代付
- 成功 {success} / 總計 {total} 筆
- 最近 7 天代收 / 代付趨勢
- 代收
- 代付
- 金流代收付佔比
- 今日交易狀態統計
- 成功筆數
- 處理中筆數
- 失敗筆數
- 最近 7 天趨勢摘要
- 代收總趨勢
- 代付總趨勢
- 今日交易量分佈（按幣種）

產品需在實作前提供 / 確認各啟用語系的精確文案。現階段只以 Jira 的繁中用語作語意來源，不在本 spec 猜測其他語言。

## 預期影響檔案

- `src/router/routes.ts`
- `src/pages/CashFlow/Overview.vue`（新增）
- 可選：`src/pages/CashFlow/components/overview/**`（若拆分圖表 / 卡片）
- `src/api/paymentOverview.ts`（新增；檔名可依團隊 API 分類慣例調整）
- `src/api/response.type.ts`
- `src/utils/constants/permission.ts`（只有後端確認新增 permission 時才改）
- 遠端 i18n 翻譯來源（不一定在本 repo）

## 不在本次範圍

- 不改會員端。
- 不改既有 Dashboard 首頁。
- 不改金流列表、風控設定、虛擬幣匯率、支付類型、金流商戶管理等既有頁面行為。
- 不改後端統計公式或訂單狀態 mapping。
- 不新增自訂日期區間、金流渠道、商戶、支付類型等額外篩選。
- 不做自動輪詢 / 定時刷新；Jira 只要求「今日即時」指標，未定義 refresh interval。頁面進入與幣別切換時更新即可；若要輪詢需先更新 spec。
- 不匯出報表、不新增 drill-down / 點擊跳轉。
- 不照抄 AI HTML 的側邊欄、header、tabs 或其他非本頁元件。
- 不重構共用 chart 系統或其他頁面樣式。
- 不處理非阻擋性的既有 ESLint 問題。
- 不檢視或修改 `src/assets/env/environment.json`。
- 不合併 develop / staging / main；任何 merge 需使用者另行確認。

## 關鍵決策與理由

- 以單一 overview API 驅動整頁：Jira 已提供完整聚合 response，可避免前端用多支列表 API 重算而產生時區與狀態定義差異。
- API wrapper 使用 `usePlatform: true`：符合現有 request interceptor 組成 `/platform/v1/agent` 的方式。
- 切換幣別更新整頁：API response 包含所有區塊，不能只換四張卡而讓圖表殘留舊幣別。
- 不主動改 `/CashFlow` redirect：Jira只要求新增總覽，沒有要求改既有預設入口。
- 不自訂新 permission code：數字必須由後端權限系統提供。
- 不實作 polling：需求未定義頻率與資源成本。
- ECharts 沿用既有 dependency：避免為兩張圖引入重複圖表套件。

## 待確認項目（實作前）

- [ ] 金流總覽是沿用既有 CashFlow permission，還是有新的 Function / View permission code？
- [ ] `/platform/v1/agent/payment/overview` 支援哪些登入角色（admin / general agent / agent / anibetAgent / credit）？
- [ ] 是否要把 `/CashFlow` 預設 redirect 從 List 改為 Overview？本 spec 預設不改。
- [ ] response 金額與百分比實際是 number、decimal string，或已含 `%` 的字串？
- [ ] `date` 格式與排序是否保證為站點時區、升冪 7 筆？
- [ ] `currency_distribution` 是否固定為「今日成功的代收 + 代付筆數」？它是否隨 request `currency_id` 改變，或永遠回全幣別分佈？
- [ ] 前一個 7 天總額為 0 時，`collection_growth` / `payout_growth` 回傳規則是否為 null？
- [ ] 各啟用語系的精確 UI 文案與 i18n keys。

## 驗收條件

- [ ] 金流管理子選單新增「總覽」，且入口只對確認有權限、API 支援的角色顯示。
- [ ] 進入 `/CashFlow/Overview/` 可正常顯示 overview 頁，不影響現有 `/CashFlow/List/` 等 route。
- [ ] 有多個站點幣別時顯示單選下拉；只有一個幣別時不顯示下拉。
- [ ] 初始化以第一個有效幣別呼叫 `GET /platform/v1/agent/payment/overview?currency_id={id}`。
- [ ] API wrapper 使用 `usePlatform: true`，不重複組出錯誤 base path。
- [ ] 切換幣別會更新四張指標卡、兩張圖表與三張摘要卡，不混用前後兩個幣別資料。
- [ ] 快速切換幣別時，較舊 response 不會覆蓋最後選擇的幣別資料。
- [ ] 四張卡正確顯示今日代收、今日代付、淨流向、成功率與成功 / 總計筆數。
- [ ] 金額格式保留正確精度並顯示所選幣別代碼；0 與負淨流向正常顯示。
- [ ] 最近 7 天圖表為代收 / 代付雙柱狀圖，顯示不含今日的 7 天資料，X 軸格式為 `MM/DD`。
- [ ] 柱狀圖 tooltip 顯示完整金額與幣別，而非只顯示 K 縮寫。
- [ ] donut chart 正確顯示 API 的代收 / 代付百分比；兩者皆 0 時不出現 NaN。
- [ ] 今日狀態統計正確顯示成功、處理中、失敗筆數。
- [ ] 趨勢摘要正確處理正值、負值、0、null，不出現重複正負號、Infinity 或 NaN。
- [ ] 今日交易量分佈只顯示 `count > 0`，依筆數由大到小；超過 3 筆時在卡片內垂直捲動且不撐壞版面。
- [ ] API / currency list 為空或失敗時顯示 loading / no-data / error 狀態，沒有 runtime error，也不以全 0 偽裝成功資料。
- [ ] 圖表在 responsive resize 後正常，離開頁面時 ECharts instances 已 dispose。
- [ ] 桌面版資訊層級對齊 Jira 參考圖；中小尺寸無水平溢出，卡片合理堆疊。
- [ ] 所有新 UI 文字使用已確認的 i18n keys，無 hardcode、無自行猜測翻譯。
- [ ] 未改動本需求以外的金流頁面、樣式、互動或 API。
- [ ] 未改動 `src/assets/env/environment.json`。

## 測試計畫

依專案規則需寫測試驗證，但測試檔不可進 commit；測試完成後移除測試檔。

### 單元 / component 測試（暫存，不提交）

- API response 欄位映射到各卡片與 chart series。
- currency list 0 / 1 / 多筆時的初始化與 select 顯示。
- 連續切換幣別時只採用最後 request 結果。
- formatter 對 0、負數、decimal string、null、百分比的處理。
- distribution 過濾 0、排序、超過 3 筆的 scroll class / container。
- trend growth 正 / 負 / 0 / null。

### 手動驗證

- 使用有權限角色進入金流管理 → 總覽。
- 測單幣別站與多幣別站。
- 對照 network request 的 `currency_id` 與畫面幣別。
- 以後端 fixture 驗證正常資料、全 0、無交易、負淨流向、基期為 0、API error。
- 驗證桌面 / tablet / mobile breakpoint。
- 驗證切換語系後所有新字串均取自 i18n。

### 最小程式驗證

- 對 touched files 執行 `git diff --check`。
- 執行專案現有 type-check / build 中最小且可用的相關驗證。
- 不主動清理不阻擋驗證的既有 ESLint 問題。

