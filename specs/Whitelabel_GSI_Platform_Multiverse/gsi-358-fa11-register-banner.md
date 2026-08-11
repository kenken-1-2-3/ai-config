# GSI-358 Fa11 註冊彈窗新增 Banner

> 交接合約：實作者依此 spec 實作，reviewer 逐條對照「驗收條件」判定通過／不通過。

- 實作專案：
  - `/Users/kenyu/wow/Whitelabel_GSI_Platform_Multiverse`
  - `/Users/kenyu/wow/static-resources`
- 建立日：2026-07-30
- 來源需求：[GSI-358](https://gamingsoft.atlassian.net/browse/GSI-358)
- 關聯需求：[F1G-39](https://gamingsoft.atlassian.net/browse/F1G-39)
- 設計稿：[Figma `okbet_setR022` node `248:21494`](https://www.figma.com/design/D8jQj4Daa2rFIwYHdJfXxs/okbet_setR022?node-id=248-21494&t=ptQ6vxA8mIAyQQ38-1)
- 端別：會員端
- 目標代理：Fa11（runtime `agentCode=fa11`）
- 目標 template：`template/set_r022`
- Frontend config 評估 repo：`/Users/kenyu/wow/whitelabel-frontend-config`

## 背景 / 目標

- 客戶希望在 Fa11 註冊頁最上方顯示 Deposit Bonus Banner，提高玩家註冊意願。
- Jira 已明確要求此功能由前端針對 Fa11 寫死，不能影響其他使用 R022 的客戶。
- Jira 亦明確說明沒有後台圖片配置位置；日後若需要更換圖片，需由技術協助更新。
- F1G-39 最後一則有效需求確認為「把這個 banner 放在註冊頁面的上方」；因此顯示範圍以 register mode 為準。
- Figma 指定 node 畫面本身顯示 login mode，與 Jira/F1G-39 的 register-only 文字不一致。此 spec 以較具體、較晚確認的 Jira 文字決定顯示範圍；Figma 僅作 Banner 尺寸、圓角、裁切與間距的視覺來源。

## 現況與研究結論

1. `template/set_r022/components/Dialog/LoginRegister.vue`
   - 現有 R022 登入／註冊共用 dialog 寬度為 `480px`，左右 padding 各 `40px`，表單可用寬度為 `400px`。
   - Dialog 已透過 route/prop 同步 login/register mode，不需新增 route 或 event。
2. `template/set_r022/components/Form/ModeLoginRegister.vue`
   - Register form 自 line 357 的 `<q-form v-else>` 開始。
   - 註冊自訂欄位位於 `.form-content > .form-container`；Banner 應放在 register `<q-form>` 內、`.form-content` 前方，確保位於所有註冊項目上方且不出現在 login form。
   - 檔案已使用 `useAgentCode()` 與 `useEnv()`，且現有 `envInfo = envData()` 可取得 `VITE_APP_STATIC_RESOURCE_URL`；不需新增 composable、env key 或 asset loader。
3. `src/common/hooks/useAgentCode.ts`
   - 已有 `FA11_AGENTS = ["fa11"]`，並同時 export 兩個以它為來源、行為完全相同的 computed：`isFA11`（line 123）與 `isFA1M`（line 125）。
   - `ModeLoginRegister.vue:567` 既有 destructure 已取用 `isFA1M`，且該檔案現有的 Fa11 專屬分支（line 447、599、600）都以 `isFA1M` 判斷。
   - 因此本需求採用 `isFA1M`，不再另外 destructure 等價的 `isFA11`，避免同一檔案內同時存在兩個同義 boolean。兩者判斷的 agent 清單相同，runtime 行為一致。
   - `checkAgentCode()`（line 80-91）在 `agentCode` 為空字串時 return false，且 `useAgentCode()`（line 96）將 `agentCode` 預設為 `""`，故 guard 冷啟動預設為 false。
   - 本需求不需修改 shared hook，也不需新增 agent whitelist、feature flag 或 frontend config key。
4. `/Users/kenyu/wow/static-resources`
   - Repo 以 `statics/staging/`、`statics/production/` 分隔測試與正式資源，會員端透過 `VITE_APP_STATIC_RESOURCE_URL` 取用。
   - 現有資源目錄沒有 `banner`、`login`、`register` 或 agent-specific 圖片的既有命名慣例；本需求新增最小、可辨識且 agent-isolated 的 `images/banner/fa11/` 路徑。
   - 同一張 Jira 原圖需各放一份：
     - `statics/staging/images/banner/fa11/register-banner-20260723.jpg`
     - `statics/production/images/banner/fa11/register-banner-20260723.jpg`
   - 檔名包含需求圖片日期以避免同 URL 被 CDN/browser cache 留住；日後換圖需新增新檔名並同步更新會員端引用，不覆寫舊檔後沿用相同 URL。
5. `/Users/kenyu/wow/whitelabel-frontend-config`
   - Fa11 已有獨立的 staging / production 目錄：
     - `staging/FA1M/whitelabel_gsi_platform_multiverse/FA11/`
     - `production/FA1M/whitelabel_gsi_platform_multiverse/FA11/`
   - 兩邊 `environment.json` 都只有 `agentCode`、`apiPath`、`baseApi`、`dynamicResourceUrl`、`siteKey`、`staticResourceUrl`、`version`；掃描該 repo 全部 Multiverse `environment.json` 也只有這七種 key，沒有 UI Banner、feature flag 或 agent-specific component asset path 的既有契約。
   - Fa11 目錄現有其他檔案是 `manifest.json`、`head_inject_extensions.html`、`sw.js` 與 PWA icons，服務站點 shell / PWA 用途；沒有會員端 Vue component 透過該 repo 載入固定 UI 圖片的既有 pattern。
   - Fa11 staging 的 `staticResourceUrl` 已是 `/statics/staging`，production 已是 `/statics/production`。現有值可直接解析上述 static-resources 路徑，不需修改任何 config。
6. 設計量測
   - Figma dialog 內容寬度：`400px`。
   - Banner render box：`400px × 112px`。
   - Banner 圓角：`8px`。
   - Header 區塊底部至 Banner 頂部：`20px`。
   - Banner 底部至後續表單內容：視覺有效間距 `20px`。
   - 圖片在 render box 內採 `object-fit: cover`，並跟隨 `8px` 圓角裁切。
   - Jira 指定站點圖片為 attachment `132835`，檔名 `photo_2026-07-23_16-54-50.jpg`，Jira 顯示尺寸為 `402px × 112px`。

## 資源與 Frontend config 決策

**結論：Banner 必須放在 `/Users/kenyu/wow/static-resources`；不修改 `/Users/kenyu/wow/whitelabel-frontend-config`，也不串後台配置。**

理由：

1. Jira 已明確定義為 Fa11 前端寫死，且圖片更換需技術協助；static-resources + hardcoded asset path 符合此維護模式。
2. App repo 已有 exact Fa11 guard；身份判斷不需要另一個 flag。
3. Frontend config repo 的 Multiverse `environment.json` 現有契約只包含七個啟動／API／資源基底欄位；為單張 component Banner 新增 `registerBanner`、asset path 或 feature flag，會成為該 repo 第一個 UI-level key，沒有必要。
4. Frontend config 已提供正確的環境資源基底：staging `/statics/staging`、production `/statics/production`。會員端只需沿用 `VITE_APP_STATIC_RESOURCE_URL`，不 hardcode 環境名稱。
5. 目前只有一個代理、一張固定圖片、一個固定位置；建立 generic config、agent-to-asset map、API response field 或後台設定屬於超出需求。
6. 最小且可隔離的做法是在 `ModeLoginRegister.vue` 使用既有 Fa11 guard，將 `VITE_APP_STATIC_RESOURCE_URL` 與固定相對路徑 `/images/banner/fa11/register-banner-20260723.jpg` 組成完整 URL。
7. 若未來出現第二個代理、可點擊 URL、排程或後台換圖，必須先更新 spec，再評估正式 config contract／CMS；不得在 GSI-358 預先擴張。

## 範圍

1. 新增 Fa11 專用 Banner asset：
   - Static-resources staging：`statics/staging/images/banner/fa11/register-banner-20260723.jpg`。
   - Static-resources production：`statics/production/images/banner/fa11/register-banner-20260723.jpg`。
   - 兩份圖片內容必須完全相同，並使用 Jira GSI-358 attachment `132835` 的原始 bytes；允許按上述路徑重新命名，不得重畫、重壓、轉檔、用相似圖替代或把短效 Figma MCP URL 寫入 production code。
2. 修改 `template/set_r022/components/Form/ModeLoginRegister.vue`：
   - 使用該檔案既有 `useAgentCode()` destructure 中的 `isFA1M`（等價於 `isFA11`，同為 `FA11_AGENTS` guard）；不修改 `src/common/hooks/useAgentCode.ts`，也不新增第二個同義 destructure。
   - 在 register `<q-form v-else>` 內、`.form-content` 前新增 Banner。
   - Banner 必須使用 `v-if="isFA1M"` 或等效 exact guard。
   - Banner 不得存在於 login `<q-form v-if="isLoginMode">` 的 DOM。
   - 使用 `envData()` 的 `VITE_APP_STATIC_RESOURCE_URL` 加固定相對路徑 `/images/banner/fa11/register-banner-20260723.jpg`。
   - 實作註記：`useEnv().getModeEnv()`（`useEnv.ts:68-91`）回傳的是**非 reactive 的 plain object snapshot**，因此 line 587 既有的 `const envInfo = envData()` 只是 setup 當下的快照。為滿足下方「`VITE_APP_STATIC_RESOURCE_URL` 尚未就緒時不得發出錯誤 request」的邊界條件，Banner URL 以 `computed(() => envData().VITE_APP_STATIC_RESOURCE_URL ...)` 組出：computed 內重新呼叫 `envData()` 會讀到 reactive store 欄位，因此 env 就緒後會自動更新，基底為空時回傳空字串。
   - `ensureAbsoluteUrl()`（`useEnv.ts:106-115`）已移除結尾斜線並在空值時回傳 `""`，故 `${base}/images/...` 不會產生雙斜線。
   - 不 hardcode `/statics/staging`、`/statics/production`、hostname 或 CDN domain。
   - 不修改 `template/set_r022/hooks/useSiteImg.ts`，也不把 Banner 放進 template-local assets。
3. 視覺規格：
   - Desktop/PC 表單寬 `400px` 時，Banner render box 精確為 `400px × 112px`。
   - `width: 100%`，依 `400:112` 比例 responsive；H5 不得水平溢出或拉伸變形。
   - `object-fit: cover`。
   - `border-radius: 8px`，圖片本身也需被同樣圓角裁切。
   - Header 至 Banner、Banner 至下一個可見註冊欄位的有效間距各為 `20px`。實作者需計入既有 `.form-container pad:pt-3`，不得因疊加 margin/padding 造成 `32px` 等非設計間距。
   - 不修改現有 dialog 寬度、全域最大高度、背景、陰影、header、表單欄位、按鈕、責任條款或 scrollbar；內容超過現有高度時沿用既有捲動行為。
4. Accessibility：
   - Banner 是裝飾／行銷圖片且沒有 Jira 指定的可見文字替代需求；使用簡短可辨識的 `alt`（例如 `Deposit bonus`），不得使用空的互動標籤。
   - Banner 非按鈕、非連結，不加 click handler、pointer cursor、keyboard handler 或 ARIA button role。

## Out of scope

- 不在 login mode 顯示 Banner。
- 不影響 Fa21 或任何其他使用 `set_r022` 的代理。
- 不修改 `src/common`、`src/stores`、`src/api`、request/response type、shared config、shared default 或其他 template。
- 不修改 `/Users/kenyu/wow/whitelabel-frontend-config`，不新增 environment key、站點根目錄 Banner asset、feature flag、CMS、後台欄位、Banner API position 或動態圖片設定。
- 不在 `Whitelabel_GSI_Platform_Multiverse/template/set_r022/assets/` 或其他 app-bundled asset folder 新增 Banner。
- 除上述 staging / production 兩張同內容 Banner 外，不修改、移動、重壓、轉檔或清理 `/Users/kenyu/wow/static-resources` 的其他資源。
- 不讓 Banner 可點擊；GSI-358 未提供 CTA URL。F1G-39 最早提出的 CTA/link 想法不構成本 spec 的實作範圍。
- 不修改註冊／登入 API payload、validation、OTP、責任條款、route、埋點、promotion roulette 或登入註冊切換流程。
- 不重做整個 Figma login dialog，不為了匹配 Figma 全頁高度而改所有 R022 dialog 尺寸。
- 不建立或修改 local locale JSON，不新增 i18n key。
- 不 inspect、修改、格式化、測試、review 或提交 `src/env/environment.json`。
- 不順手處理無關 ESLint warning、樣式或 refactor。
- 不 commit、push、merge、開 MR/PR 或部署；這些動作都需要使用者另行明確指示。

## 受影響範圍

- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- Runtime：Fa11 / `agentCode=fa11`。
- Template/siteKey：`template/set_r022`。
- App repo 預期 production diff：
  - 修改 `template/set_r022/components/Form/ModeLoginRegister.vue`。
  - 不新增 app-bundled 圖片。
- Static-resources repo 預期 production diff：
  - 新增 `statics/staging/images/banner/fa11/register-banner-20260723.jpg`。
  - 新增 `statics/production/images/banner/fa11/register-banner-20260723.jpg`。
- 預期只讀參考：
  - `template/set_r022/components/Dialog/LoginRegister.vue`
  - `src/common/hooks/useAgentCode.ts`
  - `/Users/kenyu/wow/whitelabel-frontend-config/staging/FA1M/whitelabel_gsi_platform_multiverse/FA11/environment.json`
  - `/Users/kenyu/wow/whitelabel-frontend-config/production/FA1M/whitelabel_gsi_platform_multiverse/FA11/environment.json`
  - 同目錄的 `manifest.json`、`head_inject_extensions.html`、`sw.js` 與 PWA icons
- 跨站影響：
  - Vue 檔位於多人共用的 R022 template，但新增 DOM 必須由 existing Fa11 runtime guard（`isFA1M`）隔離。
  - 不修改 shared hook/config/default。
  - Frontend config repo 必須維持零 diff；尤其不得帶入該 repo 原本存在的其他使用者修改。
  - Static-resources 路徑放在 `images/banner/fa11/`，不覆寫 template-wide、shared 或其他 agent 資源。
  - Fa21 與其他 R022 agents 的 DOM、layout、asset request、scroll height 與互動必須維持不變。

## 參考實作 / 要遵循的現有 pattern

1. `template/set_r022/components/Form/ModeLoginRegister.vue:357`
   - 使用現有 `v-if="isLoginMode"` / `v-else` 分流；Banner 只加入 register branch。
2. `template/set_r022/components/Form/ModeLoginRegister.vue:567`
   - 已 import 並 destructure `useAgentCode()` 的 `isFA1M`；沿用此 exact Fa11 guard。
3. `template/set_r022/components/Form/ModeLoginRegister.vue:588`
   - 同一檔案已透過 `useEnv()` 取得 `envData`，並建立 `envInfo`；以其中 `VITE_APP_STATIC_RESOURCE_URL` 作資源基底，不另讀 local environment JSON。
4. `src/common/hooks/useAgentCode.ts:123`／`:125`
   - 直接重用 existing `isFA11`／`isFA1M`（本實作採用檔案內已在用的 `isFA1M`）；不得再寫 `agentCode.toLowerCase() === "fa11"` 或新增 duplicate constant。
5. `src/common/hooks/useCommonImg.ts:9` 與 `src/common/composables/useGame.ts`
   - 現有 static resource pattern 是 `${VITE_APP_STATIC_RESOURCE_URL}/images/...`；本需求沿用相同資源基底與 URL 組法，不修改 shared helper。
6. Figma node `2991:5319`
   - Banner box `400 × 112px`、`8px` radius、cover crop；此 node 只作 Banner geometry 參考。

## 關鍵決策與理由 (Key decisions)

1. **Register-only，而非 login + register。**
   - GSI-358 標題、描述及 F1G-39 最後確認都明確指定註冊頁；Figma 顯示 login mode 是參考畫面矛盾，不覆蓋文字範圍。
2. **不修改獨立的 `whitelabel-frontend-config` repo。**
   - 該 repo 已正確提供 `staticResourceUrl`，沒有 component Banner key 的既有契約；本需求只消費既有值。
3. **圖片放 static-resources，不 bundle 進 template。**
   - 使用者已指定資源歸屬；staging / production 分環境存放，app 透過既有 static resource base URL 取用。
4. **不修改 shared hook。**
   - `isFA11`／`isFA1M` 已存在，production code change 可限制在 `ModeLoginRegister.vue`。
5. **圖片使用 Jira attachment，不使用短效 Figma asset URL。**
   - Jira attachment 是站點指定上傳圖；Figma MCP asset 約 7 日失效，不可進 production。
6. **Banner 不可點擊。**
   - GSI-358 沒有 CTA URL、opening method 或 target 行為；擅自加連結無法驗收且會擴大需求。
7. **保留現有 dialog sizing/scroll。**
   - 需求只新增 Fa11 Banner；調整共用 R022 dialog 高度會影響其他代理。Figma 完整 dialog 與現況高度不同，因此只套用 Banner 相關量測。
8. **H5 使用同一張圖等比例縮放。**
   - Jira/Figma 沒有獨立 H5 asset；用 `width:100%` 與 `400:112` 比例可避免固定 400px 導致 H5 溢出，也不自行發明第二張設計。

## 驗收條件

> Reviewer 必須逐條判定通過／不通過；缺少可測 Fa11 環境的項目標記「待 QA」，不得宣稱全數完成。

- [ ] App repo GSI-358 production diff 僅修改 `template/set_r022/components/Form/ModeLoginRegister.vue`；沒有新增 app-bundled asset，也沒有 shared/config/API/store/其他 template/environment diff。
- [ ] Static-resources repo GSI-358 diff 僅新增 `statics/staging/images/banner/fa11/register-banner-20260723.jpg` 與 `statics/production/images/banner/fa11/register-banner-20260723.jpg`。
- [ ] `/Users/kenyu/wow/whitelabel-frontend-config` 維持零個 GSI-358 相關 diff；未修改 staging/production Fa11 `environment.json`，未新增 Banner asset，且未碰觸該 repo 原有的其他使用者修改。
- [ ] `agentCode=fa11` 且 dialog 為 register mode 時，Banner 顯示在所有註冊項目上方。
- [ ] `agentCode=fa11` 且 dialog 為 login mode 時，Banner 不存在於 DOM，也不保留空白 gap。
- [ ] Fa21 與至少一個其他 R022 agent 在 login/register mode 都不 render Banner、不 request Banner asset，dialog layout 與捲動行為無可見變化。
- [ ] 實作重用 `useAgentCode()` 既有的 Fa11 guard（`isFA1M`，等價 `isFA11`）；沒有新增 frontend config、agent constant、duplicate `agentCode` string comparison、重複同義 destructure 或 shared hook diff。
- [ ] Static-resources staging / production 兩張圖片 SHA-256 完全相同，且都是 Jira GSI-358 attachment `132835` 的原始 bytes；未重壓、轉檔或修改 metadata。
- [ ] App 使用 `VITE_APP_STATIC_RESOURCE_URL + "/images/banner/fa11/register-banner-20260723.jpg"`（或語意等價且不產生雙斜線的寫法）；沒有 hardcode staging、production、hostname、CDN、Figma MCP URL、Jira authenticated attachment URL 或 base64。
- [ ] Staging runtime 實際 request `/statics/staging/images/banner/fa11/register-banner-20260723.jpg`；production config 展開後為 `/statics/production/images/banner/fa11/register-banner-20260723.jpg`。
- [ ] PC 表單寬度 `400px` 時，Banner 顯示尺寸為 `400px × 112px`、圓角 `8px`、`object-fit: cover`，圖片無拉伸與錯誤裁切。
- [ ] Header 底部至 Banner 頂部、Banner 底部至第一個可見註冊欄位的有效間距均為 `20px`；既有 padding 未造成重複間距。
- [ ] H5 320、375、390、414px viewport 下 Banner 寬度不超出表單，維持 `400:112` 比例、無水平 scrollbar、無拉伸或圓角破圖。
- [ ] 註冊欄位很多或小高度 viewport 時，既有表單捲動可到達所有欄位、責任條款、Register button 與切換 Login button；Banner 不遮擋 sticky header/close button。
- [ ] Banner 沒有 click handler、link、router redirect、`cursor:pointer`、keyboard button semantics 或 CTA。
- [ ] Login/register route 切換、form reset、OTP、validation、submit、責任條款與 promotion roulette 沒有 regression。
- [ ] 使用 Chrome extension 在 Fa11 測試環境或可控 local runtime 完成 PC/H5 screenshot，與 Figma Banner geometry 比對後無明顯差異；回報 screenshot 絕對路徑與仍存在差異。
- [ ] 臨時 test/harness、screenshots 與下載的 Figma/Jira 檔案在 commit 前已刪除或 unstage；commit 不含測試檔、本機設定或短效資產。
- [ ] Targeted Prettier/ESLint 與 `git --no-pager diff --check` 通過；未執行 `tsc --noEmit`。
- [ ] `src/env/environment.json` 沒有被 inspect、修改、格式化、測試、review 或納入 summary。

## 邊界情況 / 例外

- `customInputList` 尚未載入或為空時，Banner 仍可顯示；表單後續資料載入不得造成 Banner 閃爍或重複 mount。
- Agent/env 尚未就緒時不得先對所有 R022 使用者短暫顯示 Banner；guard 預設必須為 false。
- H5 dialog 是 maximized layout；Banner 需跟隨現有可用寬度，不可固定 `400px`。
- `VITE_APP_STATIC_RESOURCE_URL` 尚未就緒時不得發出 `/undefined/...`、`//images/...` 或錯誤 origin request；由 boot 初始化順序或明確 guard 保證 URL 合法。
- Static-resources 尚未部署或回傳 404 時不得使註冊表單崩潰、阻止輸入或提交；圖片失敗僅限 Banner 缺圖。
- 若 Jira attachment `132835` 無法由實作者下載，停止並請使用者提供原始檔；不得從 screenshot 裁切或以 Figma 短效 URL 代替後宣稱完成。
- 若產品方後續提供 CTA URL、要求 login mode 也顯示、要求後台換圖或指定另一個 H5 asset，先更新本 spec 的範圍與驗收條件再實作。
- 若實測發現要達成 Banner geometry 必須修改 shared code、shared config 或全 R022 dialog layout，先停止並回報跨站影響；不得自行擴大 diff。

## 測試計畫

> Repo 沒有宣告 test script。不要為本需求引入測試 framework；依規則使用臨時、不可提交的驗證與瀏覽器測試。

### 1. 臨時 conditional-render harness

- 以現有 Vue/runtime 能力或最小臨時 harness 驗證：
  1. Fa11 guard = true + register mode → Banner 存在。
  2. Fa11 guard = true + login mode → Banner 不存在。
  3. Fa11 guard = false + register/login mode → Banner 不存在。
  4. Agent/env 初始空值 → Banner 不短暫顯示。
- 若建立臨時 test file，驗證後刪除或 unstage；不得納入 commit。
- 不為了測試而抽取 production composable、修改 shared hook 或引入 Vitest/Jest。

### 2. Browser / Figma 視覺驗證

- 所有 local/QA URL 依專案規則使用 Chrome extension，不使用 in-app browser。
- Fa11 至少測：
  - PC：`1920 × 940` 或足以容納 dialog 的等效 desktop viewport。
  - H5：`320 × 568`、`375 × 812`、`390 × 844`、`414 × 896`。
- 在 register mode 檢查 Banner 位置、`400:112` 比例、`8px` radius、cover crop、前後 `20px` 有效間距。
- 切到 login mode，確認 Banner DOM/gap 都消失。
- 測小高度與長註冊欄位，確認 scroll 可到達 submit/login switch。
- 使用 Fa21 與另一個 R022 agent 重複 login/register 檢查，確認無 Banner、無資產 request、無 layout regression。
- 保存並回報 screenshot 絕對路徑；與 Figma node `2991:5319` 對照，有差異就修正後重拍。

### 3. Targeted static validation

```bash
pnpm exec prettier --check template/set_r022/components/Form/ModeLoginRegister.vue
pnpm exec eslint template/set_r022/components/Form/ModeLoginRegister.vue
git --no-pager diff --check
```

- ESLint 只處理本次新增且阻擋驗證的 error；不清理無關既有 warning。
- 檢查 app repo production diff 時排除 `src/env/environment.json`，確認 GSI-358 只涉及預期 Vue 檔；不得把目前工作樹既有修改誤算、覆寫或帶入。
- 另以 `git status --short` 檢查 `/Users/kenyu/wow/whitelabel-frontend-config`，確認沒有 GSI-358 相關變更；該 repo 原有 dirty file 不得修改、還原、stage 或納入交接。
- 在 `/Users/kenyu/wow/static-resources` 執行：

```bash
file statics/staging/images/banner/fa11/register-banner-20260723.jpg
file statics/production/images/banner/fa11/register-banner-20260723.jpg
shasum -a 256 statics/staging/images/banner/fa11/register-banner-20260723.jpg \
  statics/production/images/banner/fa11/register-banner-20260723.jpg
sips -g pixelWidth -g pixelHeight statics/staging/images/banner/fa11/register-banner-20260723.jpg \
  statics/production/images/banner/fa11/register-banner-20260723.jpg
git --no-pager diff --check
```

- 兩檔必須被辨識為 JPEG、hash 相同，原始尺寸為 Jira attachment 的 `402 × 112px`。
- 不執行 `tsc --noEmit`。

## Git Flow

- 兩個實作 repo 都使用工作分支名稱：`feat/gsi-358-fa11-register-banner`。
- App repo `/Users/kenyu/wow/Whitelabel_GSI_Platform_Multiverse`：
  - 基底分支：`main`。
  - 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（正式），每階段通過後才進下一關，不得跳關。
- Static-resources repo `/Users/kenyu/wow/static-resources`：
  - 基底分支：`main`。
  - 研究當下 remote 只有 `main`，環境以 `statics/staging`／`statics/production` 目錄區分；不得自行假設或建立 remote `develop`／`staging` branch。
  - 從 `main` 建同名 feature branch。合併、push、資源上版時點必須由使用者明確確認，並與 app 的 dev/staging/production 驗證節點協調。
- 實作者在任一 repo 開始前：
  1. 保留目前工作樹與使用者既有修改，不得覆蓋、還原、stage 或帶入本 feature。
  2. Pull 前先執行 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` 驗證 HTTPS token / macOS Keychain。若失敗，停止回報，不改用 SSH。
  3. 更新最新 `main`，再從它建立並切換到 `feat/gsi-358-fa11-register-banner`。
  4. 未切到上述工作分支前不得新增實作；不可直接在 `main`、`develop`、`staging` 或目前其他工作分支繼續修改。
- 每一次 commit 都必須先取得使用者針對該次 commit 的明確確認；本次「研究／寫 spec」不構成 commit 授權。
- 合併進任何分支前都必須再次取得使用者明確確認；有 conflict 時停止或 abort 並回報，不自行解 conflict 或改 merge strategy。
- 不預設 rebase，不主動把 `develop`／`staging`／`main` 合回工作分支。
- 不主動開 MR/PR；push 後只提供 GitLab 回傳連結，由使用者決定。
- Merge 到環境分支不等於發版。只有使用者明確要求「發版/release」才可執行 `yarn deploy`，選擇 `set_r022`、版本接受預設值、最後確認 `y`。

## 交接備註給實作者

- 先從最新 `main` 建立 `feat/gsi-358-fa11-register-banner`，再依本 spec 實作。
- 實作前先確認可取得 Jira attachment `132835` 原始檔。
- 不修改 `/Users/kenyu/wow/whitelabel-frontend-config`；它現有 `staticResourceUrl` 已足夠。
- Banner 放在 `/Users/kenyu/wow/static-resources` 的 staging / production 指定路徑，app 不保留另一份 bundled copy。
- 直接重用 `ModeLoginRegister.vue` 現有的 exact Fa11 guard `isFA1M`；它與 `isFA11` 都由 `FA11_AGENTS` 計算，不需新增第二個同義 destructure。
- 遇到 CTA、顯示範圍、H5 asset 或 shared layout 需求變更時，先更新 spec，不要自行推測。
