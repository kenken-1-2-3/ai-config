# R017 CMS 網站說明 隱私政策 `/webInformationCms/3` Spec
> **共同前提**：本批 CMS spec 先以 r017 會員端為 target；shared layer 做可重用能力，但不 wire up r001。實作時遵守專案規則：package manager 用 pnpm/Nx、不跑 `tsc --noEmit`、測試檔可暫時新增但 commit 前移除。
>
> **舊專案參考**：`/Users/kenyu/wow/Whitelabel_GSI_Platform_Multiverse`。
>
> **架構決議（已實作）**：本批四份網站說明改採**純動態路由** `/webInformationCms/:id`（對齊舊 set_r017），不再做 4 個固定 `/webInformation/PrivacyPolicy` wrapper。原因：與 set_r017 模板架構一致、後台新增 CMS 項目無需改 code、單一頁面覆蓋所有 web information 內容。固定 4 條 wrapper 已刪除。

## 背景 / 目標

把網站說明「隱私政策」從舊專案靜態內容改為 CMS-driven 內容，在 NX r017 透過動態 route `/webInformationCms/3` 提供。id 對應 `CMS_WEB_INFORMATION_URL_ID_ENUMS.PRIVACY_POLICY = 3`，內容來源為 CMS `WEBSITE_INFORMATION = 5` 的對應 item。

需求列項：`CMS網站說明串接 隱私政策  /webInformationCms/3  PrivacyPolicy`。

視覺來源：Figma [R017 優化中，node `15100:154406`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15100-154406&t=b4bJXIEG9rHVzRpi-0)。Figma node 為本頁 Tab 與內容容器的視覺 source of truth。

## 範圍

**做**：

1. 動態 route：`apps/r017/src/pages/webInformationCms/[id].vue`（與其他三份 web information 共用同一頁）。
2. 該頁從 `route.params.id` 取出 id，傳給 shared `CmsWebInformationPage`；URL 走 `/webInformationCms/3` 代表 PrivacyPolicy。
3. 對所有需要導到隱私政策的入口（`useStaticPageDirection("privacy")`、login/register 既有 Privacy 入口）改用 `toWebInformationCmsRoute(CMS_WEB_INFORMATION_URL_ID_ENUMS.PRIVACY_POLICY)` 產生 `/webInformationCms/3`。
4. 若 shared foundation 尚未存在，依本 spec 的 shared foundation 區段建立。
5. title 與 body 完全由 CMS `Page` 多語資料提供。
6. HTML 使用 `v-html` 顯示，並重寫 CMS HTML 內的資源 URL。
7. 顯示來自 CMS `WEBSITE_INFORMATION` list 的動態 Tab；沿用 API 回傳順序，不固定四項、不在前端排序。
8. Tab 使用當前 locale 的 `Page.title`，點擊後以 SPA router 切換 `/webInformationCms/:id`。
9. Tab 與內容容器依 Figma node `15100:154406` 實作，優先重用 shared `BaseTab` default category。

## Out of scope

- 不搬舊專案 `PrivacyPolicy.vue` 的硬編英文段落。
- 不新增前端翻譯 key；CMS content/title 是來源。
- 不修改 CMS 後台資料。
- 不修改 r001 或代理端。
- 不改 footer/popup/contact/floating/home information image。

## 受影響範圍

預期檔案：

- Create: `apps/r017/src/pages/webInformationCms/[id].vue`（4 份 web information spec 共用）
- Shared foundation: `libs/shared/ui-layer/src/lib/composables/useCmsWebInformationPage.ts`
- Shared foundation: `libs/shared/ui-layer/src/lib/components/cmsWebInformation/CmsWebInformationPage.vue`
- Reuse: `libs/shared/ui-layer/src/lib/components/base/BaseTab.vue`
- Modify: `libs/shared/ui-layer/src/lib/constants/routePath.ts`（加 `WEB_INFORMATION_CMS` 與 `toWebInformationCmsRoute(id)`）
- Modify: `libs/shared/ui-layer/src/lib/composables/useStaticPageDirection.ts`

## 參考實作 / 要遵循的現有 pattern

舊專案：

- 動態 route：`template/set_r017/router/routes.ts` 的 `/webInformationCms/:id`（本實作的主要參考）。
- Shared CMS WebInformation：`src/common/components/WebInformation/components/module1.vue`。
- CMS selection：`src/common/composables/useCms.ts` 的 `webInformationData`，先比 `url_id`，找不到再比 `id`。
- HTML content：`webInformationContent` 會把 `VITE_APP_BASE_API` 替換為 dynamic resource URL。

NX 既有 pattern：`useCmsListQuery`、`CMS_WEB_INFORMATION_URL_ID_ENUMS`、`cmsResourceHelpers.ts`、`useStaticPageDirection.ts`。

Figma / component pattern：Figma node `15100:154406`、Tab row `15100:154407`、content `15100:154412`；shared `BaseTab.vue` default category 已提供 Figma 所需 40px 高、20px 水平 padding、8px 上圓角、inactive token 與 active 漸層。

## Shared foundation 規格

`useCmsWebInformationPage.ts` 接收 reactive `urlId`，呼叫 CMS list type `WEBSITE_INFORMATION`，先以字串比對 `url_id`、找不到再比對 `id`；依 locale 做 exact、prefix、第一筆有 content 的 fallback；用 `rewriteCmsResourceUrl()` 重寫 HTML 資源 URL。

同一 composable 必須回傳動態 `tabs`：直接依 API list 原始順序 `map()`，不使用 `sort()`；每項包含 `urlId`、localized `label`、`toWebInformationCmsRoute(item.url_id)` 與 `isActive`。Active 以目前實際匹配到的 CMS item 判斷，使 route 經 `url_id` 或 fallback `id` 匹配時都能標示正確 Tab。

`CmsWebInformationPage.vue` 使用 `BaseTab` default category 渲染 tabs。Tab row 單列、無 gap、不可換行或縮小，超寬時可水平捲動。Desktop Tab 高 40px、`px-5 py-2`、上圓角 8px；inactive 使用 square-primary enabled tokens，active 使用橘紅水平漸層 tokens。Content 緊接 Tab，使用 `--surface-surface-contrainer`、`px-6 py-5`、8px 下方及右上圓角、`0 -2px 8px rgba(0,0,0,0.3)` shadow；title 為 24/28px bold，body 基準為 16/24px regular。

## 關鍵決策與理由

1. 採純動態 `/webInformationCms/:id`，**不做 4 個固定 wrapper**。對齊舊 set_r017 架構；後台新增第 5、6 筆 web information 不需要改 code。
2. 優先比 `url_id` 再比 `id`，對齊舊 `useCms.webInformationData`。
3. 比對採字串（B 模式）：現有後台 url_id 為 number 仍可用，同時為未來 slug 化預留。
4. 保留 `v-html`，因為 CMS 後台內容是 HTML。
5. `useStaticPageDirection("privacy")` 經 `toWebInformationCmsRoute(PRIVACY_POLICY)` 導到 `/webInformationCms/3`。
6. Tab 採 CMS 動態清單並沿用 API 順序，對齊舊專案 `webInformationMenuList` 直接 `map()` 的行為。
7. 重用 `BaseTab` default category，避免重複 Figma 已存在於 design system 的基礎樣式。

## 驗收條件

- [ ] `/webInformationCms/3` 可直接開啟，未登入也可進入。
- [ ] 頁面呼叫 CMS list API，request 帶 `type=CMS_TYPE_ENUMS.WEBSITE_INFORMATION`。
- [ ] 從 CMS list 中選到 `url_id === 3` 的 item；若沒有，才 fallback 到 `id === 3`。
- [ ] title 顯示當前 locale 的 `Page.title`，content 顯示當前 locale 的 `Page.content`。
- [ ] CMS HTML 中等於 API base 的資源網址會替換成 `runtimeConfig.public.imageBase`。
- [ ] API error、空 list、找不到對應資料時，不顯示 `undefined`，不造成 app crash。
- [ ] `useStaticPageDirection().handleStaticPageAction("privacy")` 導到 `/webInformationCms/3`。
- [ ] login/register 既有 Privacy Policy 入口導到 `/webInformationCms/3`。
- [ ] Tab 數量、標題與順序由 CMS API 決定，沒有固定四項或前端排序。
- [ ] 點擊任一 Tab 以 SPA navigation 切換 route，內容同步更新。
- [ ] route 以 `url_id` 或 fallback `id` 匹配時，對應 Tab 都正確 active。
- [ ] 無可用 localized title 的 item 不渲染空白 Tab。
- [ ] Tab 使用 `BaseTab` default category，外觀符合 Figma node `15100:154406`。
- [ ] 窄 viewport 下 Tab 維持單列並可水平捲動，不撐破頁面。
- [ ] 內容容器背景、padding、圓角、陰影與 typography 符合 Figma。
- [ ] 未新增前端硬編法律/關於我們文案。
- [ ] 未修改 r001 與代理端。

## 邊界情況 / 例外

- CMS 回傳超過四項時全部依 API 順序顯示。
- Locale 切換時 Tab label、title、content 同步更新。
- CMS item 缺少可用 title 時不顯示該 Tab。
- API error、空 list 或不存在的 id 時不 crash、不顯示 `undefined`。

## 測試計畫

1. Unit test CMS item matching、locale fallback、resource rewrite。
2. Unit test tabs 保留 API 順序、排除空 label、`url_id`/`id` fallback active。
3. Component test `BaseTab` render、router target 與 route 更新後內容同步。
4. `pnpm nx serve r017` 手動驗證 `/webInformationCms/3`、語系切換、窄 viewport 水平捲動。
5. 對照 Figma node `15100:154406` 做 desktop visual check。
6. `pnpm nx build r017`。

## Git Flow

- 分支名稱：`feat/cms-web-information-privacy-policy`（或合併 4 份成 `feat/cms-web-information`）
- 推進路徑：工作分支 → `develop` → `staging` → `main`。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

四份網站說明 spec 共用同一個動態 page 與 shared foundation；實作只需建立一次。若 CMS URL id 與 enum 不一致，先回報並更新 spec，不要自行改 enum 值。
