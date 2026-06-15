# R017 會員代理 — 設定 Tab 列表 Spec

> **角色**:設定 Tab 內**列表 + 搜尋 + 分頁**的 UI 元件。觸發編輯流程交給 [referral-setting-edit-dialog.md](referral-setting-edit-dialog.md)。
>
> **同套件 spec**:
> - 資料層 ─ [referral-setting-data-layer.md](referral-setting-data-layer.md) ⚠️ 先做
> - 本份 ─ 列表
> - 編輯彈窗 ─ [referral-setting-edit-dialog.md](referral-setting-edit-dialog.md)
>
> **先決條件**:[referral-old-api-reference.md](referral-old-api-reference.md)
>
> **參考 Figma**(`R017_優化中`):
> - PC 設定 tab:node-id `13126-120233`
> - Mobile 設定 tab(含展開卡):node-id `7822-95268`

---

## 1. 範圍

只做 ReferralSettingTable 主元件 + Mobile 展開卡。

**做的事**:
- PC 表格 + Mobile expansion 卡片(RWD 兩套 UI)
- 「會員帳號」搜尋(input + 送出 button)
- 分頁
- 觸發編輯彈窗(只負責「打開」,彈窗內容在另一份 spec)
- 「下級數量」cell 顯示數字(**藍字無互動** — 點 popover 功能已從本期移除)
- 空狀態 / Loading / Error 狀態

**不做**:編輯彈窗(另一份 spec)、popover、頁面外殼(4 卡 / Tabs 切換)。

---

## 2. 檔案位置

```
apps/r017/src/components/referral/
├─ ReferralSettingTable.vue           // ⭐ 本 spec 主元件
└─ ReferralSettingMobileCard.vue      // 抽出單張 mobile expansion 卡
```

> 容器頁 `apps/r017/src/pages/referral/index.vue` 本 spec **不實作**,僅描述環境假設:
> - 容器在 `activeTab === 'setting'` 時掛載 `<ReferralSettingTable />`
> - 容器不傳 prop;設定 tab 自包資料
> - **設定 tab 與頂部幣別下拉解耦**(setting API 本來就不帶 currency_id)
> - `/referral` 是 top-level route,對齊舊專案 `template/set_r017/pages/Referral/Index.vue`,不是 `/member/referral`

**Route 依賴**:
- 新增/確認 `apps/r017/src/pages/referral/index.vue`
- `libs/shared/ui-layer/src/lib/constants/routePath.ts` 新增 `ROUTE_PATH.REFERRAL = "/referral"`
- `AUTH_ROUTE_GROUPS.AUTH_REQUIRED_ROUTES` 加入 `ROUTE_PATH.REFERRAL`

**Base 元件依賴**(`libs/shared/ui-layer/src/lib/components/`):
- `BaseInput`、`BaseBtn`、`BasePagination`、`BaseTable`、`BaseNoData`

**Composable 依賴**:
- `useReferralSettingQuery`(資料層 spec §6.1)
- `useCustomBreakpoints()` 的 `isMobile` / `isDown.mob`(沿用 shared 現有 composable,不新建 `useMediaQuery`)
- `useBank` 的 `currencyIdMap`(把 currency_id → code)

---

## 3. 內部 State

```ts
const search = ref('')              // 搜尋輸入(未送出)
const submittedSearch = ref('')     // 已送出的搜尋 — 進 queryKey
const pageSize = ref(10)            // PC 預設 10
const currentPage = ref(1)
const offset = computed(() => (currentPage.value - 1) * pageSize.value)

const { data, isPending, isError, error } = useReferralSettingQuery({
  offset,
  size: pageSize,
  memberAccount: submittedSearch,
})

// 點某列「編輯」→ 透過 emit 或本元件內掌控彈窗 state
const editingRow = ref<{ memberId: number; account: string } | null>(null)
const editDialogVisible = computed({
  get: () => editingRow.value !== null,
  set: (v) => { if (!v) editingRow.value = null },
})
```

---

## 4. PC Layout

```
┌─ ReferralSettingTable (PC) ───────────────────────────┐
│  [Label: 會員帳號]                                       │
│  ┌──────────────┐ ┌─────┐                              │
│  │ 請輸入 ...    │ │ 搜尋 │  ← BaseInput + BaseBtn         │
│  └──────────────┘ └─────┘                              │
│                                                         │
│  ┌─ BaseTable ──────────────────────────────────────┐ │
│  │ 會員帳號 │ 下級數量 │ PHP │ VND │ SGD │ MYR │ 操作  │ │
│  │  line00 │   10     │ 25% │ 25% │ 25% │ 25% │[編輯]│ │
│  │   ...                                              │ │
│  └────────────────────────────────────────────────┘ │
│                                  < [1] [2] [3] >       │
└────────────────────────────────────────────────────────┘
```

### 表格欄位

```ts
const columns = computed(() => [
  { name: 'account',             label: t('table_header.member_account'), align: 'center' },
  { name: 'direct_member_count', label: '下級數量', align: 'center' }, // 若需多語,新增 shared i18n key
  ...currencyColumns.value,
  { name: 'actions',             label: t('common.actions'),          align: 'center' },
])

const currencyColumns = computed(() => {
  const ids = new Set<string>()
  rows.value.forEach((r) => Object.keys(r.settings.currency_limit).forEach((id) => ids.add(id)))
  return Array.from(ids)
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => ({
      name: `currency_${id}`,
      label: currencyIdMap.value?.[Number(id)]?.code ?? id,
      field: (row) => row.settings.currency_limit[id],
      format: (val) => (val == null ? '-' : `${val}%`),
      align: 'center' as const,
    }))
})
```

### Cell render(slot)

| Cell | 規格 |
|---|---|
| 會員帳號 | 純文字 |
| 下級數量 | 數字顯示;**`> 0` 時藍字**(`color: var(--link)`),**`=== 0` 時灰字**(`color: var(--container-container-field-secondary)`)。**不可點**(popover 功能本期移除) |
| 幣別 % | `{value}%` 或 `-` |
| 操作 | 「編輯」按鈕(下方規格) |

### 「編輯」按鈕(操作欄)

- 樣式:**橘色外框 pill button**
- token:`border-color / color: var(--button-button-title-border-enabled)`(= brand-primary 橘)
- hover:`var(--button-button-title-border-hover)`(= orange-600)
- active:`var(--button-button-title-border-active)`(= orange-700)
- 點下去:`editingRow.value = { memberId: row.member_id, account: row.account }`

---

## 5. Mobile Layout

```
┌─ ReferralSettingTable (Mobile) ──────────┐
│  [Label: 會員帳號]                          │
│  ┌──────────────────┐                     │
│  │ 請輸入 ...        │                     │
│  └──────────────────┘                     │
│  ┌──────────────────┐                     │
│  │      搜尋        │  ← 全寬填滿按鈕        │
│  └──────────────────┘                     │
│                                            │
│  <ReferralSettingMobileCard> × N           │
│                                            │
│            < [1] [2] [3] >                 │
└────────────────────────────────────────────┘
```

### ReferralSettingMobileCard.vue(單張卡)

⚠️ **下列兩個元素是必做,實作時很容易漏**:
- 卡片 header **右側必須有 `▼` chevron icon**(藍色)— 用來提示「可展開」,**點 header 整列**或點 icon 都能切換 expanded
- 卡片 expanded 後**底部必須有「編輯」按鈕**(橘框 pill)— 對應 PC 表格操作欄的編輯

#### Layout(collapsed)

```
┌─ Card (collapsed) ───────────────────────────┐
│  line00                    10               ▼│
│  會員帳號                  下級數量              │
└──────────────────────────────────────────────┘
```

- 左側上下兩行:**帳號(白字粗體)** / 「會員帳號」(灰 label 小字)
- 右側上下兩行:**下級數量(藍字粗體)** / 「下級數量」(灰 label 小字)
- 最右邊 `▼` chevron icon(藍色,展開時轉成 `▲`)

#### Layout(expanded)

```
┌─ Card (expanded) ────────────────────────────┐
│  line00                    10               ▲│
│  會員帳號                  下級數量              │
├──────────────────────────────────────────────┤
│   PHP                                  25%   │
│   VND                                  25%   │
│   SGD                                  25%   │
│   MYR                                  25%   │
│   ┌──────────────────────────────────────┐   │
│   │              編輯                    │   │ ← 橘框 pill,全寬或固定寬
│   └──────────────────────────────────────┘   │
└──────────────────────────────────────────────┘
```

- header 維持 collapsed 樣子,只是 `▼` 變 `▲`
- 中間 divider 線
- 4 個幣別 row,左 label(白字)右 % 值(白字粗體)
- **底部「編輯」按鈕**:橘外框 pill,**填滿卡片橫寬**(或左右留小 padding)

#### Props
```ts
defineProps<{
  row: ReferralSettingItem
  currencyColumns: Array<{ id: string; code: string }>
}>()
const emit = defineEmits<{
  edit: [{ memberId: number; account: string }]
}>()
```

#### 內部
- `expanded` 本地 ref,**點 header 任何位置或點 `▼` icon 都切換**
- 編輯按鈕點下去 `emit('edit', { memberId: row.member_id, account: row.account })` 給父層

#### Token
| 元件 | token |
|---|---|
| Card bg | `--card-card-bg-primary-enabled`(abyss-900) |
| Card border | (Figma 看起來無,或極細 light-50) |
| 帳號 / 數字白字 | `--text-text-primary` |
| 「會員帳號」/「下級數量」灰 label | `--card-card-subtitle-primary-enabled`(neutral-400) |
| 下級數量數字藍字 | `--link`(sky-400) |
| ▼ chevron icon | `--link`(同藍字)或 `--icon-icon-primary-enabled` |
| Divider 線 | `--border-border-line`(light-200,白 20% 細線) |
| 編輯按鈕邊框/字 | `--button-button-title-border-enabled`(brand-primary 橘) |

---

## 6. 互動細節

### 6.1 搜尋

```
user 在 input 打字
  └─ search.value 更新(本地,不打 API)

按下「搜尋」 OR  Enter:
  ├─ submittedSearch.value = search.value
  ├─ currentPage.value = 1
  └─ → queryKey 變化 → useReferralSettingQuery 自動重抓
```

> ⚠️ **不要 debounce 即時查詢** — 只在「搜尋」按鈕或 Enter 時送出。

### 6.2 翻頁

```
user 點 BasePagination
  ├─ currentPage.value = n
  └─ offset / queryKey 變化 → 自動重抓
```

`keepPreviousData` 由 query 端設定,翻頁時保留上一頁資料避免閃爍。

### 6.3 觸發編輯彈窗

```
PC 點某列「編輯」 / Mobile 點 card 內「編輯」
  ├─ editingRow.value = { memberId, account }
  ├─ <ReferralSettingEditDialog
  │     v-if="editingRow"
  │     v-model:visible="editDialogVisible"
  │     :member-id="editingRow.memberId"
  │     :member-account="editingRow.account"
  │  />
  └─ 彈窗成功編輯 → query.invalidate 自動讓本元件 refetch
```

> 編輯彈窗成功後**不必手動 refetch**;`useUpdateReferralSettingMutation` 內已 invalidate `TANSTACK_QUERY_KEY_REFERRAL_SETTING`,query 會自動重抓。

---

## 7. 邊界 & 錯誤狀態

| 狀態 | 呈現 |
|---|---|
| `isPending && !data` | Loading skeleton(或單純 spinner) |
| `data.list.length === 0` | `<BaseNoData>` (待 Figma 補空狀態設計再客製) |
| `isError` | 顯示 `error.message` + 「重試」按鈕(call `query.refetch()`) |
| 搜尋無結果 | 同 list 空 → `<BaseNoData>`,搜尋欄保留輸入值方便清空 |
| `direct_member_count === 0` | cell 顯示「0」灰字 |

---

## 8. RWD 切點

```vue
<template>
  <BaseTable v-if="!isMobile" ... />
  <div v-else class="flex flex-col gap-3">
    <ReferralSettingMobileCard
      v-for="row in rows"
      :key="row.member_id"
      :row="row"
      :currency-columns="currencyColumns"
      @edit="(p) => editingRow = p"
    />
  </div>
</template>
```

`isMobile` 從 `useCustomBreakpoints()` 取(shared layer 既有 composable)。

---

## 9. Token 對照(本 spec 用到的)

| 元件區塊 | token | primitive |
|---|---|---|
| 搜尋 input bg / border | `--input-input-bg-primary-enabled` / `--input-input-border-primary-enabled` | abyss-950 / light-200 |
| 「搜尋」按鈕 | `BaseBtn theme="secondary"` | 現有 bank/history/pending filters 皆用 secondary |
| 表格 header bg | `--table-table-header-bg` | brand-secondary(abyss-950) |
| 表格內容 bg | `--table-table-content-bg` | brand-secondary |
| 表格 cell 文字 | `--table-table-content-title-enabled` | brand-text(white) |
| 下級數量藍字 | `--link` | sky-400 `#38bdf8` |
| 下級數量 0 灰字 | `--container-container-field-secondary` | light-300 |
| 編輯按鈕外框/字 | `--button-button-title-border-enabled` | brand-primary(orange-500) |
| 編輯按鈕 hover 外框/字 | `--button-button-title-border-hover` | orange-600 |
| 編輯按鈕 active 外框/字 | `--button-button-title-border-active` | orange-700 |
| Pagination 當前頁 bg | `--pagination-pagination-bg-active` | navy-500 |
| 空狀態文字 | `--text-text-primary` | brand-text |

> ⚠️ Mobile 卡片 bg / 分隔線 / label 灰字 — 見 §11 待釐清

---

## 10. 驗收

- [ ] PC 渲染表格,欄位順序:會員帳號 / 下級數量 / 幣別欄 / 操作
- [ ] **Mobile 卡片 collapsed 狀態右側必須有 `▼` chevron icon(藍色)**
- [ ] **Mobile 卡片 expanded 後底部必須有橘框「編輯」按鈕**(點下去開彈窗)
- [ ] Mobile 卡片點 header 任何位置(含 `▼`)都能 expand / collapse
- [ ] 搜尋按鈕送出後才打 API,空字串視同無搜尋
- [ ] Enter 鍵在 input 內等同於點搜尋
- [ ] 翻頁不閃爍
- [ ] 下級數量 0 灰字、>0 藍字(都不可點)
- [ ] 編輯按鈕點下去能開出彈窗(彈窗內容看 dialog spec)
- [ ] 編輯成功後列表自動更新(不必手動 refetch)
- [ ] Loading / Empty / Error 三態都有渲染
- [ ] Token 全用 var,沒有寫死的 hex

---

## 11. 顏色不確定 — 需要 UI 貼圖

下列場景我看 Figma 沒辦法 100% 對應到 colorSystem token,請補圖或確認:

1. **Mobile 卡片背景色** — Figma 看起來是稍亮的深色卡片(在頁面深紫底上),token?可能用 `--card-card-bg-primary-enabled`(abyss-900)?
2. **Mobile 卡片內分隔線顏色** — header / content 之間有沒有 divider?
3. **「會員帳號 / 下級數量」灰 label** 顏色 — 在 mobile 卡片 header 顯示的灰字,對應哪個 token?
4. **PC 編輯按鈕 pill 的圓角值** — 不是 token 問題,只是想確認 `border-radius` 數值(`9999px` full pill?或固定 12px?)

待 UI 補圖或指定 token 後再開工這幾項;其餘 PC 表格、搜尋、分頁、編輯觸發都可以先做。
