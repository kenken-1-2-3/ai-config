# GSI-352 R003 推廣連結新增 QR Code

> 交接合約：Spec 作者（Codex）產出，指定實作者依此實作，reviewer 對照「驗收條件」逐條 review。Claude 與 Codex 的角色可以互換。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-352-r003-referral-qrcode.md`（版控於 ai-config）。
> 本 spec 是實作與 review 的唯一需求來源；實作者不得依對話記憶或自行推測擴張範圍。

## 背景 / 目標

- 需求來源：[Jira GSI-352](https://gamingsoft.atlassian.net/browse/GSI-352)。
- Jira 標題：`[需求 會員端]R003+新架構-推廣連結新增QRCode功能`。
- 原因：客戶需要把現有推廣註冊網址直接轉成 QR Code，方便以掃碼方式推廣。
- Jira 明確要求：
  - 所有目前顯示推廣連結／推薦碼的介面都要新增 QR Code。
  - 範圍包含會員代理、上級返佣、合營代理。
  - Jira 原始總需求包含 R003 舊架構與 R017 新架構。
  - PC 與 H5 都要製作。
  - 點擊「View Larger／放大顯示」後，以 dialog 顯示放大的同一組 QR Code。
- **本階段範圍決策（2026-07-27，使用者確認）：先只做 R003。R017 新架構拆開，後續另寫獨立 spec、另開工作分支實作與驗收；不得納入本 spec 的 diff。**
- Jira 相依項：[MRI-21 Share QR code](https://gamingsoft.atlassian.net/browse/MRI-21)，其描述也是把 URL 轉成 QR Code；GSI-352 目前被 MRI-21 block。前端可完成實作與 local verification，但 MRI-21 未解除前不得把整張 Jira 驗收宣稱為可上線。

## Figma 視覺來源

以下節點是本需求的視覺 source of truth；實作前與 review 時都必須重新讀取節點，不可只依本 spec 的文字近似：

- H5 卡片：[recommend Referral code-mob，node 452:13975](https://www.figma.com/design/jGvW4Zd8eQIw30SuQeHdNU/obbl-RM8--%E9%BB%91%E9%87%91%E7%89%88okbet-?node-id=452-13975)。
- PC 卡片：[recommend Referral code-web，node 452:9137](https://www.figma.com/design/jGvW4Zd8eQIw30SuQeHdNU/obbl-RM8--%E9%BB%91%E9%87%91%E7%89%88okbet-?node-id=452-9137)。
- 放大 dialog 的 QR 版面參考：[node 1329:13135](https://www.figma.com/design/jGvW4Zd8eQIw30SuQeHdNU/obbl-RM8--%E9%BB%91%E9%87%91%E7%89%88okbet-?node-id=1329-13135)。
- PC 完整頁面位置參考：[合營計畫＿詳細說明，node 451:16065](https://www.figma.com/design/jGvW4Zd8eQIw30SuQeHdNU/obbl-RM8--%E9%BB%91%E9%87%91%E7%89%88okbet-?node-id=451-16065)。

repo 目前沒有相關 `DESIGN.md`；因此本需求的顏色、字級、尺寸、間距、圓角與 responsive 版面以以上 Figma 節點為準，不另創設計 token。

## Template / siteKey 對應

- Jira 的 R003 對應 `template/okbet_blackGold`。
  - repo Git 歷史有 R003 需求只修改 `template/okbet_blackGold` 的明確紀錄。
  - `okbet_blackGold` 也是 deploy tooling 內的正式 siteKey。
- Jira 的 R017 對應 `template/set_r017`，但此對應只作總需求背景記錄；R017 不在本階段實作範圍。
- Figma 檔名中的 `obbl`、`RM8` 是業務／設計命名，不是額外的 source siteKey；本需求不得因此新增第三個 template。

## 受影響範圍

- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- Template/siteKey：只限 `okbet_blackGold`（R003）。
- 邏輯入口：會員代理、上級返佣、合營計畫。
- Responsive surface：PC 與 H5。
- 預期新增：
  - `template/okbet_blackGold/components/ReferralQRCodeCard.vue`
- 預期修改：
  - `template/okbet_blackGold/pages/HomePage/Referral/DesktopReferral.vue`
  - `template/okbet_blackGold/pages/HomePage/Referral/MobileReferral.vue`
  - `template/okbet_blackGold/pages/HomePage/ReferralRebate/Index.vue`
  - `template/okbet_blackGold/pages/HomePage/Collaboration.vue`
- 跨站影響：不得改變 `set_r017` 或任何其他 template。允許唯讀 import 既有 generic QR renderer；若實作者發現必須修改 `src/common`、shared config/default 或 router，先停下回報並取得使用者對跨站影響的確認，再更新本 spec。

## 現況

### 六個邏輯入口

R003 有三個顯示推薦碼與推廣註冊網址的入口：

1. 會員代理：`/referral`。
2. 上級返佣：`/referral_rebate`。
3. 合營計畫／合營代理：`/collaboration`。

### 既有行為

- 所有入口目前都已取得 referral code，且有兩個 action：
  - share icon：把 `inviteCodeUrl(...)` 產生的完整註冊網址複製到 clipboard。
  - copy icon：只把 referral code 複製到 clipboard。
- `src/common/composables/useUserInfo.ts` 的 `inviteCodeUrl()` 會以目前 origin 建立 HomePage URL，query 包含：
  - `inviteCode=<referral code>`
  - `redirect=register`
- QR Code 必須 encode 這個既有完整註冊網址；不是只 encode referral code，也不是 QR 圖片 URL。
- repo 已安裝 `qrcode.vue`，且 `src/common/components/QRCode/Index.vue` 已提供 SVG QR renderer；本需求不新增 QR dependency、不重寫 QR algorithm。

## 範圍

### 1. R003：`template/okbet_blackGold`

在以下 active surfaces 將現有 referral-code block 擴充為 Figma 的「推薦碼＋QR Code」卡片：

- 會員代理 PC：`template/okbet_blackGold/pages/HomePage/Referral/DesktopReferral.vue`。
- 會員代理 H5：`template/okbet_blackGold/pages/HomePage/Referral/MobileReferral.vue`。
- 上級返佣 PC/H5：`template/okbet_blackGold/pages/HomePage/ReferralRebate/Index.vue`。
- 合營計畫 PC/H5：`template/okbet_blackGold/pages/HomePage/Collaboration.vue`。

注意：

- active `/collaboration` route 指向單檔 `HomePage/Collaboration.vue`。
- `template/okbet_blackGold/pages/HomePage/Collaboration/Index.vue` 與其 Desktop/Mobile child 目前不是 active route 的 component；不得誤改那些同名檔案，除非 route 先有需求變更並更新本 spec。

### 2. Template-local 元件

- 在 R003 新增一個單一職責的 template-local component：
  - `template/okbet_blackGold/components/ReferralQRCodeCard.vue`
- component 至少接收：
  - referral code。
  - 已由既有 `inviteCodeUrl()` 產生的完整 share URL，或足以用既有 helper 產生該 URL 的資料。
- component 負責：
  - referral code 顯示。
  - 既有 share/copy action。
  - 120px inline QR。
  - View Larger button。
  - 放大 QR dialog 與 close action。
- 可以唯讀重用 `src/common/components/QRCode/Index.vue`，但不得為本需求修改 shared QR component、shared composable、shared config 或其他 template 的 runtime behavior。
- component 與樣式留在 `okbet_blackGold`，不要為了未來 R017 可能重用而提前把新行為放進 `src/common`。

### 3. QR payload 與 reactive 行為

- QR value 必須逐字等於現有 share icon 複製的完整 `inviteCodeUrl(...)` 結果。
- referral code 非空且 share URL 可建立後才 render QR 與啟用 View Larger。
- referral code 尚未載入、為 `undefined`、`null` 或空字串時：
  - 不 render 無效 QR。
  - View Larger 不得打開空 dialog。
  - share/copy 不得丟 runtime exception。
- API 完成後 referral code 變更時，inline QR 與 dialog QR 必須 reactive 更新為同一 URL。
- 不新增 network request；沿用各頁既有 referral/referral-rebate/collaboration fetch。

## Figma 精確規格

### PC 卡片（node `452:9137`）

- 外框：`550px × 239px`。
- layout：horizontal，padding `20px`，column gap `20px`。
- 背景：vertical linear gradient，`#D1B17C` → `#A48155`。
- 圓角：`10px`。
- 左右內容欄：各 `234.5px × 199px`。
- 中間 divider：`1px × 199px`，顏色 `#D2B27E`。
- 左欄：
  - 標題字：Open Sans Semibold、`20px`、黑色。
  - referral code bar：`234.5px × 48px`，背景 `#131313`，border `1px #8A8A8A`，圓角 `4px`，padding `12px`。
  - code 字：Open Sans Semibold、`16px`、白色。
  - share/copy icon：各 `20px × 20px`，gap `10px`。
- 右欄：
  - 標題字：Open Sans Semibold、`20px`、黑色。
  - 標題與 QR gap `12px`。
  - inline QR：`120px × 120px`，白底，圓角 `8px`。
  - View Larger content：icon `20px × 20px`；icon/text gap `8px`；水平 padding `8px`、垂直 padding `4px`、圓角 `100px`。
  - View Larger 字：Open Sans Bold、`14px`、line-height `20px`、`rgba(255,255,255,0.9)`。

### H5 卡片（node `452:13975`）

- 外框：`358px × 309px`；在 390px frame 內左右各 `16px` page margin。
- layout：vertical，padding top/bottom `20px`、left/right `12px`，section gap `12px`。
- 背景：vertical linear gradient，`#D1B17C` → `#A48155`。
- 圓角：`10px`。
- referral code section：`334px × 56px`。
  - label 與 code bar gap `4px`。
  - label：Open Sans Semibold、`12px`、黑色。
  - code bar：`334px × 36px`，背景 `#131313`，border `1px #8A8A8A`，圓角 `4px`，水平 padding `10px`。
  - code：Open Sans Semibold、`12px`、白色。
  - share/copy icon：各 `20px × 20px`，gap `10px`。
- horizontal divider：`334px × 1px`，顏色 `#D2B27E`。
- QR section：`334px × 188px`，column gap `12px`，水平置中。
  - 標題：Open Sans Semibold、`12px`、黑色。
  - inline QR：`120px × 120px`，白底，圓角 `8px`。
  - View Larger 的 icon、字級、line-height、padding、gap 與圓角同 PC。
- 不得把 Figma 的 `12px`、`20px`、`334px`、`358px` 等值四捨五入成既有 spacing scale。
- 若實際 H5 viewport 小於 390px，卡片可依 container 寬度縮到 `calc(100vw - 32px)`，但內部不得水平 overflow；在 390px 基準 viewport 必須精確為 358px。

### 放大 dialog（node `1329:13135`）

- 使用 target template 既有 Quasar `q-dialog` 結構／樣式 pattern；不得另建 route 或新 window。
- 本 QR dialog 必須是 non-persistent：不得照抄既有 referral settings dialog 的 `persistent` prop；close icon、Escape（desktop）與 backdrop click 都可關閉。
- dialog content 基準尺寸：`343px × 400px`。
- 背景：`#1E1E1E`。
- 圓角：`24px`。
- padding：`20px`。
- title row：`303px × 49px`，title 與 close icon 兩端對齊。
- title：Open Sans Bold、`24px`、`#F2F2F2`；文字語意是 Share QR Code。
- close icon：`22px × 22px`，白色；點擊或標準 dialog dismissal 可關閉。
- title row 與 enlarged QR gap：`30px`。
- enlarged QR：`281px × 281px`，白底，圓角 `8px`。
- PC 未提供另一套 dialog 尺寸；PC 與 H5 都使用上述 343px content並置中顯示。375px viewport 的 side margin 精確為 `16px`；390px viewport 的 side margin 為 `23.5px`，兩者都不得小於 `16px`。
- Figma 外層 `#414141` 是示意背景／overlay context，不得改寫實際頁面背景；overlay 使用既有 `q-dialog` 行為。
- inline QR 與 enlarged QR 的 value 必須完全相同。

## 文案與 i18n

- 保留既有 referral code 相關 `$t(...)` call 或重用語意相容的現有 key，優先使用已存在的 `collaboration.exclusive_referral_code`；不得搜尋、建立或修改 local locale JSON。
- 新增可見文案語意：
  - `Share QR Code`
  - `View Larger`
- 使用 remote i18n：
  - `Share QR Code` → `common.shareQRCode`
  - `View Larger` → `common.btn.viewLarger`
- 卡片標題與 dialog 標題共用 `common.shareQRCode`，不得保留 hardcode 英文。
- Figma H5 reference code 的大小寫與 PC 略有差異；實作統一使用 `Share QR Code`、`View Larger`，避免同一功能因 breakpoint 改變語意。

## Out of scope

- 不修改代理端 `Whitelabel_GSI_Dashboard`。
- 不修改或實作 R017 `template/set_r017`；R017 新架構後續另立 spec／branch。
- 不擴到 R003 `okbet_blackGold` 以外的 template/siteKey。
- 不修改 shared router、shared page、shared composable、shared QR renderer、shared config 或共用預設值。
- 不新增／修改 endpoint、request/response type、API payload 或 auth 行為。
- 不把 QR value 改成 raw referral code、圖片 URL、base64 圖片、HTML 或後端新欄位。
- 不更換 share action 為 Web Share API、system share sheet 或社群選擇器；share icon 繼續使用既有 clipboard copy full URL 行為。
- 不改 copy icon 的既有行為；它仍只複製 referral code。
- 不改推薦統計、幣別、table/tab、權限 guard、pagination、banner、footer、header 或其他頁面內容。
- 不修改 inactive 的 `template/okbet_blackGold/pages/HomePage/Collaboration/Index.vue` 及其 child components。
- 不新增 QR library、不修改 QR error-correction level、encoding、foreground/background 或 SVG renderer。
- 不搜尋、建立或修改 local locale JSON。
- 不 inspect、修改、格式化或提交 `src/env/environment.json`。
- 不處理與 GSI-352 無關的 lint warning、視覺、animation 或 refactor。
- 不在本需求內 commit、push、merge、開 MR/PR 或 deploy；以上都需使用者另外明確指示。

## 參考實作 / 要遵循的現有 pattern

- Generic QR renderer：`src/common/components/QRCode/Index.vue`。
- 完整推廣 URL builder：`src/common/composables/useUserInfo.ts` 的 `inviteCodeUrl()`。
- clipboard 與既有 notify：`src/common/hooks/useCommon.ts` 的 `copyMessage()`。
- R003 active screens：
  - `template/okbet_blackGold/pages/HomePage/Referral/DesktopReferral.vue`
  - `template/okbet_blackGold/pages/HomePage/Referral/MobileReferral.vue`
  - `template/okbet_blackGold/pages/HomePage/ReferralRebate/Index.vue`
  - `template/okbet_blackGold/pages/HomePage/Collaboration.vue`
- Existing template-local dialog styling：
  - R003 PC：`template/okbet_blackGold/pages/HomePage/Referral/Components/DesktopSettingTable.vue`
  - R003 H5：`template/okbet_blackGold/pages/HomePage/Referral/Components/MobileSettingList.vue`
- 只可把 `template/set_DBO88/pages/Home/components/ShareLink.vue` 當作「q-dialog + qrcode + copy」結構參考；不得 import、共用或複製其 DBO88 視覺／資產到 R003。

## 關鍵決策與理由

1. **本 spec 只涵蓋 R003；R017 拆成後續獨立交付。**
   - 使用者已確認新架構 R017 先分開；因此本次 diff、測試、review、分支與發版都不得包含 `set_r017`。
   - 一份 spec 對應一個可獨立實作與驗收的單位；R017 之後依其新架構現況與設計另立 spec，不能沿用本次 commit 授權或驗收結果。
2. **R003 的三個入口、PC/H5 全部納入。**
   - Jira 明確列出會員代理、上級返佣、合營代理與兩種裝置；不是只改使用者提供 Figma 的單一合營頁面。
3. **QR encode 現有 share full URL。**
   - MRI-21 與 Jira 都說 URL 轉 QR；現有 share action 已定義正確網址 contract。使用同一值可確保掃碼與 share icon 的結果一致。
4. **share/copy 行為不變。**
   - Figma 是新增 QR 呈現，不是重新定義分享產品行為；避免把 clipboard share 擴張成 Web Share。
5. **R003 使用一個 local card/dialog component，不新增 shared behavior。**
   - template-local 實作可重用 R003 內三個入口，又不影響 R017 或其他 template。
6. **重用現有 generic QR renderer，不新增 dependency。**
   - repo 已有 `qrcode.vue` wrapper，能輸出 SVG；本需求只需提供正確 value 與尺寸。
7. **dialog 使用同一 QR value，PC/H5 共用 343px content。**
   - Figma 已提供 343×400 dialog reference，但沒有另一套 desktop dialog；固定 content 在 PC 置中、H5 保留 16px margin可客觀驗收。
8. **不依資料來源複製 QR 邏輯。**
   - 三個入口雖分別來自 referral、referral rebate、collaboration state，但 UI 只接收 code/full URL；API 與 composable 保持現狀。

## 驗收條件

> Reviewer 必須逐條判定通過／不通過；不可只用「畫面有 QR」概括驗收。

### 功能矩陣

- [ ] R003 `okbet_blackGold` 的會員代理 `/referral`：PC 與 H5 都顯示 Figma card、120px QR、View Larger。
- [ ] R003 `okbet_blackGold` 的上級返佣 `/referral_rebate`：PC 與 H5 都顯示同一功能。
- [ ] R003 `okbet_blackGold` 的合營計畫 `/collaboration`：PC 與 H5 都顯示同一功能，且修改的是 active `HomePage/Collaboration.vue`。

### QR contract

- [ ] 六個邏輯入口中，inline QR 解碼結果都逐字等於同頁 share icon 複製的完整 URL。
- [ ] 完整 URL 使用目前 origin，包含正確 `inviteCode` 與 `redirect=register`；沒有 encode 成 raw code、圖片 URL 或其他 payload。
- [ ] inline QR 是 SVG，視覺尺寸 `120px × 120px`、白底、`8px` 圓角。
- [ ] referral code 尚未載入或為空時不 render 無效 QR、不開空 dialog、不 throw。
- [ ] referral code 非同步載入或更新後，inline 與 dialog QR 同步更新。
- [ ] 沒有為 QR 新增 API request；原有三套 fetch 數量與 request contract 不變。

### Action regression

- [ ] share icon 仍透過既有 `copyMessage()` 複製完整註冊網址並保留既有 success/error notify。
- [ ] copy icon 仍只複製 referral code。
- [ ] 點 View Larger 只打開一個 dialog；dialog 內 QR 解碼結果與 inline QR 完全一致。
- [ ] dialog 沒有 `persistent` prop；close icon、Escape（desktop）與 backdrop click 都可正常關閉，反覆開關不累積多個 dialog/QR instance。

### 視覺

- [ ] PC 550×239 card 的 gradient、padding、gap、兩欄、divider、字級、code bar、icon 與 120px QR 對齊 node `452:9137`。
- [ ] H5 在 390px viewport 時 card 為 358×309、左右 margin 16px，內部尺寸與 node `452:13975` 一致且無 horizontal overflow。
- [ ] dialog content 為 343×400、`#1E1E1E`、24px radius、20px padding、30px gap，QR 為 281×281，對齊 node `1329:13135`。
- [ ] 375px 與 390px H5 viewport、以及 PC reference viewport 都完成 Playwright/Chrome screenshot 與 Figma 疊圖／並排比對；spacing、font size、position、color、radius、icon、QR crop 無明顯差異。
- [ ] 若 Open Sans runtime font 或既有 icon glyph 造成不可消除差異，review evidence 明列差異、原因與影響，不能靜默略過。

### Scope / quality

- [ ] 未修改 `template/set_r017` 或其他非 R003 template 的 runtime code，未修改 shared QR/composable/router/config。
- [ ] 未修改 inactive R003 Collaboration folder components、API contract、權限 guard、其他頁面功能或 local locale JSON。
- [ ] 未修改或納入 `src/env/environment.json`，未處理無關 lint warning。
- [ ] 新增 imports 排序正確、無 unused/missing import；targeted Prettier/ESLint 與 `git --no-pager diff --check` 通過。
- [ ] 未執行 `tsc --noEmit`；commit 不含臨時測試檔、screenshot、帳密、environment 檔或其他無關變更。

## 邊界情況 / 例外

- referral code 可能在 first render 尚未取得；component 必須接受 async/reactive 更新。
- `inviteCodeUrl()` 回空字串時不得傳給 `qrcode.vue`。
- URL 可能包含 query encoding、非 ASCII code、`+`、`%`、`&` 等字元；不得手動二次 encode/decode、trim 或重組。
- 不同入口的 referral code data source 不同，但 QR contract 都以該入口目前 share action 的 full URL 為準。
- H5 內容若因遠端語系文案比英文更長：
  - 不縮小 Figma 指定 font size。
  - 允許依既有 i18n pattern換行／避免 overflow，但不可截斷 referral code 或 QR。
  - 若無法在固定高度容納，先回報並更新 spec，不自行增加 card 高度。
- QR payload 太長而 library 明確 throw 時，記錄 URL 長度與錯誤後回報；不得截斷 URL 或降低資料正確性。
- `/referral_rebate` 的既有 access guard 與 target group 行為保持不變；無權限帳號看不到頁面屬既有預期。
- MRI-21 若仍為 Open，不阻擋 local code implementation，但會阻擋「整體可上線」結論。

## 測試計畫

> repo 沒有宣告 Vitest/Jest/Playwright test runner；不得為本需求安裝或提交新 test framework。仍需以可重複的臨時測試與 browser assertions 驗證，測試檔／script 驗後移除，不進 commit。

### 1. 臨時 QR contract test

- 實作期間建立臨時 `ReferralQRCodeCard.spec.ts` 或 `tool/test/gsi-352-referral-qrcode.ts`（依最小可執行方式選一個），使用 repo 既有 Node/`ts-node` 與 `node:assert`，至少驗證：
  1. empty/undefined referral code 產生 empty share URL contract，不 render/啟用 QR。
  2. non-empty code 產生的 URL 含正確 `inviteCode` 與 `redirect=register`。
  3. inline 與 dialog 共用同一個 computed QR value，不各自重建不同 URL。
- 若 component 直接接收既有 `inviteCodeUrl()` 結果、沒有值得抽出的 pure helper，不要為測試創造 production abstraction；改用下方 browser DOM assertions 作為自動化 contract test。
- 測試完成後刪除臨時檔；commit 不含 test file。

### 2. Chrome browser / DOM test

- 所有 local/dev URL 都必須用 Chrome extension，不使用 in-app browser。
- R003 至少以一個有權限且能取得非空 referral code 的 QA 帳號驗證；帳密不得寫入 spec、script、console output 或 commit。
- 對以下 6 個 case 建立驗收矩陣並記錄 URL、template、viewport、結果：
  - R003 1 template × 3 routes × PC/H5。
- 每個 case 以 DOM assertion 驗證：
  - card 恰好一個。
  - inline QR SVG 恰好一個，rendered size 120×120。
  - View Larger button 可點且只打開一個 dialog。
  - dialog QR SVG 恰好一個，rendered size 281×281。
  - close 後 dialog/large QR 不再 visible。
- 每個 logical route 至少掃描一次 inline QR；R003 至少掃描一次 enlarged QR。掃描結果必須等於從 share icon 取得的完整 URL。
- share/copy clipboard：
  - share icon 結果等於 QR decode。
  - copy icon 結果等於 referral code，不含 origin/path/query。

### 3. 視覺比對

- 產出以下 reference screenshots（驗證用，不 commit）：
  - PC card，對照 node `452:9137`。
  - H5 390px card，對照 node `452:13975`。
  - H5/PC dialog，對照 node `1329:13135`。
- R003 各做一次 PC/H5 pixel comparison，確認沒有因外圍 layout 偏移或 overflow。
- 回報 screenshot 絕對路徑與仍存在的差異；沒有明顯差異時明寫「無明顯差異」。

### 4. Targeted validation

- 對所有 touched `.vue` / `.ts` 跑 targeted Prettier check。
- 對所有 touched `.vue` / `.ts` 跑 targeted ESLint；只修本次新增的 blocking error，不主動清理無關既有 warning。
- 跑 `git --no-pager diff --check`。
- 確認 working tree 不含臨時 test、screenshot、帳密、local environment 或無關檔案。
- 不執行 `tsc --noEmit`。

## Git Flow

- 基底分支：`main`。
- 工作分支名稱：`feat/gsi-352-r003-referral-qrcode`。
- 實作者開始前：
  1. 保留目前工作樹中的使用者修改，不得覆蓋、格式化或帶入本 feature。
  2. 切到 `main` 前確認不會遺失既有修改；需要隔離時依使用者指示使用安全 worktree。
  3. 拉取前用 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` 非互動確認 HTTPS token / macOS Keychain 可用；失敗即停止回報，不改 SSH。
  4. 更新最新 `main`，再建立並切換到 `feat/gsi-352-r003-referral-qrcode`。
  5. 未切到上述工作分支前不得開始實作；不可直接在 `main`、`develop`、`staging` 或其他既有工作分支修改。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（正式），每階段測試通過後才可進下一關，不得跳關。
- 每一次 commit 都必須先取得使用者針對該次 commit 的明確確認；本次「寫 spec」不構成 commit 授權。
- 合併進任何分支前都必須再次取得使用者明確確認；衝突時停止／abort 並回報，不自行解 conflict 或改 merge strategy。
- 不預設 rebase，不主動把 develop/staging/main 合回工作分支。
- 不主動開 MR/PR；push 後只提供 GitLab 回傳連結，由使用者決定。
- merge 到 develop/staging/main 不等於發版。只有使用者明確說「發版／release」才可執行：
  - 本 spec 是單一 template R003：使用 `yarn deploy` 並選 `okbet_blackGold`。
  - 不得把本需求誤當全版型而執行 `yarn deploy:all`，也不得在本次發版順帶選 R017。

## 交接備註給實作者

- 先依 Git Flow 從最新 `main` 建立 `feat/gsi-352-r003-referral-qrcode`，再開始修改。
- 建議順序：
  1. 重新讀 Jira、三個 Figma 節點與本 spec。
  2. 重新用 scoped `rg` 確認 active routes 與 referral code blocks。
  3. 完成 R003 template-local card/dialog，接入三個 active surfaces。
  4. 臨時 contract test。
  5. 6-case browser matrix、QR scan、clipboard regression、pixel comparison。
  6. targeted formatting/lint/diff checks。
- 本 spec 的 repo 現況快照為 2026-07-27、commit `7b9cefd1c`。若最新 `main` 已改 route、component 或 referral URL contract，先更新 spec 的現況、受影響檔案與驗收矩陣再實作。
- R017 新架構不得在實作途中加入本分支；後續需求必須另寫 spec，從對應工作分支獨立實作與驗收。
- 若 MRI-21 改變 QR payload、或實作需要修改 shared code，先停止並更新 spec／取得使用者確認；不得自行折衷。
- 完成後 reviewer 必須依「驗收條件」逐條 review；任何需求變更先改 spec，再改 code。
