# Spec: GSI-475 R017 新架構會員端新增蒙古語系

> 交接合約：實作者只依本 spec 實作，reviewer 逐條對照「驗收條件」驗收。
> 位置：`~/wow/ai-config/specs/whitelabel-gsi-platform-multiverse-nx/gsi-475-r017-mongolian-locale.md`（版控於 ai-config）。
> 本 spec 僅處理新架構 `whitelabel-gsi-platform-multiverse-nx` 的 R017；舊架構 `set_r033` 與代理端 Dashboard 各有獨立 spec。

- Jira：[GSI-475｜[需求 會員端/代理端]KXG1新增蒙古語系](https://gamingsoft.atlassian.net/browse/GSI-475)
- 關聯票：[KX22-2｜新增蒙古语系（前端 & 后台）](https://gamingsoft.atlassian.net/browse/KX22-2)
- 端別：新架構會員端 `whitelabel-gsi-platform-multiverse-nx`
- App：R017
- 站點：KXG1／kingxgo
- 語系代碼：`mn`（後端已確認並於 2026-08-04 部署 DEV）
- 站點設定：Mongolian、English；`default_language = mn` 已屬 KXG1 後端目標，但 R017 是否要在首次進站自動套用仍待產品確認

## 背景 / 目標

Jira 最新需求明確指出「新舊架構都需要新增此語系」，並特別提醒新架構 R017 的會員端語系選擇也要提供蒙古語。R017 繼承 NX shared Nuxt layer，因此不是只調整後端設定即可完成：前端需要註冊 `mn`、允許 Locale Manager remote 翻譯、提供旗幟、CMS 型別與遊戲啟動語言 mapping。

目標結果：

1. KXG1 後端 `/settings.language` 啟用 `mn` 時，R017 desktop／mobile 語系選擇器顯示蒙古語。
2. 切換蒙古語後，R017 使用 `mn` 翻譯、一般 API 傳送 `Accept-Language: mn`，重新整理後仍保留選擇。
3. remote `mn.json` 失敗時，沿用 current `main` 的 remote-only 錯誤處理；不得為蒙古語重新引入已移除的 bundled locale 架構。
4. 遊戲啟動對 `mn` 使用後端確認的 numeric code，或使用經產品／後端明確確認的 English fallback；不得因 unknown locale throw。
5. shared layer 只提供蒙古語 capability；實際 activation 仍由站點後端設定控制，不硬編碼 KXG1／R017 判斷。

## 需求更新（2026-08-03～2026-08-04）

- Jira 明確指定 canonical code 為 `mn`。
- 後端於 2026-08-04 回覆已支援 `mn` 並部署 DEV。
- Jira 本次對 R017 的明確文字是語系選擇需提供「蒙古語」，沒有說明是否同時改變 NX 現有首次進站 default 行為；若產品把 Mongolian default 也列為 R017 驗收，必須先將 default priority 納入本 spec再實作。
- Jira 新增蒙古國旗附件 `蒙古國旗.webp`。
- KX22-2 於 2026-08-04 上傳新版 `前台語系 (3d8a0ff8-4f9d-4e5a-8285-2249401c82df).xlsx`；此項當時的附件版本疑問已由 2026-08-06 的 Locale Manager／Sheet 完成狀態取代，不再是 NX 實作 blocker。
- Jira 提到的 AI Team `/translate` API 在 NX repo 目前沒有 client；AI API 的 `mn` 參數由 Dashboard spec 處理，不納入本 R017 實作。

## 實作澄清（2026-08-06 11:24；2026-08-07 main 架構更新）

- Corey 確認 locale manager repo 與會員端 Google Sheet 均已加入 canonical code `mn`；翻譯資料與自動翻譯已由既有 Locale Manager 流程處理。
- NX `main` 已於 `79110e9 feat: 集中前台語系至 Locale Manager` 改為 remote-only：所有 bundled locale JSON 與 locale `file` 設定均已移除。因此本票不得新增 `libs/shared/ui-layer/i18n/locales/mn.json`，也不得把其他 locale 的 `file` 設定帶回來。
- Remote `mn.json` 與版本發布是外部流程；NX 實作者只新增 Nuxt locale 註冊、remote allowlist 並在 DEV 驗證。
- `main` 已提供新版 remote 載入失敗處理 `warnCurrentLocaleLoadFailure()`；本票不覆蓋或降級該處理，也不為 `mn` 新增特殊 fallback。
- AI 翻譯 request（文案 + 目標語系）屬既有後台流程；NX repo 沒有需要修改的 AI Team client，不新增 `/translate`、alias 或特殊處理。
- Locale Manager 已確認英文顯示名稱為 `Mongolian`。shared `LANGUAGE_I18N_KEYS` 使用已確認的 remote key `common.mn`；不得假設代理端其他 key 必然可共用。

## 最小實作決策（2026-08-06）

- 使用者確認本票重點是三個前端加入 `mn` language capability；不擴大修改翻譯或 AI 流程。
- shared Nuxt locale 的 `name` 固定為 `Mongolian`，依現有 alphabetical locale 清單把 `mn` 放在 `ms` 與 `my` 之間。
- `LANGUAGE_I18N_KEYS[MN]` 使用使用者已確認的語意 key `common.mn`；selector 使用 Nuxt locale `name`，所以 remote key 尚未同步時不影響顯示。
- `resolveLaunchLanguageCode("mn")` 明確 fallback 至既有 English `0`，不猜測蒙古語 numeric code。
- 官方 frontend remote `mn.json` 已可讀，但 2026-08-06 檢查時 2,197 個 key 中只有 2 個非空；不得把該不完整 export commit 為 bundled fallback，也不得自行翻譯。code capability 可先完成，但真正蒙古語文案仍是 Locale Manager／翻譯資料的 runtime blocker。
- R017 維持 selector support only；不修改 Nuxt global default 或 `/settings.default_language` priority。

## 已確認現況

### Shared locale 與 CMS contract

- `libs/shared/ui-layer/nuxt.config.ts` 的 `i18n.locales` 是 Nuxt runtime selector 清單；R017 繼承此 layer。
- Current `main` 不維護 bundled locale JSON；`libs/shared/ui-layer/i18n.config.ts` 仍提供 Locale Manager flat dot-notation key resolver。
- `libs/shared/ui-layer/src/lib/constants/enums/languageType.ts` 定義：
  - `LANGUAGE_TYPE_ENUMS`
  - `LANGUAGE_I18N_KEYS`
  - `LANGUAGE_LABELS`
  - `LANGUAGE_ABBREVIATIONS`
  - numeric `LANGUAGE_CODE_ENUMS`
- `LANGUAGE_TYPE_ENUMS` 也限制 CMS 多語資料型別，例如 `cmsTypes.ts` 與 `cms_getFloatIcon.ts`。

### R017 語系選擇器與狀態

- `apps/r017/src/layouts/default.vue` 掛載 shared `Header.vue`，Header 固定包含 `LanguageSelect.vue`。
- `useLanguage.ts` 由 Nuxt `locales` 產生選項，再依 `/settings.language` 過濾；後端未啟用 `mn` 的站點原則上不顯示蒙古語。
- 選項順序依 `i18n.locales` 靜態順序，不依 `/settings.language` 順序。
- `changeLanguage()` 使用 Nuxt `setLocale()`；`i18n_redirected` cookie 保存目前語系。
- 全域 Nuxt default 目前為 `en`。`/settings.default_language` 雖已暴露，但現況沒有自動切換至該值；本票不順便改寫既有 default priority。
- `/settings.language` 為空或解析失敗時，現況會顯示所有 Nuxt locales。新增 shared `mn` 後，設定異常的其他站點也可能看到蒙古語，需在 release 前確認後端 production setting 不會為空，或由產品明確接受此既有 fallback。

### Remote locale

- `apps/r017/src/plugins/remote-locale.client.ts` 啟動 remote locale lifecycle。
- `libs/shared/ui-layer/src/lib/utils/remoteLocale.ts` 使用 allowlist 與 mapping 決定 remote filename；目前未包含 `mn`。
- remote URL 由 `${localeRemoteBase}/${remoteLocale}.json` 組成。
- `useRemoteLocaleMessages.ts` 在切換前預載並在切換後套用 remote messages；current `main` 已統一處理 remote load failure 與 current-locale recovery。

### API 與遊戲啟動

- `axiosInterceptors.ts` 直接把 cookie locale 放入一般 API 的 `Accept-Language`；`mn` 不需額外 string mapping。
- R017 首頁 banner preload 也直接傳 cookie locale。
- 遊戲啟動使用 numeric `language_code`。`openGame.ts` 的 `LAUNCH_LANGUAGE_CODE_BY_LOCALE` 尚無 `mn`，unknown locale 會 throw `RangeError`。
- `useOpenGame.ts` 使用該 resolver 建立 launch request。

## 翻譯附件與資產來源

### 前台翻譯

- GSI-475 原始前台附件曾完成歷史結構檢查：2,089 筆、無重複 Key、無空白 Mongolian、未發現 placeholder mismatch。
- KX22-2 在 2026-08-04 上傳新版前台 XLSX；不能假設舊檢查結果自動適用新版。
- 以下是翻譯資料維護流程的歷史檢查要求：
  1. Key 非空且唯一。
  2. Mongolian 值非空。
  3. English 與 Mongolian 的 `{placeholder}` 集合一致。
  4. JSON serialization 保留所有 literal flat keys；允許 repo 現況支援的 parent／child prefix pair（例如 `a` 與 `a.b`），只禁止 exact duplicate key。
- 工程不得自行翻譯、校正文法、移動 placeholder 或用英文覆蓋問題列。

2026-08-07 最新狀態：Locale Manager repo 與會員端 Google Sheet 已加入 `mn`。Jira XLSX 的版本比較不再是 NX 程式實作 blocker；翻譯內容由 Locale Manager remote export 維護，NX repo 不提交 `mn.json`。

### 蒙古國旗

- 使用 Jira 附件 `蒙古國旗.webp` 作為原始圖像來源。
- R017 selector 固定讀取 `/images/flagSquare/<locale>.png`，所以輸出資產為：

```text
apps/r017/src/public/images/flagSquare/mn.png
```

- 只做符合既有 PNG 尺寸／裁切規格所需的格式轉換，不重新設計國旗。
- `resolveLanguageIcon("mn")` 會直接得到 `mn`，不需新增 icon alias。

## 前置依賴 / release blocker

已完成的外部前置：Locale Manager repo 與會員端 Google Sheet 已加入 `mn`，canonical code 與英文顯示名稱 `Mongolian` 已確認。

下列 runtime 契約未確認前，不得宣稱 R017 完整上線；名稱、排序、key、numeric fallback 與 selector-only 行為已由上述最小實作決策收斂：

1. Locale Manager／翻譯方補齊 frontend `mn.json` 非空內容並完成 placeholder 驗證。
2. remote i18n 團隊確認 DEV 可讀取 `${localeRemoteBase}/mn.json`。
3. 後端確認 KXG1 DEV／正式 `/settings.language` 包含 `mn` 與 `en`，且非 KXG1 production 設定不會因空值 fallback 暴露所有語系。

## 範圍

### 1. 註冊 shared Nuxt locale

修改 `libs/shared/ui-layer/nuxt.config.ts` 的 `i18n.locales`，加入：

```ts
{
  code: "mn",
  name: "Mongolian"
}
```

要求：

- `code` 與後端 confirmed canonical code 完全一致，固定為 `mn`。
- `name` 使用 Locale Manager 已確認的英文顯示名稱 `Mongolian`；不得自行改成未確認的 native label。
- 依現有 alphabetical ordering 插在 `ms` 與 `my` 之間。
- 不新增 `file` 欄位，不修改 Nuxt `defaultLocale` 或其他既有 locale 的 code／name。

### 2. 維持 remote-only locale 架構

要求：

- 不新增 `libs/shared/ui-layer/i18n/locales/mn.json`，也不重建已由 `main` 刪除的 `i18n/locales` 目錄。
- 不把官方 remote export、English copy 或人工翻譯提交到 NX repo。
- Locale Manager `mn.json` 完整度仍是正式啟用前的外部 release blocker。

### 3. 註冊 shared language enum／records

修改 `libs/shared/ui-layer/src/lib/constants/enums/languageType.ts`：

```ts
MN = "mn"
```

並補齊：

- `LANGUAGE_I18N_KEYS`：使用已確認的 `common.mn`。
- `LANGUAGE_LABELS`：使用已確認的 `Mongolian`。
- `LANGUAGE_ABBREVIATIONS`：`MN`。
- backend key 註解加入蒙古語 `mn`。

不得為了通過型別檢查使用錯誤語意的既有 key。

### 4. Remote locale 支援

修改 `libs/shared/ui-layer/src/lib/utils/remoteLocale.ts`：

- 將 `mn` 加入 `REMOTE_LOCALE_CODES`。
- canonical code 與 remote filename 都是 `mn` 時，不新增 `REMOTE_LOCALE_MAP` alias。
- `buildRemoteLocaleUrl(base, "mn")` 必須得到 `${normalizedBase}/mn.json`。
- 不改其他 locale 的 mapping／merge 行為。

不修改 `libs/shared/ui-layer/src/lib/composables/useRemoteLocaleMessages.ts`：

- current `main` 已提供 `warnCurrentLocaleLoadFailure()` 與統一 lifecycle recovery；本票不得覆蓋、降級或複製該處理。
- 成功時維持既有預載、切換後套用 remote messages 的行為。

若 repo 已有 `remoteLocale` focused test，擴充 `mn` allowlist／URL coverage；不得只為本票新增整套測試基礎設施。

### 5. R017 旗幟與 selector 驗證

新增 `apps/r017/src/public/images/flagSquare/mn.png`。

原則上不修改 `LanguageSelect.vue`、`LanguageOption.vue`、`Header.vue` 或 R017 layout；現有 code 已能依 locale code 載入 `mn.png`。只有實測證明既有 selector 無法呈現 `mn` 時，才做最小修正並先記錄原因。

需同時驗證 desktop 與 mobile：

- 選項顯示產品確認名稱。
- 當前語系與下拉選項都顯示蒙古國旗，沒有 404。
- 切換與 cookie persistence 正常。

### 6. 一般 API 語系

不修改 shared axios interceptor。以 focused test／Network 驗證：

- 目前 locale 為 `mn` 時，一般 API 帶 `Accept-Language: mn`。
- R017 banner preload 使用 `mn`。
- 不新增 `mn-MN`、`mongolian` 或其他 alias。

### 7. 遊戲 launch numeric language code

修改 `libs/shared/ui-layer/src/lib/utils/openGame.ts` 的 `LAUNCH_LANGUAGE_CODE_BY_LOCALE`：

- 將 `mn` 明確 map 至 `LANGUAGE_CODE_ENUMS.en`（`0`）；未來若後端提供專用 numeric code，另開需求修改。
- 不得讓 `mn` 維持 unsupported 而在 launch 時 throw。
- 不修改其他 locale mapping 或 wallet／game payload 行為。

擴充既有 open-game focused tests，驗證 `resolveLaunchLanguageCode("mn")` 得到確認值，且原有 locale mapping 不變。

### 8. 後端站點設定協作

後端需在 KXG1 DEV／正式環境設定：

- `language` 包含 `mn`、`en`。
- `default_language` 為 `mn`。

前端不 hardcode KXG1／siteKey。注意 NX 目前不會自動套用 `/settings.default_language`；本票只新增蒙古語 capability 與 selector，不擴大成 default-language priority 重構。若產品要求「首次訪客一定自動切至 `mn`」，必須另行確認行為並先更新 spec。

## Out of scope

- 不修改舊會員端 `Whitelabel_GSI_Platform_Multiverse`／`set_r033`。
- 不修改代理端 Dashboard 或其 AI Team `/translate` 流程。
- 不新增或修改 NX 的 AI Team `/translate` client、payload mapping 或 response adapter。
- 不修改後端程式、remote i18n 平台或部署 pipeline。
- 不 hardcode KXG1、kingxgo 或 R017 siteKey 判斷到 shared layer。
- 不讓蒙古語自動成為所有 NX apps／站點的 default locale。
- 在產品只確認 selector support 的前提下，不順便修正 `/settings.default_language` 目前未自動套用的既有行為；若產品要求 Mongolian 首次預設，先更新 spec 再納入。
- 不改 selector UI、Header layout、顏色、spacing、responsive、動畫或互動樣式。
- 不自行發明語系名稱、i18n key、翻譯或遊戲 numeric code。
- 不修改其他語系的名稱、翻譯、旗幟、remote mapping 或 game mapping。
- 不把 XLSX／Jira 原始 WebP commit 到 repo。
- 不處理 unrelated lint／type／format 問題。

## 受影響範圍 / cross-site 風險

- R017-only：
  - `apps/r017/src/public/images/flagSquare/mn.png`
  - R017 desktop／mobile selector smoke test
- Shared capability（也會被 R001 等其他 apps 繼承）：
  - `libs/shared/ui-layer/nuxt.config.ts`
  - `libs/shared/ui-layer/src/lib/constants/enums/languageType.ts`
  - `libs/shared/ui-layer/src/lib/utils/remoteLocale.ts`
  - `libs/shared/ui-layer/src/lib/utils/openGame.ts`
- Runtime activation：只有 `/settings.language` 包含 `mn` 的站點才應顯示蒙古語。
- 既有風險：`/settings.language` 空白／解析失敗會顯示所有 shared locales。release 前必須驗證非 KXG1 production settings，或由產品明確接受該 fallback；不得為本票任意重構 shared fallback。

## 參考實作 / 要遵循的現有 pattern

- Shared Nuxt locales：`libs/shared/ui-layer/nuxt.config.ts`
- Flat-key resolver：`libs/shared/ui-layer/i18n.config.ts`
- Language enum／records：`libs/shared/ui-layer/src/lib/constants/enums/languageType.ts`
- CMS language types：`libs/shared/ui-layer/src/lib/api/commonTypes/cmsTypes.ts`
- Settings contract／query：`libs/shared/ui-layer/src/lib/api/commonTypes/settingType.ts`、`libs/shared/ui-layer/src/lib/api/hooks/useSetting.ts`
- Selector source／filter／switch：`libs/shared/ui-layer/src/lib/composables/useLanguage.ts`
- Selector UI：`libs/shared/ui-layer/src/lib/components/header/LanguageSelect.vue`、`LanguageOption.vue`
- R017 layout：`apps/r017/src/layouts/default.vue`
- Remote allowlist／URL／merge：`libs/shared/ui-layer/src/lib/utils/remoteLocale.ts`
- Remote lifecycle：`apps/r017/src/plugins/remote-locale.client.ts`、`libs/shared/ui-layer/src/lib/composables/useRemoteLocaleMessages.ts`
- API language header：`libs/shared/ui-layer/src/lib/api/axiosInterceptors.ts`
- Game language resolver：`libs/shared/ui-layer/src/lib/utils/openGame.ts`
- Game launch consumer：`libs/shared/ui-layer/src/lib/composables/useOpenGame.ts`

## 關鍵決策與理由

1. **不是 backend-only。** `/settings.language` 只會過濾 Nuxt 已註冊 locales；前端沒有 `mn` 時 selector 不會出現。
2. **shared capability、backend activation。** R017 繼承 shared layer，語系能力放 shared；站點是否顯示仍由 `/settings.language` 控制。
3. **維持 remote-only。** `main` 已集中前台語系至 Locale Manager；目前官方 `mn.json` 內容不完整，因此 code capability 可驗證，但正式上線仍需等待 Locale Manager 補齊。NX 不新增 bundled fallback，前端不得捏造翻譯。
4. **canonical code 全程使用 `mn`。** Nuxt code、cookie、API header、remote filename 與後端 code 保持一致，不新增無依據 alias。
5. **default priority 必須由產品明確決定。** Jira 新增文字只明確要求 R017 selector 出現蒙古語；`/settings.default_language` 未自動套用是既有 shared 行為。若首次 Mongolian default 也是驗收條件，必須先擴充本 spec並評估所有 NX apps。
6. **numeric launch code 是獨立契約。** `Accept-Language: mn` 不能推導遊戲 numeric code，必須取得確認值或明確 English fallback。
7. **旗幟是 R017 資產。** selector 從 app public path 讀 PNG，使用 Jira WebP 轉檔即可，不需改 shared icon map。
8. **AI API 不在 NX 範圍。** repo 無相應 client，需求由 Dashboard spec 承接。
9. **Jira XLSX 不再是實作輸入。** 翻譯由 Locale Manager／Sheet export 維護，NX repo 不保存該 export。

## 驗收條件

- [ ] Shared Nuxt `i18n.locales` 註冊 `mn`，名稱為 `Mongolian`、排序位於 `ms` 與 `my` 之間，且不含 `file` 欄位。
- [ ] `LANGUAGE_TYPE_ENUMS.MN = "mn"`，`LANGUAGE_I18N_KEYS`、`LANGUAGE_LABELS`、`LANGUAGE_ABBREVIATIONS` 全部補齊且語意正確。
- [ ] CMS 多語型別可接受 `mn`，未用 `any` 或不相關 key 規避型別。
- [ ] Locale Manager repo／會員端 Google Sheet 已包含 `mn`；NX 未提交 `mn.json` 或重建已移除的 bundled locale 目錄；已把 remote 翻譯大多數值為空記錄為 release blocker，未自行補翻譯。
- [ ] Remote allowlist 支援 `mn`，`buildRemoteLocaleUrl(base, "mn")` 得到 `${base}/mn.json`。
- [ ] DEV remote `mn.json` 可讀；切換沿用 current `main` remote lifecycle，未以舊版 fallback 程式覆蓋；完整蒙古語 UI 的驗收需待外部翻譯資料補齊。
- [ ] `apps/r017/src/public/images/flagSquare/mn.png` 由 Jira flag 轉檔，desktop／mobile selector 無 404 或錯旗。
- [ ] KXG1 `/settings.language` 包含 `mn` 時，R017 selector 顯示確認名稱；不含 `mn` 的站點不顯示。
- [ ] 切換至 `mn` 後 UI 使用蒙古語，`i18n_redirected` 保存；重新整理後維持 `mn`。
- [ ] 一般 API 與 R017 banner preload 在蒙古語下送出 `Accept-Language: mn`／`mn` locale。
- [ ] 遊戲 launch 對 `mn` 明確使用 English `0` fallback，不會 throw unsupported locale。
- [ ] R017 至少一個標準遊戲可在蒙古語 UI 下正常啟動，launch request 沒有 `undefined`／`null`／NaN language code。
- [ ] 非 KXG1／未啟用蒙古語站點的 selector、default、翻譯與遊戲 launch 無回歸。
- [ ] `/settings.language` 空值 fallback 風險已由有效 production settings 隔離，或已有產品書面接受。
- [ ] 產品已確認 R017 是 selector support only，或本 spec 已先更新並完整驗收首次 Mongolian default；不得一邊宣稱 Default 完成、一邊排除 default behavior。
- [ ] 在 selector-only 決策下，未修改 Nuxt global default、`default_language` priority、selector UI、其他 locale 或 unrelated code。
- [ ] 未 hardcode KXG1／R017 activation，未加入 AI `/translate` client，未 commit XLSX／原始 WebP。

## 邊界情況 / 例外

- `/settings.language` 不含 `mn`：selector 不顯示蒙古語，即使 shared layer 已註冊，符合 backend activation。
- `/settings.language` 空白或無效：既有行為顯示所有 locales；不得未經產品確認在本票改變此 shared fallback。
- cookie 是 `mn`，但站點未啟用 `mn`：需確認 current selector fallback 不崩潰，並以該站點可用語系顯示；不得讓蒙古語成為未啟用站點的新 default。
- remote `mn.json` 404／invalid JSON：沿用 current `main` 的 remote-only recovery 與錯誤提示；本票不另建 bundled fallback。正式啟用前必須確保 remote 翻譯可用。
- remote filename 不是 `mn.json`：先更新 spec 並加入明確 mapping；不在實作時猜 alias。
- 遊戲 API 沒有蒙古語 code：只有取得明確同意後才能 map English `0`；否則是 release blocker。
- 產品要求初次訪客自動使用 KXG1 `default_language = mn`：這超出現況行為，先更新 spec 再改 shared priority。

## 測試計畫

### Focused automated tests

新增／擴充現有測試：

1. `remoteLocale.test.ts`
   - `mapRemoteLocale("mn") === "mn"`。
   - URL 為 `/mn.json`。
   - 其他既有 alias 不變。
2. `useLanguage` focused test（沿用 repo 現有測試位置／pattern）
   - settings 含 `mn` 時顯示、未含時隱藏。
   - `setLocale("mn")` 與 cookie persistence 行為正常。
3. `openGame` focused test
   - `resolveLaunchLanguageCode("mn")` 回傳確認值或 English `0` fallback。
   - 不 throw，其他 locale mapping 不變。
4. 對官方 frontend remote `mn.json` 執行暫時 validation harness（不納入 commit）
   - 驗證 JSON 可解析，列出空值與 placeholder mismatch 作 external release blocker，不在前端修正，也不保存 export 到 NX repo。

### Focused repo validation

- 執行與 touched tests 對應的 `pnpm exec vitest run <focused-test-files>`。
- 執行 `pnpm exec nx build r017`。
- 對 touched files 執行 repo 既有 focused lint／format check；不修 unrelated issue。
- 執行 `git --no-pager diff --check -- <touched-files>`。

### 手動驗證

使用 Chrome extension 開啟 KXG1 R017 DEV：

1. 確認 `/settings.language` 含 `mn`、`en`，remote `/mn.json` 成功。
2. desktop／mobile selector 顯示正確蒙古語名稱與國旗。
3. 切換 `mn`、重新整理，確認 cookie 與 UI 保留。
4. 檢查 Header、首頁、登入／註冊、會員中心、錢包、優惠／活動、公告、CMS 動態內容等代表性 surface。
5. Network 確認一般 API `Accept-Language: mn` 與 banner preload locale。
6. 開啟至少一個標準遊戲，確認 numeric `language_code` 與遊戲啟動結果。
7. 模擬 remote `mn.json` 失敗，確認沿用 current `main` recovery，不因本票造成額外 crash；不宣稱缺少 remote translation 時蒙古語 UI 完整可用。
8. 使用至少一個未啟用 `mn` 的其他 NX 站點回歸 selector、default、API 與遊戲 launch。

## Git Flow

- 基底分支：`main`；開始前依 repo 規則完成遠端驗證並 pull 最新 `main`。
- 工作分支：`feat/gsi-475-r017-mongolian-locale`。
- 實作者開始前必須先從 `main` 建立／切換到工作分支；不可直接在 `main` 或其他共享分支實作。
- 2026-08-07 已確認此 repo remote 只有 `main`，沒有 `develop`／`staging`；使用者明確指示本次直接將完成並驗證的工作分支合入 `main`。程式合入不代表可立即啟用蒙古語，仍受上述 Locale Manager translation 與站點設定 release blocker 限制。
- 任一 merge 有 conflict 時停止，不自行解衝突或把目標分支 merge 回工作分支。
- Commit 前需取得使用者針對該次提交的明確確認；不得沿用先前確認。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

- Locale Manager／Sheet、`mn` code 與 `Mongolian` 名稱已確認；先確認剩餘六項 runtime／產品 blockers，再修改 shared locale／game mapping。
- 本票會改 shared layer；開始實作前需明確通知 shared surface 會影響 R001 等其他 NX apps。
- 若排序、remote filename、NX i18n key 或 numeric launch code與本 spec 不同，先更新 spec，再實作。
- 不要下載或 commit XLSX、Jira 原始 WebP、remote `mn.json` export 或暫時 validation harness；NX 必須維持 current `main` 的 remote-only 架構。
- reviewer 必須同時檢查 code、remote i18n、KXG1 settings、desktop／mobile selector、API header 與遊戲 launch；只檢 code 不算完整 runtime 驗收。
