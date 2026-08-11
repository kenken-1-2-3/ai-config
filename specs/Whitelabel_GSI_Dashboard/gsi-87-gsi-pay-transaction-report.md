# Spec: GSI-87 新增「GSI Pay 交易報表」頁面

> 交接合約：本 spec 是 GSI-87 實作與 review 的單一依據；若需求或 backend contract變更，先更新本spec再繼續。
>
> 正式位置：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-87-gsi-pay-transaction-report.md`

## 需求來源

- Jira：[GSI-87](https://gamingsoft.atlassian.net/browse/GSI-87)「[需求 代理端]新增『GSI Pay交易報表』頁面」。
- 父需求：[GSI-84](https://gamingsoft.atlassian.net/browse/GSI-84)「新增 GSI Pay 為預設金流」。
- 整合規格：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-84-gsi-pay-integration.md`。
- Sibling specs：
  - `gsi-85-gsi-pay-account-rate.md`
  - `gsi-86-gsi-pay-billing-center.md`
- Jira附件／使用者提供檔案：`/Users/kenyu/Downloads/GSI_Pay_管理中心_v7_11_API標註.html`。
- Backend contract查核：[Apifox project 4860774](https://app.apifox.com/project/4860774)，`代理端 > 金流管理`。
- 端別：代理端 `Whitelabel_GSI_Dashboard`。

### 來源可用性與優先序

- Spec作者已讀取GSI-87 Jira description（2026-07-28更新）、HTML report section、repo report／query／export／timezone patterns，並於2026-07-28重新查核Apifox。
- Apifox現已在`代理端 > 金流管理 > GSI Pay交易報表`提供6支查詢及6支CSV匯出API；每支均有DEV實測request／response、欄位與語意說明。API文件狀態仍標示「開發中」，但DEV contract已可供frontend integration。
- API標註版HTML在GSI-87區原本寫「本輪（85/86）未實作，無對應API」（`:1079`）；該註記已被2026-07-28 Apifox contract取代。HTML仍只作資訊架構與視覺concept，不能作request／response contract。
- GSI-85／86／87沒有正式Jira blocks／depends links；關係來自共同父需求、共用資料domain與整合順序。
- 本spec是實作的單一真實來源；backend contract以2026-07-28 Apifox內容及DEV實測結果為準。
- HTML第1076行起的report panel是資訊架構與視覺concept；其hardcoded data、client pagination、alert export與缺失states不是production contract。

## 背景 / 目標

新增GSI Pay交易報表，供財務依站點時區與已開通幣別產生日結、月結、業務量、手續費、拒付／沖銷及站長提現報表，顯示report-specific summaries與明細，並匯出完整篩選結果。

所有aggregate、rate、fee、balance與status bucket均由backend以authoritative ledger計算；frontend不下載GSI-86流水後自行加總，也不以GSI-85目前費率回算歷史。

## 與 GSI-85／86 的關係

### 共用基礎

- CashFlow sibling routes、GSI Pay API module、central request／response types、enums、permissions、enabled currencies、站點時區、GSI單號與export infrastructure。
- GSI-87 Withdrawal report讀取與GSI-85相同的`WD-` lifecycle與正式status enum，但使用report DTO，不引用GSI-85 feature-local placeholder types。
- GSI-87 Daily／Monthly／Fee／Chargeback reports使用與GSI-86相同的authoritative billing events及immutable fee snapshots。
- Ultrapay第三方單號只留typed response供Network排查，不render到report、DOM、export或logs。

### 嚴格分界

- GSI-85負責wallet、買分／提現操作、pending與account ledger；GSI-87不建立或處理提款申請。
- GSI-86負責逐筆billing ledger；GSI-87負責report selection、backend summaries與report-specific rows，不重用GSI-86 12欄table contract作所有reports。
- GSI-85 wallet ledger與GSI-86 billing flow雖都可能回`balance_after`，帳務domain不同；Daily report的「帳變後餘額」必須由正式report contract指定來源。
- GSI-87不實作Telegram Bot、Webhook或withdrawal status transition。

## GSI-84 分支整合策略

- 整合父分支：`feat/gsi-pay`。
- GSI-85：`feat/gsi-pay-account-rate`。
- GSI-86：`feat/gsi-pay-billing-center`。
- GSI-87工作分支：`feat/gsi-pay-transaction-report`。
- GSI-85／86已完成API integration並整合至`feat/gsi-pay`；GSI-87 production integration直接延續既有UI-first branch，不重建、不rebase、不改寫歷史。
- 開始實作前必須先切到既有`feat/gsi-pay-transaction-report`，再取得使用者對「把最新`feat/gsi-pay`合入此工作分支」的明確批准；若有conflict立即停止回報，不自行處理。
- 使用flat branch names；不使用`feat/gsi-pay/...`，避免Git ref prefix衝突。
- Git父分支不等於UI route parent；三頁仍是`/CashFlow`下的sibling pages。

## 範圍

- 新增GSI Pay交易報表route／page。
- 實作report type、enabled currency、start/end date controls與「產生報表」。
- 依六種report type動態顯示summary cards及對應table columns／rows。
- 實作server-side report pagination、loading、initial empty、result empty、validation與API error states。
- 實作permission-gated export，使用同一組report filters並匯出全部符合資料，不只目前page。
- 串接report API wrappers、typed discriminated request／summary／row contracts、formal enums、permissions、timezone rules與remote i18n keys。
- Withdrawal report顯示wallet address並提供copy action；正確處理clipboard success／failure。

## 跨站影響

- 父需求GSI-84是全站點共用功能，不是單一代理、template或siteKey特例。
- 所有符合正式permission的站點可進入本頁，但API只能回目前登入站點的enabled currencies與report data。
- 不把某站currency、report result或filters快取成其他站點的global default。
- GSI Pay與Ultrapay可同站共存；report provider、單號與contracts必須分離。
- 若日後改成單站開放，先更新spec並確認route／backend隔離策略；不得修改shared menu builder連帶影響其他站點。

## 頁面入口 / Route / Menu

- URL：`/CashFlow/GSIPayTransactionReport/`
- route name：`GsiPayTransactionReport`
- page：`src/pages/CashFlow/GSIPayTransactionReport/Index.vue`
- parent：既有`/CashFlow`
- `menuShow`：`["agent"]`
- breadcrumb／label：`GSI Pay 交易報表`，使用產品提供的精確remote i18n key。
- icon：沿用CashFlow／GSI Pay sibling pattern，未指定時不新增asset。

規則：

- 本批次不建立UI top-level「GSI Pay管理中心」parent。
- 不重建HTML app shell或tab show／hide JavaScript。
- 不修改`/CashFlow`redirect、GSI-85／86 routes或其他CashFlow child behavior。
- GSI-87 route在整合環境與85／86互為sibling，name／path／permission不得覆蓋。

## 權限

- 12支report endpoints共用`A_A_GSIPAY_WALLET_VIEW`（`3590101`）。
- Backend目前沒有獨立GSI-87 View／Export permission node；查詢與匯出都使用上述wallet view permission。
- 在`src/utils/constants/permission.ts`加入正式enum值，route的`meta.permission`改用此值，移除UI-first暫借的`S_F_CASH_FLOW／M_F_CASH_FLOW／A_F_CASH_FLOW`。
- Export沒有獨立permission可判斷；能進頁面的使用者可執行export。Frontend仍須在export request pending時disable按鈕、防重複送出。
- 本批12支API不含Withdrawal remark write endpoint，因此remark維持唯讀，不新增Edit permission或`usePermission()`分支。
- Backend endpoints仍須驗權；route／button visibility不是security boundary。

## 全局資料與安全規則

- 時間顯示與filters使用站點指定時區；「今日」為站點當日00:00:00至Now。
- UI只顯示GSI單號：`PAY-`、`REV-`、`WD-`；必要時`TXN-`是否出現由report contract明訂。
- Amount／fee／rate／summary使用precision-safe decimal strings或正式等價contract；frontend不使用binary float進行財務計算。
- 不直接加總不同fiat currencies。任何summary total必須限定單一currency、依currency分組，或由backend提供明確conversion currency與server-computed total。
- Wallet address與remarks屬敏感資料；UI按contract遮罩／截斷，copy可取得允許的完整值。Export是否包含／遮罩必須由產品與security確認。
- Credentials不得進source、spec、fixture、DOM、logs、client request／response或export。
- GSI Pay與Ultrapay可共存，provider data與單號不可互相覆蓋。

## 頁面資訊架構與行為

### 初始與控制區

- 初始顯示report controls與「請選擇報表類型及日期區間」empty state；未產生前不顯示mock results。
- Controls：
  - Report type：Daily、Monthly、Volume、Fee、Chargeback／Reversal、Withdrawal。
  - Currency：六種report均必填單一currency，只能從GSI-85 overview回傳的本站enabled cards選擇；不提供`All`。
  - Start／End dates。
  - 「產生報表」。
- 只有valid report成功產生後才顯示summary／table與Export button。
- 切換report type時清除前一type不相容的summary／rows／pagination／validation，不顯示stale results。
- Report type改變時依formal config更新date limit；六種type的currency都保持required。

### Responsive／visual baseline

- Controls在窄寬度換行；summary cards在desktop最多四欄，中小尺寸自動降欄，不沿用HTML固定四欄造成overflow。
- Table依report type動態columns並支援horizontal scroll；不為mobile刪除財務欄位。
- 所有欄位一律置中（含金額／手續費／筆數等數字欄；使用者於2026-07-30明確指示全置中，不採數字欄靠右）、status用repo badge、單號／日期避免無意義換行。
- Wallet address顯示可讀截斷＋copy；clipboard失敗不可顯示成功。
- HTML缺少loading／API error／result empty／export states；使用repo Quasar／query／table patterns補齊。
- Production pagination沿用shared 20／50／100，除非backend正式指定；不照搬HTML client-side 10／20／50。

## 六種報表規格

### A. Daily 日結對帳

- Date limit：最多1個inclusive calendar day。
- Summary：成功代收總額、成功代付總額、代收＋代付手續費、淨收入（代收－代付）。
- Rows：時間、類型、幣別、GSI單號、金額、手續費、帳變後餘額。
- Backend來源為`gsipay_wallet_ledger`，明細不篩type，會包含1～7全部帳變類型；依`created_at ASC`排序。
- Summary只按type2／3計算：`deposit_total=ΣABS(type2 amount)`、`payout_total=ΣABS(type3 amount)`、`fee_total=Σtype2/3 total_fee`、`net_income=deposit_total-payout_total`。
- Row的`fee`依該帳變列回傳；type4會回`chargeback_fee`，不可因summary不計type4就隱藏或改成0。
- `balance_after`是GSI Pay wallet running balance，由backend原樣回傳；不是GSI-86 billing points balance，frontend不重算。

### B. Monthly 月結對帳

- Date limit：最多31個inclusive calendar days。
- Summary：代收總額、代付總額、手續費、拒付筆數。
- Rows按日聚合：日期、日代收總額、日代付總額、日手續費、日淨收入、日交易筆數。
- 語意是「使用者選定區間」，可跨calendar month，只要inclusive days不超過31；UI不得把它寫成固定自然月。
- Backend summary另回`net_income`，本輪只typed保留，不新增Jira未要求的第5張summary card。
- `items[].tx_count`是當日帳變筆數；frontend直接顯示backend結果，不以代收＋代付筆數自行回算。

### C. Volume 代收／代付業務量

- Date limit：最多31個inclusive calendar days，只支援整日。
- Summary：代收筆數、代付筆數、日均交易筆數、峰值日。
- Currency必填單一值；response `items`恆為該currency的單列，不支援All currencies。
- 日均筆數分母是全部selected inclusive calendar days，backend固定回兩位小數decimal string。
- 峰值日由backend回YYYY-MM-DD；同筆數tie時backend取先遇到的最大值，frontend不得自行重排或重算。
- Rows：幣別、代收筆數／金額、代付筆數／金額、總筆數；`total_cnt=deposit_count+payout_count`由backend回傳。

### D. Fee 手續費

- Date limit：最多31個inclusive calendar days。
- Summary：無。
- Currency必填單一值；response `items`恆為該currency的單列，不支援All currencies。
- Rows：幣別、代收手續費、代付手續費、拒付手續費、合計。
- type2／3讀`total_fee`，type4讀`chargeback_fee`；backend回decimal strings及total，frontend不混用欄位或重算。

### E. Chargeback／Reversal 拒付／沖銷

- Date limit：最多31個inclusive calendar days。
- Summary：拒付筆數、拒付金額、拒付手續費、拒付率。
- Rows：時間、原始PAY單號、REV單號、幣別、原始金額、拒付手續費、固定「已沖銷」紅色status、remark／reason。
- 只查selected period／currency內type4的拒付事件，時間filter以type4 ledger `created_at`為準。
- 拒付率由backend回已格式化percent string：分子=`type4 count`，分母=同selected period／currency內`type2+type3 count`；分母0時回`"0%"`，否則固定兩位小數如`"12.34%"`。
- `amount`為原始金額絕對值；`orig_biz_no`顯示PAY單號、`biz_no`顯示REV單號。

### F. Withdrawal 提現申請

- Date limit：最多31個inclusive calendar days。
- Summary：提現筆數、已出款金額、審核中金額、已退回金額。
- Rows：WD單號、幣別、金額、wallet network／type、wallet address＋copy、status、申請時間（`created_at`）、`processed_at`、remark。
- Backend來源為`gsipay_withdraw_request`，date filter使用`created_at`（申請時間），不是processed_at。
- Status enum固定為`PENDING_REVIEW`／`SUCCESS`／`REJECTED`；pending的`processed_at`實測為空字串，UI顯示N/A。
- Response欄位名使用`created_at`；畫面label仍是「申請時間」，不要另造`applied_at` mapping。
- Wallet address由backend完整回傳；UI只顯示可讀截斷，copy使用完整值且成功／失敗分流，不寫入logs。
- CSV由backend輸出明細欄位；frontend不自行生成或改寫wallet address。
- 本批API沒有remark write endpoint，Jira「可讓財務輸入」本輪不實作；remark唯讀。

## 多幣別與期間語意

- 六種報表的`currency`均必填且單選；不提供`All currencies`，避免不同fiat直接相加。
- 幣別選項沿用GSI-85 `GET /gsipay/wallet/overview`的`cards[]`，只顯示`enabled:true`；不可使用placeholder固定MMK／PHP／INR／VND或自行補六幣。
- B／F及所有summary語意都是「所選期間」，不是固定自然月；現有「本月」hardcode須改成不誤導的所選期間文案，但remote i18n key仍待產品提供。
- Inclusive days以站點時區calendar days計算；1日=同一日期，31日不可允許32個日曆日。

## Query / Pagination / Export

- 六種查詢共用required filters：`currency`、`start_date`、`end_date`。
- `currency`為本站enabled GSI Pay currency code；`start_date`／`end_date`為站點時區calendar date，格式`YYYY-MM-DD`。
- A／B／E／F查詢另帶`offset`、`size`並使用server-side pagination；初始`offset=0`、`size=20`，UI沿用20／50／100。C／D不送pagination，response也沒有`pagination`。
- Generate前驗證required fields、`start_date <= end_date`及inclusive day limit；A最多1日，B～F最多31日。Backend會再次驗證，超限回business `code:100 BAD_REQUEST`。
- Report type是frontend endpoint dispatch值，不送`report_type`query param。切type／currency／date後重新Generate必須回第1頁並清除舊summary／rows。
- Backend執行所有aggregate、decimal、sort與pagination；frontend不從當頁rows回算summary。
- Export只在成功Generate後顯示；使用相同`currency/start_date/end_date`，不送`offset/size`，匯出全部matched rows。
- 6支export皆為非同步CSV job，response回`export_uuid`；沿用`useExport().getExportPath(export_uuid)`取得既有下載路徑，不實作blob下載或自行產CSV。
- Export request pending時button loading＋disabled，防重複提交；失敗沿用repo Notify pattern。

## API / 資料契約（2026-07-28 Apifox＋DEV實測）

### Endpoint matrix

| Report | 查詢 | CSV匯出 | Query pagination | Date limit |
|---|---|---|---|---|
| A Daily | `GET /v1/agent/gsipay/report/daily` | `GET /v1/agent/gsipay/report/daily/export` | `offset,size` | 1日 |
| B Monthly | `GET /v1/agent/gsipay/report/monthly` | `GET /v1/agent/gsipay/report/monthly/export` | `offset,size` | 31日 |
| C Volume | `GET /v1/agent/gsipay/report/volume` | `GET /v1/agent/gsipay/report/volume/export` | 無 | 31日 |
| D Fee | `GET /v1/agent/gsipay/report/fee` | `GET /v1/agent/gsipay/report/fee/export` | 無 | 31日 |
| E Chargeback | `GET /v1/agent/gsipay/report/chargeback` | `GET /v1/agent/gsipay/report/chargeback/export` | `offset,size` | 31日 |
| F Withdraw | `GET /v1/agent/gsipay/report/withdraw` | `GET /v1/agent/gsipay/report/withdraw/export` | `offset,size` | 31日 |

API wrapper規則：

- 寫在`src/api/gsiPay.ts`，使用normal request mode及suffix path（例如`"/gsipay/report/daily"`）；不要重複寫`/v1/agent`，不要傳`{usePlatform:true}`。
- 建立12個語意明確wrapper：
  - `getGsiPayDailyReport`／`exportGsiPayDailyReport`
  - `getGsiPayMonthlyReport`／`exportGsiPayMonthlyReport`
  - `getGsiPayVolumeReport`／`exportGsiPayVolumeReport`
  - `getGsiPayFeeReport`／`exportGsiPayFeeReport`
  - `getGsiPayChargebackReport`／`exportGsiPayChargebackReport`
  - `getGsiPayWithdrawReport`／`exportGsiPayWithdrawReport`
- 不要以可自由拼path的generic string wrapper降低type safety。
- Standard helper generic使用caller消費的unwrapped `data` payload；envelope仍由既有request helper處理。
- Request／response contracts追加在`src/api/request.type.ts`、`src/api/response.type.ts`的GSI Pay區段，不使用`any`，不建立所有欄位皆optional的巨型row。
- Frontend internal report type可維持`DAILY/MONTHLY/VOLUME/FEE/CHARGEBACK/WITHDRAWAL`，但每個case映射到獨立typed wrapper。

### 共用request／response基礎

```ts
interface GetGsiPayReportFilter {
  currency: string
  startDate: string // YYYY-MM-DD
  endDate: string   // YYYY-MM-DD
}

interface GetGsiPayPaginatedReportFilter extends GetGsiPayReportFilter {
  offset: number
  size: number
}

interface GsiPayReportPayload {
  currency: string
  start_date: string
  end_date: string
}

interface GsiPayPaginatedReportPayload extends GsiPayReportPayload {
  offset: number
  size: number
}

interface GsiPayReportPagination {
  offset: number
  size: number
  total: number
}

interface GsiPayReportExportResult {
  export_uuid: string
}
```

- Wrapper集中把caller的`startDate/endDate`映射成API `start_date/end_date`；export由同一mapper移除`offset/size`，確保list／export filters一致。
- 所有money／fee／rate運算結果使用backend decimal string；count／pagination使用number。
- Response envelope實測為`{"code":0,"msg":"success","data":...}`；frontend依既有`BaseResponse<T>`讀取`status/msg/data`。
- `items`可為空陣列；summary仍以backend回傳為準，不用placeholder補值。

### A Daily response

```ts
interface GsiPayDailyReport {
  summary: {
    deposit_total: string
    payout_total: string
    fee_total: string
    net_income: string
  }
  items: Array<{
    time: string
    type: 1 | 2 | 3 | 4 | 5 | 6 | 7
    type_name: string
    currency: string
    biz_no: string
    amount: string
    fee: string
    balance_after: string
    ref_trans_code: string
    remark: string
  }>
  pagination: GsiPayReportPagination
}
```

- `time`實測格式`YYYY-MM-DD HH:mm:ss`（已是站點時區）。
- `ref_trans_code`只保留在typed response供Network工程排查；不render、不放DOM／logs／CSV mapping。

### B Monthly response

```ts
interface GsiPayMonthlyReport {
  summary: {
    deposit_total: string
    payout_total: string
    fee_total: string
    net_income: string
    chargeback_count: number
  }
  items: Array<{
    day: string
    deposit_sum: string
    payout_sum: string
    fee_sum: string
    net_income: string
    tx_count: number
  }>
  pagination: GsiPayReportPagination
}
```

- `day`是純`YYYY-MM-DD`。
- 分頁單位是「日」，最多31列；summary是整個filter區間，不是當頁加總。

### C Volume response

```ts
interface GsiPayVolumeReport {
  summary: {
    deposit_count: number
    deposit_sum: string
    payout_count: number
    payout_sum: string
    daily_avg_count: string
    peak_day: string
  }
  items: Array<{
    currency: string
    deposit_count: number
    deposit_sum: string
    payout_count: number
    payout_sum: string
    total_cnt: number
  }>
}
```

- `items`正常情況恆為所選currency的單列；無pagination。
- `daily_avg_count`已由backend四捨五入為兩位小數string；`peak_day`是`YYYY-MM-DD`。

### D Fee response

```ts
interface GsiPayFeeReport {
  items: Array<{
    currency: string
    deposit_fee: string
    payout_fee: string
    chargeback_fee: string
    total: string
  }>
}
```

- 無summary、無pagination；`items`正常情況恆為所選currency單列。

### E Chargeback response

```ts
interface GsiPayChargebackReport {
  summary: {
    cnt: number
    amount_sum: string
    fee_sum: string
    rate: string
  }
  items: Array<{
    time: string
    orig_biz_no: string
    biz_no: string
    currency: string
    amount: string
    chargeback_fee: string
    status: string // backend目前固定「已沖銷」
    remark: string
  }>
  pagination: GsiPayReportPagination
}
```

- `rate`已含`%`，frontend不可再乘100或自行補`%`。
- `time`實測格式`YYYY-MM-DD HH:mm:ss`（站點時區）。

### F Withdraw response

```ts
type GsiPayWithdrawReportStatus = "PENDING_REVIEW" | "SUCCESS" | "REJECTED"

interface GsiPayWithdrawReport {
  summary: {
    total_cnt: number
    success_sum: string
    pending_sum: string
    rejected_sum: string
  }
  items: Array<{
    wd_no: string
    currency: string
    amount: string
    wallet_network: string
    wallet_address: string
    status: GsiPayWithdrawReportStatus
    created_at: string
    processed_at: string
    remark: string
  }>
  pagination: GsiPayReportPagination
}
```

- `processed_at`在`PENDING_REVIEW`實測為`""`，不是`null`。
- Wallet network目前可見值：`TRC20/ERC20/BEP20/SOL/POLYGON/AVAX/ARB/OP`；顯示未知新值時不可整列失敗。

### Export contract

- 六支export共同response：`data.export_uuid: string`。
- A／E／F是逐筆型，backend單次匯出上限10萬列；超限錯誤顯示backend `msg`。
- B為逐日聚合（最多31列），C／D固定單列；backend不套10萬列檢查。
- Export欄位與各report明細一致，匯出當前filters全量且不含pagination。
- 取得`export_uuid`後走現行下載流程；DEV已實測可換得CSV path。

### UI-first收斂

- 串接成功後整檔刪除`src/pages/CashFlow/GSIPayTransactionReport/placeholder.ts`。
- `types.ts`中的API DTO移到central request／response types；只保留純UI型別（summary card tone、report config等），若無剩餘consumer則整檔刪除。
- `placeholderCurrencyOptions`改為GSI-85 overview的enabled cards；C／D原本`currencyMode:"disabled"`改為required。
- `generateReport()` placeholder switch改成typed endpoint dispatch；保留現有type-specific columns／slots，但field names全面對齊backend snake_case。
- Export alert／Notify stub改成`useSearch(exportWrapper)`＋`useExport().getExportPath(export_uuid)`。
- A／B／E／F使用server-side pagination；C／D隱藏pagination，不製造假的total。
- 保留initial empty、validation、copy UI及responsive layout；移除所有mock數值與silent fallback。

## Timezone / Date contract

- API要求plain `YYYY-MM-DD`，不要把`start_date/end_date`加入`src/utils/timeFieldRules.ts`，也不要轉RFC3339。
- HTML date input值或wrapper mapping必須保持calendar date語意；避免`new Date("YYYY-MM-DD")`經browser timezone產生日期偏移。Inclusive day validation使用date-only安全算法。
- Backend依`AGENT_SETTING_UTC_OFFSET`處理day boundaries、1／31日限制與aggregate date。
- Response的`time/created_at/processed_at`已是站點時區`YYYY-MM-DD HH:mm:ss`字串；直接顯示，不再經`useRfc3339()`二次轉換。
- Monthly `day`與Volume `peak_day`直接顯示`YYYY-MM-DD`。
- Pending withdrawal的空`processed_at`顯示N/A，不填假時間。

## 邊界情況 / 例外（Loading / Empty / Error / Concurrency）

- 初始empty、validation error、query loading、valid zero-result、API error、export processing／error必須可區分。
- Report type切換或快速generate只採最後request response；舊response不得覆蓋新type／filters。
- API error不得以empty rows偽裝成功，也不得保留錯type summary。
- Clipboard只有實際成功才notify success；permission／browser failure顯示error且不洩漏完整address。
- 大數值、0、null、N/A、負數與不同precision正常顯示。
- 相同sort key由backend tie-breaker保持pagination穩定。

## i18n

- Repo使用remote i18n，不建立local locale files。
- 產品提供：page／controls、六種report names、所有summary labels／columns、status、validation、empty／error、copy／export messages及period wording。
- 不自創remote keys或其他語言翻譯。API integration可保留UI-first已提供繁中及既有remote keys並標TODO；產品提供精確keys後再替換。
- Backend的`type_name`與Chargeback `status`是繁中資料欄位；多語UI不得把它們當翻譯來源。帳變type依既有GSI Pay enum映射remote key；Chargeback狀態使用產品提供key前沿用現有繁中。

## 受影響範圍

- `src/router/routes.ts`
- `src/pages/CashFlow/GSIPayTransactionReport/Index.vue`
- `src/pages/CashFlow/GSIPayTransactionReport/components/**`（必要時feature-local）
- `src/api/gsiPay.ts`
- `src/api/request.type.ts`、`src/api/response.type.ts`
- `src/utils/constants/gsiPay.ts`、`src/utils/constants/index.ts`
- `src/utils/constants/permission.ts`
- `src/pages/CashFlow/GSIPayTransactionReport/placeholder.ts`（串接後刪除）
- `src/pages/CashFlow/GSIPayTransactionReport/types.ts`（收斂API DTO）

不要為此需求修改shared query／pagination／table behavior、MainLayout或global menu builder。若現有shared API不足，先列出受影響consumers並更新spec。

## 參考實作 / 要遵循的現有 pattern

- CashFlow與GSI-85 sibling routes：`src/router/routes.ts`。
- Report query／summary／export：`src/pages/Reports/AgentCommissionReport.vue`。
- Query／date／pagination：`src/components/query/common.vue`、`src/components/query/dateTimePicker.vue`、`src/components/query/pagination.vue`、`src/hook/useSearch.ts`。
- GSI Pay endpoint／date-only／export mapping：`src/api/gsiPay.ts`的GSI-85 ledger及GSI-86 billing wrappers。
- Export UUID下載：`src/hook/useExport.ts`、GSI-85／86現有export implementation。
- Enabled currencies：GSI-85 `getGsiPayWalletOverview(locale)`及`cards[].enabled/currency/currency_name`。
- Permission：`src/hook/usePermission.ts`、`src/router/index.ts`、`src/utils/constants/permission.ts`。
- Visual concept：API標註版HTML第1076行起的report panel；API與資料以2026-07-28 Apifox為準。

## Out of scope

- 不實作GSI-85 wallet／top-up／withdraw submission／account ledger。
- 不實作GSI-86 billing ledger UI或frontend aggregation。
- 不實作GSI-88 Telegram Bot／Webhook／status transitions。
- 不實作Withdrawal remark寫入（本批12支API沒有write endpoint）。
- 不直接加總多幣別、不以目前費率回算歷史、不在frontend計算財務summary。
- 不新增charts、saved reports、scheduled reports、custom columns、sorting UI或row detail。
- 不把HTML mock rows、client pagination、alert export或silent MMK fallback帶入production。
- 不改會員端、Ultrapay既有UI／flow、shared architecture或`src/assets/env/environment.json`。
- 不建立local locale files、不處理unrelated lint。
- 不自行commit、merge、push或開MR／PR。

## 關鍵決策與理由

- 延續既有`feat/gsi-pay-transaction-report`並在使用者批准後補入最新parent foundation：保留UI-first歷史，同時重用85／86已驗收API／export／currency patterns。
- 六種discriminated report contracts：各report columns／summaries不同，避免巨型optional DTO。
- Aggregation由backend負責：確保precision、timezone、status與跨頁完整性。
- 六種currency都必填單選：Apifox已解決multi-currency gate，不同fiat不直接相加。
- Plain date contract：API吃`YYYY-MM-DD`且backend按站點時區切日，frontend不得轉RFC3339或二次轉response time。
- Withdrawal remark唯讀：12支contract沒有write endpoint／Edit permission／audit，不能在report頁自行新增mutation。
- View與Export共用`A_A_GSIPAY_WALLET_VIEW`：backend沒有獨立report permission node，frontend不得繼續借CashFlow permission或自行發明Export ID。
- Git父分支不改UI IA：三頁維持CashFlow siblings，控制scope。

## 待確認項目（實作前 gate）

- [x] GSI-85／86 shared foundation已整合至`feat/gsi-pay`。
- [x] 六種query／export endpoints、filters、response DTO、date limits、pagination與export UUID contract。
- [x] 六種currency均為required single-select；enabled source為GSI-85 overview。
- [x] A balance／fee、C average／peak、E rate denominator／timestamp、F date／status／processed_at語意。
- [x] View／Export permission：`A_A_GSIPAY_WALLET_VIEW`（3590101）。
- [x] Export為CSV job；A／E／F上限10萬列，B／C／D為聚合結果。
- [x] F remark本輪唯讀，沒有write endpoint。
- [ ] 產品提供GSI-87完整remote i18n keys，特別是「所選期間」而非「本月」的summary labels。
- [ ] 實作者開始前取得使用者批准，將最新`feat/gsi-pay`合入既有`feat/gsi-pay-transaction-report`；若conflict停止回報。

API integration已不再blocked；未提供的remote i18n keys不授權自行發明，先保留UI-first繁中TODO。

### UI-first phase（使用者已於 2026-07-16 明確批准）

- 分支基底偏離備註：使用者指示 GSI-86 UI-first commit「先不合回」`feat/gsi-pay`，因此 `feat/gsi-pay-transaction-report` 從只含 GSI-85 的 `feat/gsi-pay`（55652a80）建立，GSI-86 留在 `feat/gsi-pay-billing-center`（d3298647）。整合時 86／87 在 routes.ts 同一插入點會有 trivial append conflict，屆時依 Git Flow 規則回報處理。
- 批准範圍：route／child tab、report controls（六種報表類型、幣別、起訖日期、產生報表）、type 連動 date limit 與 hint、初始／驗證／結果 empty states、六種報表的 summary cards 與對應 table、pagination、export button stub、withdrawal address 截斷＋copy。
- Placeholder 生命週期：display-only 假資料集中在 feature-local `placeholder.ts`，檔頭標明「串接後整檔移除」；數值僅版面示意，不當帳務真相，frontend 不做任何 aggregate 計算。
- Production收斂：placeholder整檔移除；六種幣別均必選單一enabled currency；C／D不再disabled。
- F Withdrawal remark 唯讀顯示；不實作寫入。
- Permission：UI-first暫借的CashFlow IDs必須替換為`A_A_GSIPAY_WALLET_VIEW`（3590101）；Export與View共用此permission。
- i18n：新文案 hardcode 已提供之繁中並標 TODO；沿用既有 remote keys。
- API／export已具正式contract，依本spec開始production integration。

## 驗收條件

- [ ] 實作在既有`feat/gsi-pay-transaction-report`進行；開始前依使用者批准策略補入最新`feat/gsi-pay`，遇到conflict立即停止回報。
- [ ] 新route為CashFlow sibling，未修改85／86或CashFlow redirect。
- [ ] Route permission使用`A_A_GSIPAY_WALLET_VIEW`（3590101），不再借CashFlow IDs；Export不自行發明獨立permission。
- [ ] `src/api/gsiPay.ts`新增12個typed wrappers，使用normal mode suffix paths，沒有`/v1/agent`重複或`usePlatform:true`。
- [ ] Controls完整顯示report type、required enabled currency、dates與Generate；六種都不可選All，切type不殘留stale results。
- [ ] Currency options只來自overview `cards[].enabled === true`，沒有placeholder固定清單或silent MMK fallback。
- [ ] A送單一calendar day；B～F最多31個inclusive calendar days；start>end／32日等在frontend阻擋且backend `code:100`正常呈現。
- [ ] Request送plain `YYYY-MM-DD`，未加入`timeFieldRules`或轉RFC3339；response站點時間未二次轉換。
- [ ] A summary／全type rows／ASC順序／type4 fee／wallet `balance_after`依contract顯示。
- [ ] B summary與逐日rows使用backend全區間結果；不從當頁加總，`day`保持YYYY-MM-DD。
- [ ] C為required single currency、固定單列、無pagination；daily average／peak直接顯示backend值。
- [ ] D無summary、固定單列、無pagination；三種fee與total不由frontend重算。
- [ ] E rate不再乘100或補`%`，PAY／REV欄位mapping正確，狀態固定紅色「已沖銷」。
- [ ] F使用`PENDING_REVIEW/SUCCESS/REJECTED`，空`processed_at`顯示N/A，address截斷顯示但copy完整值且成功／失敗分流。
- [ ] F remark唯讀，沒有edit input／mutation／Edit permission。
- [ ] Report data、summary、pagination與export由backend產生；未從UI rows自行aggregate。
- [ ] A／B／E／F使用server pagination；C／D不顯示pagination；filter／type變更回第1頁。
- [ ] 6支export使用同filters、不帶offset/size、取得`export_uuid`後走`useExport().getExportPath()`，pending防重複，未自行生成CSV。
- [ ] A／E／F超過10萬列錯誤顯示backend msg；B／C／D聚合export正常。
- [ ] `placeholder.ts`整檔刪除，feature-local API DTO收斂至central request／response types。
- [ ] 站點時區、inclusive1／31日、whole-day與跨月行為正確。
- [ ] Loading、initial empty、zero result、validation、API／export error與race states可區分。
- [ ] 0、null、N/A、decimal strings與large values顯示正確，frontend未重算財務數字。
- [ ] UI／DOM／logs不含Ultrapay `ref_trans_code`或credentials；typed response保留供Network工程排查。
- [ ] Desktop／tablet／mobile對照HTML concept，summary／filters responsive且table可scroll，無明顯overflow。
- [ ] 沒有local locales或自創remote keys／翻譯；缺少key的UI-first繁中保留TODO。
- [ ] 未修改GSI-85／86 behavior、GSI-88、會員端、Ultrapay或其他out-of-scope surface。

## 測試計畫

### 暫存測試（不提交）

- 12個wrapper endpoint／method／normal-mode path及request mapping。
- Report type config：A 1日、B～F 31日、六種currency required、pagination matrix、summary／columns mapping。
- Inclusive1／31日、32日、start>end、跨月、date-only不受browser timezone偏移。
- A／B／E／F list帶offset/size，C／D不帶；所有export不帶pagination且filters一致。
- 六種discriminated DTO mapping、空items、0／空字串／N/A／negative decimal／large value。
- E rate已含percent；F三種status與pending空processed_at。
- Type／filter change reset、request race、export防重複。
- Clipboard success／failure；wallet address只以截斷值render，完整值僅在copy action使用且不寫入logs；CSV由backend contract產生。

Repo無runner時使用backend-approved deterministic fixtures並明確回報；不得引入永久test framework，只為滿足本需求。

### 手動／fixture驗證

- 六種report各測normal、zero data、API error、maximum date boundary、pagination與export。
- 測overview的enabled／disabled cards；select只列enabled currency，不以mock MMK fallback。
- 測WD三種status、pending空字串processed_at、long／invalid address、copy failure、唯讀remark。
- 測大額、負值、不同precision、0、null與N/A。
- Network確認query fields、plain dates、pagination matrix及export UUID下載；A／E／F驗10萬列錯誤fixture。
- 用Chrome對照HTML report section測desktop／tablet／mobile及所有啟用語系。
- Network確認response可供排查但UI／DOM／export／logs沒有third-party reference或credentials。

### 最小程式驗證

- `git --no-pager diff --check -- <touched files>`
- Focused Prettier／ESLint只檢查touched files，不清理unrelated lint。
- 使用Node 22執行專案build。
- 不執行`tsc --noEmit`。
- 暫存tests不可進commit。

## Git Flow

- 基底／整合父分支：`feat/gsi-pay`（已含GSI-85／86）；既有UI-first branch保留歷史，不rebase／重建。
- 工作分支：既有`feat/gsi-pay-transaction-report`；實作者開始前必須先切到此分支，不可在`main/develop/staging`實作。
- 開始production API整合前，取得使用者對「把最新`feat/gsi-pay`合入工作分支」的明確批准；不得自行merge或處理conflict。
- 實作／review完成後，經使用者明確批准才merge回`feat/gsi-pay`；conflict停止回報，不自行resolve或merge parent回child。
- 推進路徑：`feat/gsi-pay-transaction-report` → `feat/gsi-pay` → `develop` → `staging` → `main`；每階段測試通過且取得merge批准才前進。
- Commit／push／MR／PR均需各自明確授權；不得沿用先前授權。

## 交接備註給實作者

- 先切到既有工作分支，取得批准後補入最新GSI-85／86 shared foundation；保留UI-first branch與commit history。
- 讀Jira、HTML report section、GSI-84 integration spec、85／86 contracts及Apifox `GSI Pay交易報表`12支API；不把mock samples當財務真相。
- Shared module只做additive extension；report DTOs維持discriminated且與wallet／billing DTO分離。
- API實作完成後刪除`placeholder.ts`，不得保留可在production被import的mock fallback。
- 若發現需改shared UI／menu／permission behavior，先回報三頁影響並更新spec。
- 完成後由另一context對照本spec及GSI-84 integration spec逐條review。
