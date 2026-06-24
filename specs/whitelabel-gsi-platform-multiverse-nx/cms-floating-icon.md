# R017 CMS 懸浮圖標 Spec
> **共同前提**：本批 CMS spec 先以 r017 會員端為 target；shared layer 做可重用能力，但不 wire up r001。實作時遵守專案規則：package manager 用 pnpm/Nx、不跑 `tsc --noEmit`、測試檔可暫時新增但 commit 前移除。
>
> **舊專案參考**：`/Users/kenyu/wow/Whitelabel_GSI_Platform_Multiverse`。

## 背景 / 目標

把舊會員端 CMS 懸浮圖標串進 NX r017。畫面右側顯示可展開/收合的浮動入口，展開後列出 CMS `FLOATING_ICON = 7` 清單；主開關 icon 由 `/platform/v1/player/cms/features/floating-icon/main` 提供語系化圖片。

需求列項：`CMS懸浮圖標串接`。

## 範圍

**做**：

1. 修正 `getFloatIcon("main")` API response type：舊 API 回傳 `data.list`，NX 型別需是 `list` 包裝。
2. 新增 shared composable：`libs/shared/ui-layer/src/lib/composables/useCmsFloatingIcon.ts`。
3. 新增 shared UI：`libs/shared/ui-layer/src/lib/components/cmsFloatingIcon/CmsFloatingIconEntry.vue`。
4. 在 `apps/r017/src/layouts/default.vue` 掛上 `<CmsFloatingIconEntry />`，位置與 `ClaimGiftFloatingEntry` 同層。
5. 使用 CMS list type `CMS_TYPE_ENUMS.FLOATING_ICON` 取得展開項目。
6. 使用 `getFloatIcon("main")` 取得主開關 icon，依 locale 選 `storage_key`；無對應語系時 fallback。
7. 展開項目顯示 `Setting.lang` label 與 `Setting.icon_lang` icon，並依 `display_device` 過濾 PC/mobile。
8. 點擊展開項目沿用 CMS Entrance 導航/openGame 行為。

## Out of scope

- 不取代既有 `ClaimGiftFloatingEntry`。
- 不實作彈窗內容管理。
- 不新增 CMS 後台資料。
- 不新增一套全站 drag/drop 系統；若使用 `BaseFloatingAction`，僅沿用既有能力。
- 不修改 r001 或代理端。

## 受影響範圍

預期檔案：

- Modify: `libs/shared/ui-layer/src/lib/api/apiFunctions/cms_getFloatIcon.ts`
- Create: `libs/shared/ui-layer/src/lib/composables/useCmsFloatingIcon.ts`
- Create: `libs/shared/ui-layer/src/lib/components/cmsFloatingIcon/CmsFloatingIconEntry.vue`
- Modify: `apps/r017/src/layouts/default.vue`
- Reuse: `libs/shared/ui-layer/src/lib/components/BaseFloatingAction.vue`
- Reuse: `libs/shared/ui-layer/src/lib/composables/useSideMenu/resolver.ts`
- Reuse: `libs/shared/ui-layer/src/lib/composables/cmsResourceHelpers.ts`

## 參考實作 / 要遵循的現有 pattern

舊專案：

- API：`src/api/cms.ts` 的 `getFloatIcon(type)`。
- Type：`src/api/response.type.ts` 的 `CmsFlotIconListPayload`。
- UI：`template/set_r017/components/FloatIconCMS/Index.vue`。
- Common state：`src/common/composables/useCms.ts` 的 `floatingIconList`、`handleCmsFloatIcon()`、`floatIcon`。

NX pattern：`BaseFloatingAction.vue`、`ClaimGiftFloatingEntry.vue`、`useCmsListQuery.ts`、`cmsResourceHelpers.ts`。

## 關鍵決策與理由

1. `getFloatIcon` response 必須改成 list 包裝，否則會誤讀舊 API。
2. 主開關 icon 走 `getFloatIcon("main")`，展開項目走 CMS list type 7；兩個資料源都需要。
3. 優先用 `BaseFloatingAction`，避免重寫 pointer/定位邏輯。
4. 不合併贈金浮標，避免功能條件互相污染。
5. 點擊項目用共用 CMS entrance resolver，不寫死單一路徑。

## 驗收條件

- [ ] r017 layout 載入後，若 CMS type 7 有資料，畫面右側顯示 CMS floating entry。
- [ ] 初始只顯示主開關 icon；點擊後展開清單，再點可收合。
- [ ] 主開關 icon 來自 `getFloatIcon("main")` 的 `data.list`，依目前 locale 選 `storage_key`。
- [ ] 主開關 API 無資料或失敗時，功能不 crash，仍可用 fallback 展開 CMS list。
- [ ] 展開項目依 CMS list type 7 顯示 label 與 icon，圖片 URL 正確套 `imageBase` 與 `updated_time`。
- [ ] `display_device` 正確過濾 PC/mobile。
- [ ] 點擊展開項目會依 `Entrance[0]` 正確導向或開遊戲。
- [ ] 與 `ClaimGiftFloatingEntry` 同時存在時不互相遮擋主要底部導覽。
- [ ] API error 或空清單時不顯示 undefined、不阻塞 app。
- [ ] 未修改 r001 與代理端。

## 邊界情況 / 例外

- `data.list` 有多語但沒有目前 locale：fallback 到同語系 prefix，再 fallback 第一筆。
- CMS item 沒 `Entrance[0]`：展開項目可顯示但點擊不動作。
- `icon_lang` 已是完整 URL：不可重複加 `imageBase`。
- 使用 `BaseFloatingAction` 時 storage key 建議為 `r017.cmsFloatingIcon.position`。

## 測試計畫

1. Unit test `getFloatIcon` response usage：mock list 包裝。
2. Unit test `useCmsFloatingIcon`：locale fallback、display_device、empty/error。
3. Component test：展開/收合與 item click。
4. 手動驗證：`pnpm nx serve r017`，PC/mobile viewport 各確認位置。
5. Focused build：`pnpm nx build r017`。

## Git Flow

- 分支名稱：`feat/cms-floating-icon`
- 從 `main` pull 後開出。
- 推進路徑：工作分支 → `develop` → `staging` → `main`。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

先修正 API 型別，再寫 composable/UI。若站台要求固定右側不可拖曳，仍可用 `BaseFloatingAction` 但停用/忽略拖曳能力。
