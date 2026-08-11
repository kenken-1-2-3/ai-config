# Spec: GSI-475 KXG1 會員端新增蒙古語系

> 交接合約：實作者只依本 spec 實作，reviewer 逐條對照「驗收條件」驗收。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-475-kxg1-mongolian-locale.md`（版控於 ai-config）。
> 本 spec 僅處理舊會員端 `Whitelabel_GSI_Platform_Multiverse` 的 KXG1／`set_r033`；代理端與新架構 R017 會員端各有獨立 spec。

- Jira：[GSI-475｜[需求 會員端/代理端]KXG1新增蒙古語系](https://gamingsoft.atlassian.net/browse/GSI-475)
- 關聯建站票：[GSI-365｜KXGM/KXG1測試環境建立](https://gamingsoft.atlassian.net/browse/GSI-365)
- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`
- 站點：總代 `KXGM`、代理 `KXG1`、品牌 `kingxgo`
- siteKey / template：`set_r033`
- 幣別：MNT
- 環境：測試環境、正式環境
- 站點語系：Mongolian（Default）、English
- 語系代碼：`mn`（後端已確認並部署 DEV）

## 需求更新（2026-08-03～2026-08-04）

- Jira 已明確指定語系代碼為 `mn`。
- 後端於 2026-08-04 回覆已支援 `mn` 並部署 DEV；canonical player code 與 `Accept-Language` code 不再是 blocker。
- Jira 補充「新舊架構都需要新增此語系」，並特別要求 R017 語系選擇也顯示「蒙古語」；R017 由 `whitelabel-gsi-platform-multiverse-nx` 的獨立 spec 處理。
- Jira 新增蒙古國旗附件 `蒙古國旗.webp`，旗幟資產應以該附件為需求來源，轉成 repo 現行格式後使用。
- 關聯票 [KX22-2｜新增蒙古语系（前端 & 后台）](https://gamingsoft.atlassian.net/browse/KX22-2) 於 2026-08-04 上傳新版前／後台語系 XLSX；此項當時的附件版本疑問已由 2026-08-06 的 Locale Manager／Sheet 完成狀態取代，不再是舊會員端實作 blocker。

## 實作澄清（2026-08-06 11:24）

- Corey 確認 locale manager repo 與會員端 Google Sheet 均已加入 canonical code `mn`；翻譯資料準備與自動翻譯已由既有 Locale Manager 流程處理。
- 舊會員端 repo 的工作只保留前端支援 `mn` 所需的 locale 定義、顯示名稱／既有 key 接線、國旗，以及遊戲 numeric／provider mapping；不下載、匯入、修改或重新判定 Jira XLSX 版本。
- Remote `mn.json` 與版本發布是外部流程，實作者只在 DEV 驗證可讀與 fallback，不在 repo 建 local locale JSON。
- AI 翻譯 request（文案 + 目標語系）屬既有後台流程；舊會員端沒有需要修改的 AI Team client，本 spec 不新增 AI API、alias 或特殊處理。
- Locale Manager 已確認英文名稱為 `Mongolian`。會員端 `LANGUAGE_I18N_KEYS` 仍應接到會員端資料集中已存在且語意相容的 key；不得假設代理端已建立的 `common.mn` 必然屬於同一資料集。

## 最小實作決策（2026-08-06）

- 使用者確認本票重點是三個前端加入 `mn` language capability；不擴大修改翻譯或 AI 流程。
- 為避免會員在蒙古語 UI 啟動遊戲時送出 `undefined`，舊會員端明確將 `mn` numeric launch code fallback 至既有 English `0`。
- BetBy 與 Digitain 的 `mn` provider locale 明確 fallback 至 `en`，不猜測尚未確認的蒙古語 provider code。
- `LANGUAGE_TYPE.I18nKeys[MN]` 使用使用者已確認的語意 key `common.mn`；實際 selector 仍以 `Labels[MN] = "Mongolian"` 顯示，因此 remote key 尚未同步時不影響 set_r033 selector。
- 官方 frontend remote `mn.json` 已可讀，但 2026-08-06 檢查時 2,197 個 key 中只有 2 個非空；code capability 可先完成，真正蒙古語文案仍是 Locale Manager／翻譯資料的 runtime blocker，前端不得以硬碼或自行翻譯補齊。

## 背景 / 目標

GSI-365 已記錄 KXG1 使用 `set_r033`，主要市場為 Mongolia，預設語系為 Mongolian，次語系為 English。GSI-475 要求會員端及代理端新增蒙古語，並在 Jira 附上完整翻譯表。

會員端不能只由後端回傳 `mn`：

- vue-i18n `availableLocales` 只包含前端 `LANGUAGE_TYPE.Enums` 已註冊語系。
- `/v1/player/settings.language` 雖決定站點啟用清單，composable 仍會過濾掉前端未知 code。
- 一般 API 會帶目前語系的 `Accept-Language`。
- 遊戲啟動另使用 numeric `language_code`；未補 mapping 時會得到 `undefined`。
- BetBy、Digitain 有各自 provider language code mapping。

因此要完成 KXG1 蒙古語，必須同步處理 player settings、remote i18n、shared locale 註冊、旗幟、API code 與遊戲 provider fallback。

## 已確認現況

### set_r033 初始化與語系選擇

- `template/set_r033/layout/Index.vue` 初始化時呼叫 `getAgentSetting()`。
- `GET /v1/player/settings` 回傳：
  - `default_language`：站點預設語系。
  - `language`：JSON 字串語系列表，順序需保留。
- `src/common/composables/useLanguage.ts`：
  - API 語系列表只保留同時存在於 vue-i18n `availableLocales` 的 code。
  - 初始化優先序：query `?lang=` → Pinia persisted language → API `default_language` → API language list 第一筆。
  - 每一階段都要求 code 同時被 frontend enum 與 API 列表支援。
- `template/set_r033/layout/LanguageDropdown.vue` 使用 shared available languages、shared label 與 shared flag lookup。

### Remote i18n

- repo 不維護 locale JSON。
- `src/boot/i18n.ts` 讀取 remote `version.json` 及語系 JSON，並以版本寫入 localStorage cache。
- 非英文語系載入前會先載 English 作 placeholder reference。
- remote 檔缺失或 fetch 失敗會 fallback English；vue-i18n 亦設定 `fallbackLocale: "en"`。
- runtime 切換另使用 `src/common/i18n/loadLanguageAsync.ts`；若需 filename alias，boot 與 async loader 的 `LEGACY_LOCALE_MAP` 必須同步。

### API 與遊戲語言

- 一般 API request 會送 `Accept-Language = current language || default language`。
- 一般遊戲啟動使用 `src/common/utils/constants/languageCode.ts` 的 numeric enum；目前沒有蒙古語。
- `useGame`、Saba、Lucky、FB Sports、BetBy、Digitain 等 launch flow 都會使用 numeric language mapping。
- BetBy 與 Digitain 另有 provider-specific string language map。
- 未確認 Mongolia provider code 前，不可把 ISO code 直接當 provider contract。

## 翻譯附件稽核

### GSI-475 原始前台附件（歷史基準）

Jira 原附件 `前台語系 (1) (...).xlsx`：

- `工作表2` 共 2,089 筆翻譯。
- 欄位為 `Key`、`en`、`zh-CN`、`Mongolian`。
- Key 無重複。
- Mongolian 欄沒有空值。
- 英文與 Mongolian 的 `{placeholder}` 集合沒有發現不一致。
- `工作表3` 為空白，不納入匯入。

上述原始附件的結構檢查通過，但只是歷史基準，不代表它仍是最終發布版本，也不代表工程已驗證蒙古語文法或語意。

### KX22-2 新版附件

關聯票 KX22-2 於 2026-08-04 上傳 `前台語系 (3d8a0ff8-4f9d-4e5a-8285-2249401c82df).xlsx`。以下是翻譯資料維護流程的歷史檢查要求：

1. 由 PO／AM 確認它是否正式取代 GSI-475 原始前台附件。
2. 對確認採用的最終版重新執行 Key 唯一性、Mongolian 空值及 placeholder 集合一致性檢查。
3. 翻譯內容以 AM／翻譯提供方確認版本為準，實作者不得自行改寫或假設新版與原始版內容相同。

2026-08-06 最新狀態：Corey 確認 Google Sheet 與 locale manager 已加入 `mn`。上述 XLSX 稽核只保留作歷史背景，不再是舊會員端程式實作的 blocker；實作者以已更新的 Locale Manager／Sheet 輸出為外部資料來源。

## 前置依賴 / 實作 blocker

已完成的外部前置：Locale Manager repo 與會員端 Google Sheet 已加入 `mn`，canonical player code 與一般 API `Accept-Language` 也已確認為 `mn`。

下列 runtime 契約未確認前，不得宣稱完整上線；numeric／provider fallback 與名稱 key 已由上述最小實作決策收斂：

1. DEV 確認 remote filename 為預期的 `mn.json` 且可讀；若 filename 不同，先更新 spec 再加明確 alias。
2. Locale Manager／翻譯方補齊 frontend `mn.json` 非空內容並完成 placeholder 驗證。
3. 後端確認 KXG1 測試／正式環境的 `/v1/player/settings` 都能設定 Mongolian default + English。

如果 remote filename 使用其他字串，必須先更新本 spec，明確列出 alias；不得在實作中自行推測。

## 範圍

### 1. 註冊 shared member locale

修改 `src/common/utils/constants/languageType.ts`：

- 在 `LANGUAGE_TYPE.Enums` 加入已確認的蒙古語 code：

```ts
MN = "mn"
```

- 同步補齊 exhaustive records：
  - `I18nKeys`：使用已確認的 `common.mn`。
  - `Labels`：使用已確認的 `Mongolian`。
  - `Abbreviation`：`MN`。
- 更新 backend key 註解。
- 不修改既有語系 code、label 或歷史命名。

### 2. Shared label map

修改 `src/common/composables/useLanguage.ts` 的 `langListWithLabel` mapping：

- 新增蒙古語 code 對應的已確認顯示名稱 `Mongolian`。
- mapping 與 `LANGUAGE_TYPE.Labels` 的語意需一致。
- 不改初始化 priority、normalization 或 API list filter。

### 3. KXG1 語系旗幟

新增 shared round flag asset：

```text
src/common/assets/images/flag/mn.<existing-format>
```

要求：

- 原始圖像來源使用 Jira 附件 `蒙古國旗.webp`；只做符合現有 flag 資產規格所需的格式／裁切轉換，不重新設計國旗。
- filename 必須等於 confirmed frontend locale code `mn`。
- 沿用既有 flag directory 的格式與尺寸。
- `set_r033` LanguageDropdown 在蒙古語下顯示蒙古國旗，不 fallback English flag。
- 只有 KXG1 實際 surface 使用 `getSquareFlagImg()` 且驗證缺圖時，才補 `flagSquare`；不要為未使用 surface 擴大資產變更。

### 4. Remote locale loader

若 remote i18n 依 canonical code 使用 `mn.json`：

- 不修改 `LEGACY_LOCALE_MAP`；沿用 direct filename loading。

若後端 code 與 remote filename 不同：

- 先更新本 spec，記錄明確 mapping。
- 同步修改：
  - `src/boot/i18n.ts`
  - `src/common/i18n/loadLanguageAsync.ts`
- 兩份 mapping 必須完全一致。

不得只改其中一份，否則首次 boot 與 runtime 切換會使用不同檔名。

### 5. 驗證會員端 remote i18n（不修改本 repo）

Locale Manager／Google Sheet 已加入 `mn`，remote 發布由既有外部流程完成。舊會員端實作者只驗證：

1. DEV 可讀取與 loader contract 相符的蒙古語 `mn.json`。
2. remote `version.json` 已更新，使快取版本改變。
3. remote 失敗時既有 English fallback 可用。
4. 若資料或版本缺失，回報 Locale Manager／部署方修正；不得回到 Jira XLSX 重做翻譯，也不得在 repo 建 local locale JSON。

### 6. Numeric game language code

修改 `src/common/utils/constants/languageCode.ts` 及所有必要 launch consumers，確保蒙古語下永遠不會送出 `undefined`。

決策規則：所有 launch flow 對蒙古語明確送 `LANGUAGE_CODE.Enums.en`（`0`）；未來若後端提供專用 code，另開需求修改，不在本票猜數字。
- 不重構遊戲啟動架構；只做蒙古語 mapping 所需最小修改。

需覆蓋至少：

- `src/common/composables/useGame.ts`
- `src/common/hooks/useSabaGame.ts`
- `src/common/hooks/useLuckyGame.ts`
- `src/common/hooks/useFBSportsGame.ts`
- `src/common/hooks/useBetByGame.ts`
- `src/common/hooks/useDigitainGame.ts`

若共用 numeric enum mapping 已能讓所有 call path 正確取得數值，consumer 不需逐檔修改，但測試必須逐類型驗證。

### 7. Provider-specific language fallback

修改：

- `src/common/hooks/useBetByGame.ts`
- `src/common/hooks/useDigitainGame.ts`

要求：

- 為 `LANGUAGE_TYPE.Enums.MN` 明確 mapping 至 `en`；未來若 provider 官方提供蒙古語 code，另開需求修改。
- 不依賴 map lookup 後的隱式 fallback 來掩蓋缺少 exhaustive mapping；spec 要求新增語系的 fallback 意圖在 code 中可讀。
- 不調整其他 provider 的既有 code。

### 8. KXG1 player settings

後端需在測試及正式環境設定：

```json
{
  "default_language": "mn",
  "language": "[\"mn\",\"en\"]"
}
```

上例使用後端已確認的 canonical code `mn`。

要求：

- Mongolian 位於語系列表第一位。
- English 仍可選。
- 不替其他代理／站點開啟 Mongolian。

### 9. set_r033 驗證

`template/set_r033` 原則上不新增 site-specific 語系邏輯。需驗證：

- layout 初始化取得 KXG1 settings 後預設 Mongolian。
- LanguageDropdown 顯示 Mongolian、English 且順序正確。
- query `?lang=mn`、persisted language、API default 與 API first-language fallback 的現有優先序正常。
- 切換語系後 remote translation、CMS 內容、API error message 與遊戲啟動沒有 runtime error。

## Out of scope

- 不修改代理端 Dashboard repo；代理端由另一份 spec 處理。
- 不修改新架構 `whitelabel-gsi-platform-multiverse-nx`／R017；由 R017 獨立 spec 處理。
- 不修改後端程式、provider API 或 remote i18n 平台程式。
- 不新增或修改 AI Team 翻譯 API／client；AI 翻譯按鈕驗證由代理端 spec 處理。
- 不在會員端 repo 新增 locale JSON。
- 不把翻譯 XLSX commit 到會員端 repo。
- 不自行翻譯、校正文法或發明語系名稱／i18n key。
- 不為其他 siteKey／template 啟用蒙古語。
- 不在 shared code 加 `agentCode === "KXG1"` 或 siteKey guard。
- 不改 set_r033 layout、router、頁面結構、樣式、顏色、動畫或 responsive behavior。
- 不修改其他語系 label、旗幟、provider code 或 fallback。
- 不重構 i18n boot、language store、request interceptor 或 game launch architecture。
- 不修改 `src/env/environment.json`。
- 不處理 unrelated lint／type／format 問題。

## 受影響範圍

- 驗收站點：KXG1／`set_r033`。
- 共用 infrastructure：locale enum、composable、loader、flags、game mappings 位於 `src/common`／`src/boot`，會打包進其他 templates。
- runtime activation：只有後端 `/v1/player/settings.language` 包含新 code 的站點才顯示 Mongolian；其他站點不得改設定。
- 預期修改：
  - `src/common/utils/constants/languageType.ts`
  - `src/common/composables/useLanguage.ts`
  - `src/common/assets/images/flag/mn.<existing-format>`
  - `src/common/utils/constants/languageCode.ts`（依 backend numeric contract）
  - `src/common/hooks/useBetByGame.ts`
  - `src/common/hooks/useDigitainGame.ts`
- 條件式修改：
  - `src/boot/i18n.ts`（只有需要 filename alias）
  - `src/common/i18n/loadLanguageAsync.ts`（只有需要 filename alias）
  - numeric game-code consumers（只有 shared mapping 不能覆蓋時）
- 預期只驗證、不修改：
  - `template/set_r033/layout/Index.vue`
  - `template/set_r033/layout/LanguageDropdown.vue`

## 參考實作 / 要遵循的現有 pattern

- shared locale enum／records：`src/common/utils/constants/languageType.ts`
- shared language list、label 與 flag：`src/common/composables/useLanguage.ts`
- boot remote loader：`src/boot/i18n.ts`
- runtime remote loader：`src/common/i18n/loadLanguageAsync.ts`
- persisted locale：`src/stores/languageStore.ts`
- settings API：`src/api/setting.ts`
- settings response：`src/api/response.type.ts`
- general request language header：`src/common/utils/request.ts`
- numeric game language：`src/common/utils/constants/languageCode.ts`
- standard game launch：`src/common/composables/useGame.ts`
- provider hooks：`src/common/hooks/useSabaGame.ts`、`useLuckyGame.ts`、`useFBSportsGame.ts`、`useBetByGame.ts`、`useDigitainGame.ts`
- set_r033 initialization：`template/set_r033/layout/Index.vue`
- set_r033 selector：`template/set_r033/layout/LanguageDropdown.vue`

## 關鍵決策與理由

1. **不是 backend-only。** API list 會被 frontend availableLocales 過濾；未註冊時 KXG1 看不到蒙古語。
2. **共用支援、站點設定啟用。** locale infrastructure 保持 shared，KXG1 activation 由 player settings 控制，避免 site-specific code branch。
3. **Mongolian default 由 API 控制。** 保留既有 query／persisted／API fallback priority，不在 set_r033 強制寫死 locale。
4. **翻譯由既有 Locale Manager／Sheet 流程發布。** repo 不維護 locale JSON，實作者只驗證 remote 與現有 cache/version 流程。
5. **game numeric code 是獨立契約。** 已確認的 `Accept-Language = mn` 不代表 launch API 的 numeric code 也能推導，必須由後端確認。
6. **provider 不支援時明確 fallback English。** KXG1 可使用蒙古語站點 UI，同時讓不支援蒙古語的第三方遊戲安全使用英文 UI。
7. **不自行發明 remote key 或 native label。** fallback label 已確認為 `Mongolian`；會員端 i18n key 必須使用其資料集中已存在的相容 key。
8. **不為 direct `mn.json` 增加 alias。** 只有 code 與 filename 不一致才修改兩份 loader，避免不必要 legacy mapping。

## 驗收條件

- [ ] frontend、backend 與一般 API 使用已確認的 canonical player code `mn`；remote filename 為已確認的 `mn.json` 或 spec 已記錄的明確 alias。
- [ ] `LANGUAGE_TYPE.Enums`、`I18nKeys`、`Labels`、`Abbreviation` 都包含蒙古語且型別完整。
- [ ] shared label map 包含蒙古語，fallback 顯示名稱為已確認的 `Mongolian`。
- [ ] round flag 資產存在，set_r033 selector 不會 fallback English flag。
- [ ] remote 前台 Mongolian JSON 已發布測試環境，`version.json` 已更新。
- [ ] Locale Manager repo／會員端 Google Sheet 已包含 `mn`；repo diff 未包含 XLSX 或 local locale JSON。
- [ ] KXG1 settings 回傳 Mongolian default，語系列表依序為 Mongolian、English。
- [ ] 首次進入且沒有有效 query／persisted locale 時，set_r033 使用 Mongolian。
- [ ] `?lang=<mongolian-code>` 可載入 Mongolian；無效 query 不會讓頁面崩潰。
- [ ] 切換 English／Mongolian 後重新整理，persisted 行為符合既有 priority。
- [ ] 一般 API 在 Mongolian 下傳送 confirmed `Accept-Language` code。
- [ ] 所有納入的遊戲 launch flow 在 Mongolian 下送出有效 numeric language code，不是 `undefined`／`null`／NaN。
- [ ] BetBy 與 Digitain 對 `mn` 明確使用 `en` fallback。
- [ ] 不支援 Mongolian 的 provider 可正常開啟英文遊戲介面，不因 locale mapping 失敗卡住。
- [ ] remote Mongolian JSON 載入失敗時 English fallback 生效，頁面可用。
- [ ] set_r033 代表性頁面不顯示 raw translation key；CMS／API 動態內容無 runtime error。
- [ ] 未替其他站點啟用 Mongolian；其他 siteKey 現有 default language、selector 與 game launch 無回歸。
- [ ] 未新增 local locale JSON、KXG1 frontend guard 或 unrelated set_r033 UI 修改。
- [ ] 未修改 `src/env/environment.json`，未包含 unrelated 變更。

## 邊界情況 / 例外

- persisted language 是 English：依既有 priority，使用者可維持 English；「Mongolian default」只適用沒有有效既存選擇的情況。
- query `?lang=mn` 與後端 language list 不一致：不接受未知／未啟用語系，沿用 API default。
- remote `mn.json` 尚未發布：不得推正式環境；測試環境應安全 fallback English。
- API 支援 `mn`，某 provider 不支援：站點 UI 使用 Mongolian，provider UI 明確 fallback English。
- numeric launch code 未確認：這是 blocker，不得以 `undefined` 或自行猜數字送出。
- remote filename 是 `mn-MN.json`：先更新 spec，兩份 loader同步增加 alias。
- 翻譯 key 缺失：使用現有 English fallback，記錄缺 key並回到 remote i18n 修正，不新增 local key。

## 測試計畫

### Focused executable checks

實作者需建立不納入 commit 的暫時 test／harness，commit 前移除或 unstage：

1. 驗證蒙古語 enum、I18nKeys、Labels、Abbreviation 及 shared label map 完整。
2. 驗證 remote filename resolution：boot loader 與 async loader對蒙古語得到相同 URL。
3. 驗證 settings priority：query → persisted → default → first language。
4. 逐一驗證標準 game、Saba、Lucky、FB Sports、BetBy、Digitain 的蒙古語 launch code；不得出現 `undefined`。
5. 驗證其他現有語系 mapping 不變。

### Focused repo validation

- 對 touched files 執行 focused Prettier／ESLint；只處理本需求造成且會阻擋驗證的問題。
- 執行 `git --no-pager diff --check -- <touched-files>`。
- 不執行 `tsc --noEmit`。

### 手動驗證

使用 Chrome extension 開啟 KXG1 測試環境：

1. 無 query、清除 persisted locale後登入，確認預設 Mongolian。
2. LanguageDropdown 依序顯示 Mongolian、English，名稱與旗幟正確。
3. 切換兩種語系並刷新，確認保存與 fallback priority。
4. 檢查首頁、登入／註冊、會員中心、存提款、優惠／活動、公告、遊戲大廳等代表性 surface。
5. Network 確認 remote Mongolian JSON 與 version 載入成功。
6. Network 確認一般 API `Accept-Language`。
7. 各開啟至少一個標準遊戲及 BetBy／Digitain 等有獨立 mapping 的 provider，確認 launch request 與實際遊戲介面。
8. 模擬 remote locale 載入失敗，確認 English fallback。
9. 以至少一個未啟用蒙古語的其他 siteKey 回歸，selector、default language 與遊戲 launch 不變。

## Git Flow

- 基底分支：`main`；開始前先依該 repo 規則完成遠端驗證並 pull 最新 `main`。
- 工作分支：`feat/gsi-475-kxg1-mongolian-locale`。
- 實作者開始前必須先從 `main` 建立／切換到工作分支；不可直接在 `main`、`develop`、`staging` 或其他共享分支上實作。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（正式環境），每階段測試通過後才進下一關。
- 任一 merge 有 conflict 時停止，不自行解衝突或把目標分支 merge 回工作分支。
- Commit 前需取得使用者針對該次提交的明確確認；不得沿用先前確認。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

- Locale Manager／Sheet 與 `mn` code 已確認；先確認剩餘 runtime／provider blockers，再完成 shared locale／game mappings。
- canonical code 與 `Accept-Language` 已確認為 `mn`；若 remote filename 或 provider contract 與本 spec 不同，先更新 spec。
- 不要下載或重新判定 Jira XLSX，也不要把 locale JSON commit 到會員端 repo。
- 本票驗收雖以 KXG1／set_r033 為主，但 shared infrastructure diff 必須回歸至少一個其他 siteKey。
- reviewer 必須同時檢查 code、remote i18n、KXG1 player settings 與遊戲 launch；只檢 code 不算完成。
