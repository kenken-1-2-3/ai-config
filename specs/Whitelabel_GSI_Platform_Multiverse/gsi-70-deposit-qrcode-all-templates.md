# GSI-70 全版型支援存款 QR Code

> 交接合約：Spec 作者（Codex）產出，指定實作者依此實作，reviewer 對照「驗收條件」逐條 review。Claude 與 Codex 的角色可以互換。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-70-deposit-qrcode-all-templates.md`（版控於 ai-config）。
> 本 spec 已包含實作所需的需求、repo 現況與決策；實作者不得依對話記憶自行擴張需求。

## 背景 / 目標

- 需求來源：[Jira GSI-70](https://gamingsoft.atlassian.net/browse/GSI-70)。
- 端別：舊會員端 `Whitelabel_GSI_Platform_Multiverse`，範圍為全部版型（28 個 `template/<siteKey>`）。
- 觸發原因：2026-07-13 後端回覆 KITAPAY 存款需要前端協助顯示 QR Code；使用者確認本次不是只修 DOBT，而是「把 QR Code 鋪到全版型」。
- 存款 API 成功回傳 `redirect_type: 3`（`DEPOSIT_REDIRECT_TYPE.Enums.OpenQRCode`）時，前端必須另開 `/deposit-qr-code`，並把 `redirect_content` 當作 QR payload 交給 `qrcode.vue` 產生 QR Code。
- KITAPAY 現況可能回傳 `channel: ""`；未來也可能回傳 `channel: "qris"` 或 `channel: "kitapay"`。這些值都不能阻止 QR Code 顯示。
- 已確認 DOBT dev 的 siteKey 是 `bmm_set_obtd`。現況因該 template 沒有 `DepositQRCode` route，直接開指定 URL 為全白頁，DOM 無 SVG、Canvas 或 QR Code。

## 現況與 root cause

### 共用存款流程已支援 type 3

- `src/common/composables/useBank.ts` 的 `handleDepositSubmit(pageQRCode = "DepositQRCode")` 已處理 `DEPOSIT_REDIRECT_TYPE.Enums.OpenQRCode`：
  - 以 route name `DepositQRCode` resolve URL。
  - query 傳遞 `type`、`currency`、`amount`、`channel`、`content`。
  - `content` 直接來自 API 的 `redirect_content`。
  - 一般瀏覽器另開新分頁；被阻擋時沿用既有 dialog fallback；Telegram 環境沿用既有 `openLink`。
- `src/common/components/Deposit/QRCode.vue` 已把 query `content` 傳給 `src/common/components/QRCode/Index.vue`。
- `src/common/components/QRCode/Index.vue` 使用 `qrcode.vue`，預設輸出 SVG。

### 版型 route 缺漏

repo 共有 28 個 template router。只有以下 5 個已同時註冊 `path: "/deposit-qr-code"`、`name: "DepositQRCode"` 並有 local wrapper page：

- `okbet`：`template/okbet/router/routes.ts`、`template/okbet/pages/DepositQRCode/Index.vue`
- `okbet_green`：`template/okbet_green/router/routes.ts`、`template/okbet_green/pages/DepositQRCode/Index.vue`
- `set33_GREEN`：`template/set33_GREEN/router/routes.ts`、`template/set33_GREEN/pages/DepositQRCode/Index.vue`
- `set_r024`：`template/set_r024/router/routes.ts`、`template/set_r024/pages/DepositQRCode/Index.vue`
- `set_r025`：`template/set_r025/router/routes.ts`、`template/set_r025/pages/DepositQRCode/Index.vue`

以下 23 個 template 都沒有該 route，也沒有 local DepositQRCode page：

- `bmm_set_obtd`
- `cordova_app`
- `okbet_blackGold`
- `okbet_red`
- `okbet_redBlack`
- `set33_RED`
- `set_DBO88`
- `set_amuse`
- `set_ed3`
- `set_ed8888`
- `set_jokerhill`
- `set_r016`
- `set_r017`
- `set_r022`
- `set_r022_mga`
- `set_r023`
- `set_r027`
- `set_r029`
- `set_r030`
- `set_r031`
- `set_r032`
- `set_r033`
- `set_royalslot88`

### 既有 channel gate 也會造成白頁

- 上述 5 個既有 local wrapper 都只在以下兩個條件同時成立時 render 共用元件：
  1. `queryType === DEPOSIT_REDIRECT_TYPE.Enums.OpenQRCode`
  2. `channel.toLowerCase()` 位於 `gcash`、`maya`、`qrph` 白名單
- 因此即使 route 存在，`channel: ""`、`qris`、`kitapay` 或任何未知 channel 仍不 render QR Code。
- `src/api/response.type.ts` 的 `Response.Deposit.channel` 目前被限制為 `DEPOSIT_REDIRECT_CHANNEL.Enums`，但實際 API 已可能回空字串；型別與 runtime contract 不一致。
- `src/common/components/Deposit/QRCode.vue` 目前永遠 render channel `<img>`。空字串或沒有對應 asset 的 channel 會得到空 `src`，不應留下 broken/empty logo。

## 範圍

1. 在 shared router composition 補一個共用 `DepositQRCode` fallback route：
   - path 固定為 `/deposit-qr-code`。
   - name 固定為 `DepositQRCode`，維持 `handleDepositSubmit()` 既有 contract。
   - component 指向新的共用 page wrapper。
   - 只有 template routes 內尚未存在同名／同 path route 時才加入；已有 route 的 5 個 template 必須保留原 route 與 local page，且不得出現 duplicate route name/path warning。
2. 新增共用 DepositQRCode page wrapper，供 23 個缺 route 的 template 使用：
   - 沿用 `src/common/components/Deposit/QRCode.vue`，不得重寫 QR 產生邏輯。
   - 視覺以既有 DepositQRCode wrapper 的版面為參考，使用中性、可讀的 shared fallback 樣式；不加入任何單一 tenant logo、ID 或品牌專屬資產。
   - 只在 `type === OpenQRCode` 且 `content` 為非空字串時顯示 QR 內容。
3. 調整既有 5 個 local wrapper：
   - 保留各自 route、wrapper 與樣式。
   - 移除 `gcash/maya/qrph` channel 白名單對「是否 render」的控制。
   - render 條件只保留 `type === OpenQRCode` 與非空 `content`；或將這兩項有效性檢查集中在共用 QR 元件，但不得讓 channel 重新成為 gate。
4. 調整 shared QR component 的 channel logo 行為：
   - `gcash`、`maya`、`qrph` 等有現成 asset 的 channel 繼續顯示 logo。
   - channel 比對需能安全處理大小寫、空字串、缺 query、陣列 query 與未知值。
   - `""`、`qris`、`kitapay` 或任何沒有 asset 的 channel：隱藏 logo，QR Code 本身仍正常顯示；不得 render 空 `src` 或 broken image。
5. 修正 `Response.Deposit.channel` 型別，使它能表達後端實際可能回傳的空字串與未來 channel 字串。不得再用只含 `gcash/maya/qrph` 的 enum 阻擋合法 API response。
6. 保留既有 redirect/open 行為；QR payload 必須是 `redirect_content` 原字串，不是圖片 URL。

## Out of scope（明確不做）

- 不修改代理端 `Whitelabel_GSI_Dashboard`；代理端不處理此存款 API，也沒有本次 QR rendering responsibility。
- 不新增或修改存款 endpoint、request payload、API wrapper、錯誤碼或後端 channel 值。
- 不把 `redirect_content` 當 `<img src>`、遠端圖片 URL、HTML 或 iframe；不得對 payload 內容做 trim、decode、parse、重組或補字元後再產 QR。
- 不新增 `qris`／`kitapay` logo 或任何視覺資產；需求沒有提供正式 asset。沒有 logo 時只隱藏 logo 區塊。
- 不修改 `qrcode.vue` 的 error-correction level、render-as、顏色或 encoding 規則，除非實測證明既有設定無法 render 後端 payload，且先更新本 spec。
- 不改存款金額、幣別、promotion、loading、window.open、Telegram、dialog fallback 或其他 redirect type 的行為。
- 不修改其他存款頁 UI、版型 layout、spacing、animation 或無關樣式。
- 不搜尋、建立或修改 local locale JSON；保留既有遠端 `$t(...)` keys，不發明 i18n key。
- 不 inspect、修改、格式化或提交 `src/env/environment.json`。
- 不在本需求內 merge、push、開 MR/PR 或部署；以上都要使用者另行明確指示。
- 不順手處理與 GSI-70 無關的既有 lint/type 問題。

## 受影響範圍

- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 跨站影響：明確為 28 個 template 全版型；修改 shared router / shared deposit QR component 是本需求本意，已由使用者確認，不需做單站隔離。
- 預期新增／修改：
  - 新增 `src/common/pages/DepositQRCode.vue`：缺 route template 的共用 page wrapper與有效 query gate。
  - 新增 `src/router/depositQRCodeRoute.ts`（或同等單一職責檔）：定義 shared fallback route 與「已有則保留、缺少才補」的 route composition helper。
  - 修改 `src/router/routes.ts`：在 template routes 與 base routes 合併時套用上述 helper。
  - 修改 `src/common/components/Deposit/QRCode.vue`：安全讀取 query、依現有 asset 顯示可選 channel logo、繼續把原始 content 傳給 QRCode。
  - 修改 `src/api/response.type.ts`：讓 `Deposit.channel` 接受實際 channel 字串（含空字串）。
  - 修改 5 個既有 local wrapper，移除 channel render gate：
    - `template/okbet/pages/DepositQRCode/Index.vue`
    - `template/okbet_green/pages/DepositQRCode/Index.vue`
    - `template/set33_GREEN/pages/DepositQRCode/Index.vue`
    - `template/set_r024/pages/DepositQRCode/Index.vue`
    - `template/set_r025/pages/DepositQRCode/Index.vue`
- 預期不修改 28 個 template router。23 個缺 route template 由 shared fallback 補齊；5 個已有 route template 保留既有 route。若實作者認為必須逐一修改 23 個 router 或建立 23 份 page，先停下更新 spec，不得直接複製大量 template-local code。

## 參考實作 / 要遵循的現有 pattern

1. `src/common/composables/useBank.ts`：`handleDepositSubmit()` 的 `OpenQRCode` case 是 navigation 與 query contract 的唯一來源。沿用 query keys：`type`、`currency`、`amount`、`channel`、`content`。
2. `src/common/components/Deposit/QRCode.vue`：共用存款 QR 畫面。繼續使用 `useRoute()`、`moneyFormat()`、`getAgentSetting()` 與 `useCommonImg().depositChannelImg()`。
3. `src/common/components/QRCode/Index.vue`：QR renderer。繼續以 `qrcode.vue` 的 `value` 接收 payload，預設 `renderAs = "svg"`。
4. `template/okbet/pages/DepositQRCode/Index.vue`：既有 wrapper 的 type gate 與 fallback page 視覺參考；移除 channel 白名單 gate，但保留該 template 的樣式。
5. `template/set_r024/pages/DepositQRCode/Index.vue`：唯一少了 card `bg-white` override 的既有 wrapper；保留此差異，不要趁機統一樣式。
6. `src/router/routes.ts`：所有 template routes 最終都在此與 `baseRoutes` 合併，是補全版型能力的正確 shared composition point。
7. `src/common/hooks/useCommonImg.ts`：`depositChannelImg(file)` 找不到 asset 時回空字串；以此結果決定是否 render logo，不新增 fallback 圖。

## 關鍵決策與理由 (Key decisions)

1. **採 shared fallback route，不逐一新增 23 組 route/page。**
   - 需求是全版型，所有版型已在 `src/router/routes.ts` 匯入同一組 base/shared routes。
   - 共用能力放在 shared router 可避免 23 份重複 page、降低漏版型與未來新增 template 時再次缺 route 的風險。
   - 已有 5 個 template 的 local route/page 保留，避免改變既有品牌樣式。
2. **`redirect_type: 3` 是 QR rendering 的權威判斷；`channel` 不是 allowlist。**
   - 後端已用 type 3 宣告 `redirect_content` 是 QR payload。
   - KITAPAY 現況為空 channel，未來 channel 名稱也可能擴充；以 channel 白名單控制 rendering 會持續產生白頁。
   - channel 只用來找 optional logo；找不到 logo 不影響 QR。
3. **不等待後端先改為 `channel: "qris"` 才支援。**
   - 前端必須同時支援目前 `""`、建議值 `qris`、可能值 `kitapay` 與未來未知值。
   - 後端日後改成明確 channel 時，前端不需再次發版才能 render。
4. **`redirect_content` 原樣進 `qrcode.vue`。**
   - 它是 QR payload，不是圖片 URL；router 只負責 query encoding/decoding，前端不做第二次轉換。
5. **沒有正式 channel logo asset 就隱藏 logo。**
   - 不自行畫圖、不借用 QRPH logo、不顯示 broken image，避免錯誤品牌資訊。
6. **route helper 必須是 idempotent。**
   - 已有 `DepositQRCode` route 的 5 個 template 不可被再加一次；缺 route 的 23 個 template 必須恰好加一次。route name 或 path 任一已存在但彼此不一致時，視為 contract conflict，實作者應停下回報，不可靜默製造第二條 route。
7. **不改既有 `handleDepositSubmit()` redirect/open 策略。**
   - 現有流程已正確把 API payload 導向 route；root cause 是 route/channel gate，不是提交流程。

## 驗收條件

> Reviewer 必須逐條判定通過／不通過，不得只用「畫面看得到」概括驗收。

- [ ] 28 個 template 啟動後都可 resolve `{ name: "DepositQRCode" }`，結果 path 為 `/deposit-qr-code`；每個 router 中該 name/path 恰好各一條，console 無 duplicate route name/path warning。
- [ ] 原本缺 route 的 23 個 template 使用 shared fallback route；包含 `bmm_set_obtd`（DOBT）、`cordova_app` 與其餘清單內 template，未逐一新增重複的 template-local page。
- [ ] 原本已有 route 的 `okbet`、`okbet_green`、`set33_GREEN`、`set_r024`、`set_r025` 繼續使用各自 local wrapper/style，沒有被 fallback route 覆蓋或產生重複 route。
- [ ] API 回 `redirect_type: 3`、`redirect_content: <non-empty payload>` 時，前端 route query 的 `content` 與原 payload 完全一致，QR renderer 的 value 也是同一原字串。
- [ ] 下列 channel case 都會 render QR SVG（DOM 至少一個由 `qrcode.vue` 產生的 `<svg>`，且可由另一台裝置／QR reader 掃回原 payload）：`""`、`"qris"`、`"QRIS"`、`"kitapay"`、未知非空字串。
- [ ] `gcash`、`maya`、`qrph` 的既有 type 3 流程不回歸，仍 render QR；有現成 channel asset 時 logo 正常顯示。
- [ ] 空、缺少、陣列或沒有 asset 的 channel 不會 throw；不 render 空 `src`／broken channel image，且 QR SVG 仍顯示。
- [ ] `type` 不是 `DEPOSIT_REDIRECT_TYPE.Enums.OpenQRCode`，或 `content` 缺少／為空字串時，不產生 QR SVG，也不因 query type/channel 操作而丟出 runtime exception。
- [ ] `redirect_content` 沒有被當成 `<img src>`、iframe URL 或 HTML；沒有新增對 payload URL 的 network request。
- [ ] `Response.Deposit.channel` 型別可表達空字串、`qris`、`kitapay` 與未來 channel 字串，不再只限 `gcash/maya/qrph` enum。
- [ ] `handleDepositSubmit()` 的其他 redirect type、window/Telegram/dialog fallback、存款表單與 API request 無行為變更。
- [ ] 未修改代理端、local locale JSON、`src/env/environment.json`、無關 template UI 或無關 lint 問題。
- [ ] 最小驗證通過：route helper 臨時測試、DOBT browser smoke test、既有 route template regression、targeted Prettier/ESLint、`git --no-pager diff --check`。
- [ ] 未執行 `tsc --noEmit`；commit 不含任何測試檔、臨時 script、帳密或 local environment 設定。

## 邊界情況 / 例外

- API 的 `channel` 可能是 `undefined`、空字串、大小寫混用、未知字串，或因 query parser 成為陣列；一律不能對它直接呼叫 `toLowerCase()` 而未先確認型別。
- `redirect_content` 可能包含 `+`、`/`、`=`, `?`, `&`, `%` 或長 payment payload；必須依賴 Vue Router 正常 query encoding/decoding，不能手動 encode/decode 第二次。
- payload 很長時，沿用 `qrcode.vue` 既有 error correction/render 規則；若 library 明確拋出容量錯誤，記錄原始 payload 長度與錯誤後回報，不得自行截斷。
- popup 被瀏覽器阻擋時，沿用既有 game dialog fallback；本需求不改這條路徑。
- 未登入者直接開 QR URL：既有 route 沒有 `needAuth`，本需求維持相同行為，不新增 auth gate。
- 未知 channel 沒有 logo 屬預期，不是錯誤；QR 必須仍可見、可掃描。
- 若 template 已有 route name 但 path 不是 `/deposit-qr-code`（或反之），這是 route contract conflict；停止實作、回報並先更新 spec。
- repo 目前沒有 `DESIGN.md`；視覺沿用現有 DepositQRCode pattern，不新增設計系統或品牌視覺。

## 測試計畫

> repo `package.json` 沒有 test script，也沒有 Vitest/Jest。依專案規則，仍需寫測試驗證，但不得為此引入新測試 framework；臨時測試檔驗證後刪除，不可進 commit；不得執行 `tsc --noEmit`。

### 1. Route helper 臨時單元測試（必做，驗後刪除）

- 為 `src/router/depositQRCodeRoute.ts` 的 pure helper 建立臨時 `src/router/depositQRCodeRoute.spec.ts`，使用 Node `assert`，至少覆蓋：
  1. 空 route list 會補一條 name/path 正確的 shared route。
  2. 已有同名同 path route 時，回傳不重複、既有 component 不被替換。
  3. 重複呼叫 helper 仍只有一條（idempotent）。
  4. 同名異 path、或同 path 異 name 的 conflict 依實作 contract 明確報錯／阻止靜默追加。
- 可用 repo 既有 `ts-node` 執行，不新增 dependency。若直接載入 `.vue` dynamic import 造成 runner 問題，將 route descriptor 與 pure composition helper 分開，使 test 不需執行 component loader；不得為了測試改用字串解析 production source。
- 測試通過後刪除 spec 檔，commit 不含測試檔。

### 2. 靜態全版型驗證

- 以 `rg --files template -g 'routes.ts' | rg '/router/routes\\.ts$'` 確認 28 個 template router 都走 `src/router/routes.ts` 的 shared composition。
- 以 scoped `rg` 確認 repo 只有 5 個 template-local `DepositQRCode` route，另外一條為 shared fallback 定義；不得出現 23 份新增 page。
- 檢查 5 個 local wrapper：不存在 `gcash/maya/qrph` rendering allowlist，type 3 + non-empty content 不依賴 channel。

### 3. Browser / DOM 驗證（Chrome extension）

- 依專案規則，所有 URL 都用 Chrome extension 開啟，不使用 in-app browser。
- 缺 route 代表：DOBT dev (`bmm_set_obtd`) 部署後，以 QA 帳號登入，再走一次真實 KITAPAY 存款；不得把帳密寫進 spec、程式、測試或 commit。
- 在新開的 `/deposit-qr-code?...` 頁確認：
  - `channel=` 空字串仍有 QR `<svg>`，不是全白頁。
  - DOM 沒有空 `src` 或 broken channel `<img>`。
  - 用 QR reader 掃描，結果逐字等於 API response 的 `redirect_content`。
  - DevTools Network 沒有把 `redirect_content` 當圖片／頁面再請求。
- 既有 route 代表：至少抽驗 `okbet` 或 `set_r024`，以 type 3 + `channel=qris` 與 type 3 + `channel=gcash` 各一次，確認未知 channel 可顯示、既有 channel/logo 不回歸。
- 以 desktop 與 360px mobile viewport 各確認一次 QR 不超出 viewport，頁面可讀；記錄 tenant、breakpoint、平台與實測 payload 類型（不要記錄敏感完整 payload）。
- 若尚未部署到 dev，先完成 local/static verification，將 DOBT 真實 API 驗證明確標為「待部署後驗證」，不得宣稱已完成 end-to-end。

### 4. Targeted validation

- 對所有 touched `.ts` / `.vue` 跑 targeted Prettier check。
- 對所有 touched `.ts` / `.vue` 跑 targeted ESLint；只回報本次新增的 blocking error，不主動清理無關既有 warning。
- 跑 `git --no-pager diff --check`。
- 確認 `git status --short` 不含臨時測試、帳密、local environment 或無關檔案；既有使用者修改必須保留且不得納入本次 commit。

## Git Flow

- 基底分支：`main`。
- 工作分支名稱：`fix/gsi-70-deposit-qrcode-all-templates`。
- 實作者開始前：
  1. 保留目前工作樹的使用者修改，不得覆蓋或帶入本 feature。
  2. 先切到 `main`；拉取前用 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` 非互動確認 HTTPS token / Keychain 可用，失敗即停止回報，不改 SSH。
  3. 更新最新 `main`，再從它建立並切換到 `fix/gsi-70-deposit-qrcode-all-templates`。
  4. 未切到上述工作分支前不得開始實作；不可直接在 `main`、`develop`、`staging`、`tunnel` 或其他共享／既有工作分支修改。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（正式），每階段測試通過後才可進下一關，不得跳關。
- 每一次 commit 都必須先取得使用者針對該次 commit 的明確確認；本次「先 spec」不構成 commit 授權。
- 合併進任何分支前都必須再次取得使用者明確確認；衝突時停止／abort 並回報，不自行解 conflict 或改 merge strategy。
- 不預設 rebase，不主動把 develop/staging/main 合回工作分支。
- 不主動開 MR/PR；push 後只提供 GitLab 回傳連結，由使用者決定。
- merge 到 develop/staging/main 不等於發版。只有使用者明確說「發版／release」才可執行 `yarn deploy` 或 `yarn deploy:all`；全版型正式發版才使用 `yarn deploy:all`。

## 交接備註給實作者

- 先依 Git Flow 從最新 `main` 建立 `fix/gsi-70-deposit-qrcode-all-templates`，再讀本 spec 實作。
- 建議順序：pure route helper + 臨時測試 → shared fallback page → common QR query/logo hardening → 5 個 local gate 調整 → response type → targeted checks → browser smoke test。
- 實作前重新用 scoped `rg` 確認 template 數與既有 route 清單；本 spec 的 repo 快照為 2026-07-14、專案 commit `7c8a2f812`。若 main 已新增 template 或 route，更新清單與驗收矩陣後再繼續。
- 現有工作樹曾看到與本需求無關的 `src/common/composables/useAgentReport.ts` 修改；必須保留、不格式化、不 review、不納入 GSI-70 diff/commit。
- 若發現 shared fallback 無法保留既有 5 個 local styles、或 Vue Router 對 route conflict 的行為與本 spec 假設不符，先回報並更新 spec，不得退回大量複製 23 份 page。
- 完成後 reviewer 必須依「驗收條件」逐條 review；任何需求變更先改 spec，再改 code。
