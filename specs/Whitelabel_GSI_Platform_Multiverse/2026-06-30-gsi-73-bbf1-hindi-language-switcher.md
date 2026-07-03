# GSI-73 BBF1 Hindi Language Switcher Spec

- **Project**: `Whitelabel_GSI_Platform_Multiverse`
- **建立日**: 2026-06-30
- **背景需求單**: [GSI-73](https://gamingsoft.atlassian.net/browse/GSI-73) / [BLUFF-67](https://gamingsoft.atlassian.net/browse/BLUFF-67)
- **目標版型**: `template/set_r025`（BBF1）
- **影響環境**: 正式環境 BBF1 front office

---

## 1. Goal

修正 BBF1 正式前台在後台開啟「英文 + Hindi (`hi`)」時，右上角語系切換按鈕未顯示的問題。

完成後，若站點語系設定包含 `["en", "hi"]`，前台應判定有兩個可用語系，顯示語系切換按鈕，並允許切換到 Hindi。

## 2. Background

GSI-73 回報：

- 客戶 BBF1 正式站已開啟兩個前台語系：英語、印度語。
- 正式前台沒有語系切換按鈕。
- STG 環境 BBF1 開啟英語 + 繁中時正常顯示語系切換按鈕。
- 單上初步懷疑：Hindi 未正常顯示於前台，導致前台判定只剩一種語系，因此隱藏切換按鈕。

BLUFF-67 補充：

- 客戶原本詢問是否能自行新增語系。
- 客服已回覆語系可以自由調整。
- 後續客戶指出正式站看不到語系切換，測試站右上角有切換入口。
- USD / NGN 錢包顯示問題已另行回覆，不屬於本 spec 範圍。

## 3. Current Code Findings

目前資料流：

1. `template/set_r025/components/Header/Index.vue` 會渲染共用 `LanguageDropdown`。
2. `src/common/components/LanguageDropdown.vue` 只有在 `languageList.length > 1` 時顯示按鈕。
3. `languageList` 來自 `src/common/composables/useLanguage.ts` 的 `availableLanguages`。
4. `availableLanguages` 會把後台回傳的 `languageList` 再和 vue-i18n 的 `availableLocales` 做交集。
5. vue-i18n 的 `availableLocales` 初始由 `src/boot/i18n.ts` 的 `initialMessages` 建立。
6. `initialMessages` 由 `Object.values(Enums)` 建立，`Enums` 來自 `src/common/utils/constants/languageType.ts`。

關鍵缺口：

- `src/common/utils/constants/languageType.ts` 註解列出 `印度：hi`。
- `src/common/composables/useLanguage.ts` 已有 Hindi 下拉顯示 label：`hi: "हिन्दी"`。
- `src/common/assets/images/flag/hi.png` 與 `src/common/assets/images/flag/hi.webp` 已存在。
- 但 `src/common/utils/constants/languageType.ts` 的 `Enums` 目前沒有 `HI = "hi"`。

因此若後台回傳 `["en", "hi"]`，`availableLanguages` 會把 `hi` 過濾掉，只剩 `["en"]`，`LanguageDropdown` 因 `length === 1` 不顯示。

## 4. Scope

### In Scope

- 補齊前台 Hindi (`hi`) 語系支援，讓 `hi` 能進入 vue-i18n `availableLocales`。
- 確保 BBF1 / `set_r025` 語系切換按鈕在後台回傳 `["en", "hi"]` 時顯示。
- 確保語系切換流程可成功呼叫遠端 i18n 載入 Hindi 語系檔，失敗時維持既有 fallback 行為。
- 補齊因新增 `LANGUAGE_TYPE.Enums.HI` 造成的 TypeScript exhaustive map 缺口。
- 不新增或編輯 local locale JSON。

### Out of Scope

- 不處理 USD / NGN 顯示議題。
- 不修改後台語系設定功能。
- 不更動正式環境設定。
- 不調整 header layout / spacing / animation / RWD。
- 不新增 local i18n key 或 local locale JSON。
- 不執行 `yarn deploy`。發版需 user 另外明確指示。
- 不主動 merge、commit、push 或開 MR。

## 5. Expected Implementation

### 5.1 Add Hindi to language enum

Modify `src/common/utils/constants/languageType.ts`:

- Add `HI = "hi"` to `Enums`.
- Add `[Enums.HI]: "common.hindi"` to `I18nKeys`.
- Add `[Enums.HI]: "हिन्दी"` to `Labels`.
- Add `[Enums.HI]: "HI"` to `Abbreviation`.

Notes:

- If remote i18n currently does not provide `common.hindi`, this key is only used as a shared label fallback in code paths that read `LANGUAGE_TYPE.I18nKeys`.
- `LanguageDropdown` itself currently uses its own hardcoded label map and already contains `hi: "हिन्दी"`, so the dropdown label path should not require new local locale files.

### 5.2 Review enum consumers that require exhaustive keys

After adding `Enums.HI`, check compile-time exhaustive maps that use `{ [key in LANGUAGE_TYPE.Enums]: string }`.

Known files to inspect:

- `src/common/hooks/useBetByGame.ts`
- `src/common/hooks/useDigitainGame.ts`

Expected behavior:

- Add `LANGUAGE_TYPE.Enums.HI` mapping in each exhaustive provider language map.
- Prefer provider-native Hindi code if already supported by that provider documentation or existing backend convention.
- If provider support is unknown, map Hindi to `"en"` as a conservative fallback and add a short comment that provider support is not confirmed.

### 5.3 Do not change the dropdown visibility rule

Do not change `src/common/components/LanguageDropdown.vue` from `languageList.length > 1` to another condition.

The desired behavior is still:

- 0 or 1 supported language: hide switcher.
- 2+ supported languages: show switcher.

This issue should be fixed by making `hi` a supported locale, not by forcing the button visible.

### 5.4 Do not inspect or commit local environment

Per project rules:

- Do not inspect, diff, format, test, review, or commit `src/env/environment.json`.
- If local runtime needs BBF1 setup, ask the user for exact local template / environment instructions instead of reading `src/env/environment.json`.

## 6. Acceptance Criteria

- [ ] `LANGUAGE_TYPE.Enums` includes `HI = "hi"`.
- [ ] `LANGUAGE_TYPE.I18nKeys`, `Labels`, and `Abbreviation` include `Enums.HI`.
- [ ] `Object.values(Enums)` used by `src/boot/i18n.ts` includes `hi`, so vue-i18n `availableLocales` can contain Hindi.
- [ ] With mocked or manually configured language setting `["en", "hi"]`, `useLanguage().availableLanguages` resolves to both `en` and `hi`.
- [ ] With mocked or manually configured language setting `["en", "hi"]`, `LanguageDropdown` renders because `languageList.length === 2`.
- [ ] Clicking the Hindi option calls `setLanguage("hi")`.
- [ ] `loadLanguageAsync("hi")` attempts to fetch the Hindi remote i18n file using existing loader behavior.
- [ ] No local locale JSON files are created or edited.
- [ ] No visual layout, spacing, or style changes are made to `template/set_r025/components/Header/Index.vue` or `src/common/components/LanguageDropdown.vue`.
- [ ] No changes are made to `src/env/environment.json`.
- [ ] USD / NGN wallet display remains untouched.
- [ ] `git --no-pager diff --check` passes.

## 7. Suggested Verification

### Static checks

Run:

```bash
rg -n "HI = \"hi\"|Enums.HI|common.hindi|हिन्दी" src/common/utils/constants/languageType.ts src/common/hooks/useBetByGame.ts src/common/hooks/useDigitainGame.ts
```

Expected:

- `languageType.ts` contains `HI = "hi"`.
- `languageType.ts` contains `Enums.HI` entries for i18n key, label, and abbreviation.
- Exhaustive provider maps touched by TypeScript errors contain `Enums.HI`.

Run:

```bash
git --no-pager diff --check
```

Expected:

- No whitespace errors.

### Targeted unit-style verification

If the repo has no declared test script, use a temporary local test or a small runtime check while developing, but do not commit temporary test files unless the user explicitly asks.

Suggested check logic:

```ts
import { Enums } from "src/common/utils/constants/languageType"

const locales = Object.values(Enums)

console.assert(locales.includes("hi"), "Hindi should be included in i18n initial locales")
```

Suggested `useLanguage` scenario:

- Mock store language list as `["en", "hi"]`.
- Mock i18n `availableLocales` as `Object.values(Enums)`.
- Assert `availableLanguages` includes both `en` and `hi`.

### Manual browser verification

Use Chrome extension per project rule when opening URLs.

Scenario:

1. Open BBF1 test or local front office using `set_r025`.
2. Ensure agent language setting resolves to `["en", "hi"]`.
3. Confirm right header language switcher is visible.
4. Open switcher and confirm English and Hindi options are present.
5. Click Hindi.
6. Confirm current language changes to `hi`.
7. Confirm no header layout regression on desktop and mobile widths.

If exact BBF1 local setup is not available, document that manual browser verification was blocked by missing local environment setup and include the static verification evidence.

## 8. Review Checklist

- [ ] Diff is limited to language support and required exhaustive map fallout.
- [ ] No unrelated ESLint cleanup.
- [ ] No local locale JSON changes.
- [ ] No `src/env/environment.json` changes or inspection.
- [ ] No template-specific visual changes.
- [ ] The fix addresses the source of filtering (`availableLocales`) rather than the symptom (`LanguageDropdown` visibility).
- [ ] The Jira reply can state that Hindi was missing from frontend supported language constants, causing `["en", "hi"]` to collapse to only `["en"]` before the dropdown visibility check.

## 9. Suggested Jira Response After Fix

Use this only after implementation and verification:

> 已確認原因：前台支援語系列表未包含 Hindi (`hi`)，導致 BBF1 正式站後台設定為英文 + Hindi 時，前台語系清單被過濾後只剩英文，因此不顯示語系切換按鈕。已補齊 Hindi 前台支援並驗證英文 + Hindi 會顯示切換入口。

