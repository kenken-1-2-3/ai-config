# R017 會員代理 — 明細 Tab 列表 Spec

> **角色**:明細 Tab 內**結算列表**的 UI 元件 — PC 表格、Mobile expansion 卡、搜尋、分頁、「查看」按鈕觸發子頁。
>
> **同套件 spec**:
> - 資料層 ─ [referral-details-data-layer.md](referral-details-data-layer.md) ⚠️ 先做
> - 本份 ─ 列表
> - 查看子頁 ─ [referral-details-subdetail.md](referral-details-subdetail.md)
>
> **先決條件**:[referral-old-api-reference.md](referral-old-api-reference.md)
>
> **參考 Figma**:
> - PC 明細 tab 主列表:node-id `13082-86677`
> - Mobile 明細 tab 主列表:node-id `13103-111079`(expanded card 範例)
>
> **參考實作**(舊專案 `set_r017`):
> - `template/set_r017/pages/Referral/Components/DesktopDetailsTable.vue`
> - `template/set_r017/pages/Referral/Components/MobileDetailsList.vue`

---

## 1. 範圍

做明細 tab 主列表元件 + Mobile 展開卡。

**做的事**:
- PC 表格 + Mobile expansion 卡(RWD 兩套 UI)
- 「會員帳號」搜尋(input + 送出 button)— 與 setting 同 pattern
- 分頁
- 「查看」按鈕觸發子頁切換(state 由父層管,本元件 emit 出去)
- 空狀態 / Loading / Error 三態

**不做**:子頁本體(看另一份 spec)、頁面外殼(看 [referral-page-shell.md](referral-page-shell.md))。

---

## 2. 檔案位置

```
apps/r017/src/components/referral/
├─ ReferralDetailsTable.vue           // ⭐ 本 spec 主元件
└─ ReferralDetailsMobileCard.vue      // 抽出單張 mobile expansion 卡
```

**Base 元件依賴**:`BaseInput`、`BaseBtn`、`BasePagination`、`BaseTable`、`BaseNoData`

**Composable 依賴**:
- `useReferralStatementListQuery`(資料層 spec §6.1)
- `useCustomBreakpoints()` 的 `isMobile`(shared 既有)
- `useBank` 的 `currencyIdMap`

---

## 3. 父子關係(明細 tab 內的「列表」vs「子頁」)

明細 tab 容器(`pages/referral/index.vue` 或新拆元件)管 `showingSubDetails` 狀態:

```ts
const showingSubDetails = ref(false)
const selectedStatementId = ref<number>(0)

const handleShowSubDetails = (statementId: number) => {
  selectedStatementId.value = statementId
  showingSubDetails.value = true
}

const handleBackToList = () => {
  showingSubDetails.value = false
  selectedStatementId.value = 0
}
```

```vue
<template>
  <template v-if="!showingSubDetails">
    <ReferralDetailsTable @show-sub-details="handleShowSubDetails" />
  </template>
  <template v-else>
    <ReferralDetailsSubDetail
      :statement-id="selectedStatementId"
      :statement-range="..."
      @back="handleBackToList"
    />
  </template>
</template>
```

> 沿用 setting 的「父層 v-if 切換」決策(referral-old-api-reference.md §8),不用 nested route。

---

## 4. 內部 State

```ts
const search = ref('')
const submittedSearch = ref('')
const pageSize = ref(10)
const currentPage = ref(1)
const offset = computed(() => (currentPage.value - 1) * pageSize.value)

const { data, isPending, isError, error } = useReferralStatementListQuery({
  offset,
  size: pageSize,
  memberAccount: submittedSearch,
})

const emit = defineEmits<{
  'show-sub-details': [statementId: number, statementRange: { start: string; end: string }]
}>()
```

---

## 5. PC Layout(對齊 Figma `13082-86677`)

```
┌─ ReferralDetailsTable (PC) ─────────────────────────────┐
│  [Label: 會員帳號]                                          │
│  ┌──────────────┐ ┌─────┐                                 │
│  │ 請輸入 ...    │ │ 搜尋 │  ← BaseInput + BaseBtn            │
│  └──────────────┘ └─────┘                                 │
│                                                            │
│  ┌─ BaseTable ──────────────────────────────────────────┐│
│  │ 結算日期 │ 結算範圍              │ 下級 │  返佣金額       │││
│  │          │                       │ 數量 │ PHP │VND │SGD │MYR │ 操作 │
│  │ 2026-10-01│2025-09-01... ~ ...   │  10  │2500│2500│2500│2500│[查看]│
│  │ ...                                                       ││
│  └──────────────────────────────────────────────────────┘│
│                                          < [1] [2] [3] > │
└──────────────────────────────────────────────────────────┘
```

### 表格欄位

```ts
const columns = computed(() => [
  {
    name: 'billing_date',
    label: t('menu.settlementDate'),       // 「結算日期」
    field: 'billing_date',
    align: 'center',
    format: (val: string) => formatDate(val),   // e.g. dayjs(val).format('YYYY-MM-DD')
  },
  {
    name: 'billing_cycle',
    label: t('menu.settlementRange'),       // 「結算範圍」
    field: (row) => row,
    align: 'center',
    // render slot: `${formatRange(row.billing_start)} - ${formatRange(row.billing_end)}`
  },
  {
    name: 'cashback_count',
    label: t('menu.directMemberCount'),    // 「下級數量」
    field: 'cashback_count',
    align: 'center',
    // ⭐ 跟 setting 同樣:>0 藍字,=0 灰字,本期都不可點
  },
  // ── 「返佣金額」group(animate 多 colspan 第二行)──
  ...currencyColumns.value,
  {
    name: 'actions',
    label: t('menu.function'),              // 「操作」
    align: 'center',
    // render slot: 「查看」橘框 pill button
  },
])

const currencyColumns = computed(() => {
  const ids = new Set<string>()
  rows.value.forEach((r) => Object.keys(r.revenues).forEach((id) => ids.add(id)))
  return Array.from(ids)
    .sort((a, b) => Number(a) - Number(b))
    .map((id) => ({
      name: `currency_${id}`,
      label: currencyIdMap.value?.[Number(id)]?.code ?? id,
      field: (row) => row.revenues[id],
      format: (val) => val == null ? '-' : moneyFormat(val),
      align: 'center' as const,
    }))
})
```

### 「返佣金額」group header(雙層表頭)

```
┌────────────┬────────────┬──────┬──── 返佣金額 ────┬──────┐
│ 結算日期    │ 結算範圍    │ 下級  │ PHP │VND │SGD │MYR│ 操作 │
└────────────┴────────────┴──────┴────┴────┴────┴───┴──────┘
```

- 「返佣金額」是 group header,**colspan = 幣別欄數**
- 對齊舊 set_r017 SubDetailsTable 寫法(用 `<template v-slot:header>` 自訂兩行表頭)
- i18n key:**`menu.commissionAmount`**(若 key 不存在 fallback 顯示 `"返佣金額"`)

### Cell render

| Cell | 規格 |
|---|---|
| 結算日期 | `formatDate(billing_date)` 例 `"2026-10-01"` |
| 結算範圍 | `${formatDateTime(billing_start)} - ${formatDateTime(billing_end)}` 例 `"2025-09-01 00:00 - 2026-09-30 23:59"`(看 Figma 是有時間,不只日期) |
| 下級數量 | 跟 setting 一致:`>0` **藍字** `var(--link)` / `=0` **灰字** `var(--container-container-field-secondary)`,**都不可點** |
| 幣別 % | ⚠️ 不是 %!是金額:`moneyFormat(value)` 例 `2,500`(沿用既有 helper)。空值 `-` |
| 操作 | 「查看」按鈕(下方) |

### 「查看」按鈕(操作欄)

- 樣式:**橘色外框 pill button**,跟 setting 的「編輯」按鈕**完全同樣**樣式(沿用同 token)
- 文字:`t('menu.details')`(舊 key,翻譯「查看」或「詳情」)
- 點下去:`emit('show-sub-details', row.statement_id, { start: row.billing_start, end: row.billing_end })`
- Token:`--button-button-title-border-enabled/hover/active` brand-primary 橘

---

## 6. Mobile Layout(對齊 Figma `13103-111079`)

```
┌─ ReferralDetailsTable (Mobile) ──────┐
│  [Label: 會員帳號]                      │
│  ┌──────────────────┐                 │
│  │ 請輸入 ...        │                 │
│  └──────────────────┘                 │
│  ┌──────────────────┐                 │
│  │      搜尋        │  ← 全寬填滿       │
│  └──────────────────┘                 │
│                                        │
│  <ReferralDetailsMobileCard> × N       │
│                                        │
│            < [1] [2] [3] >             │
└────────────────────────────────────────┘
```

### ReferralDetailsMobileCard.vue(單張卡)

⚠️ **跟 setting 的 mobile 卡共用同樣結構**(只差展開內容與按鈕文字)。實作時很容易漏:

- 卡片 header 右側必須有 **`▼` chevron icon**(藍色)
- 卡片 expanded 後底部必須有 **「查看」按鈕**(橘框 pill)— 不是「編輯」

#### Layout(collapsed)

```
┌─ Card (collapsed) ───────────────────────────┐
│  line00                    10               ▼│
│  會員帳號                  下級數量              │
└──────────────────────────────────────────────┘
```

- 左側上下:**帳號(白字粗體)**(可疑 — 看 Figma 是顯示「line00」當帳號,但「結算列表」邏輯上應該顯示「結算日期」而不是會員帳號)
- ⚠️ **資料對應疑點**:Figma Mobile 卡 header 顯示 `line00 / 10`,但結算列表 API 回的不是會員帳號;這可能是設計師沿用 setting card 的 mock 文案。**實作時 header 顯示**:
  - 左側上:**`formatDate(billing_date)`**(結算日期,例 `2026-10-01`)
  - 左側下:`t('menu.settlementDate')` 灰 label
  - 右側上:**`cashback_count`**(下級數量,藍字)
  - 右側下:`t('menu.directMemberCount')` 灰 label
  - 最右:`▼` chevron

#### Layout(expanded,對齊 Figma `13103-111079`)

```
┌─ Card (expanded) ──────────────────────────────┐
│  2026-10-01               10                  ▲│
│  結算日期                 下級數量                │
├────────────────────────────────────────────────┤
│   結算日期             2026-10-10               │
│   結算範圍   2025-09-01 00:00 - 2026-09-30 23:59│
│   PHP                                   2,500   │
│   VND                                   2,500   │
│   SGD                                   2,500   │
│   MYR                                   2,500   │
│   ┌────────────────────────────────────────┐   │
│   │              查看                       │   │ ← 橘框 pill
│   └────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

> ⚠️ Figma 內 expanded 區的「結算日期」+「結算範圍」**重複顯示了 header 已有的「結算日期」**。這是 Figma 設計選擇,實作對齊就好(展開後重看一次日期 + 提供範圍)。
>
> ⚠️ Figma 內 expanded 區寫了 `VND 25% / VND 25% / SGD 25% / MYR 25%` 看起來是 **設計師 mock 失誤**(複製貼上自 setting card,且用 % 而不是金額)。實作時應該是 **`PHP / VND / SGD / MYR` 四個幣別 + 各自金額**(`moneyFormat`)。

#### Props
```ts
defineProps<{
  row: ReferralStatementListItem
  currencyColumns: Array<{ id: string; code: string }>
}>()
const emit = defineEmits<{
  view: [{ statementId: number; range: { start: string; end: string } }]
}>()
```

#### 內部
- `expanded` 本地 ref,點 header 任何位置或 `▼` 切換
- 「查看」按鈕點下去 `emit('view', { statementId: row.statement_id, range: { start: row.billing_start, end: row.billing_end } })`

#### Token
| 元件 | token |
|---|---|
| Card bg | `--card-card-bg-primary-enabled` |
| 帳號 / 日期白字粗體 | `--text-text-primary` |
| 灰 label | `--card-card-subtitle-primary-enabled` |
| 下級數量藍字 | `--link` |
| ▼ icon | `--link`(藍同數字)或 `--icon-icon-primary-enabled` |
| Divider | `--border-border-line` |
| 查看按鈕 | `--button-button-title-border-enabled` |

---

## 7. 互動細節

### 7.1 搜尋

跟 setting 同 pattern:打字本地 → 按搜尋 / Enter 才送出 → queryKey 變化自動重抓。**不要 debounce 即時查**。

### 7.2 翻頁

跟 setting 同 pattern:`currentPage` 變更 → `offset` / `queryKey` 變化自動重抓,`keepPreviousData` 不閃爍。

### 7.3 查看 → 切到子頁

```
PC 點某列「查看」 / Mobile 點 card 內「查看」
  └─ emit('show-sub-details', row.statement_id, { start, end })
        → 父層收到 → showingSubDetails = true / selectedStatementId = id
        → v-if/v-else 切到 <ReferralDetailsSubDetail>
```

> 切到子頁不會 unmount 本元件的 query;父層用 `v-if/v-else` 兩個都掛時,本元件保留 state,user「返回」回來時 state 還在(包括分頁、搜尋條件)。

---

## 8. 邊界 & 錯誤狀態

| 狀態 | 呈現 |
|---|---|
| `isPending && !data` | Loading skeleton |
| `data.list.length === 0` | `<BaseNoData>`(待 Figma 補空狀態) |
| `isError` | error message + 「重試」(call `query.refetch()`) |
| 搜尋無結果 | 同 list 空 → `<BaseNoData>`,搜尋欄保留輸入 |
| `cashback_count === 0` | cell 顯示「0」灰字(同 setting) |

---

## 9. RWD 切點

```vue
<template>
  <div>
    <SearchSection />
    <BaseTable v-if="!isMobile" ... />
    <div v-else class="flex flex-col gap-3">
      <ReferralDetailsMobileCard
        v-for="row in rows"
        :key="row.statement_id"
        :row="row"
        :currency-columns="currencyColumns"
        @view="(p) => emit('show-sub-details', p.statementId, p.range)"
      />
    </div>
    <Pagination ... />
  </div>
</template>
```

---

## 10. Token 對照

| 元件區塊 | token |
|---|---|
| 搜尋 input / 「搜尋」按鈕 | 跟 setting 一致(`--input-input-*` / `BaseBtn theme="secondary"`) |
| 表格 header bg | `--table-table-header-bg` |
| 「返佣金額」group header bg | 同上 |
| 「返佣金額」group 第二層 sub-header bg | `--table-table-content-bg-dark` 或同 header bg(看 Figma) |
| 表格 cell 文字 | `--table-table-content-title-enabled` |
| 下級數量 >0 藍字 | `--link` |
| 下級數量 =0 灰字 | `--container-container-field-secondary` |
| 查看按鈕(操作欄) | `--button-button-title-border-enabled/hover/active` |
| Pagination | `--pagination-pagination-bg-active` |

---

## 11. i18n key 對照(沿用舊翻譯)

| UI | i18n key | 確認來源 |
|---|---|---|
| 結算日期 | `menu.settlementDate` | set_r017 DesktopDetailsTable ✅ |
| 結算範圍 | `menu.settlementRange` | set_r017 DesktopDetailsTable ✅ |
| 下級數量 | `menu.directMemberCount` | set_r017 同 setting ✅ |
| 返佣金額(group header) | `menu.commissionAmount` | **fallback** `"返佣金額"`(舊版 set33_RED 是 hardcode `"返傭金額(含所有下載)"`,新版改用 i18n;若 key 不存在,先用 fallback 文字,等後端 i18n 補) |
| 操作 | `menu.function` | set_r017 ✅ |
| 查看(按鈕)| `menu.details` | set_r017 ✅(舊翻譯就是「詳情」/「查看」) |
| 會員帳號 label(搜尋)| `menu.userAccount` | 同 setting 沿用 |
| 請輸入 placeholder | `common.placeholder.pleaseEnter` | 通用 |
| 搜尋按鈕 | `common.btn.search` | 通用 |

---

## 12. 驗收

- [ ] PC 渲染表格,**雙層表頭**:第一列 `結算日期 / 結算範圍 / 下級數量 / 返佣金額(colspan) / 操作`;第二列幣別碼 colspan 對齊
- [ ] PC 表格內**幣別欄顯示金額**(`moneyFormat`)**不是 `%`**(別跟 setting 搞混)
- [ ] **Mobile 卡 collapsed**:header 左側顯示「結算日期 / 結算日期 label」,右側顯示「下級數量 / 下級數量 label」,最右側有 `▼` icon(藍)
- [ ] **Mobile 卡 expanded**:顯示結算日期 / 結算範圍 / 四幣別金額 / 「查看」按鈕(橘框 pill)
- [ ] **Mobile 「查看」按鈕**(不是「編輯」)
- [ ] 點查看 emit `show-sub-details` 帶 statementId + range
- [ ] 搜尋按鈕 / Enter 才送出
- [ ] 翻頁不閃爍
- [ ] 切到子頁後返回,搜尋條件與分頁狀態仍在(本元件 v-if 保留)
- [ ] Loading / Empty / Error 三態
- [ ] Token 全 var

---

## 13. 顏色不確定 — codex 開 Chrome 自查

下列細節用 Chrome MCP 直接查 Figma(`13082-86677` / `13103-111079`)即可,不必回問 user:

1. 雙層表頭背景色是否同色?還是 group header 較深?
2. Mobile 卡片 collapsed 時 header 是否有 hover state(看 Figma 有沒有 hover frame)
3. 「查看」按鈕的 disabled 狀態(理論上不會 disable,但要不要做)

若 Chrome 自查仍不確定,記回本 spec §13 等 UI 補。
