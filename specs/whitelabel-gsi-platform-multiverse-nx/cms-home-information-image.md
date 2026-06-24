# R017 CMS 首頁形象圖 Spec
> **共同前提**：本批 CMS spec 先以 r017 會員端為 target；shared layer 做可重用能力，但不 wire up r001。實作時遵守專案規則：package manager 用 pnpm/Nx、不跑 `tsc --noEmit`、測試檔可暫時新增但 commit 前移除。
>
> **舊專案參考**：`/Users/kenyu/wow/Whitelabel_GSI_Platform_Multiverse`。

## 背景 / 目標

把舊會員端 CMS 首頁 Information 圖片串進 NX r017 首頁。此功能使用 CMS `HOME_INFORMATION_IMAGE = 9`，不是既有 banner carousel。舊版會在首頁顯示最多三張形象圖，依數量切換單欄、雙欄、左大右二版面。

需求列項：`CMS首頁形象圖串接`。

## 範圍

**做**：

1. 新增 shared composable：`libs/shared/ui-layer/src/lib/composables/useCmsHomeInformationImage.ts`。
2. 新增 shared UI：`libs/shared/ui-layer/src/lib/components/home/HomeInformationImageSection.vue`。
3. 在 `libs/shared/ui-layer/src/lib/components/views/HomeView.vue` 接入此 section。
4. 使用 CMS list type `CMS_TYPE_ENUMS.HOME_INFORMATION_IMAGE`。
5. 依 `display_device` 過濾 PC/mobile。
6. 每張圖使用 `Setting.img_lang[locale]`，透過 `buildCmsImageUrl()` 補 `imageBase` 與 `updated_time`。
7. 最多顯示前三筆：1 筆單欄、2 筆雙圖、3 筆左大圖加右側兩張；手機版直向堆疊。
8. 若 item 有 `Entrance[0]`，點擊圖片沿用 CMS Entrance 導航/openGame 行為。

## Out of scope

- 不修改 `HomeBanner.vue` 的 banner API 行為。
- 不把 `HOME_INFORMATION_IMAGE` 合併進 `CMS_TYPE_ENUMS.HOME` 的 `HomeCmsSection`。
- 不新增 CMS 後台資料。
- 不重做首頁 GameTab、Marquee、RankBoard、ProviderList。
- 不修改 r001 或代理端。

## 受影響範圍

預期檔案：

- Create: `libs/shared/ui-layer/src/lib/composables/useCmsHomeInformationImage.ts`
- Create: `libs/shared/ui-layer/src/lib/components/home/HomeInformationImageSection.vue`
- Modify: `libs/shared/ui-layer/src/lib/components/views/HomeView.vue`
- Reuse: `libs/shared/ui-layer/src/lib/api/hooks/useCmsListQuery.ts`
- Reuse: `libs/shared/ui-layer/src/lib/composables/cmsResourceHelpers.ts`
- Reuse: `libs/shared/ui-layer/src/lib/composables/useSideMenu/resolver.ts`

## 參考實作 / 要遵循的現有 pattern

舊專案：

- `template/set_r022/pages/HomePage/Components/HomeInformationCMS.vue`
- `template/set_r023/pages/HomePage/Components/HomeInformationCMS.vue`
- `src/common/composables/useCms.ts` 的 `cmsHomeInformationImageList`。
- `src/common/apiHooks/cms/processCmsListFromAll.ts`：`HOME_INFORMATION_IMAGE` 做圖片 URL 裝飾與 device filter。

NX pattern：`HomeView.vue`、`HomeBanner.vue`、`HomeCmsSection.vue`、`useHome()`、`cmsResourceHelpers.ts`。

## 關鍵決策與理由

1. `HOME_INFORMATION_IMAGE = 9` 獨立於 `BANNER_POSITION_ENUMS.HOME = 1`，兩個後台模組與 API 不同。
2. Section 放在 `HomeBanner` 之後、CMS home sections 之前，對齊舊首頁資訊圖的優先露出位置。
3. 最多顯示前三筆，不新增 carousel，避免 scope 擴大。
4. 使用 shared component，因為 r017 首頁已使用 shared `HomeView`。
5. 圖片點擊沿用 Entrance resolver，支援外連、custom page、game link。

## 驗收條件

- [ ] 首頁載入時會呼叫 CMS list API，request 帶 `type=CMS_TYPE_ENUMS.HOME_INFORMATION_IMAGE`。
- [ ] CMS type 9 有資料時，首頁顯示形象圖區塊，且不取代 `HomeBanner`。
- [ ] 1 筆顯示單張滿寬圖；2 筆顯示雙圖 layout；3 筆以上只取前三筆並顯示左大右二 layout。
- [ ] 手機版形象圖不橫向撐破畫面。
- [ ] 圖片依 locale 取 `Setting.img_lang`，缺精準 locale 時 fallback。
- [ ] 圖片 URL 正確套 `runtimeConfig.public.imageBase` 與 `updated_time`。
- [ ] `display_device` 正確過濾 PC/mobile。
- [ ] item 有 `Entrance[0]` 時，點擊圖片依入口類型導向或開遊戲。
- [ ] CMS empty/error 時首頁其他內容正常顯示。
- [ ] 未修改 r001 與代理端。

## 邊界情況 / 例外

- CMS 超過三張：只顯示前三張，依後端排序原樣排序。
- 某張缺目前語系圖片：可 fallback；完全沒有圖片則不渲染該 item。
- 圖片比例不一致：容器使用固定 aspect ratio 或 object-fit，避免 layout shift。
- `updated_time` 無效：仍顯示圖片，只是不加 version query。

## 測試計畫

1. Unit test `useCmsHomeInformationImage`：0/1/2/3/4 筆資料的 visible list 與 layout class。
2. Unit test image fallback 與 display_device 過濾。
3. Component test：點擊有 Entrance 的圖片會呼叫 navigation/openGame 分支。
4. 手動驗證：`pnpm nx serve r017`，PC 與 mobile viewport 看首頁 layout。
5. Focused build：`pnpm nx build r017`。

## Git Flow

- 分支名稱：`feat/cms-home-information-image`
- 從 `main` pull 後開出。
- 推進路徑：工作分支 → `develop` → `staging` → `main`。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

實作前先確認 `HomeView.vue` 的實際順序是否仍為 `HomeBanner` → Marquee → CMS home sections → ProviderList → RankBoard；若已有變更，保持「形象圖不取代 banner、不破壞既有首頁區塊」這個原則。
