# R017 CMS 網站說明 關於我們 `/webInformationCms/1` Spec
> **共同前提**：本批 CMS spec 先以 r017 會員端為 target；shared layer 做可重用能力，但不 wire up r001。實作時遵守專案規則：package manager 用 pnpm/Nx、不跑 `tsc --noEmit`、測試檔可暫時新增但 commit 前移除。
>
> **舊專案參考**：`/Users/kenyu/wow/Whitelabel_GSI_Platform_Multiverse`。
>
> **架構決議（已實作）**：本批四份網站說明改採**純動態路由** `/webInformationCms/:id`（對齊舊 set_r017），不再做 4 個固定 `/webInformation/AboutUs` wrapper。原因：與 set_r017 模板架構一致、後台新增 CMS 項目無需改 code、單一頁面覆蓋所有 web information 內容。固定 4 條 wrapper 已刪除。

## 背景 / 目標

把網站說明「關於我們」從舊專案靜態內容改為 CMS-driven 內容，在 NX r017 透過動態 route `/webInformationCms/1` 提供。id 對應 `CMS_WEB_INFORMATION_URL_ID_ENUMS.ABOUT_US = 1`，內容來源為 CMS `WEBSITE_INFORMATION = 5` 的對應 item。

需求列項：`CMS網站說明串接 關於我們  /webInformationCms/1  AboutUs`。

視覺來源：Figma [R017 優化中，node `15100:154406`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15100-154406&t=b4bJXIEG9rHVzRpi-0)。Figma node 為本頁 Tab 與內容容器的視覺 source of truth。

## 範圍

**做**：

1. 動態 route：`apps/r017/src/pages/webInformationCms/[id].vue`（與其他三份 web information 共用同一頁）。
2. 該頁從 `route.params.id` 取出 id，傳給 shared `CmsWebInformationPage`；URL 走 `/webInformationCms/1` 代表 AboutUs。
3. 對所有需要導到關於我們的入口（`useStaticPageDirection("about")`、sidebar `website_information` did）改用 `toWebInformationCmsRoute(CMS_WEB_INFORMATION_URL_ID_ENUMS.ABOUT_US)` 產生 `/webInformationCms/1`。
4. 若 shared foundation 尚未存在，依本 spec 的 shared foundation 區段建立。
5. title 與 body 完全由 CMS `Page` 多語資料提供。
6. HTML 使用 `v-html` 顯示，並重寫 CMS HTML 內的資源 URL。
7. 在內容容器上方新增動態 Tab 列；Tab 項目來自同一份 CMS `WEBSITE_INFORMATION` 清單，不硬編固定四項。
8. Tab 順序完全沿用 CMS API 回傳順序，不在前端依 `id`、`url_id` 或標題重新排序。
9. 每個 Tab 使用當前 locale 對應的 `Page.title`；沒有可顯示 title 的項目不渲染 Tab。
10. 點擊 Tab 以 SPA router 導到該項目的 `/webInformationCms/:id`，不重新載入整個頁面。
11. Tab 與內容容器依 Figma node `15100:154406` 實作，優先重用 shared `BaseTab` 的 default category。

## Out of scope

- 不搬舊專案 `AboutUs.vue` 的硬編英文段落。
- 不新增前端翻譯 key；CMS content/title 是來源。
- 不修改 CMS 後台資料。
- 不修改 r001 或代理端。
- 不改 footer/popup/contact/floating/home information image。

## 受影響範圍

預期檔案：

- Create: `apps/r017/src/pages/webInformationCms/[id].vue`（4 份 web information spec 共用）
- Shared foundation: `libs/shared/ui-layer/src/lib/composables/useCmsWebInformationPage.ts`
- Shared foundation: `libs/shared/ui-layer/src/lib/components/cmsWebInformation/CmsWebInformationPage.vue`
- Reuse without modification unless Figma mismatch is verified: `libs/shared/ui-layer/src/lib/components/base/BaseTab.vue`
- Modify: `libs/shared/ui-layer/src/lib/constants/routePath.ts`（加 `WEB_INFORMATION_CMS` 與 `toWebInformationCmsRoute(id)`）
- Modify: `libs/shared/ui-layer/src/lib/composables/useStaticPageDirection.ts`
- Modify: `libs/shared/ui-layer/src/lib/composables/useSideMenu/resolver.ts`

## 參考實作 / 要遵循的現有 pattern

舊專案：

- 動態 route：`template/set_r017/router/routes.ts` 的 `/webInformationCms/:id`（本實作的主要參考）。
- Shared CMS WebInformation：`src/common/components/WebInformation/components/module1.vue`。
- CMS selection：`src/common/composables/useCms.ts` 的 `webInformationData`，先比 `url_id`，找不到再比 `id`。
- HTML content：`webInformationContent` 會把 `VITE_APP_BASE_API` 替換為 dynamic resource URL。

NX 既有 pattern：`useCmsListQuery`、`CMS_WEB_INFORMATION_URL_ID_ENUMS`、`cmsResourceHelpers.ts`、`useStaticPageDirection.ts`。

Figma 與 NX component：

- Figma node `15100:154406`：完整 Tab + content composition。
- Figma node `15100:154407`：Tab row。
- Figma node `15100:154412`：content container。
- `libs/shared/ui-layer/src/lib/components/base/BaseTab.vue` default category：已提供 40px 高、`px-5 py-2`、8px 上圓角、16px/24px bold 文字、inactive token 與 active 漸層 token。

## Shared foundation 規格

Shared foundation 檔案（4 份 web information spec 共用，只建一次）：

- `libs/shared/ui-layer/src/lib/composables/useCmsWebInformationPage.ts`
- `libs/shared/ui-layer/src/lib/components/cmsWebInformation/CmsWebInformationPage.vue`
- `libs/shared/ui-layer/src/lib/constants/routePath.ts`
- `libs/shared/ui-layer/src/lib/composables/useStaticPageDirection.ts`

`useCmsWebInformationPage.ts` 職責：接收 `MaybeRefOrGetter<number | string>` `urlId`（reactive，配合動態 route param 變動）；呼叫 CMS list type `WEBSITE_INFORMATION`；用**字串寬鬆比對** `String(item.url_id) === String(urlId)`，找不到再比 `String(item.id) === String(urlId)`；依 locale 選 `Page` exact match、prefix match、第一筆有 content 的 page；用 `rewriteCmsResourceUrl()` 重寫 HTML 資源 URL；回傳 `title`、`content`、`isLoading`、`hasContent`。

> **寬鬆比對動機（B 模式）**：未來後台若把 `url_id` 改成 string slug（e.g. `"AboutUs"`），前端不需再改即可支援 `/webInformationCms/AboutUs` 樣式的 URL。

`CmsWebInformationPage.vue` 職責：props 傳入 `urlId`，以 `() => props.urlId` getter 傳給 composable 維持 reactivity；顯示動態 Tab、title 與 `v-html` content；空資料 / 找不到 item 時顯示 fallback 文案，不噴 undefined；容器需處理長字串、表格與圖片，手機版不可撐破寬度。

### 動態 Tab 與內容容器規格

1. Tab data 直接由 CMS `WEBSITE_INFORMATION` list 依原始順序 `map()` 產生，不呼叫 `sort()`。
2. 每個 Tab 至少包含 `urlId`、localized `label`、route target、`isActive`；route target 使用 `toWebInformationCmsRoute(item.url_id)`。
3. Active 判斷以目前實際匹配到的 CMS item 為準：route 可先匹配 `url_id`、找不到再匹配 `id`，兩種 URL 都必須讓正確 Tab 呈現 active。
4. Tab 使用 `BaseTab` default category，不複製一套相同的背景、漸層與 typography。
5. Tab row 為單列、項目不可縮小、標題不可換行；寬度不足時容器可水平捲動，且不顯示突兀的 scrollbar。
6. Figma desktop 尺寸：Tab 高 40px、水平 padding 20px、垂直 padding 8px、上方左右圓角 8px、相鄰 Tab 無額外 gap。
7. Inactive 使用 `--tab-tab-bg-square-primary-enabled` 與 `--tab-tab-title-square-primary-enabled`。
8. Active 使用由 `--tab-tab-bg-rounded-primary-left-active` 到 `--tab-tab-bg-primary-dark-right-active` 的水平漸層，以及 `--tab-tab-title-square-primary-active`。
9. Content container 緊接 Tab row，下方左右及右上角 8px 圓角，使用 `--surface-surface-contrainer`、`px-6 py-5`、`0 -2px 8px rgba(0,0,0,0.3)` shadow。
10. Content title 使用 24px、line-height 28px、font-weight 700；body 基準為 16px、line-height 24px。CMS HTML 自帶的合法格式可保留。

## 關鍵決策與理由

1. 採純動態 `/webInformationCms/:id`，**不做 4 個固定 wrapper**。對齊舊 set_r017 架構；後台新增第 5、6 筆 web information 不需要改 code。
2. 優先比 `url_id` 再比 `id`，對齊舊 `useCms.webInformationData`。
3. 比對採字串（B 模式）：現有後台 url_id 為 number 仍可用（`String(1) === String(1)`），同時為未來 slug 化預留。
4. 保留 `v-html`，因為 CMS 後台內容是 HTML。
5. `useStaticPageDirection("about")` 經 `toWebInformationCmsRoute(ABOUT_US)` 導到 `/webInformationCms/1`。
6. Tab 採 CMS 動態清單而非固定 enum 清單，讓後台新增、刪除或調整項目時不需改前端。
7. Tab 沿用 API 順序，對齊舊專案 `webInformationMenuList` 直接 `map()` 的行為。
8. 採用 shared `BaseTab` 方案，因為 default category 已對應 Figma token 與尺寸；不在 WebInformation 內重複建立相同基礎樣式，也不引入會員中心 `MemberContainer`。

## 驗收條件

- [ ] `/webInformationCms/1` 可直接開啟，未登入也可進入。
- [ ] 頁面呼叫 CMS list API，request 帶 `type=CMS_TYPE_ENUMS.WEBSITE_INFORMATION`。
- [ ] 從 CMS list 中選到 `url_id === 1` 的 item；若沒有，才 fallback 到 `id === 1`。
- [ ] title 顯示當前 locale 的 `Page.title`，content 顯示當前 locale 的 `Page.content`。
- [ ] CMS HTML 中等於 API base 的資源網址會替換成 `runtimeConfig.public.imageBase`。
- [ ] API error、空 list、找不到對應資料時，不顯示 `undefined`，不造成 app crash。
- [ ] `useStaticPageDirection().handleStaticPageAction("about")` 導到 `/webInformationCms/1`。
- [ ] sidebar `website_information` did 點擊導到 `/webInformationCms/1`。
- [ ] SPA 內透過 router 切換不同 id（e.g. `/webInformationCms/1` → `/webInformationCms/2`）時，內容會正確更新（composable 接 reactive urlId）。
- [ ] Tab 數量、標題及順序皆由 CMS `WEBSITE_INFORMATION` API 回傳資料決定，前端沒有固定四項或額外排序。
- [ ] 每個有當前語系 title 的 CMS item 都顯示為一個 Tab；缺少可用 title 的 item 不顯示空白 Tab。
- [ ] 點擊 Tab 以 SPA navigation 切換到該 item 的 `/webInformationCms/:id`，title 與 content 同步更新。
- [ ] route 以 `url_id` 或 fallback `id` 匹配時，對應 Tab 都能正確呈現 active。
- [ ] Tab 使用 shared `BaseTab` default category，desktop 外觀符合 Figma node `15100:154406`。
- [ ] Tab 超出可用寬度時維持單列並可水平捲動，不換行、不壓縮文字、不撐破 viewport。
- [ ] 內容容器緊接 Tab，背景、padding、圓角、陰影與 typography 符合 Figma node `15100:154406`。
- [ ] 未新增前端硬編法律/關於我們文案。
- [ ] 未修改 r001 與代理端。

## 邊界情況 / 例外

- CMS 有 title 但 content 空：顯示 title，content 區塊保持空白但不破版。
- CMS content 含圖片、表格、長 URL：內容容器需 `overflow-wrap` 或等價處理。
- Locale 例如 `zh-TW`，CMS 只回 `zh` 或 `zh-tw`：需 normalize 後匹配。
- 不存在的 id（e.g. `/webInformationCms/999`）：顯示「No content available.」fallback。
- 字串 id（e.g. `/webInformationCms/AboutUs`）：B 模式邏輯允許，但後台目前還是 number url_id 時會 fallback 到 No content；等後台 slug 化後即自動 work。
- CMS 回傳超過四個項目：全部依 API 順序顯示，不限制數量。
- CMS item 缺少當前語系 title：套用既有 locale fallback；仍無 title 時不建立該 Tab。
- 切換語系後：Tab labels、內容 title 與 body 同步更新，不保留前一語系文字。

## 測試計畫

1. Unit test `useCmsWebInformationPage`：驗證 `url_id` 優先於 `id`、字串/數字 id 都能匹配。
2. Unit test locale fallback：exact、prefix、fallback。
3. Unit test resource rewrite：HTML API base URL 被換成 imageBase。
4. Unit test tabs：驗證 API 原始順序被保留、無 title item 被排除、`url_id`/`id` fallback 均能標示正確 active Tab。
5. Component test：驗證 Tab 使用 `BaseTab`、點擊後送出正確 router target、route param 更新後 active/content 同步。
6. 手動驗證：`pnpm nx serve r017` 後開 `/webInformationCms/1`、`/2`、`/3`、`/4`、`/999`、`/AboutUs`，切 locale，並用窄 viewport 驗證 Tab 水平捲動。
7. 對照 Figma node `15100:154406` 檢查 desktop 的 Tab 尺寸、active/inactive token、content container、title/body typography。
8. Focused build：`pnpm nx build r017`。

## Git Flow

- 分支名稱：`feat/cms-web-information-about-us`（或合併 4 份成 `feat/cms-web-information`）
- 從 `main` pull 後開出。
- 推進路徑：工作分支 → `develop` → `staging` → `main`。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

四份網站說明 spec 共用同一個動態 page 與 shared foundation；實作只需建立一次。若 CMS URL id 與 enum 不一致，先回報並更新 spec，不要自行改 enum 值。若後台支援 string slug url_id，可考慮把 `useStaticPageDirection` / sidebar resolver 改用 slug（e.g. `toWebInformationCmsRoute("AboutUs")`）讓 URL 更可讀。
