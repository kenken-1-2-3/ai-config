# Spec: GSI-86 新增「GSI Pay 計費中心」頁面

> 交接合約：本 spec 是 Claude / Codex 實作與 review 的單一依據；若需求在實作中變更，先更新本 spec，再繼續實作。
>
> 正式位置：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-86-gsi-pay-billing-center.md`

## 需求來源

- Jira：[GSI-86](https://gamingsoft.atlassian.net/browse/GSI-86)「[需求 代理端]新增『GSI Pay 計費中心』頁面」。
- 父需求：[GSI-84](https://gamingsoft.atlassian.net/browse/GSI-84)「新增 GSI Pay 為預設金流」。
- 整合規格：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-84-gsi-pay-integration.md`
- 關聯需求：
  - [GSI-85](https://gamingsoft.atlassian.net/browse/GSI-85)「GSI Pay 帳戶費率」。
  - [GSI-87](https://gamingsoft.atlassian.net/browse/GSI-87)「GSI Pay 交易報表」。
  - [GSI-88](https://gamingsoft.atlassian.net/browse/GSI-88)「GSI Pay - Telegram 財務審核自動化整合」。
- Jira 附件／使用者提供檔案：`/Users/kenyu/Downloads/GSI_Pay_管理中心_v7_11_API標註.html`。
- Backend contract：[Apifox project 4860774](https://app.apifox.com/project/4860774)，`代理端 > 金流管理 > GSI Pay計費中心`。
- 既有 sibling spec：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-85-gsi-pay-account-rate.md`。
- 端別：代理端 `Whitelabel_GSI_Dashboard`。

### 來源可用性與優先序

- Spec 作者已讀取 GSI-85、GSI-86 的 Jira 需求及本機 HTML，並檢查目前 GSI-85 spec、UI-first branch 與 Dashboard 既有 route／table／export／timezone patterns；2026-07-22另以登入中的Apifox核對list／export契約。
- Jira 的 GSI-85 與 GSI-86 沒有正式 issue link（沒有 `blocks`／`depends on`）；兩者的關係來自共同父需求 GSI-84、同一份 HTML、相同 GSI Pay domain 與共用前端基礎。
- 本 spec 是實作的單一真實來源。新的 backend／permission／產品決議只有在產品確認並先寫回本 spec 後才可取代既有內容；更新 spec 時以產品核准的正式 contract、Jira 已確認規則、HTML concept與repo sibling pattern交叉核對，不得由實作者自行選一版覆蓋。
- 視覺優先序：API標註版HTML的GSI-86 section（第942–1074行）是資訊架構與視覺概念來源；實作需逐層檢查該section的toolbar、table、badge、數字對齊、horizontal scroll、pagination與說明文字，不只看外層panel。
- HTML是靜態mock但已直接標出billing list／export endpoint與query摘要；hardcoded假資料、client-side pagination、stub query／export、固定幣別與缺少responsive states仍不是正式response contract，完整schema以Apifox為準。
- HTML 與 Jira 有重大帳務矛盾，詳見「帳務 contract 衝突與實作 gate」。在產品／backend 確認前，不得從 sample 數字反推並寫入 frontend 計算邏輯。

## 與 GSI-85 的關係

### 共用基礎

- 同屬 GSI-84，均為代理端 CashFlow 下的 GSI Pay sibling page。
- 共用站點 enabled currencies、站點時區、金額／幣別 formatter、GSI 單號顯示規則、Ultrapay 三方單號安全規則、permissions、server-side pagination 與 export pattern。
- API wrappers、request／response contracts 與 enum 可集中在同一 GSI Pay domain module；若 GSI-85 先建立 `src/api/gsiPay.ts` 或 `src/utils/constants/gsiPay.ts`，GSI-86 只做 additive extension，不另建重複 module。
- 兩個分支都可能修改 `src/router/routes.ts`、`src/api/gsiPay.ts`、central request／response types、permission constants、time rules 與 constants index；整合時須保留雙方 additive contracts。

### 嚴格分界

- GSI-85 是商戶錢包頁：錢包餘額、買分／提現、pending withdrawal、費率與限額、帳戶異動事件。
- GSI-86 是計費稽核頁：每筆 `PAY-`／`REV-` 的交易金額、當下費率快照、固定費、拒收費、收費與該幣別點數 Running Balance。
- GSI-85 account ledger與GSI-86 billing flow雖都使用`balance_before`／`balance_after`欄名，DTO與帳務domain仍不同；不得共用GSI-85 feature-local `IGsiPayTransaction`或placeholder rows。
- GSI-86 不得用 GSI-85 的「目前費率」重算歷史交易。Backend 必須回傳交易發生當下的 immutable rate／fee snapshots 與最終帳務結果。
- `WD-`、`TXN-`、`ADJ-` 等 GSI-85 account ledger 事件不自動納入 GSI-86。除非正式 contract 明確定義它們會產生計費流水，GSI-86 只處理 Jira 定義的 Deposit、Payout 與 Payout chargeback／reversal。
- GSI-86不直接從GSI-85 sibling branch開發；GSI-85完成且經使用者批准merge回`feat/gsi-pay`後，GSI-86才從更新後的整合父分支建立。

## GSI-84 分支整合策略

- 整合父分支：`feat/gsi-pay`；只整合 GSI-85／86／87，不直接承載 ticket-specific 開發。
- GSI-85：`feat/gsi-pay-account-rate`（目前已有一個本機UI-first commit）。
- GSI-86：`feat/gsi-pay-billing-center`。
- GSI-87：`feat/gsi-pay-transaction-report`。
- 分支必須使用上述flat names；不能使用`feat/gsi-pay/...`，因為Git無法讓`feat/gsi-pay`與其同名前綴子ref共存。
- 一次完成一張：85經review／批准merge進父分支後才建立86；86經review／批准merge進父分支後才建立87。
- Git父分支不等於UI route parent；三頁仍是既有`/CashFlow`下的sibling pages。

## 背景 / 目標

新增 GSI Pay 計費中心，讓站長與財務可查詢逐筆扣點／返還軌跡，核對交易當下的費率與費用拆解，以及各幣別點數帳戶的前後餘額。

此頁的核心不是前端計算帳務，而是忠實呈現 backend 已結算且可稽核的 immutable billing ledger。對同一筆代付被拒收的情境，原 `PAY-` 紀錄保持不變，另新增 `REV-` 沖銷紀錄。

## 範圍

- 在代理端 CashFlow 新增「GSI Pay 計費中心」route／child tab 與 page view。
- 實作交易單號、業務類型、幣別、備註關鍵字、結算日期區間 filters 與查詢。
- 實作 12 欄逐筆計費流水 table、server-side pagination、loading／empty／error states。
- 實作 permission-gated export，並沿用目前全部 filters。
- 顯示站點時區的結算時間與各幣別獨立 Running Balance。
- 串接本頁專用的 list／export API wrappers、typed request／response、正式 enum、permission 與 time-field rules。
- 保留 Ultrapay 三方單號於 typed API response 供 PM 在瀏覽器 Network response 排查，但不顯示於一般 UI／DOM。

## 跨站影響

- 父需求 GSI-84 是全站點的共用 GSI Pay 功能，不是單一代理、template 或 siteKey 特例。
- Route、permission、GSI Pay API module與central contracts屬代理端共用 surface；所有符合正式permission的站點都可進入本頁。
- List／export只能取得目前登入站點的billing ledger與enabled currencies；frontend不得帶入或快取其他站點資料，也不得用某站response作全域預設。
- GSI Pay與Ultrapay可在同一站點共存；provider資料、單號與API contract必須分離，不修改shared Ultrapay config／flow。
- 若需求改成只對單一站點開放，必須先確認隔離策略並更新本spec；不得以修改shared menu builder或common defaults的方式連帶影響其他站點。

## 頁面入口 / Route / Menu

依 GSI-85 已採用的 CashFlow child 結構與 HTML sibling tabs：

- URL：`/CashFlow/GSIPayBillingCenter/`
- route name：`GsiPayBillingCenter`
- page：`src/pages/CashFlow/GSIPayBillingCenter/Index.vue`
- parent：既有 `/CashFlow`
- `menuShow`：`["agent"]`
- breadcrumb／menu label：`GSI Pay 計費中心`，使用產品提供的精確 remote i18n key。
- icon：未指定時沿用 CashFlow／相鄰 GSI Pay page 的既有 icon pattern，不新增 asset。

規則：

- 不重建 HTML mock 的 app shell、sidebar 或 tab show/hide JavaScript。
- 不修改 `/CashFlow` redirect、其他 CashFlow child path／排序／權限／行為。
- 本批次不建立新的UI top-level「GSI Pay管理中心」parent；若日後要改IA，須先同步更新GSI-84／85／86／87 specs並另立需求。
- GSI-86從包含已驗收GSI-85的`feat/gsi-pay`建立時，新增自己的CashFlow sibling route，不修改或引用GSI-85 page source。

## 權限

Jira未提供permission IDs；Apifox已標示list／export使用VIEW `3590101`。仍須由permission owner確認S／M／A audience對應與route meta常數後，才能取代UI-first暫借權限。

所需controls：

1. Page Function / View：控制 sidebar、CashFlow child tab 與直接 URL。
2. Export action：控制 export button 與 export API。

實作規則：

- 在 `src/utils/constants/permission.ts` 依現有 S／M／A audience pattern新增正式 IDs 與 `I18nKeys`；不得自行猜測流水號。
- Route 使用 `meta.permission` 控制 page entry；Export 使用 `usePermission()` 控制按鈕與 action。
- 不沿用 GSI-85 UI-first 暫借的 `S_F_CASH_FLOW／M_F_CASH_FLOW／A_F_CASH_FLOW` 當正式 GSI-86 permission，除非使用者明確批准同樣的暫時驗證方案。
- 隱藏按鈕不是安全邊界；backend list／export endpoints 均須驗權。
- `menuShow: ["agent"]` 只限制 app mode，不作 siteKey 隔離。父需求 GSI-84 是全站共用需求；不加入 `gsi1` 或單站 hardcode。

## 全局資料與安全規則

- 所有顯示時間、查詢與匯出區間使用站點指定時區；「今日」為站點當日 `00:00:00` 到目前時間。
- UI 只顯示 GSI 定義的單號：
  - 代收／代付：`PAY-YYYYMMDD-NNNNNN`
  - 拒收沖銷：`REV-YYYYMMDD-NNNNNN`
- Backend response 需另保留 Ultrapay 三方單號，供 PM 於瀏覽器開發者工具的 Network response 排查。
- Ultrapay 三方單號不得出現在 table、tooltip、search result copy、DOM attribute、export 檔或 frontend log；不新增自訂「工程模式」。
- 前端只呼叫 GSI Dashboard／Platform backend，不直接呼叫 Ultrapay 或其他第三方金流。
- Auth key、secret、token、後台帳密等憑證不得進入 source、env、fixture、console、DOM、request／response 或 error message。
- 金額、費率、固定費、拒收費、收費、前後餘額與 remark 均以 backend 已結算結果為準；前端只負責 format 與呈現，不重算、不修正 response。
- 金額與費率 contract 應使用 decimal string 或其他明確 precision-safe 表示，並明訂 scale、rounding 與 nullable semantics；frontend 不用 binary float 對帳。

## 頁面資訊架構與視覺基線

依 HTML `panel-billing`，桌面版由上到下為：

1. Section title「流水明細」。
2. 說明文字：逐筆點數扣除軌跡，供財務對帳與稽核，前後餘額為該交易幣別的 Running Balance。
3. Filter toolbar：交易單號、業務類型、幣別、備註關鍵字、起訖日期、查詢、匯出。
4. 可水平捲動的 12 欄 table。
5. Pagination。
6. 帳務公式說明（只有在產品確認精確文案與公式後才顯示）。

視覺與 responsive 規則：

- 內容位於 repo-native CashFlow page panel，不複製 mock shell。
- Filter toolbar 在窄寬度可換行；控制項需保留 label／placeholder 可讀性。
- Table 欄數多，使用 horizontal scroll，不擅自改成卡片、刪欄或把多欄合併。
- 金額／費率／餘額欄靠右；單號、時間不任意換行；長 remark 依 sibling table pattern truncation + tooltip 或可讀換行。
- Deposit／Payout／Chargeback 使用既有 badge color pattern；chargeback row 可沿用 HTML 的 warning highlight，但不可因 row style 改變數值語意。
- HTML 無正式 mobile media query、loading、empty 或 error design；缺少部分使用 repo 現有 Quasar／query／table patterns，不沿用 200px fixed mock sidebar。
- HTML pagination 的 `10／20／50` 與 repo shared pagination 不同；production 沿用 repo `20／50／100`，除非正式 backend／產品 contract另有指定。
- 實作完成後需用 Chrome 開啟本機 app，對照 HTML GSI-86 section 做 desktop／tablet／mobile 視覺檢查，修正明顯 layout、spacing、font、color、alignment 與 overflow 差異；不得只驗證畫面可開。

### HTML 中各 API 的畫面位置

| API | HTML畫面位置 |
| --- | --- |
| `GET /v1/agent/gsipay/billing/flow` | API tag與完整query摘要`:945`；GSI Pay計費中心section`:942-1074`，含filters、12欄table及pagination |
| `GET /v1/agent/gsipay/billing/flow/export` | 匯出button旁API tag`:967`，明訂回`export_uuid`走既有下載流程 |

上述`:line`均指`/Users/kenyu/Downloads/GSI_Pay_管理中心_v7_11_API標註.html`；HTML負責API放置位置與query摘要，完整schema／sample以Apifox為準。

## 篩選與查詢行為

### Filters

1. **交易單號**：GSI `PAY-`／`REV-` 單號精準查詢。
2. **業務類型**：`all`全部（預設）、`deposit`代收、`payout`代付、`payout_reject`拒收沖銷；顯示文案集中mapping。
3. **幣別**：全部或本站已開通且可用於 GSI Pay 的幣別；HTML 只列四幣是 fixture，不可 hardcode。
4. **備註關鍵字**：query field為`keyword`，backend從備註開頭做前綴匹配；frontend不載入全量資料自行filter。
5. **結算日期起訖**：必須完整、`start <= end`，以站點時區送出，最多 31 個日曆日（inclusive）。同一天合法；31 天邊界與 DST／跨月由 backend 再次驗證。

### Query behavior

- 初始預設日期建議為「今日」，但須在產品／backend contract確認後固定；未確認時不得自行選 7 天／30 天等範圍。
- 點「查詢」才送出目前 filters；不得照搬 HTML 的 stub query。
- Query 與 Export 共用同一組 filters mapping 與 31 天 validation。
- 任一 filter 改變並重新查詢時回到第 1 頁。
- 空字串與未選值依 repo pattern移除，不送成有意義的 filter；keyword 的 trim／空白／特殊字元處理由正式 contract 定義。
- 不新增 reset、auto-search、client sorting、advanced search 或 row detail，除非需求更新。

## 計費流水 Table

預設由 backend 以 `settled_at DESC` 回傳；相同 timestamp 須有穩定 tie-breaker（如 ledger id），避免跨頁重複／遺漏。前端不自行對全量資料排序。

| UI 欄位 | 建議 contract 語意 | 顯示規則 |
| --- | --- | --- |
| 交易單號 | `biz_no` | 只顯示 GSI `PAY-`／`REV-` 單號。 |
| 業務類型 | `business_type` | Deposit／Payout／Chargeback mapping；正式 enum 後集中在 GSI Pay constants。 |
| 幣別 | `currency` | 該筆 billing ledger 的法幣代碼。 |
| 金額 | `amount` | Backend 定義的 signed／unsigned business amount；sign convention需先確認。 |
| 費率計算 | `fee_rate` | 交易當下快照；百分比 scale 必須由 contract 明訂。 |
| 固定費 | `fixed_fee` | 交易當下快照；合法 0 顯示 0。 |
| 拒收手續費 | `chargeback_fee` | 只在適用 row 顯示；不適用顯示 `—`，合法 0 不當成 N/A。 |
| 收費 | `total_fee` | 欄位語意與 sign convention 是 blocking gate；frontend 原值呈現，不自行計算。 |
| 扣款前點數餘額 | `balance_before` | 該幣別 ledger 執行前 Running Balance。 |
| 扣款後點數餘額 | `balance_after` | 該幣別 ledger 執行後 Running Balance。 |
| 結算時間 | `settled_at` | RFC3339／正式 timestamp，以站點時區顯示。 |
| 備註 | `remark` | Backend 原文；chargeback 包含淨返還與下游錯誤訊息時完整可讀。 |

顯示規則：

- 金額與餘額使用專案既有 formatter，保留 backend precision；不得 `toFixed()` 任意截斷。
- `0`、`null`、N/A、正負值需可區分。只有 null／not applicable 顯示 `—`。
- 正負色只依已確認的欄位 sign semantics；不可把 `REV-` 單號本身當成正負判斷。
- 多幣別資料可交錯顯示；Running Balance 只在相同幣別、完整連續 ledger 下才可稽核。前端不得拿相鄰 table row、不同幣別、不同頁或被 filter 掉的 rows 做連續性驗證。
- `PAY-` 紀錄建立後不可因拒收而在 frontend 改寫；拒收以獨立 `REV-` row 呈現。
- API error 不得以空陣列偽裝為成功 no-data；loading 時不得短暫顯示舊 query 結果為新結果。

## 帳務 contract 衝突與實作 gate

現有 Jira／HTML sample 不能直接當測試 oracle，至少有以下矛盾：

1. **固定費是否包含在收費**：公式寫 `收費 = 金額 × 費率 + 固定費`，但 `PAY-20260617-000004` 的 3,200 × 3.30% + 6 應為 111.60，sample 卻顯示 105.60，扣後餘額也漏掉固定費。
2. **另一筆 Payout sample 又含固定費**：2,800 × 3.30% + 6 = 98.40，與上一筆規則不一致。
3. **REV 收費矛盾**：Jira table 顯示 `-1,911.20`，HTML 顯示 `-1,805.60`，敘述同時把 `+1,805.60` 稱為淨返還，另稱淨手續費為 1,394.40。`total_fee` 究竟代表拒收罰金、淨返還或 signed net movement 未定。
4. **Deposit 使用錯誤費率疑慮**：GSI-85 HTML 的 INR 代收費率為 11.30%，GSI-86 Deposit samples 卻使用 3.30%（與代付費率相同）。歷史 row 必須回傳當下 fee snapshot，不能取目前 GSI-85 rate。
5. **通用餘額公式不適用所有類型**：Jira 的 `before - fee - amount = after` 只符合部分 Payout；Deposit 是加本金後扣費，REV 是退回原預扣再扣罰金。
6. **「提現當下不預扣」文字歧義**：前文要求PAY發起時立即預扣本金＋代付費，後文卻寫「提現當下不預扣」。上下文可能只是在說拒收手續費等到REV才扣，但此時點語意仍須由產品／backend明確確認，本spec不先採用任一解讀。
7. **31 天算法**：HTML 用 date difference `> 31`，inclusive 計算可能允許 32 個日曆日；本 spec 依 Jira「最多選擇 31 天」定義為 inclusive 不超過 31 個日曆日，仍需 backend確認。

Backend／產品需提供一組正式 fixture，至少涵蓋 Deposit、Payout、Payout Chargeback，逐欄確認：

- `amount`、`fee_rate`、`fixed_fee`、`chargeback_fee`、`total_fee` 的語意、正負號、scale 與 N/A 表示。
- 三種business type的`balance_before -> balance_after` reconciliation invariant。
- 原 `PAY-` 與後續 `REV-` 的關聯欄位與是否需要顯示。
- Table 下方公式說明的精確文案；未確認前不 render 可能誤導財務的公式。

上述gate完成並寫回本spec前，不開始程式實作。若使用者另行明確批准UI-first phase，須先更新本spec，限定可做的route／layout範圍、placeholder生命週期與禁止當成正式contract的邊界，再開始該階段。

### UI-first phase（使用者已於 2026-07-16 明確批准）

- 批准範圍：route／child tab、頁面 layout（section title、說明文字、filters toolbar、12 欄 table、pagination、export button stub）。GSI-85 的 UI-first commit 已經批准 fast-forward merge 進 `feat/gsi-pay`，本票從更新後父分支建立 `feat/gsi-pay-billing-center`。
- Placeholder 生命週期：display-only 假資料集中在 feature-local `placeholder.ts`，檔頭標明「串接後整檔移除」；數值僅供版面示意，不得當帳務真相、不得寫入任何費用計算或 sign 判斷邏輯。
- 帳務邊界：頁尾收費公式說明不 render；金額／收費欄不做正負色判斷（sign semantics 未確認）；chargeback row 只沿用視覺 highlight。
- Permission：比照 GSI-85 UI-first 方案暫借 `S_F_CASH_FLOW／M_F_CASH_FLOW／A_F_CASH_FLOW` 作 page view（routes.ts 標 TODO），Export 按鈕未 gating；正式 IDs 確認後替換。
- i18n：新文案 hardcode Jira／HTML 已提供之繁中並標 TODO；沿用既有 remote keys（`common.no_data`、`table_header.currency` 等）。
- 正式API雖已補齊，accounting reconciliation／permissions／i18n與production驗證仍受其餘gates管制。

## 已確認 API / 資料契約（2026-07-22）

Apifox `代理端 > 金流管理 > GSI Pay計費中心`定義：

| Frontend wrapper | Method／normal-mode suffix | Request | Unwrapped `data` payload |
| --- | --- | --- | --- |
| `getGsiPayBillingTransactions()` | GET `gsipay/billing/flow` | `biz_no?`、`business_type?`、`currency?`、`keyword?`、required `start_date`／`end_date`、`offset?`、`size?` | `{ list, pagination: { offset, size, total } }` |
| `exportGsiPayBillingTransactions()` | GET `gsipay/billing/flow/export` | 與list相同filters，不帶pagination | `{ export_uuid: string }` |

Contract規則：

- 完整server path為`/v1/agent/...`，wrapper使用normal request mode與上表suffix，不傳`{ usePlatform: true }`，也不重複寫`/v1/agent`。
- List由backend以`settled_at DESC`排序；相同時間的stable tie-breaker與row unique key若未隨payload提供，仍須在實作前由backend補充，不可用array index。
- `business_type`為`all／deposit／payout／payout_reject`；`biz_no`完整精準匹配`PAY-／REV-`，`keyword`為remark前綴匹配。
- Date格式是站點時區`YYYY-MM-DD`，`start_date`／`end_date`必填且最多31天；`offset`從0開始、`size`預設20。
- Row contract為`biz_no`、`business_type`、`currency`、`amount`、`fee_rate`、`fixed_fee`、`chargeback_fee`、`total_fee`、`balance_before`、`balance_after`、`settled_at`、`remark`、`ref_trans_code`、`orig_biz_no`。Money／rate使用decimal string；不適用欄位可為`null`。
- `ref_trans_code`是Ultrapay第三方單號，只保留在typed response／Network供排查，不進UI、DOM、log或export；`orig_biz_no`供REV回鏈原PAY。
- Apifox定義計費只含account ledger types `2／3／4`。Payout Reject以獨立REV row表達：退回原預扣後再扣`chargeback_fee`；frontend仍不重算或校正backend ledger。
- List／export的Apifox權限標示VIEW `3590101`；route／Export在S／M／A audiences的正式permission mapping仍須permission owner確認。
- Export固定回`export_uuid`，再呼叫既有`useExport().getExportPath(uuid)`；GSI Pay為normal agent API，不傳platform override，不實作blob或frontend CSV。
- 使用者已確認DEV測試站`dobt`已備妥三種business types及所有filter組合資料；正式驗證須逐列核對12欄與PAY／REV關聯。Apifox頁面中的舊local E2E空list只代表當次未產生types 2／3／4，不代表DEV fixture缺資料。

## Timezone / Date contract

- List／export使用`start_date`與`end_date`，格式為站點時區`YYYY-MM-DD`；不把日期自行改成未經contract定義的RFC3339。
- 顯示使用 `useRfc3339().formatDateTime()`；不得直接以瀏覽器 local timezone format。
- Backend 依站點時區處理 day boundary 與 inclusive 31 calendar days；frontend validation只作 UX 防呆。
- `start > end`、只填一端、超過 31 天均不送 request；同一天與跨月合法。

## Pagination / Export

- 使用 backend pagination；page size 預設及 options沿用 repo shared `20／50／100`。
- Pagination 顯示總筆數、上一頁／下一頁與頁碼，filter query 後回第 1 頁。
- 不把 HTML 既有 rows 載入後做 client-side pagination。
- Export button 只對正式 Export permission 顯示，submit pending 時 disabled，避免重複 job。
- Export params與list query params必須由同一mapping產生；不能只帶日期而漏掉`biz_no`、`business_type`、`currency`或`keyword`，但需移除`offset／size`。
- Export也要通過完整日期、inclusive 31天與backend permission／validation；成功取`export_uuid`後走既有`useExport()`polling／download。
- HTML 的「功能開發中」alert 不納入 production。

## 邊界情況 / 例外（Loading / Empty / Error / Concurrency）

- 初次載入與每次查詢顯示 table-level loading。
- Empty 使用 repo 既有 `common.no_data` pattern；不得顯示 mock rows。
- 401／403／validation／range error／network error 沿用全域 error handler與 notify pattern，不顯示 raw stack／third-party payload。
- Request failure 與合法 empty 必須可區分；若保留上一筆成功資料，畫面需明確表示目前 query 更新失敗。
- 快速連點查詢／切頁時只採最後一次 query 對應的 response，舊 response不得覆蓋新 filters。
- Export pending 時不可重複送出；polling／download error 可重試但不能建立無限並行 jobs。
- Stable pagination由 backend負責；新 ledger 寫入造成頁面位移時，重新查詢不得把不同 snapshot誤當重複 row。

## i18n

本 repo 使用 remote i18n，不維護 local locale JSON。產品需提供啟用語系的精確文案與 keys，至少涵蓋：

- GSI Pay 計費中心、流水明細與說明文字。
- 交易單號、業務類型、幣別、備註關鍵字、結算日期、查詢、匯出。
- Deposit／Payout／Chargeback labels。
- 12 個 table 欄位、pagination、loading／empty／error／date validation。
- 帳務公式說明（確認後才加入）。

Jira／HTML 的繁中可作精確 zh-TW 語意來源；實作者不得自行發明 remote keys、英文或其他語言翻譯，也不得建立 locale files。若 keys 尚未提供而使用者批准 UI-first，僅可 hardcode 已提供的繁中 copy並加明確 TODO，不能猜翻譯。

## 受影響範圍

預期新增／修改：

- `src/router/routes.ts`
- `src/pages/CashFlow/GSIPayBillingCenter/Index.vue`（新增）
- `src/pages/CashFlow/GSIPayBillingCenter/components/**`（只有 page複雜度需要時新增 local components）
- `src/api/gsiPay.ts`（若 GSI-85 已建立則 additive擴充；否則新增）
- `src/api/request.type.ts`
- `src/api/response.type.ts`
- `src/utils/constants/gsiPay.ts` + `src/utils/constants/index.ts`（正式 enum確認後）
- `src/utils/constants/permission.ts`（正式 permission IDs確認後）
- `src/utils/timeFieldRules.ts`（正式 date field／endpoint確認後）
- 遠端 i18n 系統（不一定在本 repo）

不要為此需求修改 shared query／pagination／table／dialog、`MainLayout.vue` 或全域 menu builder；優先使用既有 config／slots／feature-local rendering。若現有 shared API無法表達需求，先回報所有受影響頁面並更新 spec。

## 參考實作 / 要遵循的現有 pattern

- CashFlow parent route：`src/router/routes.ts` 的 `/CashFlow` branch（目前約第 2988 行）。
- GSI-85 sibling route／UI-first page：`src/router/routes.ts` 約第 3136 行、`src/pages/CashFlow/GSIPayAccountRate/Index.vue`；只參考 CashFlow placement、query/table layout，不引用 placeholder contract。
- 31-day server query／pagination：`src/pages/Reports/AccountFlowReport.vue`、`src/hook/useSearch.ts`。
- Query pagination reset與 `{ offset, size }` mapping：`src/components/query/common.vue`、`src/components/query/pagination.vue`。
- Permission：`src/hook/usePermission.ts`、`src/router/index.ts`、`src/utils/constants/permission.ts`。
- Export job：`src/pages/Reports/CashReport/List.vue`、`src/hook/useExport.ts`；blob path：`src/utils/request.ts`。
- Platform wrapper／rewrite：`src/api/report.ts`、`src/utils/request.ts`。
- Time conversion／display：`src/utils/timeFieldRules.ts`、`src/composables/useRfc3339.ts`。
- HTML GSI-86 section：`/Users/kenyu/Downloads/GSI_Pay_管理中心_v7_11_API標註.html` 第942–1074行；API tags在945、967行。

## Out of scope

- 不實作 GSI-85 的錢包餘額、買分、提現、pending withdrawal、費率限額或帳戶異動。
- 不實作 GSI-87 的交易報表、摘要卡、報表類型或 report generation。
- 不實作 GSI-88 Telegram Bot、財務指令、通知、白名單、Webhook 或狀態處理。
- 不改會員端。
- 不修改 backend 的扣點、返還、拒收或帳本寫入邏輯；本 repo只呈現 backend結果。
- 不使用 frontend重算或校正歷史帳務。
- 不改現有 Ultrapay UI、設定、交易流程或單號。
- 不新增 row detail、edit、delete、bulk action、sorting UI、auto refresh、websocket 或公式 calculator。
- 不新增 reset／advanced filters；HTML 未要求的 interaction不自行擴充。
- 不把 mock sample rows、hardcoded currencies、client pagination或 stub export帶入 production。
- 不重構 shared query／table／permission／menu architecture。
- 不檢視或修改 `src/assets/env/environment.json`。
- 不建立 local locale files。
- 不處理 unrelated ESLint／Prettier 問題。
- 不 commit、push、開 MR 或 merge；均需使用者另行明確確認。

## 關鍵決策與理由

- **與 GSI-85 同 parent、不同 page contract**：共享 IA 與 infra，但 wallet ledger和 billing ledger財務語意不同，避免錯誤 reuse。
- **由整合父分支依序開發**：Jira雖沒有blocks／depends on，但使用者選擇一次完成一張，以`feat/gsi-pay`集中shared files並降低重複實作。
- **Flat child branch names**：避開`feat/gsi-pay`與`feat/gsi-pay/...`的Git ref prefix衝突。
- **Backend-authoritative accounting**：來源 sample互相矛盾，前端重算會放大財務風險；只顯示 immutable backend snapshots。
- **PAY 不改寫、REV 另建 row**：符合稽核帳本 append-only 行為與 Jira敘述。
- **Enabled currencies動態來源**：HTML 四幣只是 fixture，不符合 Jira「僅顯示有開通幣別」。
- **Server query／pagination／export**：流水可持續增長，client-side全量處理不可接受。
- **Inclusive 31 calendar days**：依 Jira「最多選擇31天」的自然語意修正 HTML off-by-one風險，並要求 backend再次驗證。
- **不顯示未確認公式**：財務說明文字若錯誤會誤導對帳；確認後才 render。
- **Feature-local UI**：避免為單一新頁修改 shared components而影響其他 Dashboard screens。

## 待確認項目（實作前 gate）

- [ ] Apifox已標示VIEW `3590101`；仍需確認Page／Export在S／M／A audiences的正式permission mapping。
- [x] Route維持CashFlow child；本批次只建立Git整合父分支，不建立UI parent。仍需確認正式path／name／order／icon／remote i18n key。
- [x] List／export endpoint、method、normal request mode、filters、主要response、pagination、`settled_at DESC`與`export_uuid`contract已由Apifox確認。
- [ ] Backend補充stable tie-breaker／row unique key、完整error codes與nullable schema，不可用array index或sample猜測。
- [ ] Enabled currencies來源，及其是否可直接共用 GSI-85 capability response。
- [x] `business_type` enum為`all／deposit／payout／payout_reject`；各啟用語系顯示labels仍需產品提供。
- [ ] `amount`、`fee_rate`、`fixed_fee`、`chargeback_fee`、`total_fee`、`balance_before/after`已確認為decimal-string／nullable欄位；仍需正式scale、rounding、sign與reconciliation contract。
- [ ] 帳務時點：PAY發起時是否預扣本金＋代付費，以及是否只有拒收手續費延至REV發生時扣除。
- [ ] DEV `dobt`已具三種business types；仍需產品／backend逐欄簽認Deposit／Payout／REV reconciliation fixture，取代矛盾mock數字。
- [x] PAY／REV relationship field為`orig_biz_no`；本spec預設typed保留但12欄UI不新增關聯欄。
- [ ] 頁尾公式說明的精確已確認 copy；未確認預設不顯示。
- [ ] 初始日期範圍是否為今日；31 天採 inclusive calendar-day規則。
- [x] Export為CSV、回`export_uuid`並走既有`useExport()`流程；檔名與最大資料量仍由backend既有匯出機制定義。
- [ ] 長 remark與下游 error message 的安全清理、最大長度與 tooltip／wrap策略。
- [ ] 所有啟用語系的精確文案與 remote i18n keys。

任一涉及帳務語意、API、permission或 route的 gate未完成時，實作者應回報並更新 spec，不得自行發明 contract。

## 驗收條件

- [ ] 新 route位於已確認的 CashFlow／GSI Pay IA，且未改變 CashFlow既有 redirect或其他 child行為。
- [ ] Sidebar、child tab、直接 URL與 Export action分別依正式 permission控制，無猜測 IDs。
- [ ] GSI-86 branch以additive `/CashFlow` child實作，未修改或引用GSI-85 placeholder data／types，也未重複建立GSI Pay shared modules。
- [ ] 在包含GSI-85與GSI-86的整合branch／環境中，兩頁呈現為同一CashFlow parent下的sibling entries，且route name／path／permission互不覆蓋。
- [ ] Filters包含精準 GSI單號、三種業務類型、動態 enabled currencies、remark右模糊與完整結算日期區間。
- [ ] Query與Export都驗證 start/end、站點時區與 inclusive最多31日；filter query後回第1頁。
- [ ] List使用server-side stable sort與pagination，page size沿用正式 repo／backend contract；未使用mock client pagination。
- [ ] Table依序顯示12欄，寬表可水平捲動，數字對齊與長remark在desktop／tablet／mobile均可操作閱讀。
- [ ] Deposit、Payout、Chargeback badge與數值正負呈現依正式 enum／sign contract，不依sample猜測。
- [ ] 0、null、N/A、正負decimal string、不同precision顯示正確，frontend未重算或修改backend帳務結果。
- [ ] 每row使用交易當下的rate／fixed fee／chargeback fee snapshots，不讀GSI-85目前費率回算歷史。
- [ ] PAY row不因拒收被改寫；REV以獨立row呈現，points before/after與正式fixture一致。
- [ ] 多幣別Running Balance未跨幣別／跨頁做錯誤連續性判斷。
- [ ] `settled_at`以站點時區顯示；查詢／匯出送`YYYY-MM-DD`的`start_date／end_date`。
- [ ] Export只對有權限者顯示，沿用所有filters但不帶pagination，pending防重複送出，以`export_uuid`接既有`useExport()`完成下載。
- [ ] Loading、empty、API error、validation error、快速query race與export error可區分且不顯示mock資料。
- [ ] UI只顯示GSI單號；typed response保留Ultrapay三方單號供Network排查，但UI／DOM／export／log均未render。
- [ ] Source、request／response、DOM、console與錯誤訊息均無integration credentials或敏感third-party payload。
- [ ] 帳務公式說明只有在產品／backend確認後才顯示，且與正式fixture一致。
- [ ] 所有新增UI文字使用確認的remote i18n keys，或經使用者批准只hardcode已提供繁中；無自創key／翻譯／locale JSON。
- [ ] 對照HTML GSI-86 section完成Chrome視覺檢查，無明顯layout、spacing、alignment、color或overflow差異；mock不合理responsive部分已用repo pattern補齊。
- [ ] 未修改GSI-85行為、GSI-87／88、會員端、Ultrapay、shared architecture、local env或其他out-of-scope surface。

## 測試計畫

Repo目前沒有可用的Vitest／Jest／Playwright／Cypress基礎設施；不得只為本需求引入永久test framework。測試仍不可省略。

### 暫存測試（不提交）

若實作環境已有可用臨時runner，為純mapping／validation helpers建立並執行暫存測試，commit前移除或unstage：

- Filter mapping：空值、exact transaction number、business type、enabled currency、remark `keyword%`。
- Inclusive date range：同日、31日、32日、跨月、start > end、缺一端、站點offset。
- Business type／badge mapping與0／null／N/A。
- Decimal string／percentage formatting與正負sign。
- List與export params完全一致。
- Filter變更reset page與快速request只採最後response。
- Ultrapay third-party number存在typed row但不進render model／export params。

若沒有runner，需在交接回報明確記錄限制，改用deterministic API fixtures與手動矩陣，不可宣稱automated tests已通過。

### API fixture / 手動驗證

- DEV測試站使用`dobt`；後端已建立`deposit／payout／payout_reject`及每個filter都有結果的資料集。
- Deposit、Payout、Chargeback各使用backend／產品已確認fixture核對12欄。
- 測多幣別交錯、0、null、N/A、極大值、不同小數precision、長remark與相同settled_at。
- 測query：每個filter單獨／組合、empty、server error、401／403、page 20／50／100、快速切頁。
- 測date：今日、同日、31日、32日、跨月與站點offset。
- 測export：所有filters、permission denied、processing、success、download failure、double click。
- 用browser Network確認response保留三方單號，但table／tooltip／DOM／export無該值；確認無credentials。
- 在Chrome開啟local app，對照HTML第942–1074行，測desktop／tablet／mobile、horizontal table scroll與所有啟用語系。

### 最小程式驗證

- `git --no-pager diff --check -- <touched files>`
- Focused Prettier check／ESLint只針對touched files；不清理非阻擋既有lint。
- 使用`.nvmrc`的Node 22執行專案現有build，確認Vue／TypeScript imports、exports、route與templates可編譯。
- 不執行`tsc --noEmit`。

## Git Flow

- 基底分支：更新後的`feat/gsi-pay`；該父分支須先包含經使用者批准merge的已驗收GSI-85。
- 工作分支：`feat/gsi-pay-billing-center`。
- 不直接從`feat/gsi-pay-account-rate`開branch，也不rebase／cherry-pick GSI-85 commit；以父分支的整合結果為唯一base。
- GSI-86實作開始前才從父分支建立工作分支；目前只先建立父分支，不預先建立空child branch。
- GSI-86完成review後，經使用者明確批准才merge回`feat/gsi-pay`；不得自行merge。
- 推進順序：GSI-86 child → `feat/gsi-pay`；待GSI-87也完成整合後，再由`feat/gsi-pay` → `develop` → `staging` → `main`。
- Commit前需取得使用者針對該次提交的明確確認；暫存測試檔不可包含在commit。
- Merge任何branch前需使用者確認；發生conflict時停止並回報，不自行解conflict或把target branch merge回work branch。
- 不主動開MR／PR；push後提供Git server回傳連結，由使用者決定。

## 交接備註給實作者

- 先完成「待確認項目」，尤其帳務fixture／sign convention、API、permission與route，並把答案更新回本spec。
- 確認GSI-85已驗收且經批准merge入`feat/gsi-pay`後，才從更新後的父分支建立`feat/gsi-pay-billing-center`。
- 讀取Jira GSI-86、HTML GSI-86完整section、GSI-85 spec與正式backend contracts；不要把HTML sample值當帳務真相。
- 若GSI-85已先合併shared GSI Pay API／constants／permissions，做additive extension；central API type merge conflict需保留雙方contracts。
- 若需要改shared component或GSI Pay parent IA，先回報受影響pages／sites並更新spec。
- 完成後由另一個context逐條對照本spec驗收；不得只以畫面可開或sample看起來正確判定完成。
