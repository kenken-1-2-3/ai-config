# R017 CMS 聯絡我們懸浮入口 Spec

> **共同前提**：本需求只實作 r017 會員端。shared layer 可提供可重用能力，但不 wire up r001。實作時使用 pnpm/Nx、不執行 `tsc --noEmit`；測試檔可暫時新增用於驗證，但不得包含在 commit。
>
> **視覺來源**：以下 Figma nodes 是 PC、H5 與各互動狀態的唯一視覺依據。實作完成前必須逐一比對。

## 背景

現有 NX r017 將 CMS `CONTACT_US = 8` 實作為公開頁面 `/ContactUs`。新版設計取消獨立頁面，改為全站可拖曳的聯絡我們懸浮入口。

懸浮入口使用 Figma 固定耳機圖示；點擊後在按鈕旁展開服務面板，面板內容由 CMS type 8 回傳資料產生。

## 目標

1. 將 ContactUs 從獨立頁面改為全站懸浮按鈕。
2. PC 與 H5 共用相同元件、資料流及互動規則。
3. 重用現有 `BaseFloatingAction` 的拖曳、viewport 限制、左右吸附與位置保存能力。
4. 保留既有 CMS type 8 多語資料解析及 Entrance 點擊能力。
5. 移除 `/ContactUs` 路由，不提供 redirect。

## Figma Source of Truth

### PC

- Default button：[`15133:201837`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15133-201837)
- Hover button：[`15133:201915`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15133-201915)
- Expanded panel：[`15133:203681`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15133-203681)

### H5

- Default button：[`15133:204031`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15133-204031)
- Expanded panel：[`15133:204766`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15133-204766)

## 範圍

### 做

1. 新增全站掛載的 `CmsContactUsFloatingEntry`。
2. 使用 `BaseFloatingAction` 實作 64×64 懸浮按鈕。
3. 懸浮按鈕使用 Figma 固定耳機圖示，不使用 CMS `Setting.icon_lang`。
4. 使用 `/v1/player/cms/detail/list?type=8` 取得 ContactUs 清單。
5. 依目前 locale 解析 CMS 多語欄位。
6. 點擊懸浮按鈕展開或收合服務面板。
7. 面板依按鈕所在畫面區域自動決定展開方向。
8. 點擊卡片沿用既有 CMS Entrance resolver、遊戲開啟及外部連結行為。
9. 移除現有 `/ContactUs` page、route constant 與 static-page mapping。

### 不做

- 不修改 CMS 後台或 API schema。
- 不使用 CMS `display_login` 控制 ContactUs 顯示。
- 不修改 r001 或代理端。
- 不改造其他懸浮功能，例如 Claim Gift 或 CMS Floating Icon。
- 不新增 `/ContactUs` redirect 或相容頁。
- 不新增非 Figma 指定的動畫、樣式或功能。

## 顯示規則

- ContactUs 懸浮入口在 r017 全站顯示，包含：
  - 首頁及一般公開頁。
  - 登入、註冊及忘記密碼頁。
  - 會員中心 `/member/**`。
  - 已登入與未登入狀態。
- ContactUs 不套用 `Setting.payload.display_login` 過濾。這與舊專案直接使用未過濾 `cmsContactUsList` 的行為一致。
- API loading 時不先顯示空按鈕。
- API error 或 type 8 清單為空時，整組懸浮入口與面板不顯示。

## 懸浮按鈕

### 視覺

- PC 與 H5 尺寸均為 `64 × 64px`。
- 使用 Figma 固定耳機 SVG／圖示資產。
- Default：
  - 背景 token：`--icon-icon-secondary-enabled`，fallback `#1d125d`。
  - 耳機圖示／光暈：`--icon-icon-accent`，fallback `#ea580c`。
  - 圓角：full circle。
  - shadow：對齊 Figma `0 0 4px` accent glow。
- PC hover：
  - 背景改為 `--icon-icon-secondary-hover`，fallback `#0f073d`。
  - 不額外加入 Figma 未定義的位移或放大效果。
- H5 不要求 hover state。

### 拖曳

完整沿用 `BaseFloatingAction`：

- Pointer drag 支援 mouse、touch 與 pen。
- 拖曳位置限制在 viewport 內。
- 放開後吸附到最近的左側或右側邊界。
- 位置存入 localStorage，重新整理後恢復。
- viewport resize 後重新 clamp 並保存合法位置。
- 使用 ContactUs 專屬 storage key，不能覆蓋其他懸浮元件的位置。
- 拖曳超過 threshold 不觸發展開；單純點擊才切換面板。

## 展開面板

### 位置與方向

- 面板錨定於懸浮按鈕。
- 按鈕位於 viewport 上半部時，面板向下展開。
- 按鈕位於 viewport 下半部時，面板向上展開。
- 面板位於按鈕吸附側：
  - 按鈕在左側時，面板左緣對齊按鈕左側。
  - 按鈕在右側時，面板右緣對齊按鈕右側。
- 按鈕與面板間距依 Figma 實作；面板不得超出 viewport 水平邊界。
- 展開方向由目前按鈕位置決定，不固定向上。

### 尺寸與捲動

- Figma 基準尺寸：`196px` 寬；兩筆範例資料時高度 `540px`。
- 面板內容依 CMS 筆數自然增長，但最大高度不得超出 viewport 可用空間。
- 超過可用高度時，只允許面板內容區垂直捲動；頁面本身不應因面板開啟而鎖住或跳動。
- PC 與 H5 使用相同面板寬度和卡片尺寸，除非實際 viewport 小於安全邊距。

### 視覺

- 面板背景：`--surface-surface-contrainer`，fallback `#000025`。
- 外框：依 Figma gradient/card/border 效果，視覺結果需符合橘色半透明邊框。
- 圓角：`12px`。
- 內距：`16px`。
- 區塊間距：`16px`。
- Header：
  - 固定文字 `Service`，不讀 CMS、不使用 i18n。
  - Open Sans Bold 700、14px、line-height 20px、白色。
  - 右側為 Figma close icon，20×20px。
- 面板出現／消失可使用短 opacity + translate transition；不得加入彈跳、旋轉等額外效果。

### 關閉方式

以下操作皆可關閉面板：

1. 點擊 Header 右上角 X。
2. 面板開啟時再次點擊懸浮按鈕。
3. 點擊面板與按鈕以外的頁面空白處。

點擊面板內部、捲動內容或拖曳 scrollbar 不得誤關閉。

## CMS 資料映射

每一筆 CMS type 8 item 對應一張 QR Code／聯絡方式卡片：

| UI 欄位 | CMS 欄位 |
|---|---|
| 卡片頂部標題 | `Setting.lang` |
| QR Code／聯絡圖片 | `Setting.contact_img_lang` |
| 卡片底部帳號文字 | `Setting.contact_lang` |
| 點擊行為 | `Entrance[0]` |

### 多語與圖片

- 所有多語欄位依目前 locale 解析。
- 缺精準 locale 時，依既有 resolver 採語系 prefix fallback，再取第一個非空值。
- `contact_img_lang` 使用 `buildCmsImageUrl()` 補 `imageBase` 與 `updated_time` version。
- 完整 URL 不得重複加 base。
- `Setting.icon_lang` 不再用於懸浮按鈕，也不需要顯示在面板。

### 卡片視覺

- 卡片背景：`--card-card-bg-primary-enabled`，fallback `#1d125d`。
- 卡片寬度填滿面板內容區，Figma 基準為 `164px`。
- 卡片圓角：`12px`。
- 卡片 padding：上下 `8px`、左右 `12px`。
- 卡片內間距：`8px`。
- 頂部標題區：
  - 高度 `28px`。
  - 背景與面板相同。
  - 圓角 `8px`。
  - 文字 Open Sans Bold 700、14px／20px、白色、置中。
- 圖片：
  - Figma 基準 `140 × 140px`。
  - 圓角 `8px`。
  - `object-fit: cover`。
- 底部帳號區：
  - 高度 `28px`。
  - 文字 Open Sans Bold 700、14px／20px、白色、置中。
- 多筆資料垂直排列，卡片間距 `16px`。

## CMS Entrance 行為

- 保留既有 `useCmsContactUs` click flow：
  - `GAME_LINK` 使用 `useOpenGame()`。
  - External link 使用既有 protocol normalization 與 navigation resolver。
  - Internal route 使用 `navigateTo()`。
- 必須沿用 `handleGlobalClick()` debounce，避免重複點擊。
- `Entrance` 為空時，卡片仍可顯示但不可點擊，且不得報錯。
- 點擊有 Entrance 的卡片後，不強制關閉面板；除非實際 navigation 造成 route/page 變更。

## 架構與預期檔案

### 建議結構

- `useCmsContactUs.ts`
  - 負責 type 8 query、多語資料映射、圖片 URL 與 Entrance 行為。
  - view-model 增加 `title`、`contactImageUrl`、`contactText`。
  - 不負責拖曳、展開方向或 DOM interaction。
- `CmsContactUsFloatingEntry.vue`
  - 負責全站懸浮入口、展開狀態、面板、close/backdrop 與 Figma 樣式。
  - 組合 `BaseFloatingAction` 與 `useCmsContactUs`。
- `BaseFloatingAction.vue`
  - 原則上重用既有 API。
  - 若 overlay 定位資訊不足，只能做向後相容的小幅擴充，不得破壞 Claim Gift 或 CMS Floating Icon。

### 預期變更

- Create or rename:
  - `libs/shared/ui-layer/src/lib/components/cmsContactUs/CmsContactUsFloatingEntry.vue`
- Modify:
  - `apps/r017/src/layouts/default.vue`
  - `libs/shared/ui-layer/src/lib/composables/useCmsContactUs.ts`
  - 視需要小幅修改 `libs/shared/ui-layer/src/lib/components/BaseFloatingAction.vue`
- Delete:
  - `apps/r017/src/pages/ContactUs.vue`
  - 舊頁面專用 `CmsContactUsView.vue`（若不再被其他程式引用）
- Remove:
  - `ROUTE_PATH.CONTACT_US`
  - `useStaticPageDirection()` 中 `contact → /ContactUs` mapping

實作者須先以 `rg` 確認所有 `/ContactUs`、`CONTACT_US` route constant 與舊元件引用，再刪除，避免留下 dead import。

## Loading、Error 與不完整資料

- Loading：不顯示懸浮入口，避免先顯示後消失。
- API error：整組隱藏，不顯示英文錯誤訊息或空面板。
- Empty list：整組隱藏。
- 缺 `Setting.lang`：卡片標題區保留，但不得顯示 `undefined`。
- 缺 `contact_img_lang`：不顯示破圖；卡片保留其他有效資料。
- 缺 `contact_lang`：底部文字區不得顯示 `undefined`。
- 圖片載入失敗：隱藏失敗圖片，不影響其他卡片。
- 缺 Entrance：顯示卡片但套用不可點擊狀態。

## Accessibility

- 懸浮按鈕使用真正的 `button`，提供可理解的 `aria-label`。
- 支援 Enter 與 Space 開關面板。
- 關閉按鈕使用真正的 `button`，提供 `aria-label="Close Service"`。
- 面板需有可辨識的 dialog／region semantics，標題與容器建立關聯。
- 展開後不強制 focus trap，因它不是 modal dialog；鍵盤仍可操作頁面。
- Escape 關閉面板。
- `prefers-reduced-motion` 時移除非必要 transition。

## 驗收條件

### 路由與掛載

- [ ] `/ContactUs` page 已移除，直接造訪該 URL 走 Nuxt 既有 404 行為，不 redirect。
- [ ] `ROUTE_PATH.CONTACT_US` 與 static page `contact` mapping 已移除。
- [ ] r017 default layout 全站掛載 ContactUs floating entry。
- [ ] r001 未被掛載或改動。

### 顯示與資料

- [ ] type 8 loading、error 或 empty 時不顯示懸浮入口。
- [ ] type 8 有至少一筆資料時顯示 64×64 固定 Figma 耳機按鈕。
- [ ] 登入前、登入後及 `/member/**` 都顯示。
- [ ] ContactUs 不受 `display_login` 影響。
- [ ] 懸浮入口不使用 `Setting.icon_lang`。
- [ ] 面板卡片正確顯示 `Setting.lang`、`Setting.contact_img_lang`、`Setting.contact_lang`。

### 拖曳與展開

- [ ] Mouse/touch drag 均可移動按鈕。
- [ ] 拖曳後吸附最近的左右邊界並保存位置。
- [ ] 重新整理後恢復保存位置。
- [ ] 拖曳不誤觸展開。
- [ ] 按鈕在 viewport 上半部時面板向下展開。
- [ ] 按鈕在 viewport 下半部時面板向上展開。
- [ ] 面板不超出 viewport；內容過多時面板內可垂直捲動。
- [ ] 點 X、再次點懸浮按鈕、點外部空白及按 Escape 都可關閉。
- [ ] 點面板內部不會關閉。

### 視覺

- [ ] PC default、hover、expanded 與 H5 default、expanded 逐一比對指定 Figma nodes。
- [ ] 按鈕尺寸、背景、hover、耳機圖示與 accent glow 符合 Figma。
- [ ] 面板為 196px 寬，header、close icon、卡片、QR 圖片、間距、圓角及色彩符合 Figma。
- [ ] 不存在額外放大、漂浮、彈跳或非 Figma 動畫。

### 點擊行為

- [ ] 有 Entrance 的卡片可依類型正確處理遊戲、外連及內部 route。
- [ ] 無 Entrance 的卡片不可點擊且不報錯。
- [ ] 快速重複點擊受到既有 debounce 保護。

## 測試計畫

1. Unit test `useCmsContactUs`：
   - type 8 query。
   - locale exact/prefix/fallback。
   - `Setting.lang`、`contact_img_lang`、`contact_lang` mapping。
   - 圖片 base/version。
   - 不使用或過濾 `display_login`。
   - 空 Entrance。
2. Unit test Entrance click：
   - `GAME_LINK`。
   - external link。
   - internal route。
3. Component test：
   - loading/error/empty 隱藏。
   - toggle、X、outside click、Escape。
   - 上半部向下、下半部向上。
   - 點擊面板內不關閉。
4. `BaseFloatingAction` regression：
   - drag threshold。
   - edge snapping。
   - localStorage restore。
   - resize clamp。
   - 現有 Claim Gift 與 CMS Floating Icon 行為不受影響。
5. Browser verification：
   - PC default／hover／expanded。
   - H5 default／expanded。
   - 首頁、公開頁、登入頁、會員中心。
   - 將按鈕拖至左右及上下區域後展開。
6. Focused build：`pnpm exec nx build r017`。

## Git Flow

- 實作分支依目前主功能分支安排；不要自行新開或切換分支。
- 工作完成後依環境順序推進 `develop` → `staging` → `main`。
- 合併任何分支前必須取得使用者確認。
- 不得主動建立 MR／PR。

## 交接備註

- Figma MCP node 是視覺 source of truth；若實作與本 spec 的 fallback 色值有差異，以 Figma variable/token 與實際 theme token 為準。
- Figma asset URL 有時效性。實作時必須將固定耳機圖示轉存為 repo asset 或使用專案既有等價 SVG，不得把短效 MCP URL 寫進 production code。
- 若後端 type 8 實際 payload 缺少 `contact_img_lang`，先更新本 spec 與型別，再繼續實作；不得自行改用 `icon_lang` 代替。
