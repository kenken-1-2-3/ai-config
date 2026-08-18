# GSI-425 新會員端自訂頁面設為首頁

> 交接合約：Spec 作者產出，實作者只依此檔與 active `REQ-ID` 實作，reviewer 對照 `AC-ID`／`VT-ID` 驗證。
> 位置：`~/wow/ai-config/specs/whitelabel-gsi-platform-multiverse-nx/gsi-425-custom-page-as-home.md`

## Background / 背景與目標

- 問題與預期結果：新會員端目前在首頁讀到 CMS 首頁 ID 後會改走 `/cmsCustomPage/:id`；GSI-425 要採路徑映射模式，讓根路徑 `/` 直接顯示後端指定的自訂頁面內容，網址不跳轉。
- 目標端別與 repo：新會員端、`whitelabel-gsi-platform-multiverse-nx`；目前完整實作入口為 `apps/r017`。
- 原始需求連結：[Jira GSI-425](https://gamingsoft.atlassian.net/browse/GSI-425)

## Spec Governance / 規格治理

- Role: `CANONICAL`
- Canonical spec: `SELF`

## Scope / 範圍

- 僅處理新會員端：由 shared `HomeEntryView` 依 `GET /v1/player/settings` 回傳的 `home_custom_page_id` 選擇預設首頁或 CMS 自訂頁面；`apps/r017/src/pages/index.vue` 是目前第一個 consumer。
- 將首頁分流、CMS 自訂頁面內容 wrapper 與純分流 resolver 放在 `libs/shared/ui-layer`，供後續每一個新會員端版型共用；首頁與既有 `/cmsCustomPage/:cmsCustomPageId` route 共用同一份 CMS 詳情查詢及 section 渲染。
- `home_custom_page_id > 0` 時在 `/` 原地顯示該 ID 的自訂頁面內容，不執行 route redirect／replace。
- `home_custom_page_id` 為 `0` 時，維持既有 `HomeView` 為首頁；非契約 response（欄位缺少／settings error）不在本需求新增 fallback 行為。
- 將新會員端 settings response type 與使用端改為後端正式欄位 `home_custom_page_id`，移除本功能路徑對舊欄位 `homepage_cms_id` 的依賴。

## Out of Scope / 不在範圍

- 代理後台的首頁開關、互斥切換、權限、列表欄位與 PUT API 對接。
- 後端 DB、快取、`GET /v1/player/settings` 或 CMS detail API 的實作與部署。
- 舊會員端 `Whitelabel_GSI_Platform_Multiverse`。
- CMS 自訂頁面的編輯能力、section 種類、視覺樣式、排序、文案與互動重做。
- 新增 redirect、改寫網址或新增首頁專用 route。
- 新增 user-visible copy 或本地 locale key；本需求不需要 i18n 變更。

## Source Responsibilities / 來源職責與版本

| Source ID | Snapshot / Revision | Responsibility | Location |
| --- | --- | --- | --- |
| SRC-REQ-001 | Jira updated 2026-08-14 14:55 +08:00 | Scope / behavior | GSI-425 description「PM 決定用 B 路徑映射模式」「此需求僅先製作新架構」 |
| SRC-REQ-002 | Jira comment 356832, 2026-08-14 10:45 +08:00 | Scope / behavior | GSI-425 comment：會員端資料加入 `/v1/player/settings` |
| SRC-API-001 | Jira comment 356875, DEV contract 2026-08-14 14:55 +08:00 | API / persistence | `GET /v1/player/settings.home_custom_page_id`；非 0 代表根路徑顯示指定 CMS，無設定回 0 |
| SRC-DEC-001 | User task message, 2026-08-14 | User decision | 「只做新會員端；直接把 CMS 頁面包起來，在 index 用後端回傳資料判定切換」 |
| SRC-DEC-002 | User follow-up, 2026-08-14 | User decision | 「之後的每一個版型也會用到這個邏輯」；確認首頁分流與 CMS wrapper 應成為 shared capability |
| SRC-CODE-001 | `origin/main@b20af5b` | Implementation pattern | `apps/r017/src/pages/index.vue`：現況使用 `homepage_cms_id` 並 `router.replace` |
| SRC-CODE-002 | `origin/main@b20af5b` | Implementation pattern | `apps/r017/src/pages/cmsCustomPage/[cmsCustomPageId].vue`：現有 CMS detail query、loading 與 section renderer |
| SRC-CODE-003 | `origin/main@b20af5b` | Implementation pattern | `libs/shared/ui-layer/src/lib/api/commonTypes/settingType.ts`、`useSetting.ts`、`useCmsDetailQuery.ts` |

## Requirement Traceability Matrix / 需求追蹤矩陣

| REQ-ID | Source anchor / asset | UI surface | API / persistence | Status | Decision ID | Acceptance ID | Verification ID / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | SRC-REQ-001; SRC-REQ-002; SRC-API-001; SRC-DEC-001; SRC-CODE-001; SRC-CODE-003 | 根路徑 `/` 的首頁內容選擇 | `GET /v1/player/settings.home_custom_page_id`；`> 0` 選 CMS，`0` 選預設首頁 | CONFIRMED | DEC-001; DEC-002 | AC-001; AC-002; AC-003 | VT-001; VT-002; VT-003; VT-006 |
| REQ-002 | SRC-REQ-001; SRC-DEC-001; SRC-CODE-001; SRC-CODE-002 | `/` 在 CMS 首頁模式下原地呈現指定自訂頁面，網址保持 `/` | 使用 `home_custom_page_id` 呼叫既有 CMS detail API；不新增 persistence | CONFIRMED | DEC-001 | AC-002; AC-004 | VT-002; VT-006 |
| REQ-003 | SRC-API-001; SRC-DEC-001; SRC-CODE-001 | `home_custom_page_id` 為 `0` 時呈現既有 `HomeView` | 不得用 `0` 呼叫 CMS detail；沿用 settings response | CONFIRMED | DEC-001 | AC-003 | VT-003; VT-006 |
| REQ-004 | SRC-DEC-001; SRC-CODE-002; SRC-CODE-003 | `/` 與 `/cmsCustomPage/:cmsCustomPageId` 使用同一份 CMS 自訂頁面內容／loading 呈現 | 沿用 `useCmsDetailQuery(cmsId)`；不新增 endpoint | CONFIRMED | DEC-001 | AC-005; AC-006 | VT-004; VT-005 |
| REQ-005 | SRC-API-001; SRC-CODE-001; SRC-CODE-003 | N/A — settings response type 與 obsolete binding 清理由靜態檢查驗證，不新增 UI | `ISetting` 使用 API 契約要求的 `home_custom_page_id: number`；本功能移除 `homepage_cms_id` 讀取 | CONFIRMED | N/A — API 欄位契約已明確 | AC-001; AC-007 | VT-001; VT-005 |
| REQ-006 | SRC-REQ-001; SRC-DEC-001 | 僅新會員端現有首頁與 CMS 自訂頁面，其他端別無 UI 變更 | 不修改代理端、舊會員端或後端 | CONFIRMED | DEC-002 | AC-008 | VT-007 |
| REQ-007 | SRC-DEC-002; SRC-CODE-001; SRC-CODE-002; SRC-CODE-003 | shared `HomeEntryView` 與 CMS wrapper；`r017/index.vue` 為薄入口，後續新會員端版型可直接重用 | 沿用 shared `useSetting()`、`useCmsDetailQuery()` 與正式 settings field；不新增 endpoint | CONFIRMED | DEC-003 | AC-009 | VT-008 |

## Source Conflicts / 未決與來源衝突

- 無。repo 現況 `homepage_cms_id`／route redirect 與 Jira DEV API 契約及使用者本輪決策不同；這是已由 DEC-001 明確覆蓋的舊實作，不是未決衝突。

## Affected Area / 受影響範圍

- 端別、repo、模組、route、template/siteKey：新會員端；`whitelabel-gsi-platform-multiverse-nx`；shared UI layer 與目前 consumer `apps/r017`；`/` 與 `/cmsCustomPage/:cmsCustomPageId`。
- 預期修改：`apps/r017/src/pages/index.vue`、`apps/r017/src/pages/cmsCustomPage/[cmsCustomPageId].vue`、`libs/shared/ui-layer/src/lib/api/commonTypes/settingType.ts`。
- 預期新增：`libs/shared/ui-layer/src/lib/components/views/HomeEntryView.vue`、shared CMS wrapper component 與 shared 純分流 resolver；不得保留功能相同的 r017 app-local duplicate。
- 可重用且不改行為：`libs/shared/ui-layer/src/lib/api/hooks/useCmsDetailQuery.ts` 與 `libs/shared/ui-layer/src/lib/components/cmsCustomPage/CmsCustomPageSection.vue`。
- 跨站／共用程式影響：使用者已確認此邏輯供後續每一個新會員端版型使用；本次建立 shared capability 並接上 r017，但不順帶改寫目前 scaffold 性質的 `apps/r001` UI。
- 不得碰的使用者既有 local changes：`libs/shared/ui-layer/src/lib/stores/memberAsideStore.ts` 目前已有未提交修改，與 GSI-425 無關，實作與提交時不得覆寫或帶入。

## Existing Patterns / 參考實作

- `libs/shared/ui-layer/src/lib/components/views/HomeEntryView.vue`：集中 `useSetting()`、settings loading gate 與預設首頁／CMS 首頁分流；tenant `index.vue` 只掛載此入口元件。
- `libs/shared/ui-layer/src/lib/components/cmsCustomPage/`：集中 CMS detail query、spinner、container class 與 `CmsCustomPageSection` 迴圈；app-local route 只負責 route param 與既有 not-found 導回首頁行為。
- `libs/shared/ui-layer/src/lib/api/hooks/useCmsDetailQuery.ts`：以 numeric CMS ID、locale 與既有 query options 取得 CMS detail。
- `libs/shared/ui-layer/src/lib/api/commonTypes/settingType.ts`：以正式 snake_case API field 宣告 settings response。

## Decision Log / 關鍵決策與理由

| Decision ID | Date | REQ-ID | Decision + reason | Approval / source |
| --- | --- | --- | --- | --- |
| DEC-001 | 2026-08-14 | REQ-001; REQ-002; REQ-003; REQ-004 | 採 index 內條件渲染：CMS 自訂頁面包成元件後由後端 ID 切換；不再 redirect，符合 Jira 的路徑映射模式與乾淨根網址 | SRC-DEC-001 |
| DEC-002 | 2026-08-14 | REQ-001; REQ-006 | 本次只做新會員端，不實作代理端、舊會員端或後端工作 | SRC-DEC-001 |
| DEC-003 | 2026-08-14 | REQ-007 | 首頁分流、CMS wrapper 與 resolver 放到 shared UI layer；r017 只消費 shared 入口，讓後續每個新會員端版型直接重用同一邏輯，但本次不改 r001 現有 UI | SRC-DEC-002 |

## Acceptance Criteria / 驗收條件

- [x] AC-001: `ISetting` 能以 `home_custom_page_id: number` 表示 DEV API response，首頁判斷只讀這個正式欄位。
- [x] AC-002: 當 settings 回傳 `home_custom_page_id = 123`，使用者進入 `/` 會看到 CMS ID 123 的自訂頁面 sections。
- [x] AC-003: 當 `home_custom_page_id = 0`，使用者進入 `/` 會看到既有 `HomeView`，且不發送 CMS detail ID 0 的請求。
- [x] AC-004: CMS 首頁模式載入及呈現期間，瀏覽器網址保持 `/`，不執行 `router.push`、`router.replace` 或對 `/cmsCustomPage/123` 的 navigation。
- [x] AC-005: CMS 自訂頁面的 detail query、loading spinner、container layout 與各 `CmsCustomPageSection` 渲染集中於單一 reusable wrapper，`index.vue` 不複製整份 CMS page template。
- [x] AC-006: 直接開啟 `/cmsCustomPage/123` 仍使用同一 reusable wrapper 顯示 CMS ID 123；現有 invalid-detail 導回首頁行為保留在 route wrapper，不污染 index 的條件切換。
- [x] AC-007: 完整搜尋本功能相關檔案後，`homepage_cms_id` 舊欄位與 `index.vue` 的 `toCmsCustomPageRoute`／CMS 首頁 redirect binding 均無剩餘引用。
- [x] AC-008: diff 不包含代理端、舊會員端、後端、`apps/r001` UI、CMS section 行為／樣式或新文案變更。
- [x] AC-009: shared UI layer 擁有唯一的首頁分流 resolver、`HomeEntryView` 與 CMS wrapper；`apps/r017/src/pages/index.vue` 只掛載 shared `HomeEntryView`，direct CMS route 只傳入 route ID 與處理既有 not-found，且 r017 不保留同功能 app-local duplicate。

## Edge Cases / 邊界與狀態

- loading：settings 尚未完成時不得先掛載 `HomeView` 或 CMS wrapper；settings 完成並選定 CMS 後，沿用 reusable CMS wrapper 的既有 loading spinner。
- empty：`home_custom_page_id = 0` 屬預設首頁分支，不是錯誤；CMS detail 回 `null` 時不新增無來源文案，direct route 保留既有導回首頁行為，index 只沿用 wrapper 的 empty 呈現。
- error / API unavailable：不新增 fallback copy、toast、redirect 或假資料；維持既有 query/error 行為，並在驗證報告記錄實際結果。若產品要指定 fallback，先更新 spec。
- permission：`GET /v1/player/settings` 與 CMS detail 都是既有會員端讀取流程；本需求不新增權限 UI。
- 合法阻擋：只有既有 loading 與 API query lifecycle；不得以 API 缺口預先隱藏已選定的 CMS 功能。
- 後端 constraint：後端保證 `home_custom_page_id` 為目前首頁 CMS ID，無設定回 `0`；前端不重做代理級互斥或刪除同步邏輯。
- create / edit / detail / copy 等相關狀態：只讀首頁與既有 CMS detail；不新增 create/edit/copy。

## Verification Plan / 驗證計畫

- [x] VT-001: 執行 `rg -n "homepage_cms_id|home_custom_page_id|toCmsCustomPageRoute|router\\.(push|replace)" apps/r017/src/pages/index.vue apps/r017/src/pages/cmsCustomPage libs/shared/ui-layer/src/lib/api/commonTypes/settingType.ts`，確認正式欄位存在且 obsolete redirect binding 無殘留；Evidence: 2026-08-14 read-back 僅見 `index.vue` 的 `home_custom_page_id`、settings type 正式欄位，以及 direct CMS route 保留的 invalid-detail `router.replace`。
- [x] VT-002: 新增 focused Vitest 驗證首頁分流 resolver：`home_custom_page_id > 0` 產生 CMS 模式與原始 numeric CMS ID；再由 VT-006 驗證實際 wrapper／sections 與無 navigation；Evidence: `homePageContent.spec.ts` 先取得預期 RED，再以 `vitest run` 得到 2/2 GREEN；依 repo 規則於驗證後移除暫存 test file。
- [x] VT-003: focused Vitest 覆蓋正式無設定值 `0`，驗證 resolver 選擇既有預設首頁模式；再由 VT-006 的 Network evidence 確認不發送 CMS detail ID 0；Evidence: resolver 的 `0` case GREEN；Chrome 本地 mock `home_custom_page_id=0` 顯示 `defaultHomeMarkers=1`、`cmsWrapperCount=0`。
- [x] VT-004: 以 Chrome 直接開啟 `/cmsCustomPage/:id`，驗證 route 仍顯示與 `/` CMS 模式相同的 reusable wrapper 內容；Evidence: Chrome `http://127.0.0.1:4173/cmsCustomPage/123` 回讀 `cmsWrapperCount=1` 且 URL 未改寫。
- [x] VT-005: 執行既有可用的 focused tests 與 `pnpm nx build r017`；repo 無 project-defined `ts-check` target 時回報 `TYPECHECK_UNAVAILABLE`，不得改跑 `tsc --noEmit`；Evidence: `NX_DAEMON=false ./node_modules/.bin/nx build r017 --verbose` 成功；完整既有 Vitest 11/11 通過；`TYPECHECK_UNAVAILABLE`（r017 無 project-defined type-check target）。
- [x] VT-006: 以 Chrome 對 DEV／本地頁面做 runtime smoke：分別讓 settings 回 `0` 與非 0，保留 Network evidence（settings field、CMS detail ID）與 `/` URL 截圖；Evidence: 本地 mock `123` 時 `/` 回讀 `cmsWrapperCount=1`、`defaultHomeMarkers=0`、URL 保持 `/`；mock `0` 時 `/` 回讀 `cmsWrapperCount=0`、`defaultHomeMarkers=1`。真實 DEV localhost 因既有 Agent Domain 驗證不可用，mock 已在驗證後移除。
- [x] VT-007: 執行 `git diff --name-only <base>...HEAD` 與 `git diff --check`，確認變更只涵蓋新會員端本需求且未帶入既有 `memberAsideStore.ts` 修改；Evidence: worktree `git diff --check` 通過；status 僅 6 個 GSI-425 功能檔，未包含 `memberAsideStore.ts`、`apps/r001`、代理端或後端。
- [x] VT-008: 先以 focused Vitest 對 shared resolver 取得預期 RED，再實作並取得 GREEN；完整搜尋確認 r017 app-local duplicate 無殘留，並重跑 r017 build、既有 Vitest 與 shared component runtime smoke；Evidence: shared `homePageContent.spec.ts` 先以 1 failed／1 passed 取得預期 RED，再以 2/2 GREEN；依 repo 規則驗證後移除暫存 test。最終既有 Vitest 11/11、Prettier、`git diff --check` 與 `NX_DAEMON=false nx build r017 --verbose` 通過；Chrome mock runtime：ID 123 時 `/` 為 `cmsWrapperCount=1`、預設首頁 marker 0、網址保持 `/`，ID 0 時 wrapper 0、預設首頁 marker 1 且 request log 無 `/cms/detail/0`，direct `/cmsCustomPage/123` wrapper 1。mock、env override 與本機服務均已移除／還原。

## Git Flow

- 基底分支：`main`（開始前依 repo 規則先做 HTTPS auth probe 並更新）。
- 工作分支：`feat/gsi-425-custom-page-as-home`。
- 推進路徑：`feat/gsi-425-custom-page-as-home` → `develop` → `staging` → `main`。
- 實作開始前必須建立／切換到上述工作分支；不可直接在目前的 `fix/gsi-669-agent-detail-navigation` 或共享分支實作。
- 不可直接在共享分支實作；每次 commit／merge 都要先取得使用者針對該次操作的明確確認。

## Handoff Readiness

- Status: `READY`
- User confirmation: CONFIRMED — 使用者於 2026-08-14 回覆「開始做」，核准本 spec 進入實作
- Active REQ IDs: `REQ-007`
- Structural check: `node ~/wow/ai-config/scripts/check-spec.js ~/wow/ai-config/specs/whitelabel-gsi-platform-multiverse-nx/gsi-425-custom-page-as-home.md`
- Ready check: `node ~/wow/ai-config/scripts/check-spec.js --ready ~/wow/ai-config/specs/whitelabel-gsi-platform-multiverse-nx/gsi-425-custom-page-as-home.md`

## Feature Completion Gate

- Status: `COMPLETE`
- Remaining / blocked REQ IDs: `NONE`
- Complete check: `node ~/wow/ai-config/scripts/check-spec.js --complete ~/wow/ai-config/specs/whitelabel-gsi-platform-multiverse-nx/gsi-425-custom-page-as-home.md`

## Implementation Handoff / 交接給實作者

- Spec path：`/Users/kenyu/wow/ai-config/specs/whitelabel-gsi-platform-multiverse-nx/gsi-425-custom-page-as-home.md`
- Active REQ IDs：使用 Handoff Readiness 的唯一清單，不在此重複。
- Target repo / branch：`/Users/kenyu/wow/whitelabel-gsi-platform-multiverse-nx`；`feat/gsi-425-custom-page-as-home` from updated `main`。
- Known blockers：無功能 blocker；真實 DEV API 在 localhost 會被既有 Agent Domain 驗證拒絕，因此 runtime 分流以驗證後已移除的本機 mock 完成。
- Report format：逐條回報 AC／VT 結果、test/build/runtime evidence、`TYPECHECK_UNAVAILABLE`（若仍無 project-defined target）與所有未驗證項。
