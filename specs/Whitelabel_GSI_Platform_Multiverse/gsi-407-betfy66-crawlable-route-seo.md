# GSI-407 Betfy66 可爬取路由 SEO

> 交接合約：實作者依此 spec 實作，reviewer 逐條對照「驗收條件」review。
> 狀態：Ready for technical implementation。照商戶明確要求實作，所有 shared-code 變更必須以 BF61 guard 或 BF61 專屬 artifact 隔離；商戶未提供的正文／meta 仍須補齊後才能完成最終驗收。

## 背景 / 目標

- Jira：[GSI-407](https://gamingsoft.atlassian.net/browse/GSI-407)。
- 商戶的最高優先級不是只有 sitemap，而是：
  1. Homepage 與重要分類頁的 H1、段落、清單直接存在於 initial HTML response。
  2. Googlebot 不執行 JavaScript 也能讀到主內容。
  3. 各重要頁有唯一 title、description、self-referencing canonical 與一個含 `Betfy66` 的 H1。
  4. Homepage 有 300–500 words；分類頁各有 200–300 words 的獨特可見內容。
- 現況是 Quasar SPA。瀏覽器執行 JavaScript 後可看到首頁 H1/文字，但 initial HTML 是共用 shell；這正是商戶 audit 把 Rendering & Content 判為 `AT RISK / FAILED` 的原因。
- 本 spec 負責真正的 route-level SEO 與 initial HTML crawlability；robots / sitemap / AMP 靜態資產由：
  - `~/wow/ai-config/specs/whitelabel-frontend-config/gsi-407-betfy66-seo-static-assets.md`

## 現況證據

- BF61 共用 `template/okbet`，不是獨立 template：
  - `template/okbet/pages/HomePage/Home.vue:216`
- 目前為 SPA build / history router：
  - `quasar.config.js:72`
  - `package.json:8`
- initial shell 只有 generic description，沒有 route title、canonical、OG 或正文：
  - `index.html:69`
- app 啟動後才抓 `/environment.json`，因此 build-time shell 不知道 runtime agent：
  - `src/router/index.ts:36`
- 公開 routes：
  - `template/okbet/router/routes.ts:5`
- 現有 `usePageTitle` 是 client-side query-string title 功能，不是 SEO route map：
  - `src/common/composables/usePageTitle.ts:21`
  - `src/common/composables/useInit.ts:126`
- Homepage 有 client-rendered H1：
  - `template/okbet/pages/HomePage/Home.vue:161`
- Product / Game lobby 目前只有 H3：
  - `template/okbet/pages/ProductLobby/Index.vue:7`
  - `template/okbet/pages/GameLobby/Index.vue:8`
- Promotion / News / CMS detail 主要由 client/API 取得，不在 initial response：
  - `template/okbet/pages/HomePage/Promotion.vue:25`
  - `template/okbet/pages/HomePage/News.vue:10`
  - `template/okbet/pages/HomePage/CmsHome.vue:2`

## 已確認原則與待補素材

- **Shared-code 原則**：可以為完成需求修改 shared template / build code，但結果必須嚴格限定 BF61；不得改變其他 okbet agents 的 HTML、meta、內容或部署產物。
- **Primary canonical domain**：固定使用 `https://betfy66.com`，與 Jira、商戶 PDF、AMP 與 config spec 一致。
- **BF61 入口網域**：`bf61.gpsriowdl.com`、`betfy66.com`、`betfy66.net`、`betfy66.org` 都會載入 BF61；不論由哪個入口進站，route canonical 都指向 `.com` 的相同 route。
- **Homepage 正文**：從商戶提供的 AMP HTML 既有印尼文內容取用並整理成 300–500 words，不新增未出現在商戶素材中的宣稱。
- **待補 category 正文**：Slot、Live Casino、Sportsbook、Promotions 的 200–300 words 核准正文未提供。技術結構可先實作，但最終驗收前必須由商戶補素材；開發者或 agent 不自行撰寫／翻譯。
- **待補 meta descriptions**：PDF 只提供 Homepage、Slot、Live Casino、Sportsbook；Promotions 與 Register/Login description 必須由商戶補充。
- **文案長度衝突**：直接使用商戶明確提供的 title / description，不因一般字數建議而改寫。
- **Register / Login**：依商戶要求套用提供的 title；目前仍是 homepage modal/action，所以不放 sitemap，canonical 回 homepage。若商戶之後提供獨立 route 與正文，再另行改成可索引頁。

## 範圍

### 1. BF61 專屬 initial HTML 產物

- 目標是讓指定 route 的 HTTP initial response 已包含該頁的：
  - `<title>`
  - `<meta name="description">`
  - `<link rel="canonical">`
  - Open Graph / Twitter 對應欄位
  - 恰好一個含 `Betfy66` 的 `<h1>`
  - 核准後的可見正文與 H2 結構
- 驗收不能只看 `Inspect Element` 或 Vue mount 後 DOM。
- 採用 **BF61 / canonical-domain 專屬的 prerender 或 edge-rendered artifact**，不得把整個 shared okbet app 直接改成通用 SSR。
- 產物選擇必須發生在 build/deploy 或 server/edge 層，讓 initial request 在 JavaScript 執行前已取得 BF61 專屬 HTML。
- 若現有部署流程無法針對 BF61 選擇獨立 artifact，先停止並更新 spec／拆 infra ticket，不得以 client-side meta 冒充完成。

### 2. Route SEO map

先支援商戶清單中有明確要求的公開頁：

| 頁面 | Route（已於 2026-07-30 依 router 驗證） | Title |
|---|---|---|
| Homepage | `/` | `Betfy66 - Situs Slot Online & Sportsbook Resmi Terpercaya 2026` |
| Slot | `/productLobby/1` **⚠ 目前會自動跳轉，需另解** | `Slot Online Betfy66 - Provider Terbaik & RTP Tinggi` |
| Live Casino | `/productLobby/2` | `Live Casino Betfy66 - Dealer Asli & Provider Premium` |
| Sportsbook | `/productLobby/3` | `Sportsbook Betfy66 - Odds Terbaik Sepakbola, NBA & Esports` |
| Promotions | `/promotion` | `Promo & Bonus Betfy66 Terbaru - Klaim Sekarang` |
| Register / Login action | 實作時依既有 `action` query 驗證 | `Daftar Betfy66 - Buat Akun Slot Online Resmi` |

- **route 驗證結論**：`productLobby/:gameType` 的 `:gameType` 由 `Number()` 解析（`template/okbet/pages/ProductLobby/Index.vue:108`），非法值被 `useProductLobbyRouteGuard` replace 回 slots（`src/common/hooks/useProviderLobbyRouteGuards.ts:30`）。`GAME_TYPE.FrontendKey` 的語意字串未被 router 使用，因此 `/productLobby/slots` 等路徑無效。
- 使用者 2026-07-30 決議：改用數字路徑，**不**修改 shared okbet router／hook 去支援語意路徑（避免影響其他 okbet agents）。若日後要改回語意 URL，屬另一張跨站 ticket。
- 數字對照（`src/common/utils/constants/gameType.ts`）：slots=1、live casino=2、sports=3、lottery=5、fishing=8、esport=11、casino premium=13。
- **Slot 額外阻礙（2026-07-30 查證）**：`GAME_TYPE.Category` 把 SLOT(1) 標為 `GameOpen`（`src/common/utils/constants/gameType.ts:75`），`useRedirectGameOpenProductLobby` 會在 productList 載入後 `router.replace` 到第一個供應商的 GameLobby（`src/common/composables/useRedirectGameOpenProductLobby.ts:13`）。FISHING(8)、P2P(7)、OTHER(9)、POKER(12) 同理。
  - 因此 `/productLobby/1` 不是穩定落地頁：即使 prerender 出正確 initial HTML，Vue mount 後仍會把使用者與 Googlebot（會執行 JS）帶離該頁，違反本 spec §3「hydrate 後不得刪掉或大幅改寫 prerender 主內容」。
  - 商戶 checklist 的最高優先分類頁正是 Slot，所以這題必須解，可能方向：為 BF61 做一個不自動跳轉的 SEO 分類頁，或以 BF61 guard 關閉該 route 的 auto-redirect。後者屬 shared code 行為變更，需依「Shared-code 原則」嚴格限定 BF61 並做非 BF61 回歸驗證。
  - 在解掉之前，`/productLobby/1` 與 `/productLobby/8` 已從 config spec 的 sitemap 移除。
- 本表 route 與 config spec 的 sitemap 收錄清單必須一致（Slot 解掉自動跳轉後才可加回 sitemap）。
- 每頁 title 唯一並包含 `Betfy66`。
- 每頁 canonical 為 `https://betfy66.com` + 該頁 canonical path，且只有一個 canonical。
- Homepage prerender 另加入唯一的 `<link rel="amphtml" href="<canonical-domain>/amp.html">`；其他 route 不加入 homepage AMP alternate。
- 不把 query、tracking params 或 modal state 放入 canonical。
- description 使用商戶提供／核准的精確文案：

Homepage:

`Betfy66 situs slot online & sportsbook resmi terpercaya. Main slot, live casino, sportsbook & lottery dengan akses cepat, withdraw mudah, dan bonus menarik. Daftar sekarang!`

Slot:

`Main slot online di Betfy66 dengan provider terbaik (Pragmatic, PG Soft, dll). RTP tinggi, jackpot besar, dan bonus new member. Coba sekarang!`

Live Casino:

`Main live casino di Betfy66 dengan dealer asli dari provider premium. Baccarat, Roulette, Blackjack & lainnya. Daftar & main sekarang!`

Sportsbook:

`Pasang taruhan di Sportsbook Betfy66. Odds terbaik untuk sepakbola, basket, esports & lainnya. Withdraw cepat & aman.`

- Promotions description 等 SEO owner 提供後再加入；不可自行翻譯。

### 3. Heading 與可爬取正文

- 每個目標頁恰好一個 H1，H1 文字本身包含 `Betfy66`。
- Homepage：
  - 300–500 words 的獨特、可見、核准印尼文內容。
  - 使用 H2 組織子段落，例如商戶文件提到的「Mengapa Memilih Betfy66?」「Provider di Betfy66」「Cara Daftar Betfy66」，但以核准正文為準。
- Slot / Live Casino / Sportsbook / Promotions：
  - 每頁 200–300 words 的獨特、可見、核准內容。
  - 不得只顯示 game grid / API cards。
- 正文不得用 `display:none`、off-screen、透明字或只放 `<noscript>` 來騙取字數。
- Vue app hydrate / mount 後不得刪掉、重複或大幅改寫 prerender 的主內容。

### 4. Client-side navigation 同步

- 從站內 SPA navigation 切換 route 後，head 與 H1 仍需更新成目標頁內容。
- 可新增 BF61-gated route SEO map / composable，但不得讓其他 okbet agents 套用 BF61 文案或 canonical。
- 不沿用現有 query-string `usePageTitle` 作為唯一 SEO 解法；它可以保留原本功能，但 route SEO 必須有獨立且可測的來源。

### 5. Canonical / indexing

- 重要公開頁不得含 `noindex`。
- private、member、transaction、game-launch、login modal 不列入本 spec 的 indexable routes。
- route canonical、config head、AMP、sitemap、robots 一律使用 primary `.com` domain。
- 本 spec 的 prerender route-specific head 必須與 config spec 移除 shell-wide homepage canonical / amphtml / `og:url` 的變更同批部署，避免短暫缺少 canonical 或產生重複 tag。
- `.net`、`.org` 與技術網域不建立獨立 sitemap；是否永久轉址到 `.com` 屬 infra scope。

## Out of scope

- 不把所有 okbet agents 一次改成 SSR。
- 不做通用 Quasar SSR migration；現有 browser-only code 與 boot 流程需另案評估。
- 不自行建立／改寫印尼文 SEO 文案。
- 不替未列入商戶清單的所有 route 補 SEO 內容。
- 不索引 member、deposit、auth、game launcher 或其他私人／交易頁。
- 不操作 Google Search Console。
- 不修改 Dashboard（代理端）。
- 不順手重構 router、i18n、CMS、template 或非 BF61 UI。

## 受影響範圍

- 端別：會員端 legacy。
- Repo：`Whitelabel_GSI_Platform_Multiverse`。
- Template：shared `template/okbet`，但行為必須嚴格限定 BF61。
- 可能另需 build/deploy/edge repo；一旦確認，先把實際 repo、檔案及 Git Flow 補入本 spec。
- **2026-07-30 查證：per-agent HTML 注入機制不在這兩個 repo 內。** `head_inject_extensions.html` 在 `Whitelabel_GSI_Platform_Multiverse` 全 repo 無任何引用；`tool/build/onlyCode.js` 只做 `quasar build` + 複製 `template/{siteKey}/public` + 備份 `index.html`，沒有 per-agent 或 per-route HTML 產生邏輯。實際把 `whitelabel-frontend-config/production/BF6M/whitelabel_gsi_platform_multiverse/BF61/*` 套進 `dist/spa` 的是部署 pipeline（Jenkins/CDN），兩個 repo 都看不到。
- 因此 §1「BF61 專屬 initial HTML 產物」的先決條件尚未成立：要確認 (a) pipeline 能為 BF61 放置 per-route HTML 檔，以及 (b) web server 對這些路徑是 file-first 而非一律 SPA fallback。這兩點必須由有 pipeline 權限的人確認並補入本 spec，否則依本 spec §1 最後一條與「邊界情況」須先停止並拆 infra ticket。
- 跨站影響：高風險。initial shell 在 runtime env 載入前不知道 agent，不能只靠 Vue 裡的 `agentCode` guard 達成真正 BF61-only initial HTML。

## 參考實作 / 現有 pattern

- BF61 runtime guard：
  - `template/okbet/pages/HomePage/Home.vue:216`
- Router：
  - `template/okbet/router/routes.ts:5`
- 目前 client-side title 功能（只參考既有行為，不視為 SEO 完成）：
  - `src/common/composables/usePageTitle.ts:21`
- 靜態 landing page pattern：
  - `template/set_amuse/public/landingPage/index.html:1`
  - `tool/build/onlyCode.js:62`
- 注意：直接把檔案放入 `template/okbet/public` 會跟著所有 okbet build，不能直接照搬。

## 關鍵決策與理由

- **選 BF61/domain-specific prerender artifact，不做全站 SSR migration**：需求是單站，通用 SSR 會碰 shared router、boot、browser-only code，範圍與風險遠超 GSI-407。
- **HTTP initial response 是驗收真相**：client-side DOM 看得到文字，不代表符合商戶的 View Page Source / no-JS crawlability 要求。
- **route meta 與正文共用同一份 BF61 SEO map / content source**：避免 prerender 與 SPA navigation 顯示不同 title、canonical 或 H1。
- **不把 login/register 當 SEO landing page**：目前只是 modal/action 且缺少獨立內容；索引登入頁也不符合現有 sitemap/robots 邏輯。
- **不自行修正文案長度**：多語文案必須由商戶或 SEO owner 核准。

## 驗收條件

- [ ] `.com` primary canonical、商戶文案原樣使用及 BF61-only 隔離原則已依本 spec 實作。
- [ ] 商戶未提供的 category 正文與 Promotions / Register/Login descriptions 已取得並補入 spec；未補齊前不得宣告整張 GSI-407 完成。
- [ ] BF61 的 `/`、Slot、Live Casino、Sportsbook、Promotions canonical routes 已逐一確認。
- [ ] 對每個目標 route 做不執行 JavaScript 的 HTTP fetch，initial HTML 已包含該頁唯一 title、description、self-canonical、H1 與核准正文。
- [ ] 每個目標 route 恰好一個 canonical，且 domain/path 正確。
- [ ] 由四個 BF61 入口網域分別開啟每個目標 route，canonical 都指向 `https://betfy66.com/<same-route>`。
- [ ] Homepage 恰好一個指向 canonical-domain `/amp.html` 的 amphtml；非 homepage routes 不含該 homepage amphtml。
- [ ] 每個目標 route 恰好一個 H1，H1 文字本身包含 `Betfy66`。
- [ ] Homepage initial HTML 有 300–500 words 的獨特可見正文。
- [ ] 每個分類／Promotions initial HTML 有 200–300 words 的獨特可見正文。
- [ ] 各頁 title / description / H1 /正文不互相重複。
- [ ] SPA navigation 後 head、H1、正文仍與直接開啟該 URL 一致。
- [ ] BF61 的公開重要頁沒有 `noindex`。
- [ ] 至少一個非 BF61 的 okbet agent 經回歸驗證，未出現 Betfy66 文案、`.com` canonical 或新正文。
- [ ] private / auth / member / transaction / game launcher route 未被誤做成 indexable landing page。
- [ ] config static assets spec 的 domain、sitemap、robots、AMP 與本 spec 一致。
- [ ] Google Search Console 的「Test live URL / View crawled page」由有權限人員驗證能看到 H1 與正文（上線後驗收，不由 agent 代操作）。

## 邊界情況 / 例外

- API 暫時失敗時，initial HTML 仍需保留 route 的基礎 SEO 正文，不可退化成空 game grid。
- 帶 query / tracking params 的 URL canonical 回無 query 的 route。
- Vue hydration 不得產生重複 H1、canonical 或 hydration mismatch。
- 找不到 route 或內容已移除時，不得用 homepage 內容回 200 並 self-canonical；需依既有 404 策略處理。
- 若 deployment 只能提供一份 shared okbet shell，這個架構不符合驗收條件；停止並拆出 infra / independent artifact 工作，不可降級宣稱 client meta 已完成。
- config 與 prerender 無法 coordinated release 時不得只上其中一半；先更新 release plan。

## 測試計畫

- Repo 現況沒有既有 unit-test script；不為本需求新增整套 test infrastructure。
- 建立暫時性驗證腳本（驗證後不納入 commit）：
  - 對每個 prerender route 讀 initial HTML。
  - assert title / description / canonical / H1 數量與內容。
  - assert word count。
  - assert BF61 domain，並對非 BF61 artifact 做 negative assertion。
- 最小 repo 驗證：
  - `pnpm exec eslint <touched-files>`
  - `pnpm exec prettier --check <touched-files>`
  - `git --no-pager diff --check`
  - `pnpm run build:onlyCode -- SITE_KEY=okbet VERSION=<version> ENV=<env>`
  - `pnpm run preview`
- 手動：
  - 直接開每個 route。
  - View Page Source（不是只看 Inspect Element）。
  - 關閉 JavaScript後確認 title、H1、正文仍存在且可讀。
  - BF61 與至少一個非 BF61 okbet agent 做對照。

## Git Flow

- 主要 repo：`/Users/kenyu/wow/Whitelabel_GSI_Platform_Multiverse`
- 基底分支：`main`（實作者開始前先依 repo 規則更新）。
- 工作分支名稱：`feat/gsi-407-betfy66-crawlable-route-seo`
- 若另需 build/deploy/edge repo，必須先在本節補上該 repo 的基底與工作分支，不可在未記錄的 shared branch 直接改。
- 推進路徑：工作分支 → `develop` → `staging` → `main`，每階段測試過才進下一關。
- Commit 前需取得使用者針對該次提交的明確確認。
- 合併到任何分支前需使用者確認；發生 conflict 時停止，不自行解。

## 交接備註給實作者

- 可直接開始技術實作；canonical、既有文案、Register/Login 行為及 BF61-only 隔離原則不再重問。
- 商戶未提供的 category 正文與 meta description 是素材依賴，取得後先補入本 spec，再完成對應內容與最終驗收。
- 若只能做到 Vue mount 後更新 meta，回報為「interim client-side improvement」，不得把 initial HTML 驗收項目勾成完成。
- 實作中若發現部署架構無法產 BF61-only artifact，先更新／拆分 spec，再繼續。
