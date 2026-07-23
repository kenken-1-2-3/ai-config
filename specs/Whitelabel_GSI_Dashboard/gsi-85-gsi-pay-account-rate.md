# Spec: GSI-85 新增「GSI Pay 帳戶費率」頁面

> 交接合約：本 spec 是 Claude / Codex 實作與 review 的單一依據；若需求在實作中變更，先更新本 spec，再繼續實作。
>
> 正式位置：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-85-gsi-pay-account-rate.md`

## 需求來源

- Jira：[GSI-85](https://gamingsoft.atlassian.net/browse/GSI-85)「[需求 代理端]新增『GSI Pay 帳戶費率』頁面」
- 父需求：[GSI-84](https://gamingsoft.atlassian.net/browse/GSI-84)「新增 GSI Pay 為預設金流」
- 整合規格：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-84-gsi-pay-integration.md`
- 關聯需求：
  - [GSI-86](https://gamingsoft.atlassian.net/browse/GSI-86)「GSI Pay 計費中心」
  - [GSI-87](https://gamingsoft.atlassian.net/browse/GSI-87)「GSI Pay 交易報表」
  - [GSI-88](https://gamingsoft.atlassian.net/browse/GSI-88)「GSI Pay - Telegram 財務審核自動化整合」
- Jira 附件：
  - `GSI_Pay_管理中心_v7_11_API標註.html`：頁面資訊架構／視覺概念稿與各API畫面位置。
  - `kiosktopup.pdf`：站長存款所需的 GS 內部金流 contract；backend endpoint／程式識別仍沿用 buy／top-up。
- 費率與限額資料來源：[Google Sheet](https://docs.google.com/spreadsheets/d/1zhFSRWgQF5VKV6BQkZWCE0WqHqbPbqJOKx9Xy16if0k/edit?gid=0#gid=0)
- Backend contract：[Apifox project 4860774](https://app.apifox.com/project/4860774)，`代理端 > 金流管理 > GSI Pay帳戶費率`。
- 端別：代理端 `Whitelabel_GSI_Dashboard`。

### 來源可用性說明

- Spec 作者已讀取 GSI-84、GSI-85、GSI-86、GSI-87、GSI-88 的 Jira 文字需求。
- 已檢視使用者提供的本機HTML：`/Users/kenyu/Downloads/GSI_Pay_管理中心_v7_11_API標註.html`。它直接標示各endpoint在UI中的位置與用途；其中假資料、client-side pagination及stub export仍只作視覺concept，不當正式response contract。
- 2026-07-22 已以登入中的 Apifox 專案核對 7 支 endpoint 的method、path、parameters、response examples、enum與permission說明；API contract優先於HTML mock。
- Jira connector 只提供 `kiosktopup.pdf` metadata，未提供 PDF 內容；Google Sheet 也無法由目前連線讀取。未由Apifox覆蓋的產品文案、實際費率數字與第三方支付細節仍不得猜測。
- 實作開始前，實作者必須以有權限的 Jira／Google 帳號讀取 PDF 與 Sheet；若內容與本 spec 衝突，先更新本 spec，不能自行選一版實作。

## 背景 / 目標

GSI Pay 是包裝自 Ultrapay 的 GS 集團預設金流服務。此頁讓站長在代理後台完成以下工作：

1. 查看 GSI Pay 固定六幣別錢包卡，並依 `enabled` 區分已啟用與尚未啟用狀態。
2. 以 GS 內部 USDT 金流存款，或提交站長提現申請。
3. 查看審核中的提現摘要與最近提現紀錄。
4. 查看各開通幣別的 GSI Pay 專屬費率及通道限額。
5. 查詢、分頁與匯出 GSI Pay 帳戶異動紀錄。

本頁只處理 GSI Pay，不取代或改寫站點既有 Ultrapay 設定與交易流程；同一站點同時開通 GSI Pay 與 Ultrapay 時，資料、設定與交易單號必須可以共存且不互相覆蓋。

## 範圍

- 在代理端金流管理新增「GSI Pay 帳戶費率」route／child tab 與 page view。
- 顯示 GSI Pay 支援狀態、不支援幣別提示與各開通幣別餘額卡。
- 實作站長存款與提現 dialogs，以及成功後的資料更新。
- 顯示 pending withdrawal compact summary 與最近 5 筆提現。
- 顯示唯讀的專屬費率／固定費／拒付費／通道限額。
- 實作帳戶異動 filters、server-side pagination、table 與 permission-gated export。
- 串接本頁所需的新 GSI Pay frontend API wrappers、types、enums、time rules、permissions 與 remote i18n keys；已確認API依本spec實作，其餘產品／i18n／第三方金流 gates仍須完成。

## GSI-84 分支整合策略

- GSI-85、GSI-86、GSI-87 採同一個本機整合父分支 `feat/gsi-pay`，但各 Jira 仍在獨立 flat child branch 實作與驗收。
- 分支名稱使用 flat 形式，因 Git 不能同時保存 `feat/gsi-pay` 與 `feat/gsi-pay/...` ref：
  - GSI-85：`feat/gsi-pay-account-rate`
  - GSI-86：`feat/gsi-pay-billing-center`
  - GSI-87：`feat/gsi-pay-transaction-report`
- 開發順序為 GSI-85 → GSI-86 → GSI-87；每一張完成並經使用者明確批准 merge 後，才合併回 `feat/gsi-pay`，下一張再從更新後的父分支建立。
- Git 父整合分支只管理程式整合順序，不代表 UI 要新增一層 GSI Pay top-level route；三頁仍維持既有 `/CashFlow` 下的 sibling pages。
- Shared API／types／constants／permissions／time rules 由最先需要的 child branch additive 建立，後續 child 擴充；不得建立平行重複 modules。

## 跨站影響

- 父需求 GSI-84 明確要求全站點預設 GSI Pay，因此此頁是代理端共用功能，不是 `gsi1` 或單一 siteKey 特例。
- 共用 route／permission／API modules 會讓所有符合權限的代理站點可進入本頁；不以 site-specific hardcode 隱藏。
- Wallet overview 每站固定顯示 backend 回傳的六張幣別卡；每張卡的 `enabled`、餘額與後續資料仍以該站 response 為準，不得把某站狀態當成全域預設。
- 費率、限額與 account history 仍只顯示該站適用資料；overview 固定六卡不代表所有站點的六幣別都已啟用。
- 不修改 shared Ultrapay config／flow；兩者同站時依 provider/domain 分離。

## 全局資料與安全規則

- 所有時間顯示與查詢區間以站點指定時區為準；「今日」為站點當日 `00:00:00` 到目前時間。
- 前端只顯示 GSI 定義的交易／提現／充值單號：
  - 代收／代付：`PAY-YYYYMMDD-NNNNNN`
  - 拒收沖銷：`REV-YYYYMMDD-NNNNNN`
  - 站長提現：`WD-YYYYMMDD-NNNNNN`
  - 站長存款：`TXN-YYYYMMDD-NNNNNN`
- 後端 response 仍需保留 Ultrapay 三方單號，供 PM 在瀏覽器開發者工具的 Network response 排查；一般 UI、table、tooltip、DOM attribute 不得顯示該三方單號，也不需新增自訂「工程模式」。
- 前端只呼叫 GSI Dashboard／Platform backend，不可從瀏覽器直接呼叫 Ultrapay、GS 內部金流或 Telegram API。
- Auth key、secret key、bot token、後台帳密及其他整合憑證不得：
  - 寫入 frontend source、env、spec、測試 fixture 或 console log；
  - 出現在 client response、頁面 DOM、Network request payload 或 error message；
  - 由前端自行保存或轉送。
- Jira 內出現的 live-looking credentials 不屬於前端需求；不得複製。憑證輪替由系統 owner 另行處理，不納入本 repo 實作。
- 金額、費率、匯率、限額、錢包餘額與狀態均以後端回傳為準。前端不可自行重算帳務結果，只能做顯示格式與提交前的基本 UX 驗證；後端仍需做完整驗證。

## 頁面入口 / Route / Menu

目前本機 `feat/gsi-pay-account-rate` 已有 UI-first route／page commit；該 route 放在既有「金流管理」`/CashFlow` parent 下：

- URL：`/CashFlow/GSIPayAccountRate/`
- route name：`GsiPayAccountRate`
- page：`src/pages/CashFlow/GSIPayAccountRate/Index.vue`
- `menuShow`：`["agent"]`
- breadcrumb／menu label：`GSI Pay 帳戶費率`，使用產品提供的精確 remote i18n key。
- icon：由產品指定，未指定時沿用 CashFlow parent icon，不自行新增 icon asset。

本機 HTML 也把「GSI Pay 帳戶費率」、「GSI Pay 計費中心」、「GSI Pay 交易報表」放在既有金流管理的同層 tabs，支持上述 CashFlow child 建議。實作只建立 repo-native route／child tab，不複製 mock 的 top bar、sidebar 或 tab JavaScript。

本批次決定只建立 Git 整合父分支，不新增 UI top-level「GSI Pay 管理中心」parent。若產品日後要改 route IA，須先同步更新 GSI-84／85／86／87 specs，統一 path、redirect、permission 與 menu order，再由一張獨立需求建立一次。

本需求不改 `/CashFlow` 現有 redirect，不改其他 CashFlow child 的 path、排序、權限或行為。

## 權限

Jira未提供permission IDs；Apifox現已標示wallet VIEW `A_A_GSIPAY_WALLET_VIEW (3590101)`與EDIT `A_A_GSIPAY_WALLET_EDIT (3590102)`。VIEW涵蓋overview／recent／ledger／ledger export，EDIT涵蓋buy／withdraw；仍須由permission owner確認S／M／A audience對應及route meta常數後才能取代UI-first暫借權限。

所需controls：

1. Page Function / View：控制 sidebar、CashFlow child tab 與直接導航。
2. Deposit action：控制「存款」按鈕與 submit，對應 EDIT；backend contract 仍名為 Buy／Top-up。
3. Withdraw action：控制「提現」按鈕與submit，對應EDIT。
4. Export action：控制帳戶異動匯出按鈕與export API，Apifox目前對應VIEW。

實作規則：

- 在 `src/utils/constants/permission.ts` 依既有 S／M／A audience pattern 新增後端提供的 IDs 與 `I18nKeys`；不得自行推測流水號。
- Route 使用 `meta.permission` 控制 page view；頁內 action 使用 `usePermission()` 控制按鈕與操作。
- UI-first 階段實作備註（2026-07-15）：route guard 會以 merged meta 檢查權限，child route 不設 `permission` 會繼承 `/CashFlow` parent 的模組層級 IDs 導致 redirect。因此 UI-first 版本暫借同層金流管理 List 的 `S_F_CASH_FLOW／M_F_CASH_FLOW／A_F_CASH_FLOW` 作 page view permission（routes.ts 有 TODO 註記）；正式 Page View permission ID 確認後必須替換，Buy／Withdraw／Export 按鈕目前未做 permission gating（同樣標 TODO）。
- 隱藏按鈕不是安全邊界；後端 endpoint 仍需驗權。
- `menuShow: ["agent"]` 只限制 app mode，不限制 site。GSI-84 明確要求全站點預設 GSI Pay，因此本 spec 不加 `gsi1` 或其他 siteKey gating。
- 若實際需求改為單一站點，因現有 shared menu builder 沒有通用 site-key route metadata，必須先更新 spec 並確認隔離策略，不可直接修改全域 `MainLayout` 影響其他站點。

## 頁面資訊架構與行為

桌面版由上到下依序為：頁面標題／不支援幣別提示、全幣別餘額卡、進行中提現提示、專屬費率與限額、帳戶異動紀錄。中小尺寸改為垂直堆疊，不得水平溢出。

### HTML concept 提供的視覺基線

- 內容位於既有 CashFlow child tab 的白色 panel，不重建 app shell。
- 不支援幣別使用黃色 warning banner，支援幣別以小 chip 列出。
- 餘額卡在寬版以一列多卡呈現；mock 是六欄，但實作須用 Quasar／CSS responsive grid，依可用寬度自動降為多列，不能固定造成水平溢出。
- 進行中提現使用單行 compact warning card，下一行顯示最新一筆細節。
- 費率區預設收合，由整個 section header 控制展開／收合；展開後以 responsive card grid 顯示各幣別，而不是每個幣別各自一個 accordion。
- 帳戶異動 filters 與 export 在 table 上方，寬表以 horizontal scroll 容納，pagination 在 table 下方。
- Dialog concept 約為中型 modal（mock 寬 540px、最大寬 95vw）；實作以 repo 的 `DialogComp`／Quasar responsive API 為準，不 hardcode mock 尺寸。
- Mock 沒有 responsive media rules，且用 client-side pagination、alert export 與假資料；這些只表示視覺，不可照搬到 production。

### HTML 與 Jira 的差異處理

- Mock 把餘額卡放在 pending 提示之前；使用者已確認本頁採此順序，pending 顯示在餘額卡下方。
- Backend 已確認 overview 固定回滿六張卡並帶 `enabled`；mock 的「尚未啟用／啟用此幣種」狀態納入本需求。啟用沒有獨立 API，按鈕直接沿用存款流程。
- Mock 的提現 dialog 顯示「最近 7 筆帳戶扣款紀錄」，而 Jira 明確要求「最近 5 筆我的提現紀錄」。本 spec 以 Jira 的 5 筆純提現紀錄為準，不混入 PAY／其他帳變。
- 使用者已確認 UI 用語統一為「存款」；`buy`／`top_up` 僅保留於 backend endpoint、request type 與內部程式識別，不顯示為「買分」。
- Mock pagination options 是 10／20／50；repo 現行 shared pagination 是 20／50／100。本 spec 沿用 repo pattern，除非 backend／產品另行指定。

### HTML 中各 API 的畫面位置

HTML已把method／literal endpoint直接標在畫面區塊，實作mapping固定如下：

| API                                           | HTML畫面位置                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `GET /v1/agent/gsipay/wallet/overview`        | API tag `:599`；不支援幣別、餘額cards與`pending_withdraw`整頁一次取得，pending細節註記於`:676`              |
| `POST /v1/agent/gsipay/wallet/buy`            | 存款 modal API tag與`payment_url` redirect註記 `:333`；modal範圍`:328-354`                                  |
| `POST /v1/agent/gsipay/wallet/withdraw`       | 提現modal API tag與凍結／`334010`註記`:362`；申請fields與submit`:357-403`                                   |
| `GET /v1/agent/gsipay/wallet/withdraw/recent` | 提現modal紀錄區`:404-480`，API tag`:408`明訂無參數、固定最近5筆「我的提現紀錄」；不採`:407`的舊「7筆」title |
| `GET /v1/agent/gsipay/fee-settings`           | 折疊面板API tag`:684`，註明既有GSI-84 endpoint且只回站點已開通幣別                                          |
| `GET /v1/agent/gsipay/wallet/ledger`          | 帳戶異動API tag與完整query摘要`:774`；section`:772-939`                                                     |
| `GET /v1/agent/gsipay/wallet/ledger/export`   | 匯出button旁API tag`:796`，明訂回`export_uuid`走既有下載流程                                                |
| `POST /v1/callback/gsipay/buy`                | HTML沒有此tag；依使用者確認為backend webhook，無frontend畫面且前端不串接                                    |

上述`:line`均指`/Users/kenyu/Downloads/GSI_Pay_管理中心_v7_11_API標註.html`。

### 1. 不支援幣別提示

- 不支援提示與 wallet cards 分開處理：提示仍依 `unsupported_site_currencies` 顯示站點不受支援幣別；wallet cards 則直接渲染 overview 回傳的固定六張卡，不再自行取交集或補卡。
- 目前 Jira 定義的 GSI Pay 支援幣別為：`MMK`、`BRL`、`PHP`、`INR`、`PKR`、`VND`。
- 若站點所有開通幣別皆受支援，整個提示區隱藏。
- 若部分或全部不受支援，列出「站點已開通但 GSI Pay 不支援」的幣別，不得把站點未開通的幣別當成缺少支援。
- 繁中語意來源沿用 Jira：

  ```text
  目前 GSI Pay 尚未支援本站幣別 {unsupportedCurrencies}
  目前僅支援以下幣別，如需新增支援幣別請聯絡 GSI 確認：
  MMK、BRL、PHP、INR、PKR、VND
  ```

- 不自行翻譯其他語言；remote i18n keys 與各語系精確文案需由產品提供。
- 支援幣別應優先由 backend capability／wallet response 提供；只有後端正式 contract 保證固定集合時，才可在 `src/utils/constants/gsiPay.ts` 定義集中常數，不能散落 hardcode。

### 2. 全幣別帳戶餘額卡

`GET /v1/agent/gsipay/wallet/overview` 的 `cards` 固定回滿六張，順序與幣別為 `MMK／BRL／PHP／INR／PKR／VND`；frontend 直接渲染 response，不自行補卡、刪卡或推導 `enabled`。

- `enabled: true`：正常卡片，顯示幣別代碼、名稱、當前 GSI Pay 商戶錢包餘額，以及 permission-gated「存款」與「提現」按鈕。
- `enabled: false`：灰色未啟用卡片，顯示幣別代碼、名稱、「尚未啟用」狀態與「啟用此幣種」按鈕；不顯示可操作的提現按鈕。
- 點擊「啟用此幣種」直接開啟既有存款 modal，預選該卡幣別；frontend 不呼叫任何 enable endpoint。
- 未啟用幣別可照常送 `POST /v1/agent/gsipay/wallet/buy`。建單成功取得 `payment_url`、準備導向第三方付款頁時，backend 自動把該幣別設為已啟用；下次取得 overview 時該卡的 `enabled` 應為 `true`。
- 前端不得在取得 `payment_url` 後自行修改卡片狀態或額外呼叫啟用 API；畫面狀態以後續 overview response 為準。

行為與邊界：

- 卡片順序以 backend 固定六卡 contract 為準。
- 金額使用專案既有 formatter，保留 backend precision，不以 `toFixed()` 任意截斷。
- loading 時不得把 `0` 當 placeholder；合法 `0` 必須顯示。
- 單一卡片 API 資料缺失時顯示該幣別 no-data／error，不得把其他幣別餘額套上去。
- 成功存款或提交提現後，依 backend 狀態 refetch wallet／pending withdrawal／history；不得以前端本地加減模擬最終餘額。

### 3. 存款 Modal

點擊某幣別卡的「存款」後開啟 local dialog，至少包含：

- 幣別 selector：由點擊的卡片預選；至少必須允許由 `enabled: false` 卡片帶入並提交該幣別，不能以前端 `enabled` 狀態阻擋第一筆存款。若 selector 保持可切換，可選範圍為 overview 六張 cards；若產品希望鎖定卡片幣別，需在實作前確認。
- 法幣入款金額，必填且大於 0；min／max／precision 依 backend contract。
- 本期backend沒有獨立quote endpoint；不要新增不存在的quote request，也不要由前端自行計算匯率／USDT金額。支付資訊由成功回傳的`payment_url`頁面負責。
- 下單loading、validation error、provider error、submit loading與防重複提交狀態。
- 取消與確認操作。

資料流程：

1. 使用者選擇／確認幣別並輸入有效法幣金額。
2. `POST /v1/agent/gsipay/wallet/buy`，body為`{ currency, amount }`，兩個值均以string送出；`currency`限六個正式幣別，`amount`是大於0的decimal string。
3. 成功payload為`{ payment_url }`；前端只在檢查URL存在且符合允許的navigation policy後導向GSPay付款頁，由該頁呈現QR／USDT支付資訊。
4. 存款入帳由`POST /v1/callback/gsipay/buy`觸發；這是GSPay → backend webhook，Dashboard frontend不串接、不建立wrapper、不持有callback secret。
5. 錯誤碼至少包含`334011`（非正式六幣別，例如送出`USD`）、`334012`（金額無效）；`334011`不再代表「幣別未啟用」，未啟用的六幣別不得被此錯誤擋下。

前端不可取得或使用GS內部金流憑證。使用者已確認目前實際金流商尚未開通，因此存款下單／後續支付可能回provider error；這是已知環境限制。實作仍需完成request、loading與error UX，但不得把第三方未開通誤判為frontend regression，也不可使用真實資金繞過限制。

### 4. 提現 Modal 與最近 5 筆紀錄

點擊某幣別卡的「提現」後開啟 local dialog，至少包含：

- 幣別 selector：由點擊的卡片預選，可切換範圍只包含站點已開通且 GSI Pay 支援的幣別；切換後可用餘額與最近提現紀錄必須同步更新，不得殘留原幣別資料。若產品希望鎖定卡片幣別，需在實作前確認。
- 顯示目前選擇幣別的可用餘額。
- 提現金額：必填、大於 0、不得大於目前顯示餘額；後端需再次驗證餘額、precision、min／max 與併發。
- 虛擬錢包網路下拉：`TRC20`、`ERC20`、`BEP20`、`SOL`、`POLYGON`、`AVAX`、`ARB`、`OP`。實際 enum value 以 backend contract 為準。
- USDT 收款錢包地址：必填；格式驗證規則由所選 network／backend contract 決定。
- 站長聯繫方式：backend body使用單一必填string欄位`contact`，可承載TG／手機／Email；前端如要額外提供類型selector，仍須由產品確認顯示方式與validation。
- submit loading、防重複提交、backend validation error。

同一 dialog 右側或下方顯示該站長最近 5 筆提現，欄位：

- GSI 提現單號。
- 幣別。
- 金額。
- 狀態：`PENDING_REVIEW`（審核中／黃色）、`SUCCESS`（提現成功／綠色）、`REJECTED`（已退回／紅色）。
- 申請時間（站點時區）。

成功提交後：

- 成功payload為`{ wd_no }`；顯示backend回傳的`WD-...`單號，並以重新查詢結果呈現`PENDING_REVIEW`狀態。
- Backend在提交當下即凍結扣款並寫入ledger type `5`；成功後立即refetch wallet overview、最近5筆與帳戶異動，不以frontend本地加減取代authoritative response。
- 提現錯誤碼至少包含`334010`餘額不足、`334013`提現幣別未開通、`334014`金額無效、`334015`wallet network無效、`334016`地址或聯絡方式空白。
- Telegram 通知、財務指令、白名單、退回返還與狀態 webhook 屬 GSI-88／backend；本頁只提交申請並顯示後端狀態。

### 5. 進行中提現提示

- 只要存在至少一筆 `PENDING_REVIEW`，在餘額卡下方顯示高亮提示；沒有 pending 時整區隱藏。
- 顯示：
  - pending 總筆數；
  - pending 金額摘要；
  - 最新一筆 pending 的 GSI 單號、wallet network、黃色狀態標籤、申請時間。
- 「最新一筆」由 backend 以申請時間排序／明確回傳，不由前端假設 list 第一筆。
- 多幣別法幣不可直接相加。實作前 backend／產品必須在下列方案中確認一種，並更新 contract：
  1. 依幣別分組回傳／顯示 pending amount；或
  2. 只顯示目前指定幣別的 pending amount；或
  3. 提供統一換算幣別及 server-computed amount。
- 未確認前不得顯示一個跨幣別相加的「總金額」。

### 6. 專屬費率與限額（唯讀折疊面板）

- 只顯示站點已開通且 GSI Pay 支援的幣別。
- 整個「專屬費率與限額清單」使用獨立白底區塊，不與餘額卡共用容器；內容為預設收合的 section，header 提供展開／收合控制。
- 展開後每個幣別一張唯讀 card，使用 responsive grid；不提供編輯、toggle 或 inline save。
- 每幣別顯示：
  - 代收費率（百分比）；
  - 代收固定費（該幣別金額／每筆）；
  - 代付費率（百分比）；
  - 代付固定費（該幣別金額／每筆）；
  - 拒付手續費：只有 backend 表示適用時顯示；Jira 目前指定 INR 專屬；
  - 通道限額：依電子錢包／銀行及代收／充值／提款等 backend channel/type 分組顯示單筆 `MIN ≤ amount ≤ MAX`。
- 費率 precision、固定費 precision、limit 單位及 channel/type label 必須由 backend contract／Sheet 提供；前端不自行換算。
- 某費用為合法 0 時顯示 `0`，不顯示 `-`；只有 null／not applicable 才顯示 `-` 或隱藏（依 contract）。

### 7. 帳戶異動紀錄

使用 server-side query、pagination 與 export，不在前端載入全部資料後篩選。

篩選：

- 幣別：全部或站點已開通且 GSI Pay 支援之個別幣別。
- 帳變類型：`1`存款、`2`代收扣款、`3`代付扣款、`4`拒收沖銷、`5`提現、`6`提現退回、`7`人工調整；`0`或不帶為全部。
- GSI 單號：精準查詢。
- 時間區間：開始／結束，最長 31 天，以站點時區送出。
- 匯出：需 Export permission，且沿用當前全部 filters。

Table 欄位：

1. 時間：`created_at`，以站點時區顯示。
2. 幣別。
3. 類別：以既有 badge pattern 區分。
4. GSI 單號。
5. 金額：正值顯示 `+` 與成功色，負值顯示 `-` 與警示色；零值正常顯示。
6. 帳變前金額：`balance_before`。
7. 帳變後金額：`balance_after`。
8. 備註：完整顯示 backend 提供的帳變原因；過長時依 sibling table pattern truncation + tooltip，不自行改寫文案。

Table 行為：

- 使用 backend pagination；page size 沿用 repo 的 20／50／100 pattern。
- 搜尋條件改變時回到第 1 頁。
- 預設排序為 backend contract 的 `created_at DESC`；Jira 未要求可操作 sorting，不新增 sort UI。
- 前後餘額須滿足 `balance_before + amount = balance_after`，但這是 backend／QA 對帳檢核，不由前端更改 response。
- 無資料顯示既有 no-data；API error 不以空陣列偽裝成功。
- Export固定呼叫`GET /v1/agent/gsipay/wallet/ledger/export`，帶入與list相同filters但不帶`offset／size`；成功取`export_uuid`後呼叫既有`useExport().getExportPath(uuid)`完成polling與下載，不另做blob或frontend CSV。

## 已確認 API / 資料契約（更新至 2026-07-23）

Apifox `代理端 > 金流管理 > GSI Pay帳戶費率` 是本期正式API來源：

| Frontend wrapper                    | Method／normal-mode suffix          | Request                                                                                | Unwrapped `data` payload／重點                                                                                                                                     |
| ----------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getGsiPayWalletOverview()`         | GET `gsipay/wallet/overview`        | 無                                                                                     | `supported_currencies[]`、`unsupported_site_currencies[]`、`cards[]`、`pending_withdraw`；`cards`固定依序回滿`MMK／BRL／PHP／INR／PKR／VND`六張，每張包含`currency`、`currency_name`、decimal-string `balance`、`enabled` |
| `createGsiPayTopUp()`               | POST `gsipay/wallet/buy`            | body `{ currency: string, amount: string }`                                            | `{ payment_url: string }`                                                                                                                                          |
| `createGsiPayWithdrawal()`          | POST `gsipay/wallet/withdraw`       | body `{ currency, amount, wallet_network, wallet_address, contact }`，皆為string       | `{ wd_no: string }`；提交即凍結扣款                                                                                                                                |
| `getGsiPayRecentWithdrawals()`      | GET `gsipay/wallet/withdraw/recent` | 無query params；固定最近5筆                                                            | `{ list }`；status為`PENDING_REVIEW`／`SUCCESS`／`REJECTED`                                                                                                        |
| `getGsiPayAccountTransactions()`    | GET `gsipay/wallet/ledger`          | `currency?`、`type?`、`biz_no?`、required `start_date`／`end_date`、`offset?`、`size?` | `{ list, pagination: { offset, size, total } }`，`created_at DESC`                                                                                                 |
| `exportGsiPayAccountTransactions()` | GET `gsipay/wallet/ledger/export`   | 與ledger相同filters，不帶pagination                                                    | `{ export_uuid: string }`                                                                                                                                          |
| `getGsiPayRatesAndLimits()`         | GET `gsipay/fee-settings`           | 無                                                                                     | `{ list }`，row為`currency`、`direction`、`channel_code`、`rate_percent`、`fixed_fee`、`reject_fee`、`min_amount`、`max_amount`                                    |

Contract規則：

- 所有path的完整server URL為`/v1/agent/...`，因此wrapper使用normal request mode與上表suffix，不傳`{ usePlatform: true }`，也不重複寫`/v1/agent`。
- Request／response types放在central GSI Pay區段，不使用`any`；standard helper generic使用caller消費的unwrapped `data` payload。
- `currency`值域為`MMK／BRL／PHP／INR／PKR／VND`；`wallet_network`為`TRC20／ERC20／BEP20／SOL／POLYGON／AVAX／ARB／OP`。
- `POST gsipay/wallet/buy`接受六幣別中尚未啟用的幣別；第一筆建單成功即由backend啟用，不需要frontend額外request。`334011`只表示送入六幣別以外的currency。
- Ledger row至少包含`created_at`、`currency`、`type`、`biz_no`、`net_change`、`balance_before`、`balance_after`、`remark`；前端金額欄讀`net_change`，並以`balance_before + net_change = balance_after`作QA檢核。
- `biz_no`精準查詢支援`TXN-／PAY-／REV-／WD-`；ledger types正式值為`1..7`，集中在`src/utils/constants/gsiPay.ts`，不可在page散落magic numbers。
- `start_date`／`end_date`格式為站點時區的`YYYY-MM-DD`且必填，區間最多31天；超限示例為business `code: 100`。`offset`從0開始、`size`預設20。
- Fee direction為`1`代收、`2`代付；`channel_code === ""`代表通用。所有money／rate／limit欄位均以decimal string處理，合法`"0"`不可當empty。
- Wallet endpoints的VIEW permission由Apifox標示`A_A_GSIPAY_WALLET_VIEW (3590101)`，buy／withdraw EDIT permission為`A_A_GSIPAY_WALLET_EDIT (3590102)`；route與S／M／A audience如何映射仍須permission owner確認，不得從這兩個值自行推導其他IDs。
- `POST /v1/callback/gsipay/buy`是GSPay → backend webhook，frontend明確out of scope。
- 使用者已確認DEV測試站`dobt`已有三幣別餘額、ledger 7 types、withdrawal 3 statuses及各filters資料；正式串接用此站做deterministic API／UI驗證。

## Timezone / Date contract

- Ledger list／export使用`start_date`與`end_date`，格式為站點時區`YYYY-MM-DD`，不是browser-local timestamp；不把日期自行改成未經contract定義的RFC3339。
- 顯示時間沿用 `useRfc3339().formatDateTime()`，不可直接以瀏覽器 local timezone 格式化。
- Backend按站點時區處理31天限制與day boundary；前端的日期限制只作UX防呆。
- DST、跨月與 start/end 相同日都需有明確結果；`start > end` 不送 request。

## 邊界情況 / 例外（Loading / Empty / Error / Concurrency）

- 頁面初次載入：wallet、pending、rates、history 各自有 loading 狀態；單一區塊失敗不應把已成功區塊清空。
- Create操作採dialog-level loading，避免鎖死整頁。
- Submit 按鈕在 request pending 時 disabled；double click 不可建立兩張單。
- API 401／403／validation／insufficient balance／provider／network error沿用repo error handler／notify pattern；不可顯示憑證、raw stack或第三方敏感payload。
- Refetch 失敗時保留成功 action 的 GSI order number供使用者查詢，但清楚提示資料更新失敗，不以前端假資料更新餘額。

## i18n

本 repo 使用 remote i18n，沒有 local locale JSON。新增 key 前必須先搜尋現有共用 key；語意及三語文案相同時沿用舊 key，不建立 feature-specific duplicate。

已確認沿用：

| UI 用途                                  | 沿用 key                                                                                                                      |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 頁面 title                               | `menu.gsi_pay_account_rate`（與 breadcrumb 同 key，不新增 `gsi_pay.page.title`）                                              |
| 當前餘額                                 | `common.current_balance`                                                                                                      |
| 存款 action／dialog title／ledger type 1 | `account_flow_type.deposit`                                                                                                   |
| 幣別／金額／狀態／申請時間／備註         | `table_header.currency`／`table_header.amount`／`table_header.status`／`table_header.application_time`／`table_header.remark` |

GSI Pay 專屬 remote keys 與已確認文案如下；未列出的舊 key 不重複新增：

| Key                                           | EN                                                                    | 繁                                                    | 簡                                                    |
| --------------------------------------------- | --------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| `menu.gsi_pay_account_rate`                   | GSI Pay Account Rate                                                  | GSI Pay 帳戶費率                                      | GSI Pay 帐户费率                                      |
| `gsi_pay.unsupported_notice.message`          | GSI Pay does not yet support your site currency: `{currencies}`       | 目前 GSI Pay 尚未支援本站幣別 `{currencies}`          | 目前 GSI Pay 尚未支援本站币别 `{currencies}`          |
| `gsi_pay.unsupported_notice.supported_prefix` | Only the following currencies are supported. Contact GSI to add more: | 目前僅支援以下幣別，如需新增支援幣別請聯絡 GSI 確認： | 目前仅支援以下币别，如需新增支援币别请联络 GSI 确认： |
| `gsi_pay.pending.title`                       | Pending withdrawals: `{count}` in total                               | 提現審核中：共 `{count}` 筆                           | 提现审核中：共 `{count}` 笔                           |
| `gsi_pay.pending.latest`                      | Latest: `{order_number}`                                              | 最新一筆：`{order_number}`                            | 最新一笔：`{order_number}`                            |
| `gsi_pay.wallet.load_failed`                  | Failed to load wallet info. Please try again later.                   | 錢包資訊載入失敗，請稍後再試                          | 钱包资讯载入失败，请稍后再试                          |
| `gsi_pay.wallet.withdraw`                     | Withdraw                                                              | 提現                                                  | 提现                                                  |
| `gsi_pay.rates.section_title`                 | Fees & limits                                                         | 專屬費率與限額                                        | 专属费率与限额                                        |
| `gsi_pay.rates.direction_deposit`             | Deposit                                                               | 代收                                                  | 代收                                                  |
| `gsi_pay.rates.direction_payout`              | Payout                                                                | 代付                                                  | 代付                                                  |
| `gsi_pay.rates.channel_general`               | General                                                               | 通用                                                  | 通用                                                  |
| `gsi_pay.rates.fixed_fee`                     | Fixed fee (per transaction)                                           | 固定費（每筆）                                        | 固定费（每笔）                                        |
| `gsi_pay.rates.chargeback_fee`                | Chargeback fee (per transaction)                                      | 拒付手續費（每筆）                                    | 拒付手续费（每笔）                                    |
| `gsi_pay.rates.channel_limit`                 | Channel limit (per transaction)                                       | 通道限額（單筆）                                      | 通道限额（单笔）                                      |
| `gsi_pay.top_up.currency_required`            | Please select a currency.                                             | 請選擇幣別                                            | 请选择币别                                            |
| `gsi_pay.top_up.amount_label`                 | Deposit amount (`{currency}`)                                         | 入款金額（`{currency}`）                              | 入款金额（`{currency}`）                              |
| `gsi_pay.top_up.amount_positive`              | Please enter an amount greater than 0.                                | 請輸入大於 0 的金額                                   | 请输入大于 0 的金额                                   |
| `gsi_pay.top_up.redirect_hint`                | You will be redirected to the GSPay payment page after confirmation.  | 確認後將導向 GSPay 付款頁完成支付                     | 确认后将导向 GSPay 付款页完成支付                     |
| `gsi_pay.top_up.invalid_payment_url`          | Unable to obtain a valid payment link.                                | 無法取得有效的付款連結                                | 无法取得有效的付款连结                                |
| `gsi_pay.top_up.submit_failed`                | Deposit request failed.                                               | 存款申請失敗                                          | 存款申请失败                                          |
| `gsi_pay.withdraw.dialog_title`               | Withdraw                                                              | 提現                                                  | 提现                                                  |
| `gsi_pay.withdraw.available_balance`          | Available balance                                                     | 可用餘額                                              | 可用余额                                              |
| `gsi_pay.withdraw.amount_label`               | Withdrawal amount                                                     | 提現金額                                              | 提现金额                                              |
| `gsi_pay.withdraw.amount_positive`            | Please enter an amount greater than 0.                                | 請輸入大於 0 的金額                                   | 请输入大于 0 的金额                                   |
| `gsi_pay.withdraw.amount_exceed`              | Withdrawal amount cannot exceed available balance.                    | 提現金額不得大於可用餘額                              | 提现金额不得大于可用余额                              |
| `gsi_pay.withdraw.network_label`              | Wallet network                                                        | 虛擬錢包網路                                          | 虚拟钱包网路                                          |
| `gsi_pay.withdraw.network_required`           | Please select a wallet network.                                       | 請選擇錢包網路                                        | 请选择钱包网路                                        |
| `gsi_pay.withdraw.address_label`              | USDT wallet address                                                   | USDT 收款錢包地址                                     | USDT 收款钱包地址                                     |
| `gsi_pay.withdraw.address_required`           | Please enter a wallet address.                                        | 請輸入錢包地址                                        | 请输入钱包地址                                        |
| `gsi_pay.withdraw.contact_label`              | Contact (Telegram / Phone / Email)                                    | 聯繫方式（Telegram / 手機 / Email）                   | 联系方式（Telegram / 手机 / Email）                   |
| `gsi_pay.withdraw.contact_required`           | Please enter contact info.                                            | 請輸入聯繫方式                                        | 请输入联系方式                                        |
| `gsi_pay.withdraw.recent_title`               | Recent 5 withdrawal records                                           | 最近 5 筆提現紀錄                                     | 最近 5 笔提现纪录                                     |
| `gsi_pay.withdraw.recent.order_no`            | Withdrawal ID                                                         | 提現單號                                              | 提现单号                                              |
| `gsi_pay.withdraw.status.pending_review`      | Under review                                                          | 審核中                                                | 审核中                                                |
| `gsi_pay.withdraw.status.success`             | Withdrawal successful                                                 | 提現成功                                              | 提现成功                                              |
| `gsi_pay.withdraw.status.rejected`            | Rejected                                                              | 已退回                                                | 已退回                                                |
| `gsi_pay.withdraw.submit_failed`              | Withdrawal request failed.                                            | 提現申請失敗                                          | 提现申请失败                                          |
| `gsi_pay.withdraw.submitted`                  | Withdrawal request submitted.                                         | 提現申請已送出                                        | 提现申请已送出                                        |
| `gsi_pay.withdraw.submitted_with_no`          | Withdrawal request submitted (`{wd_no}`).                             | 提現申請已送出（`{wd_no}`）                           | 提现申请已送出（`{wd_no}`）                           |
| `gsi_pay.ledger.filter.biz_no`                | GSI order no.                                                         | GSI 單號                                              | GSI 单号                                              |
| `gsi_pay.ledger.column.biz_no`                | GSI order no.                                                         | GSI 單號                                              | GSI 单号                                              |
| `gsi_pay.ledger_type.collection_deduct`       | Deposit deduction                                                     | 代收扣款                                              | 代收扣款                                              |
| `gsi_pay.ledger_type.payout_deduct`           | Payout deduction                                                      | 代付扣款                                              | 代付扣款                                              |
| `gsi_pay.ledger_type.reversal`                | Chargeback reversal                                                   | 拒收沖銷                                              | 拒收冲销                                              |
| `gsi_pay.ledger_type.withdrawal`              | Withdrawal                                                            | 提現                                                  | 提现                                                  |
| `gsi_pay.ledger_type.withdrawal_rejected`     | Withdrawal rejected                                                   | 提現退回                                              | 提现退回                                              |
| `gsi_pay.ledger_type.manual_adjustment`       | Manual adjustment                                                     | 人工調整                                              | 人工调整                                              |
| `gsi_pay.export.failed`                       | Export failed.                                                        | 匯出失敗                                              | 导出失败                                              |

`gsi_pay.wallet.buy`、`gsi_pay.top_up.dialog_title`、`gsi_pay.ledger_type.top_up`、`gsi_pay.page.title`及各種重複 table column keys 不建立。「尚未啟用」與「啟用此幣種」為新增 UI 文案，產品仍需提供可沿用的 remote key 或 EN／繁中／簡中精確文案；實作者不得自行發明 key／翻譯，也不得建立 locale JSON。

## 受影響範圍

預期新增／修改：

- `src/router/routes.ts`
- `src/pages/CashFlow/GSIPayAccountRate/Index.vue`（新增）
- `src/pages/CashFlow/GSIPayAccountRate/components/**`（local components，按需要新增）
  - Wallet cards
  - Top-up dialog
  - Withdrawal dialog／recent withdrawals
  - Pending withdrawal summary
  - Rates／limits expansion panels
  - Account transaction table
- `src/api/gsiPay.ts`（新增）
- `src/api/request.type.ts`
- `src/api/response.type.ts`
- `src/utils/constants/gsiPay.ts` + `src/utils/constants/index.ts`（只有 backend enum 確認後）
- `src/utils/constants/permission.ts`（只有 permission IDs 確認後）
- `src/utils/timeFieldRules.ts`（只有 history contract 需要 RFC3339 mapping 時）
- 遠端 i18n 系統（不一定在本 repo）

不要為此需求修改 shared `src/components/query/common.vue`、shared dialog wrapper、`MainLayout.vue` 或全域 menu builder；優先使用既有 config／slots／local components。若確實無法表達，先提出跨頁影響並更新 spec。

## 參考實作 / 要遵循的現有 pattern

- CashFlow parent route 與 child metadata：`src/router/routes.ts` 的 `/CashFlow` branch。
- Sidebar／child tabs／route guard：`src/layouts/MainLayout.vue`、`src/router/index.ts`。
- Permission constants／mapping：`src/utils/constants/permission.ts`；頁內 action：`src/hook/usePermission.ts`。
- Multi-currency balance cards與 Platform wrapper：`src/pages/Dashboard.vue`、`src/api/common.ts` 的 GSC+ balance。
- Dialog validation／loading：`src/components/dialogs/index.vue`；餘額與金額 modal：`src/pages/MemberManagement/MemberQuota/Index.vue`。
- Expansion panel：`src/pages/Jackpot/WinningRecords/components/JackpotDetailsDialog.vue`。
- Filter／pagination：`src/components/query/common.vue`、`src/hook/useSearch.ts`、`src/components/query/pagination.vue`。
- 完整 report page：`src/pages/Reports/AccountFlowReport.vue`。
- Export UUID polling／download：`src/hook/useExport.ts`、`src/api/common.ts`。
- Platform API path rewrite：`src/utils/request.ts`。
- Time conversion：`src/utils/timeFieldRules.ts`、`src/composables/useRfc3339.ts`。
- Rate setting page `src/pages/CashFlow/CryptoExchangeRateSettings.vue` 只可參考 CashFlow page layout／permission style；GSI-85 rate panels 是唯讀，不沿用其 inline edit／toggle 行為。

## Out of scope

- 不實作 GSI-86「計費中心」逐筆扣點軌跡。
- 不實作 GSI-87 六類交易報表、摘要卡與 report generation。
- 不實作 GSI-88 Telegram Bot、群組通知、指令解析、白名單、Webhook、狀態變更或退回帳務。
- 不改會員端。
- 不改現有 Ultrapay 商戶設定、交易流程、畫面或單號顯示。
- 不新增 GSI Pay／Ultrapay credential 管理 UI。
- 不讓使用者編輯本頁費率或限額。
- 不新增 table sorting、bulk action、row edit、detail drawer 或自訂報表。
- 不自動輪詢整頁；只有支付流程經後續正式contract明確要求時才加入局部polling。
- 不重構 shared query、table、dialog、permission 或 menu architecture。
- 不檢視或修改 `src/assets/env/environment.json`。
- 不處理 unrelated ESLint／Prettier 問題。
- 不建立 local locale files。
- 不 commit、push、開 MR 或 merge；這些動作都需使用者另行明確確認。

## 關鍵決策與理由

- 維持 CashFlow child：現有 GSI-85 UI-first route與HTML都把三頁放在CashFlow同層；Git父整合分支不改變UI IA。
- 採 `feat/gsi-pay` 整合父分支 + flat child names：可以一次完成一張Jira並集中shared-file整合，又避開Git ref prefix衝突。
- GSI Pay 與 Ultrapay 共存：父需求明確允許同站並存，因此不修改 shared Ultrapay config，也不以同名欄位互相覆蓋。
- Overview 固定六卡由 backend 保證：frontend 不再自行補齊 `MMK／BRL／PHP／INR／PKR／VND`，只依每張卡的 `enabled` 決定正常卡或灰色啟用卡。
- 啟用沿用首筆存款：沒有獨立 enable endpoint；成功建立 buy order 即由 backend 啟用，避免 frontend 維護第二套狀態或產生競態。
- 費率與限額唯讀：Jira只要求檢視，未要求站長修改。
- 不跨幣別直接加總 pending amount：不同法幣相加沒有財務意義，需 backend 分組或換算。
- 三方單號只留在 response：符合 PM 排查需求，同時不改一般 UI。
- 所有帳務計算由 backend 負責：避免 frontend precision、timezone、race condition 造成錯帳。
- UI components 保持 feature-local：GSI Pay 是新 domain，先避免修改 shared components 影響其他頁面。

## 待確認項目（實作前 gate）

- [x] HTML concept 已由 spec 作者讀取並把可採用的 layout／interaction 基線與衝突寫入本 spec。
- [ ] `kiosktopup.pdf` 與費率 Google Sheet 已由實作者讀取，且沒有與 spec 衝突。
- [x] 頁面維持 CashFlow child；本批次不新增 UI top-level GSI Pay parent。仍需確認正式 route order、icon 與 remote i18n key。
- [ ] Apifox已提供VIEW `3590101`與EDIT `3590102`；仍需確認Page／Buy／Withdraw／Export在S／M／A audiences的正式permission mapping。
- [x] 7支endpoint的method、normal request mode、主要request／response、ledger enum／pagination與export UUID contract已由Apifox寫回本spec。
- [ ] 補齊overview `pending_withdraw.latest／total`、recent withdrawal完整row、`payment_url`允許導向policy、create idempotency及未列出的error contract；不能從sample自行擴欄。
- [x] Overview的`cards`固定依序回滿`MMK／BRL／PHP／INR／PKR／VND`六張並帶`enabled`；站點不受支援差集仍由`unsupported_site_currencies`回傳。
- [ ] 存款 min／max、payment URL有效期限、redirect完成後的返回UX與provider開通後的production-safe測試方式。
- [x] 尚未啟用幣別顯示 disabled card 與「啟用此幣種」；沒有獨立 API，直接開存款 modal，第一筆 buy 建單成功即由 backend 啟用。
- [ ] 「尚未啟用」與「啟用此幣種」可沿用的 remote i18n key，或 EN／繁中／簡中精確文案。
- [ ] 存款／提現 dialog 的幣別 selector 可切換，或鎖定從 card 帶入的幣別？本 spec 暫按 HTML 預選且可切換。
- [ ] 提現 contact 是單選一種或可輸入多種？各類型格式與必填規則。
- [ ] 多幣別 pending amount 的分組／篩選／統一換算方案。
- [ ] Fee settings schema與decimal-string表示已確認；仍需確認`null`／空字串／不適用的完整語意及channel顯示文案。
- [ ] History 預設日期區間及 backend 是否固定 `created_at DESC`；本 spec 建議預設今日、最新在前。
- [x] 帳變匯出為CSV，回`export_uuid`並走既有`useExport()`下載流程；檔名與最大資料量仍由backend既有流程決定。
- [x] 原有頁面 EN／繁中／簡中精確文案與 remote i18n keys 已由使用者提供；重複語意已改沿用既有共用 key。新增的未啟用狀態文案仍依上方獨立 gate 處理。
- [ ] Action 成功後是否需要局部 polling／websocket；本 spec 預設只 refetch，不輪詢整頁。

任一 gate 未完成時，實作者應回報 blocker／更新 spec，不得以自行發明 contract 的方式繼續。

## 驗收條件

- [ ] 新 route／menu 位置符合已確認的 GSI Pay information architecture，且未改變 CashFlow 現有 redirect 或其他 child 行為。
- [ ] Sidebar、child tab、直接 URL 與 Buy／Withdraw／Export action 分別依正式 permission 控制，無自行發明 ID。
- [ ] 所有站點按權限可使用本頁；GSI Pay 與 Ultrapay 同站時互不覆蓋設定或資料。
- [ ] 不支援提示只列「站點已開通但 GSI Pay 不支援」幣別；全支援時隱藏，且不影響固定六張 wallet cards 呈現。
- [ ] Overview 不自行補卡或過濾 cards，固定依序呈現 `MMK／BRL／PHP／INR／PKR／VND` 六張；`enabled: true` 顯示餘額及 permission-gated 存款／提現 actions，0、null、loading、error 不混淆。
- [ ] `enabled: false` 呈現灰卡、「尚未啟用」與「啟用此幣種」，不顯示可操作的提現；點擊後開啟預選該幣別的既有存款 modal，不呼叫任何額外 enable API。
- [ ] 存款 modal 直接送`{ currency, amount }`，不得因六幣別中的`enabled: false`而阻擋；成功取得合法`payment_url`並導向付款頁，backend完成啟用，下次overview回`enabled: true`。前端同時需處理provider error與重複提交，不計算USDT、不串callback、不持有整合憑證。
- [ ] `334011`只用於六幣別之外的currency（例如`USD`），不得把尚未啟用的正式六幣別誤判為錯誤。
- [ ] 提現 modal 驗證 amount、network、address、contact，backend 驗證失敗可正確呈現；成功建立 `WD-...` 並 refetch 相關區塊。
- [ ] 最近 5 筆提現正確顯示 GSI 單號、幣別、金額、三種狀態與站點時區時間。
- [ ] pending 為 0 時提示隱藏；大於 0 時顯示筆數、已確認的 amount 表達方式與最新一筆；不直接加總不同法幣。
- [ ] 費率／限額只顯示站點已開通且支援幣別，資料與 Sheet／API 一致，唯讀、0 與 N/A 顯示正確。
- [ ] History filters、31 天限制、server-side pagination、page reset、no-data／error 行為正確。
- [ ] History 金額正負色與符號正確，前後餘額及備註完整顯示，時間使用站點時區。
- [ ] Export只對有權限者顯示，沿用目前filters且不帶pagination，以`export_uuid`接既有`useExport()`下載流程。
- [ ] UI 只顯示 GSI 單號；Ultrapay 三方單號存在於 typed API response 供 Network 排查，但未 render 到一般 UI／DOM。
- [ ] Source、client response、Network payload、DOM、console、錯誤訊息皆無 Auth key、secret、bot token 或後台帳密。
- [ ] Double submit／refetch race不會建立重複訂單或以舊資料覆蓋新結果。
- [ ] Desktop／tablet／mobile 版面無水平溢出，dialog／table／expansion panel 可操作。
- [ ] 所有新 UI 文字使用已確認的 remote i18n keys；未猜測其他語言、未建立 locale JSON。
- [ ] 未修改 shared query／dialog／menu behavior、現有 Ultrapay、GSI-86、GSI-87、GSI-88 或其他 out-of-scope surface。
- [ ] 未檢視或修改 `src/assets/env/environment.json`。

## 測試計畫

Repo 目前沒有可用的 Vitest／Jest／Playwright／Cypress 基礎設施，`npm test` 只會輸出 `No test specified`；不得只為此需求引入永久 test framework。

### 暫存測試（不提交）

若實作環境已有可用的臨時 runner，為純 mapping／validation helpers 寫並執行暫存測試，commit 前移除或 unstage：

- supported／unsupported currency 交集：全支援、部分支援、完全不支援。
- money／rate formatter：0、負數、decimal string、null、不同 precision。
- 提現 amount：0、負數、等於餘額、大於餘額、併發後端 insufficient balance。
- Buy validation／provider error／double submit／invalid或missing `payment_url`。
- status／account transaction type mapping 與第三方單號不 render。
- 31 天 date range boundary、start > end、跨月。
- filter change reset page、export params 與 list params 一致。

若本機確實沒有 runner，需在交接回報中明確記錄此限制，改用下列 deterministic fixture／手動矩陣與 build 驗證；不可宣稱 automated tests 已通過。

### API fixture / 手動驗證

- DEV測試站使用`dobt`；後端已建立三幣別餘額、ledger 7 types、withdrawal 3 statuses及每個filter都有結果的資料集。
- 測站點幣別：全六幣、部分六幣、無支援幣別、空 currency list。
- 測 wallet：正常、0、null、單幣失敗、整體失敗。
- 測top-up：body mapping、validation、double submit、成功`payment_url`shape與provider error；目前金流商未開通時不要求完成真實付款或callback，但error UX仍須驗證。
- 測 withdrawal：每種 network、無效 address、amount = balance、amount > balance、backend race、三種狀態。
- 測 pending：0、1、多筆同幣、多筆跨幣，核對最新一筆。
- 測 rate／limit：0、N/A、INR chargeback、multi-channel limits。
- 測 history：每種帳變、正負／0、31 天邊界、pagination 20／50／100、empty／error、export。
- 以 browser Network 驗證 response 有第三方單號但 UI／DOM 無該值；驗證所有 request／response 無整合憑證。
- 測 desktop／tablet／mobile 與所有啟用語系。
- 金流商未開通期間不使用真實資金測試；開通後仍須由owner提供並明確批准production-safe procedure。

### 最小程式驗證

- `git --no-pager diff --check -- <touched files>`
- Focused Prettier check／ESLint 只針對 touched files；不清理非阻擋既有 lint。
- 使用 `.nvmrc` 的 Node 22 執行專案現有 build，確認 Vue／TypeScript imports、exports、route 與 templates 可編譯。
- 不執行 `tsc --noEmit`。

## Git Flow

- 整合父分支：`feat/gsi-pay`，已於 2026-07-15 從最新 `main` 建立；父分支不可直接開發 ticket-specific code。
- 工作分支：`feat/gsi-pay-account-rate`。
- 現況：GSI-85 branch沒有upstream，只有一個基於同一`main`的UI-first commit `55652a80`；保留原branch與commit，不rebase、不cherry-pick、不改寫歷史。
- 該commit目前包含route、page、local components、placeholder data／types；尚未包含正式API、central contracts、permissions、time rules或i18n，因此不代表GSI-85完整驗收。
- 先在`feat/gsi-pay-account-rate`完成本spec gates、實作與review；每次新增commit仍需使用者針對該次明確確認。
- GSI-85完成後，經使用者明確批准才把`feat/gsi-pay-account-rate` merge回`feat/gsi-pay`；不得自行merge。若merge conflict則停止回報。
- 推進順序：GSI-85 child → `feat/gsi-pay`；待GSI-86、GSI-87依序整合完成後，才由`feat/gsi-pay` → `develop` → `staging` → `main`，每階段測試通過才進下一關。
- Commit 前需取得使用者針對該次提交的明確確認；暫存測試檔不可包含在 commit。
- 任何 merge 前都需使用者確認；發生 conflict 時停止並回報，不自行解 conflict 或把 target branch merge 回 work branch。
- 不主動開 MR／PR；push 後提供 Git server 回傳連結，由使用者決定。

## 交接備註給實作者

- 先完成「待確認項目」並把正式答案寫回本 spec，再開始實作。
- 目前 GSI-85 UI-first commit保留在`feat/gsi-pay-account-rate`；繼續GSI-85時切回該branch，不要在`feat/gsi-pay`直接改code。
- 先讀 GSI-85 HTML、top-up PDF、rate Sheet 及正式 backend／permission／i18n contract。
- 實作時只改本 spec 的受影響範圍；若 shared component／menu architecture 真的需要調整，先回報跨頁／跨站影響並更新 spec。
- 完成後由另一個 context 對照本 spec 的驗收條件逐條 review；不得只以「畫面可開」判定完成。
