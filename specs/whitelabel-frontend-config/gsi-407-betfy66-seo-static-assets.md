# GSI-407 Betfy66 SEO 靜態資產更新

> 交接合約：實作者依此 spec 實作，reviewer 逐條對照「驗收條件」review。
> 狀態：Ready for implementation。原則是照商戶附件的明確要求與文案實作，不由開發端重新設計 SEO 策略。

## 背景 / 目標

- Jira：[GSI-407](https://gamingsoft.atlassian.net/browse/GSI-407)「[需求 會員端] Betfy66站點sitemap檔案更新」。
- 對象：Betfy66，master `BF6M`、agent `BF61`、legacy member-side multiverse。
- 商戶要求依 `Betfy66_Technical_SEO_Checklist.pdf` 實作，再依 `Betfy66_Checklist_Status.pdf` 驗收。
- 本 spec 只負責 `whitelabel-frontend-config` 中 BF61 的站點專屬 SEO 靜態資產，統一 canonical domain、robots、sitemap、AMP 與全站共用 structured data。
- 「每個 SPA route 的唯一 title / description / canonical」及「不執行 JavaScript 也能讀到 H1 與正文」由另一份會員端 spec 負責：
  - `~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-407-betfy66-crawlable-route-seo.md`

## 需求來源與優先序

1. 使用者提供的 BF61 網域清單：
   - `https://bf61.gpsriowdl.com/`
   - `https://betfy66.com/`
   - `https://betfy66.net/`
   - `https://betfy66.org/`
2. Jira GSI-407 的描述與附件角色：
   - `Betfy66_Technical_SEO_Checklist.pdf`：實作要求。
   - `Betfy66_Checklist_Status.pdf`：實作後驗收清單。
3. 商戶提供的明確 title / description 文案。
4. 本 repo 的 BF61 既有 SEO 檔案與命名慣例。

發生衝突時，商戶明確提供的欄位值優先於同一附件的一般建議；不可自行改寫印尼文文案或猜測 URL。

## 已確認實作原則

- **Primary canonical domain**：使用商戶文件指定的 `https://betfy66.com`。
- **其他入口網域**：`bf61.gpsriowdl.com`、`betfy66.net`、`betfy66.org` 仍可提供 BF61 網站，但 SEO canonical 必須指向 `.com` 的相同 route；不得各自建立一套重複 sitemap。
- **商戶文案原樣使用**：明確提供的文案優先，不由開發者改寫。已知但不阻擋實作：
  - Homepage title 62 字元，超過文件寫的 `≤ 60`。
  - Homepage / Live Casino / Sportsbook description 分別約 173 / 134 / 117 字元，不全符合文件寫的 140–155。
- **favicon 維持原狀（使用者 2026-07-30 決議）**：`production/BF6M/whitelabel_gsi_platform_multiverse/BF61/amp.html` 原本有一筆未提交修改移除了 favicon `<link rel="icon" href="/favicon.ico">`。使用者指示 favicon 不要改掉，該行已還原，amp.html 的 diff 只包含本需求的 SEO 變更。
- **不改動 favicon 相關資產**：`favicon.ico`、`favicon.svg`、`favicon-96x96.png`、`apple-touch-icon.png`、`site.webmanifest` 及 `head_inject_extensions.html` 內的 favicon / manifest `<link>` 一律不動。

## 範圍

### 1. 統一 BF61 SEO 靜態資產的 canonical domain

僅修改：

- `production/BF6M/whitelabel_gsi_platform_multiverse/BF61/head_inject_extensions.html`
- `production/BF6M/whitelabel_gsi_platform_multiverse/BF61/robots.txt`
- `production/BF6M/whitelabel_gsi_platform_multiverse/BF61/sitemap.xml`
- `production/BF6M/whitelabel_gsi_platform_multiverse/BF61/amp.html`

以 `https://betfy66.com` 為 primary canonical：

- 保留／統一 JSON-LD `@id` / `url` / `publisher`、robots sitemap、sitemap `<loc>`、AMP canonical / Open Graph URL / 頁面內部連結的 `.com` 網址。
- 不將 canonical SEO 欄位改成 `.net`、`.org` 或 `bf61.gpsriowdl.com`。
- 從任一 BF61 入口網域開啟相同 route 時，canonical 都必須指向 `https://betfy66.com/<same-route>`。
- `head_inject_extensions.html` 內既有的 homepage `amphtml`、canonical、`og:url` 是 route-specific tag，不做 domain 置換，而是依下一節移除。
- 第三方資產網址（例如 `wowdata.gpsriowdl.com`、AMP CDN、社群網址）不可因此改動。

### 2. 更新 head injection 的全站共用 SEO 資訊

- 保留現有 favicon、manifest、robots、Organization / WebSite JSON-LD 結構。
- domain 欄位必須與正式 canonical domain 一致。
- `Organization.logo` 必須沿用已核准的現有資產，不可自行換圖。
- 最終目標是移除以下 route-specific homepage tag，改由會員端 prerender 逐 route 產生：
  - `<link rel="amphtml" href="...">`
  - `<link rel="canonical" href="...">`
  - `<meta property="og:url" content="...">`
- **但本批不得移除（使用者 2026-07-30 review 決議）**：會員端目前沒有任何 per-route head / prerender 實作，這三個 tag 一旦在 config 先移除，BF61 全站會直接失去 canonical / amphtml / og:url。已還原這三行，`head_inject_extensions.html` 本次 diff 為空。
- 移除時機：等會員端能依 domain 與 route 產生正確標籤後，兩邊同批上線再一起移除。在那之前這三個 tag 維持現況（指向 homepage），寧可 category route 的 canonical 不精確，也不要整站沒有 canonical。
- 不在這個靜態檔硬寫任何 route 的 title 或 description；同一 SPA shell 會供多個 route 使用，硬寫會造成重複 title。
- route-specific head 由會員端 prerender spec 產生；homepage prerender 才加入指向 `/amp.html` 的 `amphtml`。

### 3. 更新 robots.txt

- 保留既有 `Allow: /`。
- 保留 private / transactional / game launcher 的既有 `Disallow` 規則，除非另有明確需求。
- `Sitemap:` 必須指向正式 canonical domain 的 `/sitemap.xml`。
- 不新增 `noindex`（robots.txt 本身亦不應用 `noindex` 作為規則）。

### 4. 更新 sitemap.xml

- 保留 XML `<urlset>` 格式。
- 所有 `<loc>` 必須使用正式 canonical domain。
- 只收錄公開、可索引、實際回應成功且具有 self-canonical 的頁面。
- 不收錄：
  - `/member/`、`/auth/`、`/quickPass/`、`/forgotPass`
  - deposit / maintenance / proxy 類 private route
  - `/gameLobby/` login-gated routes
  - register / login modal 或 query-string URL
- 已於 2026-07-30 對 member-side router 逐一驗證，結果如下（不可再照抄舊 sitemap）。

**驗證結果：分類頁必須用數字 gameType**

- Route 定義為 `productLobby/:gameType`：`template/okbet/router/routes.ts:26`
- `:gameType` 以 `Number(route.params.gameType)` 解析：`template/okbet/pages/ProductLobby/Index.vue:108`
- 非法值由 `useProductLobbyRouteGuard` `router.replace` 成 slots：`src/common/hooks/useProviderLobbyRouteGuards.ts:30`
- `GAME_TYPE.FrontendKey`（`slots` / `casino` / …）只用於 UI 與 i18n，未被任何 router 使用：`src/common/utils/constants/gameType.ts:50`
- 因此舊 sitemap 的 `/productLobby/slots` 等語意路徑全部是 client-side redirect，不得收錄。
- 決議（使用者 2026-07-30 拍板）：sitemap 與 canonical 一律改用數字路徑，不修改 shared okbet 程式碼去支援語意路徑。

**驗證結果 2：GameOpen 分類頁仍會自動跳轉，不可收錄**

- `GAME_TYPE.Category` 把 SLOT(1)、P2P(7)、FISHING(8)、OTHER(9)、POKER(12) 標為 `GameOpen`：`src/common/utils/constants/gameType.ts:75`
- `useRedirectGameOpenProductLobby` 對 `GameOpen` 類型在 productList 載入後 `router.replace` 到第一個供應商的 GameLobby：`src/common/composables/useRedirectGameOpenProductLobby.ts:13`
- 因此 `/productLobby/1`（slots）與 `/productLobby/8`（fishing）即使 gameType 合法，仍不是最終網址，**不得放進 sitemap**（使用者 2026-07-30 review 指出，已移除）。
- 只有 `Category === LobbyOpen` 的分類頁是穩定落地頁。
- 待辦：若商戶要求 Slot / Fishing 有可索引的分類頁，需另行確認正式站最終落點，或做一個不會自動跳轉的 SEO 分類頁；屬會員端 spec 範圍。

**收錄清單**

  - `/`
  - `/productLobby/2`（live casino，LobbyOpen）
  - `/productLobby/13`（casino premium，LobbyOpen）
  - `/productLobby/3`（sports，LobbyOpen）
  - `/productLobby/11`（esport，LobbyOpen）
  - `/productLobby/5`（lottery，LobbyOpen）
  - `/lobby`
  - `/promotion`
  - `/news`
  - `/info-center`
  - `/announcementCenter`
  - `/download`
  - `/ContactUs`
  - `/webInformation/AboutUs`
  - `/webInformation/TermAndCondition`
  - `/webInformation/PrivacyPolicy`
  - `/webInformation/ResponsibleGaming`

**已移除**

- `/collaboration`：router 上為 `needAuth: true`（`template/okbet/router/routes.ts:118`），屬登入後才可存取，依本節規則不得收錄。
- 移除任何 redirect、404、登入後才能存取、`noindex`、或 canonical 指到別處的 URL。
- `<lastmod>` 必須反映該 URL 的實際內容更新日期；不可把所有頁面無依據地填成實作日。
- `changefreq` / `priority` 可保留既有值，但不得把它們當成 Google 一定照做的 crawl 指令。

### 5. 更新 AMP 靜態頁

- 不可直接以附件 `index (1).html` 整檔覆蓋：
  - 該附件其實是 AMP landing page，不是 XML sitemap。
  - 它與目前 `amp.html` 幾乎相同，但仍帶著 2025 年份與舊版 title / description。
- canonical、OG、JSON-LD、SearchAction target 及所有 BF61 內部 CTA / navigation 連結使用正式 canonical domain。
- 首頁 title 與 description 使用商戶核准文案：
  - Title：`Betfy66 - Situs Slot Online & Sportsbook Resmi Terpercaya 2026`
  - Description：`Betfy66 situs slot online & sportsbook resmi terpercaya. Main slot, live casino, sportsbook & lottery dengan akses cepat, withdraw mudah, dan bonus menarik. Daftar sekarang!`
- 全頁只能有一個 `<h1>`，且 H1 文字本身必須包含 `Betfy66`；不可只在 H1 外的 badge 顯示品牌。
- 年份不得停留在附件中的 `2025`（含 footer copyright）。
- 保留原有可見印尼文內容與 AMP 結構，除非商戶提供新版正文。
- 內部連結必須指向實際存在且公開的 route（使用者 2026-07-30 核准一併修正）。已修正的錯誤連結：
  - `/promosi` ×2 → `/promotion`（router 上沒有 `promosi`）
  - `/slots` → `/productLobby/1`（router 上沒有 `/slots`）
  - `/gameLobby/1/1006`（Slots 卡片）→ `/productLobby/1`；原連結少一個 param，會被 `useGameLobbyRouteGuard` 導走
  - Memancing 卡片 `/productLobby/11`（esport）→ `/productLobby/8`（fishing）
- **未修、待商戶決定**：Referral 促銷卡的 `/referral` CTA。曾改成 `/?action=register` 以避開 `needAuth: true`，但按鈕文字是「Bagikan Link（分享連結）」，導向註冊與文字不符（使用者 2026-07-30 review 指出），已還原為 `/referral`。請商戶決定：改成註冊文案，或整個移除此 CTA。在商戶回覆前不自行改寫印尼文文案。
- AMP 頁的 CTA 可以指向 `GameOpen` 分類頁（`/productLobby/1`、`/8`）：對真人使用者而言自動進入 GameLobby 是 app 既有且正常的動線，與 sitemap 的收錄標準不同。

## Out of scope

- 不在本 repo 實作 SSR、Nuxt、Quasar SSR、Rendertron 或通用 prerender framework。
- 不修改 legacy member app 的 shared `template/okbet`。
- 不建立或修改 staging / NX 設定；Jira 指向的現況是 production legacy BF61。若要同步 staging / NX，先另行確認。
- 不設定四個網域之間的 301 redirect、CDN、DNS、reverse proxy 或 edge rule；這是基礎設施工作。
- 不登入或操作 Google Search Console；sitemap re-submit 與 request indexing 由有權限的人員在上線後執行。
- 不新增未經商戶核准的印尼文 title、description、H1 或正文。
- 不做無關格式化、key 重排或其他站點 SEO 清理。

## 受影響範圍

- 端別：會員端部署設定。
- Repo：`whitelabel-frontend-config`。
- Site scope：production `BF6M/BF61` only。
- `siteKey` 雖為 `okbet`，本 spec 只改 BF61 站點目錄，不改 shared defaults。
- 直接編輯上述四個 site-local 檔案不影響其他 agent/site。

## 參考實作 / 現有 pattern

- BF61 head：`production/BF6M/whitelabel_gsi_platform_multiverse/BF61/head_inject_extensions.html`
- BF61 robots：`production/BF6M/whitelabel_gsi_platform_multiverse/BF61/robots.txt`
- BF61 sitemap：`production/BF6M/whitelabel_gsi_platform_multiverse/BF61/sitemap.xml`
- BF61 AMP：`production/BF6M/whitelabel_gsi_platform_multiverse/BF61/amp.html`
- Git history：
  - `be2014f` — `feat: add Betfy66 SEO static files`
  - `1cbb9d5` — `feat: update Betfy66 SEO and AMP files`
- 不以 RUE1 為主要範本；其 SEO head 有多 canonical 等舊問題。優先延續 BF61 自己的結構。

## 關鍵決策與理由

- **把附件 HTML 視為 AMP 參考，不是 sitemap**：檔案是 `<html amp>` 的完整 landing page，沒有 XML `<urlset>`；Jira 對其「sitemap檔案」稱呼不精確。
- **不整檔複製附件**：避免把 2025 年份與舊 meta 帶回去，只針對需求欄位做最小變更；附件中的 `.com` primary canonical 則應保留。
- **靜態 head 不負責 per-route meta**：同一份 shell 套在所有 SPA route 會違反「每頁 title 唯一」與 self-canonical 要求。
- **shell-wide homepage canonical / amphtml / og:url 暫不移除**：只換 domain 仍會讓所有分類 route 指回首頁，長期要由 prerender 對每個 route 產生正確值。但在會員端 prerender 存在之前先移除，會讓全站連 canonical 都沒有，比 canonical 不精確更糟。因此保留現況，等兩邊能協調上線時再一起處理。
- **登入／註冊不放 sitemap**：目前是首頁 action/modal，不是應被索引的獨立公開內容頁。
- **只改 BF61 production site-local files**：符合單站隔離，避免 shared / cross-site 影響。

## 驗收條件

- [ ] primary canonical domain 為 `https://betfy66.com`，四個目標檔案一致使用。
- [ ] `bf61.gpsriowdl.com`、`.net`、`.org` 不出現在 sitemap `<loc>`、AMP canonical 或 route canonical。
- [ ] 本次 diff 只包含已核准的 BF61 site-local SEO 檔案，沒有其他站點或 shared default 變更。
- [ ] 四個目標檔案的第一方 SEO URL 使用 `.com`；第三方資產網址未被誤改。
- [ ] `robots.txt` 保留 `Allow: /`、既有 private/game exclusions，且 `Sitemap:` 指向正式 canonical domain。
- [ ] `sitemap.xml` 通過 XML parse，所有 `<loc>` 唯一且使用正式 canonical domain。
- [ ] sitemap 每個 URL 都經實際檢查為公開、成功回應、可 index、self-canonical；不含 private、login-gated 或 query/modal URL。
- [ ] sitemap `<lastmod>` 有真實內容更新依據。
- [ ] `head_inject_extensions.html` 未新增任何 `<title>` 或 description；既有 shell-wide canonical / amphtml / `og:url` 在會員端 prerender 就緒前維持原狀（本批 diff 為空）。
- [ ] `head_inject_extensions.html` 保留的 Organization / WebSite JSON-LD domain 與正式 canonical domain 一致。
- [ ] sitemap 不含任何 `GAME_TYPE.Category === GameOpen` 的 `/productLobby/*`（slots=1、p2p=7、fishing=8、other=9、poker=12）。
- [ ] 未來移除 shell-wide canonical / amphtml / `og:url` 時，已與會員端 prerender 同批部署，且每個 prerender route（homepage 含 amphtml）會補回正確且唯一的 route-specific tag。
- [ ] `amp.html` 使用核准的 homepage title / description，年份正確。
- [ ] `amp.html` 恰有一個 H1，且 H1 文字本身含 `Betfy66`。
- [ ] `amp.html` 內部 CTA / navigation 不再跳到非 canonical Betfy66 domain。
- [ ] `amp.html` 通過 AMP validator，且頁面可正常開啟。
- [ ] `amp.html` 的 favicon `<link>` 仍在，本次 diff 不含任何 favicon 增刪。
- [ ] 沒有修改 `site.webmanifest` 或 favicon assets（除非需求另行更新）。

## 邊界情況 / 例外

- 四個網域可同時提供服務，但 SEO 只使用 `.com` canonical；其他入口網域不得在 sitemap 建立重複 URL。
- 從任一入口網域開啟 route 時，canonical path 必須保留相同 route，不可全部指回 `.com` homepage。
- 若某 sitemap URL 只在 JS router 顯示 200 shell，但實際內容不存在、需要登入或 canonical 指向其他頁，視為不可收錄。
- 若 member-side route prerender 尚未上線，category route 即使存在也可能仍不符合商戶的 initial HTML 要求；不得因此宣告整張 GSI-407 已完成。
- 不得先單獨部署移除 shell-wide canonical 的 config；若 coordinated release 無法成立，停止並重新安排 release plan。
- 若工作樹 dirty change 無法安全分離，停止並請使用者處理，不可自行 stash、reset 或覆寫。

## 測試計畫

- 建立暫時性驗證（不可納入 commit）：
  - XML parser 驗證 `sitemap.xml`。
  - 檢查 `<loc>` 重複、domain、private route、`lastmod` 格式。
  - 檢查四個檔案的舊第一方 domain 殘留。
  - 檢查 AMP 的 title、description、H1 數量與品牌字樣。
- 執行：
  - `git --no-pager diff --check`
  - AMP validator（專案或可用 CLI）。
  - 對 sitemap URL 做實際 HTTP / browser 驗證，記錄 status、canonical、robots meta。
- 手動：
  - 開啟 homepage、`/amp.html`、`/robots.txt`、`/sitemap.xml`。
  - 確認 AMP CTA 不跨到舊 domain。
  - 上線後由有權限人員在 Search Console 重新提交 sitemap；這一步不由實作者代做。

## Git Flow

- Repo：`/Users/kenyu/wow/whitelabel-frontend-config`
- 基底分支：`main`。
- 工作分支名稱：`feat/gsi-407-betfy66-seo-static-assets`
- 目前本機 `main` 落後 `origin/main` 11 commits；實作者開始前：
  1. 先處理／確認與 `amp.html` 重疊的使用者 dirty change。
  2. 依 repo 規則先做非互動 HTTPS auth probe。
  3. 更新本機 `main`，再從最新 `main` 建立工作分支。
- 推進路徑：工作分支 → `develop` → `staging` → `main`，每階段測試通過才進下一關。
- Commit 前需取得使用者針對該次提交的明確確認。
- 合併到任何分支前需使用者確認；發生 conflict 時停止，不自行解。

## 交接備註給實作者

- 依「已確認實作原則」直接實作，不重新討論商戶已提供的文案或字數。
- 只做 BF61 site-local 變更。
- 不可把附件 `index (1).html` 當 sitemap 或直接覆蓋 `amp.html`。
- 本 spec 完成不等於 GSI-407 的 crawlability 要求完成；需與會員端 spec 一起驗收。
