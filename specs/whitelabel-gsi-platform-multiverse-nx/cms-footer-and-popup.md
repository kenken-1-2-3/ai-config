# R017 CMS 底欄 + 彈窗管理 Spec

> **角色**：把舊專案的 CMS 底欄（`FOOTER_SETTINGS = 6`）與 CMS 彈窗管理（`POPUP = 10`）兩個資料來源，接進新 NX 專案的 shared lib 並在 r017 wire up。
>
> **範圍**：底欄 + 彈窗管理。CMS 自訂頁面（`cmsCustomPage/:cmsCustomPageId`）已於 [apps/r017/src/pages/cmsCustomPage/\[cmsCustomPageId\].vue](apps/r017/src/pages/cmsCustomPage/[cmsCustomPageId].vue) 完成，不在本 spec 內。
>
> **參考實作**（舊專案）：
> - 底欄元件：`template/set_r017/components/Footer/Index.vue`
> - 底欄 hook：`src/common/apiHooks/cms/useFooterListCms.ts`
> - 彈窗 hook：`src/common/apiHooks/cms/usePopUPListCms.ts`
> - 彈窗顯示記憶：`src/stores/ageVerificationStore.ts`
> - 彈窗元件：`src/common/components/AgeWarningDialog/Index.vue` + `components/module1.vue`
> - 彈窗 wiring：`template/set_r017/layout/Index.vue:48`、`132`

---

## 1. 範圍

**做**：

1. CMS 底欄：把目前靜態的 [libs/shared/ui-layer/src/lib/components/containers/Footer.vue](libs/shared/ui-layer/src/lib/components/containers/Footer.vue) 改寫成 CMS-driven，版型對齊舊 `set_r017/Footer/Index.vue`。
2. CMS 彈窗管理：新增彈窗元件、composable、Pinia store，在 r017 layout 掛上。
3. 只在 r017 wire up；r001 與其他 tenant 不動。

**不做**：

- CMS 自訂頁面（已完成）。
- H5 置底選單（`CMS_TYPE.H5_BOTTOM_MENU = 4`，新專案已有 `MobileBottomNav`，超出本 scope）。
- 多 popup 排隊（舊版只取 `cmsPopupList[0]`，本版維持一致）。
- 後端端點新增（不做 `/v1/player/cms/all` aggregated 端點，沿用既有 `CMS.LIST = /v1/player/cms/detail/list?type={type}`）。
- 既有 `Footer.vue` 靜態的 logo 牆 / 連結列 / © Copyright 都移除（舊 r017 沒有，1:1 對齊）。
- 多 popup 並行、popup 之間排序、版本升級邏輯。

---

## 2. 既有可複用基礎建設

新專案已具備所有資料層所需，**不需要新增 API function、型別、endpoint 常數**：

- 端點：[ENDPOINT_PATHS.CMS.LIST](libs/shared/ui-layer/src/lib/api/endpointPaths/index.ts) = `/v1/player/cms/detail/list`
- API function：[getCmsList(params)](libs/shared/ui-layer/src/lib/api/apiFunctions/cms_getCmsList.ts) 接 `{ type }` 參數
- Query hook：[useCmsListQuery({ type })](libs/shared/ui-layer/src/lib/api/hooks/useCmsListQuery.ts)（TanStack Query，`staleTime = FIVE_MINUTES`）
- 型別：[CmsItem / CmsSettingItem / CmsEntranceItem / CmsPageItem / CmsLangTitle](libs/shared/ui-layer/src/lib/api/commonTypes/cmsTypes.ts) 已涵蓋本 spec 所需所有欄位（`logo_sort` / `pop_up_img` / `comfirm_button_lang` / `reject_button_lang` / `lang` / `payload.display_login` / `updated_time`）
- Enum：[CMS_TYPE_ENUMS.FOOTER_SETTINGS = 6](libs/shared/ui-layer/src/lib/constants/enums/cmsType.ts) 與 `.POPUP = 10` 已存在；`CMS_DISPLAY_LOGIN_ENUMS` 已存在
- Dialog base：[BaseDialog.vue](libs/shared/ui-layer/src/lib/components/base/BaseDialog.vue) 可包裝彈窗

本 spec 只新增：composable、Pinia store、彈窗 UI、改寫 Footer.vue、r017 layout 掛 dialog。

---

## 3. 檔案結構

```
libs/shared/ui-layer/src/lib/
├── components/
│   ├── containers/
│   │   └── Footer.vue                        // ⭐ 改寫：CMS-driven
│   └── cmsPopup/
│       └── CmsPopupDialog.vue                // 🆕 彈窗 UI
├── composables/
│   ├── useCmsFooter.ts                       // 🆕 footer view-model
│   └── useCmsPopup.ts                        // 🆕 popup view-model + 顯示判斷
└── stores/
    └── cmsPopupStore.ts                      // 🆕 useSessionStorage 旗標

apps/r017/src/layouts/default.vue             // ⭐ 加 <CmsPopupDialog />
```

既有 [apps/r017/src/layouts/default.vue](apps/r017/src/layouts/default.vue) 中 `<Footer v-if="shouldShowFooter">` 的 `useFooterVisibility()` 顯示開關不在本 spec 動，保留。`Footer.vue` 內目前 import 的 `useStaticPageDirection()` 因連結列被刪而一併移除。

---

## 4. CMS 底欄

### 4.1 資料層 — `useCmsFooter()`

位置：`libs/shared/ui-layer/src/lib/composables/useCmsFooter.ts`

職責：

- 呼叫 `useCmsListQuery({ type: CMS_TYPE_ENUMS.FOOTER_SETTINGS })`
- 取 `data.value?.[0]`（與舊版 `cmsFooterSettingsList.value[0]` 對齊）
- 整理兩塊資料：

```ts
export function useCmsFooter() {
  const { data } = useCmsListQuery({ type: CMS_TYPE_ENUMS.FOOTER_SETTINGS })
  const { locale } = useI18n()
  const cmsFooter = computed(() => data.value?.[0] ?? null)

  const cmsFooterLogos = computed<string[]>(() => {
    const setting = cmsFooter.value?.Setting
    if (!setting?.logo_sort?.length) return []
    return setting.logo_sort.map((path) => buildCmsImgUrl(path, setting.updated_time))
  })

  const cmsFooterTextContent = computed<{ title: string; content: string } | null>(() => {
    const pages = cmsFooter.value?.Page ?? []
    const matched = pages.find((p) => p.lang === locale.value)
    if (!matched) return null
    return { title: matched.title, content: rewriteCmsResourceUrl(matched.content) }
  })

  return { cmsFooterLogos, cmsFooterTextContent }
}
```

**Helpers**：

- `buildCmsImgUrl(path, version)`：對應舊版 `useDynamicImage().buildImageUrl`。若 shared lib 已有同等 helper（例如 `libs/shared/ui-layer/src/lib/utils/` 下的 image helper）就重用；否則就近實作 — 規則：拼 `VITE_APP_DYNAMIC_RESOURCE_URL` 為前綴，附 `?v={updated_time}` 防快取。
- `rewriteCmsResourceUrl(html)`：把 HTML 內含的 `VITE_APP_BASE_API` URL 替換為 `VITE_APP_DYNAMIC_RESOURCE_URL`（舊版 `useFooterListCms` line 34 同邏輯）。實作前先查 shared lib 是否已有對應 util。

### 4.2 UI — `Footer.vue`（改寫）

對齊舊 `template/set_r017/components/Footer/Index.vue` 的 `.footer-wrapper` 區塊：

```vue
<template>
  <footer v-if="hasContent" class="footer-wrapper">
    <ul v-if="cmsFooterLogos.length" class="provider-list">
      <li v-for="src in cmsFooterLogos" :key="src" class="provider-item">
        <img :src="src" :alt="src" class="w-[7.5rem] h-auto object-contain" @error="handleImgError" />
      </li>
    </ul>
    <div v-if="cmsFooterTextContent?.content" class="text-content-wrapper">
      <div class="cms-content" v-html="cmsFooterTextContent.content" />
    </div>
  </footer>
</template>
```

**樣式（對齊舊 SCSS）**：

- container：`width: 100%`、底色用 `var(--footer-footer-bg)`（沿用既有 token）、padding `2.5rem`（PC）／ `1.25rem 1rem`（phone）
- `.provider-list`：`flex flex-row justify-center`，置中、可換行
- `.provider-item`：PC `py-1 px-[0.625rem]`、phone `py-2 px-[1.5625rem]`
- `.text-content-wrapper`：`w-[90%] max-w-[87.5rem] mx-auto mt-4`，phone 改 `w-full`
- `.cms-content`：保留全域 cms-content 樣式 hook（提供給後台 HTML 用）

**顯示條件**：`hasContent = cmsFooterLogos.length > 0 || !!cmsFooterTextContent?.content`。兩塊都沒就整個不渲染。

**移除項目**（既存 [Footer.vue:5-25](libs/shared/ui-layer/src/lib/components/containers/Footer.vue)）：

- `providerLogos` / `certificationLogos` 兩段寫死陣列與其渲染區塊
- 中央連結列（`links` + `handleStaticPageAction`）
- `© {{ currentYear }} GSI. All Rights Reserved.`
- 對應未用到的 import

**保留**：`useFooterVisibility()` 控制的整體顯示開關（已在 [layouts/default.vue](apps/r017/src/layouts/default.vue) 用 `v-if="shouldShowFooter"`），不在本 spec 重做。

---

## 5. CMS 彈窗管理

### 5.1 Store — `cmsPopupStore`

位置：`libs/shared/ui-layer/src/lib/stores/cmsPopupStore.ts`

```ts
import { defineStore } from "pinia"
import { useSessionStorage } from "@vueuse/core"

export const useCmsPopupStore = defineStore("cmsPopup", () => {
  const alreadyShow = useSessionStorage<boolean>("cmsPopupAlreadyShow", false)
  const markShown = () => { alreadyShow.value = true }
  return { alreadyShow, markShown }
})
```

- key 命名為 `cmsPopupAlreadyShow`（舊版 `alreadyShowAgeVerification` 是 age-specific，新版改通用名）
- session 範圍：關閉瀏覽器即清掉

### 5.2 資料層 — `useCmsPopup()`

位置：`libs/shared/ui-layer/src/lib/composables/useCmsPopup.ts`

職責：

- `useCmsListQuery({ type: CMS_TYPE_ENUMS.POPUP })` → 取 list
- 過濾 `Setting.payload.display_login`（搭配當前 auth 狀態判斷）
- 取 `[0]`（與舊版 `cmsPopupList[0]` 一致）
- 整理 view-model

```ts
export interface CmsPopupViewModel {
  title: string                                    // 多語選定後 + URL 重寫
  imgs: string[]                                   // 套 updated_time 版本
  confirmLabel: string
  rejectLabel: string
  agreementList: { label: string; value: number }[]   // Entrance.filter(sort !== 0)
  agreeAllText: string                             // Entrance.find(sort === 0)?.lang
}

export function useCmsPopup() {
  const { data } = useCmsListQuery({ type: CMS_TYPE_ENUMS.POPUP })
  const { locale } = useI18n()
  const auth = useAuth()
  const store = useCmsPopupStore()
  const { alreadyShow } = storeToRefs(store)

  const filtered = computed(() => filterByDisplayLogin(data.value ?? [], auth.isLoggedIn))
  const cmsPopup = computed(() => filtered.value[0] ?? null)

  const popupData = computed<CmsPopupViewModel | null>(() => {
    if (!cmsPopup.value) return null
    return buildPopupViewModel(cmsPopup.value, locale.value)
  })

  const shouldShowPopup = computed(() => !!popupData.value && !alreadyShow.value)

  const markShown = () => store.markShown()
  const leaveStation = () => {
    window.location.href = "about:blank"
    window.close()
  }

  return { shouldShowPopup, popupData, markShown, leaveStation }
}
```

**`filterByDisplayLogin(list, isLoggedIn)`**：對應舊版 `filterCmsListByDisplayLogin`。先檢查 shared lib 是否已有等價 helper（搜尋 `display_login` 使用點）：若有，重用；若無，本 spec 新增於 `composables/useCmsPopup.ts` 同檔內（或就近 utils），規則參照 `CMS_DISPLAY_LOGIN_ENUMS`：

- `BEFORE_LOGIN` → 只在未登入顯示
- `AFTER_LOGIN` / `AFTER_LOGIN_MEMBER` → 只在已登入顯示
- `NO_RESTRICTIONS` → 都顯示
- 其他 enum 值依舊版邏輯實作

**`buildPopupViewModel(item, lang)`**：

- `title = item.Setting.lang[lang] || ""`，套 `rewriteCmsResourceUrl()`
- `imgs = item.Setting.pop_up_img.map((p) => buildCmsImgUrl(p, item.Setting.updated_time))`
- `confirmLabel = item.Setting.comfirm_button_lang[lang] || ""`（注意舊欄位名 `comfirm` typo 保留）
- `rejectLabel = item.Setting.reject_button_lang[lang] || ""`
- `agreementList = item.Entrance.filter(e => e.sort !== 0).map((e, i) => ({ label: rewriteCmsResourceUrl(e.lang[lang] || ""), value: i }))`
- `agreeAllText = rewriteCmsResourceUrl(item.Entrance.find(e => e.sort === 0)?.lang[lang] || "")`

### 5.3 UI — `CmsPopupDialog.vue`

位置：`libs/shared/ui-layer/src/lib/components/cmsPopup/CmsPopupDialog.vue`

```vue
<script setup lang="ts">
import BaseDialog from "@shared-lib/components/base/BaseDialog.vue"
import { useCmsPopup } from "@shared-lib/composables/useCmsPopup"

const { shouldShowPopup, popupData, markShown, leaveStation } = useCmsPopup()
const checkedValues = ref<number[]>([])

const allChecked = computed({
  get: () => {
    const list = popupData.value?.agreementList ?? []
    return list.length > 0 && list.every((item) => checkedValues.value.includes(item.value))
  },
  set: (v) => {
    const list = popupData.value?.agreementList ?? []
    checkedValues.value = v ? list.map((i) => i.value) : []
  }
})

const canConfirm = computed(() => allChecked.value)

const onConfirm = () => {
  if (!canConfirm.value) return
  markShown()
  checkedValues.value = []
}

const onReject = () => leaveStation()
</script>

<template>
  <BaseDialog v-if="popupData" :visible="shouldShowPopup" :closable="false">
    <div class="cms-popup">
      <h2 v-if="popupData.title" v-html="popupData.title" />
      <div class="cms-popup__imgs">
        <img v-for="src in popupData.imgs" :key="src" :src="src" :alt="src" />
      </div>
      <ul class="cms-popup__agreements">
        <li v-for="item in popupData.agreementList" :key="item.value">
          <Checkbox v-model="checkedValues" :value="item.value" />
          <span v-html="item.label" />
        </li>
      </ul>
      <label v-if="popupData.agreeAllText" class="cms-popup__agree-all">
        <Checkbox v-model="allChecked" :binary="true" />
        <span v-html="popupData.agreeAllText" />
      </label>
      <div class="cms-popup__actions">
        <BasePlainBtn class="cms-popup__reject" @click="onReject">{{ popupData.rejectLabel }}</BasePlainBtn>
        <BasePlainBtn class="cms-popup__confirm" :disabled="!canConfirm" @click="onConfirm">
          {{ popupData.confirmLabel }}
        </BasePlainBtn>
      </div>
    </div>
  </BaseDialog>
</template>
```

**行為**：

- `:closable="false"` 不給關閉 X 按鈕，強制用戶選擇按鈕
- `agreementList` 為空時：`allChecked = false`、`canConfirm = false`；若後端真的沒給 entries，此 popup 仍可顯示（圖 + 標題），但無法確認 — 視為後端設定錯誤，前端不額外處理
- 確認後 `markShown()` → 下次 `useCmsPopup` 重算 `shouldShowPopup = false` → 自動關閉
- 拒絕直接 `window.close()`，不寫旗標（因為已離站）
- 使用既有 PrimeVue `Checkbox` 元件（與 shared lib 其他 dialog 用法一致），班底樣式採 r017 既有 dialog 風格

**樣式**：對齊 shared lib 既有 `*Dialog.vue` 慣例，桌機 `max-w-[550px]`、手機全螢幕（沿用 `BaseDialog` 預設）。

### 5.4 接線 — r017 layout

[apps/r017/src/layouts/default.vue](apps/r017/src/layouts/default.vue) 在現有 Dialog 區塊（`LoginDialog` / `RegisterDialog` / ...）旁加：

```vue
<CmsPopupDialog />
```

不需要 props，元件自管顯示判斷。

---

## 6. 資料流總覽

```
App 啟動
  └─ default.vue mount
       ├─ Footer.vue
       │    └─ useCmsFooter()
       │         └─ useCmsListQuery({ type: FOOTER_SETTINGS }) → 5min cache
       │              ├─ Setting.logo_sort → cmsFooterLogos
       │              └─ Page[lang] → cmsFooterTextContent
       └─ CmsPopupDialog.vue
            └─ useCmsPopup()
                 ├─ useCmsListQuery({ type: POPUP }) → 5min cache
                 ├─ filterByDisplayLogin(list, isLoggedIn)
                 ├─ [0] → popupData (title/imgs/buttons/agreements)
                 └─ shouldShowPopup = popupData && !sessionStorage.cmsPopupAlreadyShow
                      ├─ 確認 → markShown() → 關閉
                      └─ 拒絕 → window.close()
```

---

## 7. i18n

- Footer：HTML 內容由 CMS 後台提供（多語），不需要新增前端 i18n key
- Popup：標題 / 按鈕文字 / agreement 文字皆由 CMS 後台多語欄位提供（`lang` map），不需要新增前端 i18n key
- 不為 fallback / 載入中文字加 i18n key（舊版沒做、YAGNI）

---

## 8. 已知未驗證點（實作時驗證，不阻塞 spec）

1. 後端 `GET /v1/player/cms/detail/list?type=6` 與 `?type=10` 回傳資料是否吻合既有 `CmsItem` 型別（特別是 footer 的 `Page` 陣列與 popup 的 `Entrance` `sort=0` 規約）。
2. shared lib 是否已有 `buildCmsImgUrl` / `rewriteCmsResourceUrl` / `filterByDisplayLogin` 的等價 helper；若有則重用、若無則本 spec 內新增。
3. `CMS_DISPLAY_LOGIN_ENUMS` 的具體值集合與舊版 `filterCmsListByDisplayLogin` 的分支對應。

---

## 9. 驗收條件（Checklist）

### 9.1 Footer

- [ ] r017 啟動後，footer 顯示來自 `/v1/player/cms/detail/list?type=6` 的 logo 列與 HTML 內容（PC + Mobile 兩種寬度都檢查）
- [ ] CMS 回傳空 `logo_sort` 時 logo 區段不顯示；空 `Page` 或無當前語系對應時 HTML 區段不顯示
- [ ] 兩塊都空時整個 footer 不渲染
- [ ] 切換 i18n 語系後 HTML 內容自動切換對應語言
- [ ] 既有靜態 logo 牆、連結列、© Copyright 完全移除
- [ ] CMS HTML 中的舊 base API URL 被替換為 dynamic resource URL（圖片可顯示）
- [ ] 響應式：phone 寬度下 padding 縮小、`.text-content-wrapper` 撐 100%

### 9.2 Popup

- [ ] r017 啟動後若 CMS 回傳 popup 資料且 `display_login` 符合當前登入狀態，彈窗自動出現
- [ ] 標題 / 圖片 / 確認按鈕 / 拒絕按鈕 / agreement 列表 / 全部同意文字皆依當前語系顯示
- [ ] 確認按鈕在所有 agreement 勾選之前是 disabled
- [ ] 「全部同意」勾選後所有 agreement 同步勾選；取消同步反向
- [ ] 按確認後彈窗關閉，且本 session 內重整／路由切換不再顯示（session storage `cmsPopupAlreadyShow = true`）
- [ ] 關閉瀏覽器再開後又會顯示
- [ ] 按拒絕後執行 `window.location.href = "about:blank"` + `window.close()`
- [ ] CMS 回傳空時不顯示彈窗
- [ ] `display_login` 不符當前登入狀態時不顯示
- [ ] 文字 / agreement label 中的舊 base API URL 被替換為 dynamic resource URL

### 9.3 一般

- [ ] 不新增任何後端端點；只用既有 `useCmsListQuery({ type })`
- [ ] r001 與其他 tenant 的 layout 未變動
- [ ] 沒寫死任何 CMS 內容（標題、圖、按鈕文字皆從 CMS 拿）
- [ ] 不阻塞 app 啟動：CMS API 失敗時 footer 不渲染、popup 不彈，其他頁面照常

---

## 10. 後續可能延伸（明確不在本 spec）

- 多 popup 排隊機制（需 product 補規格）
- popup 版本升級邏輯（同 popup 後台 `updated_time` 更新時清掉 session 旗標重新彈）
- r001 與其他 tenant 的 footer / popup 接線
- Footer logo 點擊行為（舊 r017 沒有，本版也沒做）
- CmsCustomPage 的擴充模組類型
