# GSI-425 自訂頁面設定為首頁

> 交接合約：Spec 作者產出，實作者只依此檔與 active `REQ-ID` 實作，reviewer 對照 `AC-ID`／`VT-ID` 驗證。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-425-custom-page-home.md`

## Background / 背景與目標

- 問題與預期結果：代理後台可在自訂頁面列表設定哪一頁是首頁，支援同代理互斥開啟與全部關閉，並正確保存／回讀後端狀態。
- 目標端別與 repo：代理端 `Whitelabel_GSI_Dashboard`。
- 原始需求連結：[Jira GSI-425](https://gamingsoft.atlassian.net/browse/GSI-425)
- Jira snapshot：issue updated `2026-08-14 14:55 +08:00`；spec 讀取日 `2026-08-14`。

## Spec Governance / 規格治理

- Role: `CANONICAL`
- Canonical spec: `SELF`

## Scope / 範圍

- 代理端「版型設定 → 頁面管理 → 自訂頁面」列表新增「首頁」欄位、說明提示與切換開關。
- 代理端串接已部署 DEV 的首頁切換 API，支援同代理互斥開啟與全部關閉。
- 本 spec 的 implementation handoff 僅包含代理端 active requirements。

## Out of Scope / 不在範圍

- 調色盤功能。
- `whitelabel-gsi-platform-multiverse-nx`、`Whitelabel_GSI_Platform_Multiverse` 與所有會員端行為，包括 `/v1/player/settings`、root path mapping、URL、SEO 與 custom-page rendering；此排除由使用者在 2026-08-14 明確核准。
- 後端、DB、快取或 API 開發；Jira 已記錄後端完成並部署 DEV。
- 修改 CMS route entry、menu visibility 或 route-level permission。

## Source Responsibilities / 來源職責與版本

| Source ID | Snapshot / Revision | Responsibility | Location |
| --- | --- | --- | --- |
| SRC-REQ-001 | Jira GSI-425 description，updated 2026-08-14 | Scope / behavior | `代理後台新增「首頁」設定`：位置、僅新架構有效、提示文案 |
| SRC-REQ-002 | Jira GSI-425 description，updated 2026-08-14 | Scope / behavior | `新增欄位`：首頁開關、互斥開啟、可全關 |
| SRC-REQ-003 | Jira GSI-425 description，updated 2026-08-14 | Scope / behavior | `作法`：PM 選定 B 路徑映射模式；本次只做新架構 |
| SRC-UI-001 | Jira attachment `image-20260730-013841.png`，captured 2026-08-14 | UI / visual | [代理端自訂頁面列表 mock](./gsi-425-custom-page-home.png)：首頁欄位位於啟用欄位後，欄名旁有提示 icon，每列為 switch |
| SRC-DEC-001 | Jira comment `356832`，2026-08-14 10:45 +08:00 | User decision | Ken 回覆：互斥以代理為單位；新架構限制由前端判定；會員端欄位加到 `/v1/player/settings` |
| SRC-DEC-002 | User message，2026-08-14 | User decision | 「你處理代理端就好」：本次 spec／implementation handoff 排除所有會員端工作 |
| SRC-API-001 | Jira comment `356875`，2026-08-14 14:55 +08:00 | API / persistence | `[PUT] /v1/agent/cms/home_page/{cmsID}`、body `is_home_page`、權限與 error code |
| SRC-API-002 | Jira comment `356875`，2026-08-14 14:55 +08:00 | API / persistence | `[GET] /v1/agent/cms/list?type=13` 回傳 `is_home_page` |
| SRC-API-003 | Jira comment `356875`，2026-08-14 14:55 +08:00 | API / persistence | `[GET] /v1/player/settings` 回傳 `home_custom_page_id`；無設定時為 `0`；fresh response 無延遲 |
| SRC-CODE-001 | Dashboard local `main@55f7178c410674bc5d992b3aa72ba639bc9ed9d0` | Implementation pattern | `src/pages/WebsiteSettings/Cms/CustomPage/List.vue`、`src/api/cms.ts`、`src/composables/useCms.ts`、CMS request/response types |
| SRC-I18N-001 | Locale Manager backstage API read-back，2026-08-17 | I18n mapping | `menu.home` reused；`cms.home_page_specific_template_only` created and read back with confirmed en／zh-TW／zh-CN values |
| SRC-RULE-001 | Project instructions snapshot 2026-08-14 | Scope / behavior | Scope Control、permission safeguard、failed persistence must not show false success or silently retain wrong state |

來源責任：需求來源決定產品範圍；視覺來源決定 UI；API 來源決定持久化能力；repo 只提供現況與 pattern。不得由 API 或目前 code 自行增加 placeholder、confirmation、sorting、disable、fallback copy 或其他 user-visible 行為。

## Requirement Traceability Matrix / 需求追蹤矩陣

| REQ-ID | Source anchor / asset | UI surface | API / persistence | Status | Decision ID | Acceptance ID | Verification ID / evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | SRC-REQ-001; SRC-UI-001; SRC-I18N-001 | 代理端自訂頁面列表：「首頁」欄位、提示 icon／tooltip、每列 switch | `GET /v1/agent/cms/list?type=13` 的 `is_home_page` | CONFIRMED | DEC-002 | AC-001; AC-002; AC-003 | VT-001; VT-002; VT-004 |
| REQ-002 | SRC-REQ-002; SRC-API-001; SRC-API-002; SRC-CODE-001; SRC-RULE-001 | 代理端「首頁」switch 的送出、成功同步、失敗恢復 | `PUT /v1/agent/cms/home_page/{cmsID}` body `{ is_home_page: boolean }`；成功後重新取得 authoritative list | CONFIRMED | DEC-001 | AC-004; AC-005; AC-006; AC-007 | VT-001; VT-002; VT-003; VT-004 |
| REQ-003 | SRC-REQ-002; SRC-DEC-001; SRC-API-001 | 同代理自訂頁面 switch 可互斥開啟，也可全部關閉 | 互斥由後端處理；前端不得先送關閉舊頁的第二支 request | CONFIRMED | DEC-001 | AC-004; AC-005 | VT-001; VT-002 |
| REQ-004 | SRC-DEC-001; SRC-DEC-002; SRC-API-003 | N/A — 使用者已核准排除會員端 settings contract | `/v1/player/settings` 與 `home_custom_page_id` 不在本次 handoff | OUT_OF_SCOPE_APPROVED | DEC-005 | AC-008 | VT-005 |
| REQ-005 | SRC-REQ-003; SRC-DEC-001; SRC-DEC-002; SRC-API-003 | N/A — 使用者已核准排除會員端 root path mapping | 會員端 route/rendering 不在本次 handoff | OUT_OF_SCOPE_APPROVED | DEC-005 | AC-008 | VT-005 |
| REQ-006 | SRC-REQ-001; SRC-REQ-003; SRC-DEC-001; SRC-DEC-002 | N/A — 使用者已核准排除所有會員端 repo／版型 | N/A — 不修改任何 member-side repository | OUT_OF_SCOPE_APPROVED | DEC-005 | AC-008 | VT-005 |
| REQ-007 | SRC-API-001; SRC-CODE-001; SRC-RULE-001 | 代理端沿用既有 CMS edit permission 控制 switch；route entry 不變 | API 權限 `A_A_CMS_SETTINGS_EDIT (3120802)`／新權限樹 `3470202` | CONFIRMED | N/A — 權限 enforcement，不形成產品範圍決策 | AC-006 | VT-003; VT-004 |

## Source Conflicts / 未決與來源衝突

- `REQ-001` i18n 已解決：使用者於 2026-08-17 授權翻譯；backstage key `cms.home_page_specific_template_only` 已完成三語 API read-back。
- `REQ-004`～`REQ-006` 已由 SRC-DEC-002 明確排除，不形成 handoff blocker，也不可由代理端實作者順手修改會員端。

## Affected Area / 受影響範圍

- 代理端 repo：`Whitelabel_GSI_Dashboard`
  - `src/pages/WebsiteSettings/Cms/CustomPage/List.vue`
  - `src/api/cms.ts`
  - `src/api/request.type.ts`
  - `src/api/response.type.ts`
  - `src/composables/useCms.ts`（若沿用共用 loading／notify／list refresh pattern）
- Route：Dashboard `/WebsiteSettings/Cms/CustomPage/List`。
- Template/siteKey：代理端共用自訂頁面管理；Jira 提示說明只有特定版型會在會員端生效，但本次不修改會員端。
- 跨站／共用程式影響：Dashboard 自訂頁面列表是 shared agent-side surface；變更僅限指定列表與其 API/types，不得擴散至其他 CMS pages 或任何 member-side repo。
- 不得碰的使用者既有 local changes：實作前重新執行各 repo `git status --short`，保留所有與 GSI-425 無關的 modified/untracked files；本 spec 不授權清理 dirty tree。

## Existing Patterns / 參考實作

- Dashboard `CustomPage/List.vue`：沿用現有 q-table、q-toggle、`permission.edit`、loading disable 與 list row pattern；只在指定列表增加首頁欄位。
- Dashboard `src/api/cms.ts`：新增 focused wrapper，例如 update custom-page home，使用現有 request helper；payload type 與 `CmsItem.is_home_page` 放進 central contracts。
- Dashboard `useCms.ts`：沿用 request status、notification 與 authoritative list refresh；不要用兩次 PUT 模擬互斥。

## I18n Mapping / 遠端文案映射

| Surface | Target dataset | Result | Key | en | zh-TW | zh-CN | Read-back evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 首頁欄位 label | backstage / agent | REUSED | `menu.home` | Home | 首頁 | 首页 | Locale Manager backstage API snapshot 2026-08-14，三語值一致 |
| 首頁欄位 tooltip | backstage / agent | CREATED | `cms.home_page_specific_template_only` | This feature is only available for specific templates. | 此功能僅針對特定版型 | 此功能仅针对特定版型 | Locale Manager backstage API read-back 2026-08-17；三語值完全一致 |

實作不得硬碼 tooltip、不得自行換 key、不得把 proposed payload 當成已建立。補齊 en 後依 `locale-entry-maintenance` bounded flow 建立並 read-back，才可把 `BLOCKED` 改為 `CREATED`。

## Decision Log / 關鍵決策與理由

| Decision ID | Date | REQ-ID | Decision + reason | Approval / source |
| --- | --- | --- | --- | --- |
| DEC-001 | 2026-08-14 | REQ-002; REQ-003 | 互斥範圍以代理為單位；設定 true 時只送一次 PUT，舊首頁由後端關閉；目前開啟項可送 false 達成全關 | SRC-DEC-001; SRC-API-001 |
| DEC-002 | 2026-08-14 | REQ-001 | 代理端顯示 Jira 指定提示，說明只有特定版型生效；不得把 feature-level 提示轉成 route access change或預先 disable switch | SRC-REQ-001; SRC-DEC-001 |
| DEC-005 | 2026-08-14 | REQ-004; REQ-005; REQ-006 | 本次只處理代理端；所有會員端 API consumption、route、rendering 與 repo change 均核准排除 | SRC-DEC-002 |

## Acceptance Criteria / 驗收條件

- [ ] AC-001: Dashboard 自訂頁面列表的欄位順序包含「標題／頁面網址／啟停用／首頁／功能」，「首頁」位於啟停用之後且每列呈現 switch；不得改動其他 CMS 列表。
- [ ] AC-002: 「首頁」欄名旁顯示 mock 所示提示 icon，hover/focus 顯示「此功能僅針對特定版型」的 remote-i18n 文案；不可硬碼。
- [ ] AC-003: 初次取得 `GET /v1/agent/cms/list?type=13` 後，每列首頁 switch 與該列 `is_home_page` 一致。
- [ ] AC-004: 把 A 從 false 切為 true 時，Dashboard 只送一次 `PUT /v1/agent/cms/home_page/{A.id}`，body 為 `{ "is_home_page": true }`；成功重新讀取列表後，同代理先前為 true 的 B 顯示 false，A 顯示 true。
- [ ] AC-005: 把目前 true 的 A 切為 false 時，Dashboard 送 `{ "is_home_page": false }`；成功重新讀取列表後允許所有 row 的 `is_home_page` 都是 false。
- [ ] AC-006: 無 CMS edit permission、request in flight 或 list loading 時，首頁 switch 不得觸發 PUT；既有 page entry、view permission 與其他 edit controls 行為不變。
- [ ] AC-007: PUT 失敗時不得顯示成功通知或留下與 server 不一致的 switch；恢復／重新取得 authoritative list，並沿用能識別 request 失敗的既有錯誤呈現，不另發明產品文案。
- [ ] AC-008: 本次 diff 只包含 `Whitelabel_GSI_Dashboard` 的代理端實作；不得修改 NX、舊 Multiverse、會員端 API contract 或會員端 route/rendering。

## Edge Cases / 邊界與狀態

- loading：
  - Dashboard switch 在首頁 PUT 與 authoritative list refresh 期間防止重複操作。
- empty：Dashboard custom-page list empty 沿用既有 no-data。
- error / API unavailable：Dashboard 依 AC-007。
- permission：只限制首頁 switch 的可操作性；不得改 parent route `meta.permission` 或 menu access。
- 合法阻擋：permission、request in flight、loading、客觀無效 CMS id；不得以「非新架構版型」為由在 Dashboard 預先隱藏或 disable Jira 明示的 switch。
- 後端 constraint：非 custom-page CMS id 回 code `100`，不存在 id 回 code `999`；前端不新增未授權 validation copy。
- delete：後端 comment 記錄刪除被設為首頁的頁面會自動取消；前端只需以 authoritative list/settings read-back 反映，不新增刪除 confirmation 行為。

## Verification Plan / 驗證計畫

- [ ] VT-001: Dashboard focused test（可用 temporary test，commit 前依專案規則移除）覆蓋 `is_home_page` mapping、true/false payload、成功 list refresh、失敗 restore、互斥只送一次 PUT；Evidence: `<test command + result>`
- [ ] VT-002: Dashboard browser + Network smoke：mock/DEV 至少兩列 custom page，驗證 AC-003～AC-005 的 request count、path/body 與 post-refresh UI；Evidence: `<screenshot + Network summary>`
- [ ] VT-003: Dashboard browser negative smoke：無 edit permission與 PUT error 各一次，驗證 AC-006／AC-007；Evidence: `<screenshot + Network/console summary>`
- [ ] VT-004: Dashboard static verification：`npm run ts-check`（project-defined vue-tsc）、focused ESLint／Prettier check、`git --no-pager diff --check -- <touched-files>`；不得用 direct `tsc --noEmit`；Evidence: `<command + result>`
- [ ] VT-005: Scope read-back：`git diff --name-only` 證明只修改 Dashboard 代理端 GSI-425 files，且未修改任何 member-side repository；Evidence: `<diff path summary>`

若 Dashboard 沒有可用 test runner，回報 `TEST_RUNNER_UNAVAILABLE`，不得安裝或引入新的測試基礎設施；此時 VT-002、VT-003、VT-004、VT-005 仍必須全部通過，且不能把 browser smoke 說成 unit test。

## Git Flow

- Dashboard：
  - 基底分支：`main`（開始前依 HTTPS/PAT 規則更新）。
  - 工作分支：`feat/gsi-425-custom-page-home`。
- 推進路徑：`work branch → develop → staging → main`。
- 實作開始前必須先建立／切換至上述 work branch；不可在目前其他 ticket branch、`develop`、`staging` 或 `main` 直接實作。
- 每次 commit／merge 都要先取得使用者針對該次操作的明確確認；不可自行建立 MR/PR。

## Handoff Readiness

- Status: `DRAFT`
- User confirmation: PENDING
- Active REQ IDs: `REQ-001, REQ-002, REQ-003, REQ-007`
- Structural check: `node ~/wow/ai-config/scripts/check-spec.js /Users/kenyu/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-425-custom-page-home.md`
- Ready check: `node ~/wow/ai-config/scripts/check-spec.js --ready /Users/kenyu/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-425-custom-page-home.md`

改成 `READY` 前必須：

1. 使用者確認本矩陣與 scope。
2. ~~補齊 tooltip en，完成 backstage remote key 建立與三語 read-back。~~ 已於 2026-08-17 完成。
3. 保持所有 active requirements 無 `PROVISIONAL`／`SOURCE_CONFLICT`，且 excluded member REQs 均引用 DEC-005。
4. 通過 ready check。

## Feature Completion Gate

- Status: `INCOMPLETE`
- Remaining / blocked REQ IDs: `REQ-001, REQ-002, REQ-003, REQ-007`
- Complete check: `node ~/wow/ai-config/scripts/check-spec.js --complete /Users/kenyu/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-425-custom-page-home.md`

只有代理端 active REQs 的所有 AC／VT evidence 都回填、tooltip i18n 完成、Remaining / blocked REQ IDs 為 `NONE` 且 complete check 通過，才可宣稱本 spec 的代理端 scope 完成；不得由此宣稱 Jira 的會員端 scope 已完成。

## Implementation Handoff / 交接給實作者

- Spec path：`/Users/kenyu/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-425-custom-page-home.md`
- Active REQ IDs：使用 Handoff Readiness 的唯一清單。
- Target repo / branch：
  - `/Users/kenyu/wow/Whitelabel_GSI_Dashboard` → `feat/gsi-425-custom-page-home`
- Known blockers：tooltip remote-i18n blocker 已於 2026-08-17 解決；REQ-004～REQ-006 已核准排除，實作者不得碰會員端。
- Report format：逐一列出 active REQ 的 AC／VT PASS/FAIL、實際 evidence、未驗證項、i18n `REUSED/CREATED/BLOCKED` read-back；只可回報代理端 scope 完成，不得宣稱 Jira 的會員端 scope 完成。
