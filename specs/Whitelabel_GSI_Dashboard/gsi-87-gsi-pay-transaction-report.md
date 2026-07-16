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
- Jira附件／使用者提供檔案：`/Users/kenyu/Downloads/GSI_Pay_管理中心_v7_11.html`。
- 端別：代理端 `Whitelabel_GSI_Dashboard`。

### 來源可用性與優先序

- Spec作者已讀取GSI-87 Jira description（2026-07-14更新）、HTML report section及repo report／query／export／timezone patterns。
- GSI-85／86／87沒有正式Jira blocks／depends links；關係來自共同父需求、共用資料domain與整合順序。
- 本spec是實作的單一真實來源。產品核准的backend／permission決議必須先寫回本spec，才能取代目前內容。
- HTML第1063行起的report panel是資訊架構與視覺concept；其hardcoded data、client pagination、alert export與缺失states不是production contract。

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
- GSI-85的wallet `balance_after`與GSI-86的billing `points_after`不同；Daily report的「帳變後餘額」必須由正式contract指定來源。
- GSI-87不實作Telegram Bot、Webhook或withdrawal status transition。

## GSI-84 分支整合策略

- 整合父分支：`feat/gsi-pay`。
- GSI-85：`feat/gsi-pay-account-rate`。
- GSI-86：`feat/gsi-pay-billing-center`。
- GSI-87工作分支：`feat/gsi-pay-transaction-report`。
- GSI-87只在GSI-85與GSI-86分別完成review、取得使用者merge批准並整合進父分支後，才從更新後`feat/gsi-pay`建立。
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

Jira未提供permission IDs。實作前確認：

1. Page Function / View。
2. Export action。
3. Withdrawal remark Edit（只有產品確認report page可寫入時需要）。

規則：

- Formal IDs加入`src/utils/constants/permission.ts`既有S／M／A pattern；不得猜測。
- Route以`meta.permission`控制page entry；Export／Edit以`usePermission()`控制action。
- 不沿用GSI-85 UI-first暫借的CashFlow permission當正式GSI-87權限。
- Backend endpoints仍須驗權；hidden button不是security boundary。

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
  - Currency：只能從本站enabled GSI Pay currencies選擇；`All`是否可選依「多幣別summary gate」。
  - Start／End dates。
  - 「產生報表」。
- 只有valid report成功產生後才顯示summary／table與Export button。
- 切換report type時清除前一type不相容的summary／rows／pagination／validation，不顯示stale results。
- Report type改變時依formal config更新date limit、currency required／disabled及whole-day rules。

### Responsive／visual baseline

- Controls在窄寬度換行；summary cards在desktop最多四欄，中小尺寸自動降欄，不沿用HTML固定四欄造成overflow。
- Table依report type動態columns並支援horizontal scroll；不為mobile刪除財務欄位。
- 數字欄靠右、status用repo badge、單號／日期避免無意義換行。
- Wallet address顯示可讀截斷＋copy；clipboard失敗不可顯示成功。
- HTML缺少loading／API error／result empty／export states；使用repo Quasar／query／table patterns補齊。
- Production pagination沿用shared 20／50／100，除非backend正式指定；不照搬HTML client-side 10／20／50。

## 六種報表規格

### A. Daily 日結對帳

- Date limit：最多1個inclusive calendar day。
- Summary：成功代收總額、成功代付總額、代收＋代付手續費、淨收入（代收－代付）。
- Rows：時間、類型、幣別、GSI單號、金額、手續費、帳變後餘額。
- Gate：帳變後餘額是GSI-85 wallet balance或GSI-86 billing points balance；fee是否包含chargeback；status何時算成功。

### B. Monthly 月結對帳

- Date limit：最多31個inclusive calendar days。
- Summary：代收總額、代付總額、手續費、拒付筆數。
- Rows按日聚合：日期、日代收總額、日代付總額、日手續費、日淨收入、日交易筆數。
- Gate：「本月」是calendar month還是使用者選定期間；若允許跨月，labels與aggregation semantics需一致。

### C. Volume 代收／代付業務量

- Date limit：最多31個inclusive calendar days，只支援整日。
- Summary：代收筆數、代付筆數、日均交易筆數、峰值日。
- Rows按currency聚合：幣別、代收筆數／金額、代付筆數／金額、總筆數。
- Gate：daily average分母是全部selected calendar days或active days；rounding；peak day tie；HTML disable currency但Jira有global currency control。

### D. Fee 手續費

- Date limit：最多31個inclusive calendar days。
- Summary：無。
- Rows按currency聚合：幣別、代收手續費、代付手續費、拒付手續費、合計。
- Gate：currency可否縮小範圍；0／null／N/A；total precision／rounding。

### E. Chargeback／Reversal 拒付／沖銷

- Date limit：最多31個inclusive calendar days。
- Summary：拒付筆數、拒付金額、拒付手續費、拒付率。
- 拒付率來源文字為`拒付總筆數 / 本月總交易筆數 × 100%`，但正式denominator尚未定義。
- Rows：時間、原始PAY單號、REV單號、幣別、原始金額、拒付手續費、固定「已沖銷」紅色status、remark／reason。
- Gate：denominator是selected period或calendar month、deposit+payout或payout-only、成功statuses、currency、以PAY或REV時間filter。

### F. Withdrawal 提現申請

- Date limit：最多31個inclusive calendar days。
- Summary：提現筆數、已出款金額、審核中金額、已退回金額。
- Rows：WD單號、幣別、金額、wallet network／type、wallet address＋copy、status、applied_at、processed_at、remark。
- 使用與GSI-85／88一致的formalstatus enum；pending的processed_at顯示N/A。
- Gate：date filter依applied_at或processed_at；summary labels中的「本月」是否等於selected period；address export／redaction。
- Jira寫「備註可讓財務輸入」，HTML有input但無save handler。正式edit endpoint、save UX、Edit permission、validation、audit trail與optimistic concurrency未確認前，本spec預設report remark唯讀，不實作寫入。

## 多幣別與期間語意 gate

- A／B／E／F summaries含金額，不得在`All currencies`下直接相加。正式contract需選擇：
  1. Currency必選單一值；或
  2. Summary依currency分組；或
  3. Backend提供統一conversion currency與server-computed totals。
- HTML在All時靜默fallback MMK屬mock bug，不可照搬。
- C／D本來按currency分組，產品需確認是永遠涵蓋所有enabled currencies或仍可先filter單一currency。
- B／F「本月」與E denominator若實際採任意<=31日區間，UI label與backend calculations必須改為「所選期間」語意；不得混用。
- Inclusive days以站點時區calendar days計算；1日=同一日期，31日不可允許32個日曆日。

## Query / Pagination / Export

- Report request由report type、currency policy、start／end及pagination組成；actual field names以backend contract為準。
- Generate前驗證required fields、start<=end、type-specific inclusive limit與whole-day rules。
- Backend執行aggregations、stable sort與pagination；frontend不對其他頁資料aggregate。
- Filter／type改變後重新generate回第1頁。
- Export只有valid generated query且有permission時顯示，沿用同一request mapping並匯出全部matched rows。
- Export format（Excel／CSV）、job／blob、filename、max rows、column order、wallet address／remark redaction需正式contract。
- Export pending disabled防重複；job polling只有backend回UUID時沿用`useExport()`，blob則走既有blob path，只實作一套。

## API / 資料契約前置條件

Backend至少提供：

1. 六種report的generate/list能力，包括summary、rows、pagination與stable sort。
2. Report export能力。
3. Enabled currencies source或確認共用GSI-85 capability response。
4. Report types、transaction types、withdrawal statuses等formal enums。
5. Precision／rounding／null／N/A與error contracts。
6. 若Withdrawal remark可編輯：write endpoint、permission、audit與concurrency contract。

Frontend semantic wrappers可為：

- `getGsiPayTransactionReport()`
- `exportGsiPayTransactionReport()`
- `updateGsiPayWithdrawalRemark()`（只有write scope確認後）

這些名稱不授權自行發明endpoint path／method／fields。

Contract設計：

- Request／response types放central GSI Pay區段，不使用`any`。
- 使用`report_type` discriminant（actual name由contract定義）建立六種summary／row unions；各type只暴露自己的columns。
- 不建立包含所有optional fields的巨型row interface。
- Standard helper generic使用caller消費的unwrapped payload。
- Platform endpoints使用relative path＋`{usePlatform:true}`。
- Response保留但不render Ultrapay reference。
- Money／rate使用decimal string或正式precision-safe型別。

## Timezone / Date contract

- 新endpoint date fields加入`src/utils/timeFieldRules.ts`allowlist後，透過existing RFC3339 conversion送出。
- 顯示使用`useRfc3339().formatDateTime()`；不使用browser local timezone。
- Backend依站點時區處理day boundaries、inclusive1／31日、whole-day與aggregation date。
- Pending withdrawal沒有processed_at時顯示N/A，不填假時間。

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
- 不自創remote keys或其他語言翻譯；如批准UI-first，只可hardcode已提供繁中並標TODO。

## 受影響範圍

- `src/router/routes.ts`
- `src/pages/CashFlow/GSIPayTransactionReport/Index.vue`
- `src/pages/CashFlow/GSIPayTransactionReport/components/**`（必要時feature-local）
- `src/api/gsiPay.ts`
- `src/api/request.type.ts`、`src/api/response.type.ts`
- `src/utils/constants/gsiPay.ts`、`src/utils/constants/index.ts`
- `src/utils/constants/permission.ts`
- `src/utils/timeFieldRules.ts`
- Remote i18n system

不要為此需求修改shared query／pagination／table behavior、MainLayout或global menu builder。若現有shared API不足，先列出受影響consumers並更新spec。

## 參考實作 / 要遵循的現有 pattern

- CashFlow與GSI-85 sibling routes：`src/router/routes.ts`。
- Report query／summary／export：`src/pages/Reports/AgentCommissionReport.vue`。
- Query／date／pagination：`src/components/query/common.vue`、`src/components/query/dateTimePicker.vue`、`src/components/query/pagination.vue`、`src/hook/useSearch.ts`。
- Export job／blob：`src/hook/useExport.ts`、`src/api/report.ts`。
- Timezone：`src/stores/timezoneStore.ts`、`src/composables/useRfc3339.ts`、`src/utils/timeFieldRules.ts`。
- Permission：`src/hook/usePermission.ts`、`src/router/index.ts`、`src/utils/constants/permission.ts`。
- Visual concept：HTML第1063–1414、1244–1430、1530–1549行。

## Out of scope

- 不實作GSI-85 wallet／top-up／withdraw submission／account ledger。
- 不實作GSI-86 billing ledger UI或frontend aggregation。
- 不實作GSI-88 Telegram Bot／Webhook／status transitions。
- 未確認前不實作Withdrawal remark寫入。
- 不直接加總多幣別、不以目前費率回算歷史、不在frontend計算財務summary。
- 不新增charts、saved reports、scheduled reports、custom columns、sorting UI或row detail。
- 不把HTML mock rows、client pagination、alert export或silent MMK fallback帶入production。
- 不改會員端、Ultrapay既有UI／flow、shared architecture或`src/assets/env/environment.json`。
- 不建立local locale files、不處理unrelated lint。
- 不自行commit、merge、push或開MR／PR。

## 關鍵決策與理由

- 從更新後`feat/gsi-pay`依序建立：可直接使用85／86已驗收shared foundation，避免平行重複contract。
- 六種discriminated report contracts：各report columns／summaries不同，避免巨型optional DTO。
- Aggregation由backend負責：確保precision、timezone、status與跨頁完整性。
- Multi-currency totals先gate：不同fiat不能直接相加，HTML fallback不具財務意義。
- Withdrawal remark預設唯讀：Jira／HTML未提供write contract、permission或audit，不能在report頁自行新增mutation。
- Git父分支不改UI IA：三頁維持CashFlow siblings，控制scope。

## 待確認項目（實作前 gate）

- [ ] GSI-85／86已驗收並經使用者批准merge入`feat/gsi-pay`。
- [ ] Route path／name／order／icon、View／Export permission IDs、remote i18n keys。
- [ ] 六種report endpoint／method／request／response／pagination／sort／error contracts。
- [ ] A／B／E／F multi-currency policy；C／D currency filter是否disabled。
- [ ] Calendar month或selected-period semantics及對應labels。
- [ ] A帳變後餘額domain、fee範圍、success statuses。
- [ ] C daily average denominator／rounding／peak tie。
- [ ] E chargeback rate denominator與filter timestamp。
- [ ] F date field、status buckets、processed_at null、address redaction／export。
- [ ] F remark是否可編輯；若是，補Edit permission、API、save UX、audit與concurrency。
- [ ] Export Excel／CSV、job／blob、filename、columns、max rows與敏感欄位policy。
- [ ] Decimal precision、rounding、0／null／N/A rules。

任一涉及財務語意、API、permission、sensitive data或route的gate未完成時，不開始production實作；UI-first需另行明確批准並先更新spec。

## 驗收條件

- [ ] GSI-87 branch由包含已驗收GSI-85／86的`feat/gsi-pay`建立，未從sibling branch或main直接建立。
- [ ] 新route為CashFlow sibling，未修改85／86或CashFlow redirect。
- [ ] Page／Export／optional Edit使用正式permissions，backend endpoints亦驗權。
- [ ] Controls完整顯示report type、正式currency policy、dates與Generate；切type不殘留stale results。
- [ ] 六種report的date limits、summary cards與columns逐項符合正式contract。
- [ ] A／B／E／F不直接加總不同fiat；period labels與backend semantics一致。
- [ ] C average／peak、E chargeback rate、A balance source使用已確認rules。
- [ ] F使用formalWD status、正確處理processed_at null、address copy success／failure與sensitive display。
- [ ] F remark未確認write contract時唯讀；若確認可寫，具備permission、save／error／audit／concurrency行為。
- [ ] Report data、summary、pagination與export由backend產生；未從UI rows自行aggregate。
- [ ] Server pagination穩定，filter／type變更回第1頁，page size依正式repo／backend pattern。
- [ ] Export只在valid generated result後顯示，沿用全部filters並匯出全部matched rows，防重複且敏感欄位符合policy。
- [ ] 站點時區、inclusive1／31日、whole-day與跨月行為正確。
- [ ] Loading、initial empty、zero result、validation、API／export error與race states可區分。
- [ ] 0、null、N/A、decimal strings與large values顯示正確，frontend未重算財務數字。
- [ ] UI／DOM／export／logs不含Ultrapay reference或credentials。
- [ ] Desktop／tablet／mobile對照HTML concept，summary／filters responsive且table可scroll，無明顯overflow。
- [ ] Remote i18n正確，無local locales或自創翻譯。
- [ ] 未修改GSI-85／86 behavior、GSI-88、會員端、Ultrapay或其他out-of-scope surface。

## 測試計畫

### 暫存測試（不提交）

- Report type config：date limits、currency policy、summary／columns mapping。
- Inclusive1／31日、32日、start>end、跨月、站點offset、whole-day。
- Multi-currency gate與single／grouped summaries。
- C average／peak ties、E rate denominator、F status buckets。
- Discriminated DTO mapping、0／null／N/A／decimal formatting。
- Type／filter change reset、request race、list／export params一致。
- Clipboard success／failure與sensitive values不render／export。

Repo無runner時使用backend-approved deterministic fixtures並明確回報；不得引入永久test framework，只為滿足本需求。

### 手動／fixture驗證

- 六種report各測normal、zero data、API error、maximum date boundary、pagination與export。
- 測每個enabled currency及multi-currency policy；不以mock MMK fallback。
- 測WD三種status、pending null processed_at、long／invalid address、copy failure、remark policy。
- 測大額、負值、不同precision、0、null與N/A。
- 用Chrome對照HTML report section測desktop／tablet／mobile及所有啟用語系。
- Network確認response可供排查但UI／DOM／export／logs沒有third-party reference或credentials。

### 最小程式驗證

- `git --no-pager diff --check -- <touched files>`
- Focused Prettier／ESLint只檢查touched files，不清理unrelated lint。
- 使用Node 22執行專案build。
- 不執行`tsc --noEmit`。
- 暫存tests不可進commit。

## Git Flow

- 基底分支：包含已批准GSI-85／86整合結果的`feat/gsi-pay`。
- 工作分支：`feat/gsi-pay-transaction-report`。
- GSI-87開始前才從父分支建立，不預先建立空branch。
- 實作／review完成後，經使用者明確批准才merge回`feat/gsi-pay`；conflict停止回報，不自行resolve或merge parent回child。
- 三張完成後：`feat/gsi-pay` → `develop` → `staging` → `main`；每階段測試通過且取得merge批准才前進。
- Commit／push／MR／PR均需各自明確授權；不得沿用先前授權。

## 交接備註給實作者

- 先確認GSI-85／86已正式整合與所有待確認gates已寫回本spec。
- 從更新後`feat/gsi-pay`建立指定工作分支，不在父分支直接開發。
- 讀Jira、HTML完整report section、GSI-84 integration spec與85／86 contracts；不把mock samples當財務真相。
- Shared module只做additive extension；report DTOs維持discriminated且與wallet／billing DTO分離。
- 若發現需改shared UI／menu／permission behavior，先回報三頁影響並更新spec。
- 完成後由另一context對照本spec及GSI-84 integration spec逐條review。
