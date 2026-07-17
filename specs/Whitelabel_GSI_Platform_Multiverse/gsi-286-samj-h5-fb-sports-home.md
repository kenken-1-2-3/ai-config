# GSI-286 samj H5 首頁新增 FB 體育入口

> 交接合約：Spec 作者（Codex）產出，指定實作者依此實作，reviewer 對照「驗收條件」逐條 review。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-286-samj-h5-fb-sports-home.md`（版控於 ai-config）。
> 本 spec 只涵蓋 GSI-286；實作者不得依對話記憶或其他站點實作自行擴張需求。

## 背景 / 目標

- 需求來源：[Jira GSI-286](https://gamingsoft.atlassian.net/browse/GSI-286)。
- Jira 標題：`[需求 會員端]日本站H5新增體育產品顯示位置`。
- Jira 狀態：待處理；Priority：High；建立日：2026-07-16。
- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- Jira 環境：正式；總代理 `sam0`；代理 `samj`。
- Repo mapping：`samj` 的站點資源與首頁位於 `template/set_amuse`；repo 沒有 `template/set_sjpn`，Figma 檔名 `set_sjpn--AMUSE-` 對應 AMUSE 日本站設計，不得因此建立新 template。
- 問題：後台已開啟體育產品，但 AMUSE 日本站 H5 首頁沒有體育產品入口。
- 目標：在 H5 首頁新增 `スポーツ競技` 區塊，只顯示 FB Sports；使用者點擊卡片後直接進入 FB Sports 三方畫面，不經 ProductLobby/GameLobby 中介頁。
- 產品識別：沿用 `src/common/utils/fbSportsLaunch.ts` 的 `FB_SPORTS_PRODUCT_CODE`（目前值 `1183`），不得在 template 再寫一份 magic number。

## 設計來源與量測

### Figma source of truth

- 完整手機稿與 Jira 設計入口：[mobile `1385:1946`](https://www.figma.com/design/FjtDYDQ0KmLsAjJpheuHKI/set_sjpn--AMUSE-?node-id=1385-1946)。
- 使用者指定的標題節點：[title `2589:8453`](https://www.figma.com/design/FjtDYDQ0KmLsAjJpheuHKI/set_sjpn--AMUSE-?node-id=2589-8453)。
- 使用者指定的 FB Sports 卡片：[card `2589:8473`](https://www.figma.com/design/FjtDYDQ0KmLsAjJpheuHKI/set_sjpn--AMUSE-?node-id=2589-8473)。
- 使用者指定的背景／現況參考：[image `1385:1948`](https://www.figma.com/design/FjtDYDQ0KmLsAjJpheuHKI/set_sjpn--AMUSE-?node-id=1385-1948)。
- `template/set_amuse` 目前沒有 `DESIGN.md`；本需求的視覺值以以上 Figma 節點為準，既有 AMUSE 首頁 pattern 次之。
- MCP asset URL 為短效連結，不得直接寫進 production code。實作者須從 Figma `2589:8473` 匯出穩定的 site-local asset。

### 386px Figma 基準畫布

- 完整 frame：`386 × 1209px`。
- 區塊順序在目標相鄰範圍為：`スポーツ競技` → FB Sports 卡片 → `カジノ/ライブ`。
- 標題 frame `2589:8453`：
  - 位置：`x=5, y=513`；尺寸：`367 × 55px`。
  - padding：`10px`。
  - 下框：`1px solid rgba(255, 255, 255, 0.2)`。
  - 文字：`スポーツ競技`，Noto Sans JP/TC Medium（專案可用字型家族中以既有 AMUSE Noto Sans 為準），`24px`、medium、白色 `#FFFFFF`、Figma normal line-height；量測文字框約 `144 × 35px`。
- 卡片 group `2589:8473`：
  - 位置：`x=20, y=588`；尺寸約 `179.469 × 120px`；左對齊，不置中、不撐滿整列。
  - 卡片圓角 `13px`，外框 `1px solid #FDEABC`。
  - 背景圖上有 `rgba(0, 0, 0, 0.6)` 深色遮罩與 Figma 原有的底部色彩／mask 效果。
  - 陰影：`0 0 3.85px rgba(0, 0, 0, 0.5)`。
  - FB SPORTS logo 約 `125.31 × 42.48px`，位於卡片內 `x≈27.08, y≈36.64`，視覺置中。
  - 標題 frame 底部到卡片頂部為 `20px`；卡片底部到下一個 `カジノ/ライブ` 標題頂部為 `24px`。
- 不得把 Figma 的 `24px`、`13px`、`20px`、`24px` 等值近似成既有 spacing/font utility；必要時使用專案既有的 Tailwind arbitrary values 或 scoped Sass 精確值。
- 其他 H5 寬度需保持相同左對齊與 179.469:120 比例；386px 基準維持約 `179.469 × 120px`，較寬 H5 則放大至接近相鄰兩欄卡片的半欄寬，不置中、不滿寬、不溢出。

## 現況與研究結論

### AMUSE 首頁

- 目標頁：`template/set_amuse/pages/HomePage/Home.vue`。
- 現有順序為 Popular → SLOT → LIVE → RankBoard；GSI-286 不移除、不重排 Popular/SLOT/LIVE/RankBoard。
- 使用者已確認新增體育區塊應插在現有 LIVE block 後；實際完整順序是 Popular → SLOT → LIVE → Sports → RankBoard。
- 現有 H5 判斷是 `$q.screen.width < 768` 的 `isMobile` computed；本需求沿用相同 breakpoint，不另創第二套 media query。
- 現有首頁與 ProductLobby launch 都沿用 `useGame().openGame()`；AMUSE 入口固定傳 `LANGUAGE_CODE.Enums.en`。
- 首頁已掛載 `CurrencySupportDialog`、`LaunchGameDialog`、`CryptoWalletDialog`，不需新增第二份 dialog。

### Product list 狀態隔離

- 現有 Home 透過 `getProducts(GAME_TYPE.Enums.LIVECASINO)` 把真人產品存入全域 `productState.list`，LIVE block 直接 render 該 list。
- 再呼叫 `getProducts(GAME_TYPE.Enums.SPORTBOOK)` 會覆寫同一份 `productState.list`，造成真人產品消失或競態；此方案禁止使用。
- Home 應直接使用既有 `getProductList` API wrapper 與 `useApi` 讀取 SPORTBOOK list，並把結果存於頁面 local ref；不得寫入 `productStore`。
- availability request 必須明確送出 `game_type_id: GAME_TYPE.Enums.SPORTBOOK`；單純載入 FB Sports availability 不得改變目前 game type 或干擾 LIVE block。
- SPORTBOOK query 只用於判斷後台是否開放 FB Sports 與取得 API 回傳的 `integration_id` / `product_code`；卡片視覺使用 Figma site-local asset，不依賴 API 圖片欄位。

### Launch 行為

- `useGame().openGame()` 建立 payload 時實際讀 `gameTypeState.using`，不是只相信函式傳入的 `game_type_id`。
- 點擊 FB Sports 前必須先 `setGameTypeUsing(GAME_TYPE.Enums.SPORTBOOK)`，再以 API product 的 `integration_id` / `product_code` 呼叫現有 `openGame()`。
- launch 參數需維持：空 `game_code`、game type SPORTBOOK、`pup=false`、currency 交由既有流程、language `LANGUAGE_CODE.Enums.en`。
- 不得直接組 launch URL、呼叫 `window.open`、複製 `useFBSportsGame`、嵌入 `FBSportsArea` iframe，或繞過既有 login/currency/wallet/error/dialog handling。

## 範圍

1. 在 `template/set_amuse/pages/HomePage/Home.vue` 加入 H5-only Sports section：
   - 放在現有 LIVE block 之前。
   - 只有 `isMobile === true` 且 SPORTBOOK API list 包含 `FB_SPORTS_PRODUCT_CODE` 時 render。
   - 標題使用 Jira 已提供的精確日文 `スポーツ競技`；直接 hardcode，不新增或猜測 remote i18n key。
   - 不顯示「すべて見る」、產品名稱、play button、favorite button或第二張產品。
   - 整張 FB Sports 卡片為 click target；點擊後直接 launch。
   - Query pending、error、空 list、FB Sports 未啟用時，整個 Sports section 不 render，且既有首頁區塊位置與功能正常。
2. 在同一頁使用獨立 SPORTBOOK product request：
   - 使用既有 `getProductList` API wrapper 與 `useApi`，傳入 `{ game_type_id: GAME_TYPE.Enums.SPORTBOOK }`，結果只存於 Home local ref。
   - 以 computed 找出 `product_code === FB_SPORTS_PRODUCT_CODE` 的 API product。
   - 不呼叫 `getProducts(SPORTBOOK)`，不修改 `productState.list` / `productState.allList`，不新增 API endpoint/type/store。
3. 新增 site-local Figma asset：
   - 建議路徑：`template/set_amuse/assets/images/fb-sports-home.png`（若依既有 asset naming 微調，spec 與 import 必須同步）。
   - 從 Figma node `2589:8473` 匯出完整 composite，使用至少 `720 × 480px` PNG 支援寬 H5 Retina 顯示；不得使用短效 MCP URL、截取整頁、重畫 logo 或用相似素材替代。
   - Production 在 386px viewport 顯示尺寸仍為 Figma 約 `179.469 × 120px`；寬度增加時維持 179.469:120 比例 responsive 放大。
4. 新增專用 click handler：
   - 無 FB product 時立即 return。
   - `setGameTypeUsing(GAME_TYPE.Enums.SPORTBOOK)`。
   - 呼叫既有 `openGame()`，integration/product metadata 取自 API product；language 固定沿用 AMUSE 的 English launch code。
   - 不導向 `ProductLobby` 或 `GameLobby`。

## Out of scope（明確不做）

- 不修改代理端 `Whitelabel_GSI_Dashboard`。
- 不擴大到 `sam0` 其他代理、日本站以外站點、所有 AMUSE-like designs、所有 templates 或 desktop。
- 不建立 `template/set_sjpn`；目標是既有 `template/set_amuse`。
- 不修改 `src/common`、`src/stores`、`src/api`、shared config、shared default、router 或其他 template。
- 不修改共用 `FB_SPORTS_PRODUCT_CODE`、FB Sports launch protocol、guest mode、H5 color、token、wallet、currency、language mapping 或 open mode。
- 不把 Sports 產品寫入現有 LIVE `productState.list`，不重構 Home 的全域 game/product state。
- 不移除或重排 Popular、SLOT、LIVE、RankBoard；Figma mock 未呈現 SLOT 不代表本需求可刪除 SLOT。
- 不新增 Sports lobby、route、view-all link、tab、footer item、sidebar item或 ProductLobby 文案。
- 不調整既有熱門遊戲、SLOT、LIVE 卡片、banner、marquee、footer、背景、首頁整體 spacing 或 desktop layout。
- 不建立或修改 local locale JSON，不自行發明 i18n key；`スポーツ競技` 是需求方提供的精確 copy。
- 不 inspect、修改、格式化或提交 `src/env/environment.json`。
- 不順手清理非阻擋 ESLint warning、imports、舊樣式或其他無關問題。
- 不在本需求內 commit、push、merge、開 MR/PR 或部署；皆需使用者另行明確指示。

## 受影響範圍

- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 目標 runtime：`samj` / AMUSE 日本站 H5。
- 目標 template/siteKey：`template/set_amuse`。
- 預期 production diff：
  - 修改 `template/set_amuse/pages/HomePage/Home.vue`。
  - 新增 `template/set_amuse/assets/images/fb-sports-home.png`（或經 spec 同步確認的等效 site-local asset path）。
- 預期只讀參考：
  - `template/set_amuse/pages/ProductLobby/Index.vue`
  - `template/set_amuse/assets/css/game.sass`
  - `src/common/composables/useProviderLobby.ts`
  - `src/common/composables/useProviderQueries.ts`
  - `src/common/composables/useGame.ts`
  - `src/common/utils/fbSportsLaunch.ts`
  - `template/set_r025/pages/HomePage/Components/HomeFBSports.vue`
- 跨站影響：production code 與 asset 都限制在 `template/set_amuse`；只讀既有 shared API，不修改 shared surface，其他 templates 不應有 diff 或 runtime 行為變化。

## 參考實作 / 要遵循的現有 pattern

1. `template/set_amuse/pages/HomePage/Home.vue`
   - 沿用現有 `isMobile` breakpoint、`setGameTypeUsing`、`openGame`、AMUSE English language code、dialog mounts 與 scoped Sass。
   - 新 section 插在 LIVE block 後、RankBoard 前，不另建 route/page。
2. `template/set_amuse/pages/ProductLobby/Index.vue`
   - 已以 `FB_SPORTS_PRODUCT_CODE` 精確篩選 SPORTBOOK 的 FB Sports，證明 `1183` 是 AMUSE 既有產品識別。
3. `src/api/game.ts` / `src/common/hooks/useApi.ts`
   - 使用既有 `getProductList` wrapper 與 `useApi` 明確送出一次 SPORTBOOK availability request，不新增 endpoint 或重複 request loop。
4. `src/common/composables/useGame.ts`
   - `openGame()` 是正式 launch 入口；呼叫前先設 SPORTBOOK game type，避免 payload 仍使用 LIVECASINO。
5. `template/set_r025/pages/HomePage/Components/HomeFBSports.vue`
   - 只參考「先查 SPORTBOOK list，再依 `FB_SPORTS_PRODUCT_CODE` 決定是否顯示」的 availability pattern。
   - 不複製其 BBF1 agent guard、整頁 iframe、`FBSportsArea` 或 100vh layout；GSI-286 是可點擊卡片，不是 inline widget。

## 關鍵決策與理由 (Key decisions)

1. **目標 template 是 `set_amuse`，不建立 `set_sjpn`。**
   - Repo 的 samj 專用 public file、AMUSE assets/Home/ProductLobby 都在 `set_amuse`；Figma 檔名不是 repo siteKey。
2. **Sports 放在 LIVE 後、RankBoard 前。**
   - 使用者已明確確認位置為真人視訊後方；此確認取代先前依 Figma 相鄰關係所作的解讀。
   - 不因 mock 未呈現 SLOT 而刪除或重排既有 SLOT；只在 LIVE 後插入 Sports。
3. **H5-only 使用現有 `<768px` 判斷。**
   - Jira 明確限定 H5，Figma 也只有 mobile frame；desktop 無設計與需求，不推測 desktop UI。
4. **availability 來自 API，視覺來自 Figma。**
   - 後台關閉產品時入口必須消失；integration id 也應以 API 為準。
   - 卡片外觀是 site-specific art direction，不應依賴後台 square/wide image 是否恰好與最終 Figma 相同。
5. **使用獨立 local request，不覆寫全域 LIVE product list。**
   - `getProducts()` 只有一份 `productState.list`；同時載入 SPORTBOOK 會造成真人區回歸。
   - 直接沿用既有 API wrapper，把結果存於 Home local ref，無需 shared 改動。
6. **點擊沿用 `openGame()`，但先明確設定 SPORTBOOK。**
   - 可完整保留登入、幣別、錢包、loading、錯誤與第三方開啟策略。
   - `openGame()` payload 目前讀 store 的 `gameTypeState.using`，所以 click handler 的 set 順序是功能必要條件。
7. **`スポーツ競技` 直接使用需求方提供文字。**
   - Repo i18n 由遠端載入，需求未提供 remote key；不得發明 key 或 local locale JSON。

## 驗收條件

> Reviewer 必須逐條判定通過／不通過；需要後台產品或 QA 帳號的項目若尚不可測，明標「待 QA」，不得宣稱全數完成。

- [ ] Production diff 只修改 `template/set_amuse/pages/HomePage/Home.vue` 並新增一個 `template/set_amuse` site-local FB Sports asset；沒有 shared、store、API、router、其他 template 或 environment diff。
- [ ] 386px H5 viewport 且 SPORTBOOK API 包含 `FB_SPORTS_PRODUCT_CODE` 時，首頁在現有 LIVE block 後、RankBoard 前顯示 `スポーツ競技` 與一張 FB Sports 卡片。
- [ ] 既有 Popular、SLOT、LIVE、RankBoard 均保留，資料與點擊功能沒有 regression；完整順序是 Popular → SLOT → LIVE → Sports → RankBoard。
- [ ] `スポーツ競技` 精確顯示需求方文字，沒有 invented `$t(...)` key 或 local locale file。
- [ ] 386px 基準下，標題區、24px medium 白字、1px 半透明下框、20px title-to-card gap、約 179.469×120 卡片、13px 圓角、金色 border、原設計 mask/overlay/shadow/logo 與 24px card-to-LIVE gap，均與 Figma 無明顯差異。
- [ ] 卡片左對齊；在 320、360、375、386px 維持 Figma 基準尺寸，在 390、430、575、695、767px 依半欄寬等比例放大；所有 H5 viewport 都不溢出、不置中、不變成滿寬、不新增第二張產品卡。
- [ ] Figma asset 來自 node `2589:8473`，production code 不含 `figma.com/api/mcp/asset/...` 短效 URL，圖片不模糊、未拉伸、未錯誤裁切。
- [ ] Desktop/tablet width `>=768px` 不 render Sports title/card；若現有 provider query 在 desktop 仍進行背景 cache read，不能產生可見 loading 或 layout 影響，且既有 desktop 首頁不變。
- [ ] SPORTBOOK query pending、失敗、回空 list，或 list 不含 `FB_SPORTS_PRODUCT_CODE` 時，Sports section 完全不 render，不留空白 title/separator/card gap，LIVE 仍正常顯示。
- [ ] SPORTBOOK availability query 不修改 `productState.list`；LIVE 清單仍是 LIVECASINO products，沒有 SPORTBOOK/LIVE 互相覆寫或 request race。
- [ ] SPORTBOOK availability 使用既有 `getProductList` wrapper 明確送出一次 `game_type_id=3` request，沒有新增 endpoint、request/response type、store 欄位或重複請求 loop。
- [ ] 點擊卡片時，先把 game type 設為 `GAME_TYPE.Enums.SPORTBOOK`，再呼叫既有 `openGame()`；launch request 的 `game_type_id` 為 SPORTBOOK (`3`)、`product_code` 為 API FB Sports product (`1183`)、`integration_id` 取 API、`game_code` 為空、language code 沿用 AMUSE English。
- [ ] 點擊後不導向 ProductLobby/GameLobby，也不顯示中介產品頁；launch 成功後直接依現有 open strategy 顯示 FB Sports 三方畫面。
- [ ] 未登入／無幣別／不支援幣別／wallet disabled／launch API error 時，沿用 `openGame()` 既有 login、notification、currency dialog 與 error handling，沒有空 iframe或自行組 URL。
- [ ] 首頁原本的 banner、marquee、favorite、view-all、game launch、LIVE product launch 與三個 shared dialogs 沒有無關 diff或重複 mount。
- [ ] Figma 對照 screenshot 在 386px viewport 完成；回報 screenshot 路徑與仍存在差異。若有 spacing/font/card mismatch，修正後重新截圖，直到「無明顯差異」或明列無法一致的限制。
- [ ] 臨時 test/harness、screenshots、Figma MCP downloads 在 commit 前已刪除或 unstage；commit 不含測試檔、短效 asset、帳密或本機設定。
- [ ] Targeted Prettier/ESLint 與 `git --no-pager diff --check` 通過；未執行 `tsc --noEmit`。

## 邊界情況 / 例外

- API 可能回多個 SPORTBOOK products；只取 `product_code === FB_SPORTS_PRODUCT_CODE`，不顯示其他體育供應商。
- API 可能回 FB Sports 但缺少 `integration_id` 或 metadata 不合法；不得猜 integration id。隱藏入口並記錄 API response，先更新 spec/資料來源再處理。
- Query 在 desktop 不應產生可見副作用；若 composable 本身無法以 H5 enabled condition 延遲 query，可允許 background read，但 desktop DOM/layout 必須完全不變。優先使用 query `enabled` 或 H5 guard，勿為此修改 shared composable。
- `$q.screen.width` 在 resize 跨過 768px 時，section 必須正確出現／消失；不得殘留 gap 或重複 query loop。
- 使用者快速連點卡片時，沿用現有 `openGame` loading/launch behavior；本需求不新增全域 debounce。若實測造成重複視窗，先記錄證據並更新 spec，不擅自改 shared launch。
- Figma 使用 `Noto Sans TC` 標記，但 AMUSE 已含 Noto Sans JP assets；實作須用現有 AMUSE 字型鏈讓日文 glyph 正確，不能為單一標題新增外部字型下載。
- 若 2x composite export 與 Figma screenshot 的 shadow bounds 有裁切差異，先回報並更新本 spec，明列允許新增的 node 子資產後再重建 exact card；在 spec 更新前不得超出「單一 site-local asset」的 production diff，也不得用 CSS 近似替代後靜默驗收。
- 如果需求方確認 Sports 應放在 LIVE 下方而非 Figma 所示 LIVE 前，必須先更新本 spec 的順序、驗收條件與 screenshot reference，再實作；不得只改 code。

## 測試計畫

> Repo `package.json` 沒有 test script，也沒有 Vitest/Jest/Playwright config。依專案規則仍需驗證，但不得為本需求引入測試 framework；臨時 harness 驗證後刪除，不可進 commit。

### 1. 臨時 product/visibility/launch harness

- 用 repo 現有 dependencies 建立臨時、不可提交的 unit-style harness，至少驗證：
  1. H5 + list 含 `1183` → 顯示且 computed 取到正確 API product。
  2. H5 + 空 list／其他 sport product／query error → 不顯示。
  3. desktop + list 含 `1183` → 不顯示。
  4. click handler 在 `openGame` 前先呼叫 `setGameTypeUsing(SPORTBOOK)`，並傳 API integration/product、空 game code、English language。
  5. SPORTS query result 不寫入／覆蓋現有 LIVE `productState.list`。
- 若 mock Vue composable 的成本會迫使 production code 大幅抽取或新增 framework，停止擴張，改用瀏覽器 network stub + Vue runtime inspection；仍須留下可重現步驟與結果。
- 驗證後刪除臨時檔，commit 不含 test/harness。

### 2. H5 browser / Figma 視覺驗證（Chrome extension）

- 所有本機或 QA URL 依專案規則使用 Chrome extension，不使用 in-app browser。
- 使用 set_amuse/samj 可測環境與合法測試帳號；帳密不得寫進 spec、程式、command output 或 commit。
- Viewport 至少測 `320×568`、`360×800`、`386×1209`、`390×844`、`430×932`，並測一個 `>=768px` desktop viewport。
- 在 `386×1209` 截完整首頁及 Sports crop，與 Figma `1385:1946`、`2589:8453`、`2589:8473` 並排比對：位置、尺寸、字型、字級、行高、border、圓角、shadow、mask、logo、裁切與相鄰 section gap。
- 記錄 screenshot 絕對路徑、API 是否含 FB Sports、viewport、登入狀態與差異清單；有差異就修正後重拍。
- 以 network stub 或可控後台資料再驗證「FB Sports 不存在」時 section 無殘留空白；不得為測試改正式後台設定。

### 3. Launch E2E

- 點卡片並在 network/devtools 驗證 launch request：`product_code=1183`、`game_type_id=3`、API integration id、空 game code、H5 platform、AMUSE English language。
- 確認沒有先進 ProductLobby/GameLobby，三方頁依現有策略直接開啟且可正常返回／關閉。
- 至少驗證一次正常 launch；若資料允許，再驗證 currency-not-supported dialog，不得把 QA 資料不足宣稱成通過。

### 4. Targeted static validation

- 對 production touched file 執行：
  - `pnpm exec prettier --check template/set_amuse/pages/HomePage/Home.vue`
  - `pnpm exec eslint template/set_amuse/pages/HomePage/Home.vue`
  - `git --no-pager diff --check`
- ESLint 只處理本次新增且阻擋驗證的 error；不清理無關既有 warning。
- 檢查 `git status --short` 時排除 `src/env/environment.json`，確認只有預期 Vue/asset diff，沒有臨時 screenshot、test、下載檔或無關修改。
- 不執行 `tsc --noEmit`。

## Git Flow

- 基底分支：`main`。
- 工作分支名稱：`feat/gsi-286-samj-h5-fb-sports-home`。
- 實作者開始前：
  1. 保留目前工作樹與其他 repo 的使用者修改，不得覆蓋或帶入本 feature。
  2. 切到 `main`；pull 前先以 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` 非互動確認 HTTPS token / macOS Keychain 可用。失敗時停止回報，不改用 SSH。
  3. 更新最新 `main`，再從它建立並切換到 `feat/gsi-286-samj-h5-fb-sports-home`。
  4. 未切到上述工作分支前不得實作；不可直接在 `main`、`develop`、`staging` 或目前的其他工作分支修改。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（正式），每階段測試通過才可進下一關，不得跳關。
- 每一次 commit 都必須先取得使用者針對該次 commit 的明確確認；本次「研究／寫 spec」不構成 commit 授權。
- 合併進任何分支前都必須再次取得使用者明確確認；有 conflict 時停止/abort 並回報，不自行解 conflict 或改 merge strategy。
- 不預設 rebase，不主動把 develop/staging/main 合回工作分支。
- 不主動開 MR/PR；push 後只提供 GitLab 回傳連結，由使用者決定。
- merge 到環境分支不等於發版；只有使用者明確要求「發版/release」才可執行 `yarn deploy`，並選擇 `set_amuse`。版本接受預設值，最後確認 `y`。

## 交接備註給實作者

- 先從最新 `main` 建立 `feat/gsi-286-samj-h5-fb-sports-home`，再依本 spec 實作。
- 建議順序：匯出 Figma card asset → 建臨時 visibility/launch harness → 加獨立 SPORTBOOK request → 加 H5-only section → 加 dedicated launch handler → targeted checks → Chrome/Figma screenshot comparison → launch E2E → 刪除臨時檔。
- Spec 研究快照：2026-07-17；local `main` / `origin/main` commit `92a02e337`。
- 撰寫 spec 時專案 checkout 位於無關分支 `fix/gsi-257-bcy1-betby-h5`；實作者不可在該分支直接修改 GSI-286。
- ai-config 撰寫前已有其他使用者的 modified/untracked specs；只新增本檔，不得清理、stage 或 commit 那些無關檔案。
- 若 main 在實作前已調整 `Home.vue`、provider query、FB Sports product code、AMUSE launch 或 Figma 設計，先重新對照本 spec 並更新 references/decisions，再開始修改。
- 完成後 reviewer 必須逐條 review「驗收條件」與 Out of scope；任何順序、copy、desktop scope、asset 或 launch contract 變更都先改 spec，再改 code。
