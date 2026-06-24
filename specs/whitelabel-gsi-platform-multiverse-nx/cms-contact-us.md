# R017 CMS 聯絡我們 `/ContactUs` Spec
> **共同前提**：本批 CMS spec 先以 r017 會員端為 target；shared layer 做可重用能力，但不 wire up r001。實作時遵守專案規則：package manager 用 pnpm/Nx、不跑 `tsc --noEmit`、測試檔可暫時新增但 commit 前移除。
>
> **舊專案參考**：`/Users/kenyu/wow/Whitelabel_GSI_Platform_Multiverse`。

## 背景 / 目標

把舊會員端 CMS 聯絡我們資料串進 NX r017，新增公開路由 `/ContactUs`。頁面內容完全由 CMS `CONTACT_US = 8` 控制，點擊項目沿用 CMS Entrance 導頁、開遊戲或客服入口邏輯。

需求列項：`CMS聯絡我們串接  /ContactUs  ContactUs`。

## 範圍

**做**：

1. 新增 r017 Nuxt page：`apps/r017/src/pages/ContactUs.vue`，產生 `/ContactUs` route。
2. 新增 shared view-model：`libs/shared/ui-layer/src/lib/composables/useCmsContactUs.ts`。
3. 新增 shared UI：`libs/shared/ui-layer/src/lib/components/cmsContactUs/CmsContactUsView.vue`。
4. 使用既有 `useCmsListQuery` 讀 CMS type `CMS_TYPE_ENUMS.CONTACT_US`。
5. 依 locale 解析 `Setting.icon_lang` 與 `Setting.contact_lang`；圖片用 `buildCmsImageUrl()` 補 `imageBase` 與 `updated_time` version。
6. 點擊 item 重用 `resolveEntranceNavigationTarget()`、`useOpenGame()`、`handleGlobalClick()`；不得只寫死 URL。
7. 更新 `ROUTE_PATH` 與 `useStaticPageDirection()`，讓 `contact` key 導到 `/ContactUs`。

## Out of scope

- 不新增或修改 CMS 後台資料。
- 不重做 footer、popup、自訂頁、網站說明四頁內容。
- 不複製舊 `set_r024` 中同一個 `v-for` 重複渲染三次的行為。
- 不新增前端 i18n 文案；標題、圖與文字由 CMS 多語欄位提供。
- 不修改 r001 或代理端。

## 受影響範圍

預期檔案：

- Create: `apps/r017/src/pages/ContactUs.vue`
- Create: `libs/shared/ui-layer/src/lib/components/cmsContactUs/CmsContactUsView.vue`
- Create: `libs/shared/ui-layer/src/lib/composables/useCmsContactUs.ts`
- Modify: `libs/shared/ui-layer/src/lib/constants/routePath.ts`
- Modify: `libs/shared/ui-layer/src/lib/composables/useStaticPageDirection.ts`
- Reuse: `libs/shared/ui-layer/src/lib/api/hooks/useCmsListQuery.ts`
- Reuse: `libs/shared/ui-layer/src/lib/composables/cmsResourceHelpers.ts`
- Reuse: `libs/shared/ui-layer/src/lib/composables/useSideMenu/resolver.ts`

## 參考實作 / 要遵循的現有 pattern

舊專案：

- Route：`template/set_r024/router/routes.ts`，`path: "/ContactUs"`, `name: "ContactUs"`。
- Page：`template/set_r024/pages/HomePage/ContactUs.vue`。
- CMS source：`src/common/composables/useCms.ts` 的 `cmsContactUsList`。
- Entrance click：`template/set_r024/composables/useCms.ts` 的 `useEntranceHandler()`。
- Asset conversion：`src/common/apiHooks/cms/processCmsListFromAll.ts` 的 `decorateCmsAssets()`。

NX 既有 pattern：`useCmsListQuery`、`cmsResourceHelpers.ts`、`useSideMenu/resolver.ts`、`handleGlobalClick.ts`。

## 關鍵決策與理由

1. 沿用 `/v1/player/cms/detail/list?type=8`，不新增 `/v1/player/cms/all`，對齊既有 NX CMS specs。
2. Page 放在 `apps/r017/src/pages/ContactUs.vue`，直接對應使用者指定的大寫 route。
3. UI 放 shared layer、page 只包 shared component，未來其他 tenant 可重用。
4. Click 必須走 CMS Entrance resolver，因為聯絡我們可能是外連、客服、遊戲或內部 route。

## 驗收條件

- [ ] `/ContactUs` 可直接開啟，未登入也可進入。
- [ ] 頁面呼叫 CMS list API，request 帶 `type=CMS_TYPE_ENUMS.CONTACT_US`。
- [ ] CMS 回傳多筆聯絡方式時，每筆各顯示一個 icon 與 label；沒有重複三次渲染同一份 list。
- [ ] `Setting.icon_lang` 圖片 URL 正確套 `imageBase` 與 version。
- [ ] `Setting.contact_lang` 依目前 locale 顯示，缺精準 locale 時 fallback。
- [ ] 點擊有 `Entrance[0]` 的 item 會依入口類型導向或開遊戲。
- [ ] CMS empty/error/item 缺欄位時，不顯示 `undefined`、不破版、不阻塞其他頁面。
- [ ] `useStaticPageDirection().handleStaticPageAction("contact")` 導到 `/ContactUs`。
- [ ] 未修改 r001 與代理端。

## 邊界情況 / 例外

- `Entrance` 為空：item 可以顯示但點擊無動作，console 不報錯。
- `payload.link` 沒有 protocol：沿用 `ensureExternalLinkProtocol()` 補 `https://`。
- 圖片 path 已是完整 URL：不可重複加 `imageBase`。

## 測試計畫

1. Unit test `useCmsContactUs`：mock 多語、空值、圖片 URL。
2. Unit test click resolver：GAME_LINK、CUSTOM_LINK、INTERNAL_PAGE 至少各一筆。
3. 手動驗證：`pnpm nx serve r017` 後開 `/ContactUs`，切換 locale。
4. Focused build：`pnpm nx build r017`。

## Git Flow

- 分支名稱：`feat/cms-contact-us`
- 從 `main` pull 後開出。
- 推進路徑：工作分支 → `develop` → `staging` → `main`。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

若後端 CMS 聯絡我們 payload 實際欄位與 `CmsSettingItem.icon_lang/contact_lang` 不一致，先更新 spec 與型別，再繼續實作。
