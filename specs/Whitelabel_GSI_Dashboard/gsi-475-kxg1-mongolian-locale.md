# Spec: GSI-475 KXG1 代理端新增蒙古語系

> 交接合約：實作者只依本 spec 實作，reviewer 逐條對照「驗收條件」驗收。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-475-kxg1-mongolian-locale.md`（版控於 ai-config）。
> 本 spec 僅處理代理端 `Whitelabel_GSI_Dashboard`；舊會員端 `set_r033` 與新架構 R017 各有獨立 spec。

- Jira：[GSI-475｜[需求 會員端/代理端]KXG1新增蒙古語系](https://gamingsoft.atlassian.net/browse/GSI-475)
- 關聯建站票：[GSI-365｜KXGM/KXG1測試環境建立](https://gamingsoft.atlassian.net/browse/GSI-365)
- 端別：代理端 `Whitelabel_GSI_Dashboard`
- 站點：總代 `KXGM`、代理 `KXG1`、品牌 `kingxgo`
- 環境：測試環境、正式環境
- 目標語系：Mongolian（canonical code 已確認為 `mn`）
- 站點語系需求：Mongolian 為預設語系、English 為次語系

## 需求更新（2026-08-03～2026-08-04）

- Jira 已明確指定語系代碼為 `mn`。
- 後端於 2026-08-04 回覆已支援 `mn` 並部署 DEV；canonical code 不再是 blocker。
- Jira 補充「新舊架構都需要新增此語系」，其中新架構 R017 會員端由獨立 spec 處理，不併入本 Dashboard 實作。
- Jira 補充 GSI 前端呼叫 AI Team 翻譯 API 時也需傳送 `mn`；本 spec 因此新增 AI 翻譯流程驗收。
- Jira 新增蒙古國旗附件 `蒙古國旗.webp`，旗幟資產應以該附件為需求來源，轉成 repo 現行格式後使用。
- 關聯票 [KX22-2｜新增蒙古语系（前端 & 后台）](https://gamingsoft.atlassian.net/browse/KX22-2) 於 2026-08-04 上傳新版前／後台語系 XLSX；此項當時的附件版本疑問已由 2026-08-06 的 Locale Manager／Sheet 完成狀態取代，不再是 Dashboard 實作 blocker。

## 實作澄清（2026-08-06 11:24）

- Corey 確認 locale manager repo 與 Google Sheet 均已加入 `mn`，remote 翻譯資料不由 Dashboard repo 處理。
- locale manager 最新 `main` 已確認 canonical code 為 `mn`、英文顯示名稱為 `Mongolian`。
- Locale Manager Web 的整表自動翻譯已負責蒙古語內容；Dashboard 不新增或修改 locale JSON／XLSX。
- AI Team API 只要沿用同一個 `mn` 即可，除非 AI Team 使用不同 code，否則 Dashboard 不需新增 alias、special case 或修改 `translateAiText()`。
- 因此本 repo 的實作範圍縮小為：新增代理端已定義的 `mn` locale capability與國旗，並驗證既有 AI call path 會自然傳入表單／啟用語系列表中的 `mn`。
- 使用者已確認新增代理端語系名稱 key `common.mn`，固定值為 `en: Mongolian`、`zh-TW: 蒙古語`、`zh-CN: 蒙古语`；其餘語系由 Locale Manager 自動翻譯。
- `common.mn` 已在 Locale Manager 建立並完成自動翻譯，回讀確認 `en: Mongolian`、`zh-TW: 蒙古語`、`zh-CN: 蒙古语`、`mn: Монгол`。
- AI 翻譯沿用既有介面操作：後台啟用蒙古語後，在具備多語文案管理與「AI 翻譯」按鈕的代表性介面觸發，確認 request 目標語系包含 `mn` 且 response 有對應內容；不因本票修改 AI wrapper 或各頁 call site。

## 背景 / 目標

KXG1 是蒙古市場站點，GSI-365 已記錄使用 MNT，語系為 Mongolian（Default）與 English。GSI-475 要求會員端與代理端新增蒙古語，並提供兩份翻譯附件。

代理端不是只靠後端開關即可支援新語系。現況需要同時具備：

1. 後端將蒙古語加入語系列表並為 KXG1 啟用。
2. 已由 locale manager／Google Sheet 提供代理端蒙古語 remote JSON 與版本。
3. Dashboard 前端註冊新 locale、顯示名稱與旗幟。
4. Dashboard 既有 AI 翻譯流程在目標語系列表包含蒙古語時，自然沿用 `mn`；不新增 AI API 特殊處理。

如果後端只回傳未知的 `mn`，前端 `availableLanguages` 與 `vue-i18n` 尚未註冊它，Header 可能不顯示選項，已保存語系也會退回英文。

## 已確認現況

### Dashboard 語系註冊

- `src/utils/constants/languageType.ts`：
  - `LANGUAGE_TYPE.Enums` 是前端認得的 runtime locale 清單。
  - `I18nKeys`、`Labels`、`Abbreviation` 是完整的 typed record；新增 enum 後需同步補齊。
- `src/i18n/language-utils.ts`：
  - `availableLanguages` 決定前端儲存值、remote 翻譯檔名、後端代碼及部分第三方元件語系代碼。
- `src/boot/i18n.ts`：
  - 從 `VITE_I18N_LOCALE_URL` 取得 `version.json` 與各語系 JSON。
  - 由 `availableLanguages[].key` 決定 remote JSON 檔名。
  - remote locale 載入失敗時以英文 fallback。
- `src/stores/languageStore.ts`：啟動時只接受 `availableLanguages` 已知值，否則回到英文。
- `src/composables/useLanguage.ts`：Header 選項是 `/settings.bo_language` 與前端已註冊 locale 的交集。

### 語系設定 API

- `GET /options/languages`：所有可設定語系候選。
- `GET /language/member`、`PUT /language/member`：會員端啟用語系與預設語系。
- `GET /language/panel`、`PUT /language/panel`：代理端啟用語系與預設語系。
- `GET /settings`：Dashboard runtime 使用 `bo_language` 與 `bo_default_language`。
- 現有 payload 已是 `{ languages, default_language }`，不需要新增 endpoint wrapper 或改 request contract。

### AI Team 翻譯 API

- `src/api/ai.ts` 的 `translateAiText()` 既有 request shape 為 `Array<{ input_text: string; languages?: string[] }>`，POST 至既有 `/translate` endpoint。
- wrapper 型別已可傳任意語系字串，因此本票不新增 endpoint，也不預設需要修改 wrapper contract。
- 多個 CMS／設定頁會依表單或目前可用語系組成 `languages` 後呼叫 `translateAiText()`；共用 locale 註冊完成後，這些既有 call path 可自然包含 `mn`。
- 2026-08-06 澄清確認 AI Team 與 GSI 共用 `mn` 時不需特別處理。只有 DEV 實測證明 AI Team 使用不同 code 時，才先更新 spec 並處理 mapping；本票不得預先加入 alias。

### Site-specific 隔離

- repo 內沒有 KXG1／kingxgo 專屬語系 guard。
- 前端 locale 註冊是共用 capability；實際站點是否顯示蒙古語由後端 `bo_language` 控制。
- `/options/languages` 若是全域候選清單，其他站點的語系設定頁可能看到尚未啟用的 Mongolian 候選；後端必須確認是否按站點限制候選，或產品明確接受其成為全域候選。
- 不可在前端以 `agent_code === "KXG1"` 硬編碼語系行為。

## 翻譯附件稽核

### GSI-475 原始後台附件（歷史基準）

Jira 原附件 `後台語系 (1).xlsx`：

- `工作表2` 共 4,942 筆翻譯。
- 欄位為 `Key`、`en`、`zh-CN`、`Mongolian`。
- Mongolian 欄沒有空值，Key 沒有重複。
- 但有 17 筆 placeholder 集合與英文來源不一致。
- Excel 約第 4,373–4,401 列存在明顯翻譯錯位，例如通知內容的 `{amount}`、`{currency_id}`、`{product_name}`、`{game_name}`、`{count}` 被移到不相關的 table/common keys。
- `audit-logs.20007` 缺少 `{item3}`。
- `agent_member_commission.demo_dialog.scenario.mode_3.case_1.title` 的蒙古語多出 `{rate}`，英文來源沒有此 placeholder。

因此，該原始附件不可原樣發布。此結論是歷史基準，不代表 KX22-2 的新版附件仍有相同問題。

### KX22-2 新版附件

關聯票 KX22-2 於 2026-08-04 上傳 `後台語系 (0e0ff330-a97b-4f47-9b7d-5a41ec325e40).xlsx`。以下原為翻譯資料發布時的檢查要求：

1. 由 PO／AM 確認它是否正式取代 GSI-475 原始後台附件。
2. 對確認採用的最終版重新執行 Key 唯一性、Mongolian 空值及 placeholder 集合一致性檢查。
3. 若新版仍有錯位或 placeholder mismatch，退回翻譯提供方修正；不得沿用原始檔的 17 筆結果推論新版通過或失敗。

歷史共同要求：

- 實作者不得自行移動 placeholder、猜測蒙古語句子或以英文覆蓋問題列。
- 翻譯資料維護方應以已確認的 Google Sheet／Locale Manager 資料為準；Dashboard 實作者不再以 Jira XLSX 判定發布版本。

2026-08-06 最新狀態：Corey 確認 Google Sheet 與 locale manager 已加入 `mn`。上述稽核紀錄保留作歷史背景；Dashboard 實作者不下載、修改、重新匯入或發布 XLSX，僅在 DEV 驗證 remote `mn.json` 可讀。

## 前置依賴 / 實作 blocker

已完成的外部前置：

- Locale Manager repo 與 Google Sheet 已加入 canonical code `mn`。
- `common.mn` 已建立、自動翻譯並回讀確認指定四個值。

下列 runtime／環境項目未確認前，不得宣稱 GSI-475 代理端完成：

1. DEV 驗證 remote `mn.json` 與 `version.json` 已可讀；若尚未發布，這是環境 blocker，不在 Dashboard repo 建 local locale 補救。
2. 後端確認 `/options/languages`、KXG1 `/language/panel`、`/settings.bo_language`、`bo_default_language` 的設定與環境部署順序。

## 範圍

### 1. 註冊 Dashboard locale enum

修改 `src/utils/constants/languageType.ts`：

- 在 `LANGUAGE_TYPE.Enums` 加入已確認的蒙古語代碼：

```ts
MN = "mn"
```

- 同步補齊：
  - `I18nKeys`：使用已確認並由 Locale Manager 建立的 `common.mn`。
  - `Labels`：使用 locale manager 已確認的 `Mongolian`，作為 remote key 缺失時 fallback。
  - `Abbreviation`：`MN`。
- 同步更新檔案頂端 backend key 說明。
- 不更改既有語系代碼或修正與本需求無關的歷史命名。

### 2. 註冊 remote locale descriptor

修改 `src/i18n/language-utils.ts` 的 `availableLanguages`，加入蒙古語 descriptor。

使用已確認的 `mn` contract，descriptor shape 為：

```ts
{
  value: "mn",
  key: "mn",
  i18nKey: "mn",
  backendKey: "mn"
}
```

要求：

- `value` 必須等於前端 locale 與 localStorage 使用值。
- `key` 必須等於 remote JSON filename（不含 `.json`）。
- `backendKey` 必須等於 API 接受／回傳的 canonical code。
- 不加入多組 alias；目前 frontend、backend 與 AI API 統一使用 `mn`。若 remote filename 另有明確契約，先更新本 spec再實作。

### 3. 蒙古國旗

修改 `src/composables/useLanguage.ts`：

```ts
mn: "mn"
```

新增：

```text
public/images/flags/circle/mn.svg
```

要求：

- 原始圖像來源使用 Jira 附件 `蒙古國旗.webp`；只做符合現有 circle flag 資產規格所需的格式／裁切轉換，不重新設計國旗。
- 沿用既有 circle-flags 資產風格與尺寸。
- 不使用外部 runtime URL。
- 語系設定頁與 Header 均能載入資產，沒有 404。

### 4. TinyMCE（不修改）

使用者於 2026-08-07 確認不需要為 TinyMCE 加入蒙古語特殊處理：

- `Editor.vue` 維持既有通用邏輯，直接把 app locale `mn` 傳給 TinyMCE。
- 不加入 `mn -> en` fallback，不自行翻譯或建立 TinyMCE 蒙古語包。
- TinyMCE 的第三方語言包支援不屬於本票範圍。

### 5. Remote i18n 驗證（不修改本 repo）

Corey 已確認 locale manager／Google Sheet 加入 `mn`。Dashboard 實作者只驗證，不執行發布：

1. DEV 可讀取與 `availableLanguages[].key` 相同檔名的 `mn.json`。
2. remote `version.json` 已含新版本，使前端 cache key 改變。
3. 如果資料或版本缺失，回報 locale manager／部署方修正；不得在本 repo 建立 locale JSON。

### 6. 後端站點設定協作

後端需完成：

- `/options/languages` 提供蒙古語 code/name。
- KXG1 `/language/panel` 啟用 Mongolian、English。
- KXG1 `bo_default_language` 設為 Mongolian canonical code。
- KXG1 `/settings.bo_language` 同時包含 Mongolian、English。
- 保證現有使用 `Accept-Language` 或 `lan` 的語系化 endpoint 接受蒙古語代碼。

前端不修改全域 request interceptor，也不要求所有 API 自動帶 `Accept-Language`。

### 7. AI Team 翻譯流程（驗證既有行為，不修改）

- 不新增 AI endpoint；沿用 `src/api/ai.ts` 的 `translateAiText()`。
- 確認以表單／啟用語系列表產生 `languages` 的既有翻譯 call path，在 KXG1 啟用蒙古語時自然包含 `mn`。
- 以代表性 surface 驗證至少一個共用 composable call path及一個 CMS／設定頁 call path。
- 驗證方式以介面既有「AI 翻譯」按鈕為主：在語系管理啟用蒙古語後觸發按鈕，確認 request 與 response 均有 `mn` 對應內容。
- request 必須使用 `languages: ["mn"]`（或與其他目標語系並列），不得改成 `mn-MN`、`mongolian` 或 numeric code。
- 不修改 `src/api/ai.ts`、不逐頁硬編碼 `mn`、不新增 AI alias 或 response adapter。
- 若 AI Team 未回傳 `mn`，先確認外部 contract；這不是在 Dashboard 各頁加特殊 fallback 的理由。

## Out of scope

- 不修改後端程式、資料庫、i18n 管理平台程式或部署 pipeline。
- 不在此 repo 新增、搜尋或修改 local locale JSON。
- 不修改會員端 repo；會員端由另一份 spec 處理。
- 不新增 route、menu、permission id 或新的語系設定 API wrapper。
- 不修改 AI translation wrapper／call sites；2026-08-06 已確認共用 `mn`，沿用現有泛型 `languages: string[]`。
- 不在前端硬編碼 KXG1／KXGM／kingxgo 判斷。
- 不讓蒙古語自動成為所有站點預設語系。
- 不修改既有語系代碼、命名或翻譯。
- 不自行修正 Jira 附件中的蒙古語句子或 placeholder。
- 不重構 i18n boot、language store、site store、Header、語系設定頁或 Editor。
- 不修改 `src/assets/env/environment.json`。
- 不處理 unrelated ESLint、版面、動畫或效能問題。

## 受影響範圍

- 端別：代理端 `Whitelabel_GSI_Dashboard`。
- 站點 activation：KXG1 only，由後端設定控制。
- 共用 capability：Dashboard 所有站點的前端 bundle 都會認得 `mn`；未被後端啟用的站點不得在 Header 顯示或切換至蒙古語。
- 預期修改：
  - `src/utils/constants/languageType.ts`
  - `src/i18n/language-utils.ts`
  - `src/composables/useLanguage.ts`
  - `public/images/flags/circle/mn.svg`
- 預期只驗證、不修改：
  - `src/api/ai.ts`
  - `src/composables/useResponsibilityClause.ts`
  - 使用 `translateAiText()` 的代表性 CMS／設定頁
- 外部交付：
  - remote Dashboard Mongolian JSON
  - remote `version.json`
  - KXG1 後端語系設定

## 參考實作 / 要遵循的現有 pattern

- locale enum、label、abbreviation：`src/utils/constants/languageType.ts`
- remote locale descriptor：`src/i18n/language-utils.ts`
- remote loading／English fallback：`src/boot/i18n.ts`
- Header 語系交集與 flag URL：`src/composables/useLanguage.ts`
- Header 切換與保存：`src/layouts/MainLayout.vue`
- 已知語系驗證：`src/stores/languageStore.ts`
- 站點 `bo_language`／default：`src/stores/siteStore.ts`
- 語系設定 API：`src/api/common.ts`
- AI translation wrapper：`src/api/ai.ts`
- AI translation representative composable：`src/composables/useResponsibilityClause.ts`
- 語系設定頁：`src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteLanguageSettings.vue`
- 語系排序與儲存：`src/pages/WebsiteSettings/ClientSideSettings/components/LanguageSettingsSection.vue`
- Editor language：`src/components/editor/Editor.vue`

## 關鍵決策與理由

1. **不是 backend-only。** Dashboard 會拒絕未在前端 `availableLanguages` 註冊的值，且 vue-i18n 也需要預建 locale。
2. **前端新增共用 capability，activation 仍由後端站點設定控制。** 這符合現有資料驅動架構，避免加入 KXG1-specific guard。
3. **翻譯留在 remote i18n。** repo 現況不維護 locale JSON，新增本地檔會形成第二個來源。
4. **canonical code 使用已確認的 `mn`。** `Enums`、`availableLanguages`、後端、AI request 與 remote filename 必須一致，避免選項隱藏或載入錯誤。
5. **翻譯由 locale manager 管理。** 2026-08-06 已確認 repo／Sheet 加入 `mn`；Dashboard 只消費 remote JSON，不處理 XLSX 或翻譯內容。
6. **TinyMCE 不做蒙古語特殊處理。** `Editor.vue` 沿用通用 app locale，不加入 `mn -> en` fallback。
7. **不全域改 request interceptor。** 現有 API 只有需要語系的 call path 顯式傳入語言；本票只驗證蒙古語可沿用現有路徑。
8. **AI API 不需程式修改。** 既有 `languages?: string[]` 已能表達 `mn`；只有 DEV 證明 AI Team 使用不同 code 時，先更新 spec，而不是預先加 alias。

## 驗收條件

- [ ] frontend、backend、remote i18n 與 AI API 全部沿用 canonical code `mn`，未新增 alias。
- [ ] `LANGUAGE_TYPE.Enums`、`I18nKeys`、`Labels`、`Abbreviation` 都包含蒙古語，TypeScript 無缺漏。
- [ ] `availableLanguages` 包含蒙古語 descriptor，`value`、`key`、`backendKey` 與確認契約一致。
- [ ] fallback 顯示名稱使用 locale manager 已確認的 `Mongolian`；`I18nKeys` 使用已確認的 `common.mn`，descriptor 的 `i18nKey` 為 `mn`。
- [ ] `mn` flag mapping 與 `public/images/flags/circle/mn.svg` 存在，Header／設定頁無 404。
- [ ] locale manager／Google Sheet 已包含 `mn`；Dashboard diff 未包含 XLSX、locale JSON 或翻譯內容。
- [ ] remote i18n DEV 可成功讀取 `mn.json`，且 `version.json` 已更新。
- [ ] KXG1 `/settings.bo_language` 同時包含 Mongolian、English，`bo_default_language` 是 Mongolian。
- [ ] KXG1 Header 顯示 Mongolian 與 English，首次登入／無有效 localStorage 時預設 Mongolian。
- [ ] 切換 Mongolian 後重新整理仍維持蒙古語；切換 English 後亦正常。
- [ ] 蒙古語 remote JSON 載入成功時 UI 顯示蒙古語，不會整站退回 key 字串。
- [ ] 模擬蒙古語 remote JSON 載入失敗時，既有 English fallback 生效且頁面不崩潰。
- [ ] `Editor.vue` 未加入 `mn` special case，TinyMCE 與其他語系相同直接收到 app locale `mn`。
- [ ] 語系設定頁可保存 Mongolian／English 排序，第一個語系成為 default 的既有行為不變。
- [ ] AI 翻譯 request 在目標包含 Mongolian 時傳送 `languages` 中的 `mn`，response 的 `mn` 翻譯可正確寫回目標欄位。
- [ ] `src/api/ai.ts` 與既有 AI call sites沒有為 `mn` 加 special case；若 AI response 缺少 `mn`，按外部 contract 問題處理。
- [ ] 未啟用蒙古語的其他站點 Header 不顯示 Mongolian，既有 default language 不變。
- [ ] 未新增 local locale JSON、KXG1-specific frontend guard、route／permission／API wrapper 變更。
- [ ] 未修改 `src/assets/env/environment.json`，未包含 unrelated 變更。

## 邊界情況 / 例外

- localStorage 保存未知或舊 code：沿用現有邏輯，改用 KXG1 `bo_default_language`，再 fallback 至第一個有效語系。
- 後端回傳 `mn`，但 remote JSON 尚未發布：不得進正式環境；測試時應安全 fallback English。
- remote JSON 已發布，但後端未在 KXG1 啟用：Header 不顯示 Mongolian，符合站點 activation 設計。
- `/options/languages` 對其他站點回傳 Mongolian：若產品不接受全域候選，應由後端站點化；不要在 Dashboard 加 agent code guard。
- 翻譯 key 缺失：vue-i18n 依既有 fallback 顯示英文；驗收需記錄缺 key，不以建立 local key 修補。
- API 只支援部分語系：保持既有 call-site 行為；發現特定 endpoint 不接受 `mn` 時交由後端修正，不全域改 interceptor。
- AI API 文件與 DEV 行為不一致：以 DEV response 保存證據並先更新 spec／API contract，不在各頁加入不同 alias。

## 測試計畫

### Focused executable checks

本 repo 不為此票新增正式測試框架。實作者需建立不納入 commit 的暫時 executable check／harness，commit 前移除或 unstage：

1. 驗證 `LANGUAGE_TYPE.Enums.MN`（或最終 canonical enum）、`I18nKeys`、`Labels`、`Abbreviation` 完整。
2. 驗證 `availableLanguages` 只有一筆蒙古語，且 code／remote key／backend key 符合 spec。
3. 驗證 flag URL 指向實際存在的 SVG。
4. 驗證代表性現有 AI payload builder 在來源語系列表包含 `mn` 時原樣產生 `languages: ["mn"]`；不得為此新增正式 production helper 或逐頁修改。

### Focused repo validation

- 對 touched files 執行 focused Prettier／ESLint（只檢查，不處理 unrelated lint）。
- 執行 `git --no-pager diff --check -- <touched-files>`。
- 不執行 `tsc --noEmit`。

### 手動驗證

使用 Chrome extension 在 KXG1 測試環境驗證：

1. 清除或設置無效 `localStorage.lang`，登入後應使用 Mongolian default。
2. Header 顯示 Mongolian、English，旗幟與名稱正確。
3. 切換兩種語系並重新整理，保存行為正確。
4. 檢查至少包含 Header、表格、篩選、Modal、通知、CMS editor 的代表性頁面。
5. Network 確認 remote Mongolian JSON 成功載入，filename 與 `availableLanguages[].key` 一致。
6. 以一個未啟用蒙古語的其他站點回歸，Header 不出現 Mongolian。
7. 在至少一個共用 composable及一個 CMS／設定頁觸發 AI 翻譯，Network request 確認 `languages` 包含 `mn`，並確認蒙古語結果正確回填。

## Git Flow

- 基底分支：`main`；開始前先完成 HTTPS 非互動 auth probe 並 pull 最新 `main`。
- 工作分支：`feat/gsi-475-kxg1-mongolian-locale`。
- 實作者開始前必須先從 `main` 建立／切換到工作分支；不可直接在 `main`、`develop`、`staging` 或其他共享分支上實作。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（正式環境），每階段測試通過後才進下一關。
- 任一 merge 有 conflict 時停止，不自行解衝突或把目標分支 merge 回工作分支。
- Commit 前需取得使用者針對該次提交的明確確認；不得沿用先前確認。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

- `mn` code、`common.mn`、`Mongolian` fallback label、locale manager／Sheet 與 AI 共用 code 已確認；實作者只需完成 repo 變更及剩餘 runtime／環境驗證。
- 若語系名稱 key、remote filename 或 AI API response shape 與本 spec 不同，先更新 spec，再實作。
- 不要把 Jira XLSX 或產生的 locale JSON commit 到 Dashboard repo。
- 實作完成後，reviewer 必須同時驗證 code diff、remote i18n 測試環境與 KXG1 後端語系設定；只驗 code 不算完成。
