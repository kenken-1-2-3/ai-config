# R017 會員代理 — 查看子頁 Spec

> **角色**:明細 Tab 內點某列「查看」後**進入的子頁** — 顯示該結算期的下級明細,純查詢(無編輯)。
>
> **同套件 spec**:
> - 資料層 ─ [referral-details-data-layer.md](referral-details-data-layer.md) ⚠️ 先做
> - 列表(觸發本子頁)─ [referral-details-list.md](referral-details-list.md)
> - 本份 ─ 查看子頁
>
> **先決條件**:[referral-old-api-reference.md](referral-old-api-reference.md)
>
> **參考 Figma**:
> - PC 查看子頁(完整):node-id `13130-129852` / `7820-85146`(之前看過)
> - Mobile 查看子頁:node-id `13118-111467`(之前看過)
>
> **參考實作**:
> - `template/set_r017/pages/Referral/Components/DesktopSubDetailsTable.vue`
> - `template/set_r017/pages/Referral/Components/MobileSubDetailsList.vue`

---

## 1. 範圍

做 ReferralDetailsSubDetail 元件 + Mobile 卡。

**做的事**:
- 「回上一層」紫色按鈕(返回明細列表)
- 「結算範圍 yyyy/MM/dd HH:mm - yyyy/MM/dd HH:mm」橘字顯示(右上)
- 「會員帳號」搜尋
- PC 表格 + Mobile expansion 卡(RWD 兩套)
- 分頁
- 空狀態 / Loading / Error 三態

**不做**:
- ❌ **頁/搜尋總計**(本期全不做,對齊 [referral-old-api-reference.md](referral-old-api-reference.md) §8 決策)
- ❌ 編輯(此頁純查詢,無編輯按鈕)

---

## 2. 檔案位置

```
apps/r017/src/components/referral/
├─ ReferralDetailsSubDetail.vue       // ⭐ 本 spec 主元件
└─ ReferralDetailsSubMobileCard.vue   // 抽出單張 mobile 卡
```

依賴:
- `useReferralStatementDetailQuery`(資料層 spec §6.2)
- `BaseInput`、`BaseBtn`、`BasePagination`、`BaseTable`、`BaseNoData`、`BaseIcon`(返回按鈕的 ← arrow)
- `useCustomBreakpoints()` 的 `isMobile`
- `useBank` 的 `currencyIdMap`

---

## 3. Props / Events

```ts
defineProps<{
  statementId: number
  statementRange: { start: string; end: string }   // 從父層帶入,顯示用
}>()

const emit = defineEmits<{
  back: []   // 返回明細列表
}>()
```

> 父層(明細 tab 容器)用 `v-if/v-else` 切換本元件與 ReferralDetailsTable;`@back` emit 後切回列表。

---

## 4. 內部 State

```ts
const search = ref('')
const submittedSearch = ref('')
const pageSize = ref(10)    // PC 預設;Mobile 沿用舊版「寫死 20」見 §8
const currentPage = ref(1)
const offset = computed(() => (currentPage.value - 1) * pageSize.value)

const { data, isPending, isError, error } = useReferralStatementDetailQuery({
  statementId: computed(() => props.statementId),
  offset,
  size: pageSize,
  memberAccount: submittedSearch,
})
```

---

## 5. PC Layout(對齊 Figma `7820-85146`)

```
┌─ ReferralDetailsSubDetail (PC) ────────────────────────────────────┐
│  ┌──────────────────────┐                                            │
│  │ ← 回上一層             │  ← 紫色填滿 pill button                     │
│  └──────────────────────┘                                            │
│                                                                       │
│  [Label: 會員帳號]                            結算範圍 2023/09/01 00:00 │
│  ┌──────────────┐ ┌─────┐                         - 2023/09/30 23:59 │
│  │ 請輸入 ...    │ │ 搜尋 │                          ↑ 橘字              │
│  └──────────────┘ └─────┘                                            │
│                                                                       │
│  ┌─ BaseTable ──────────────────────────────────────────────────┐  │
│  │ 會員帳號 │ 下級數量 │      返佣金額                              │  │
│  │          │          │ PHP  │ VND  │ SGD  │ MYR              │  │
│  │ cckk881333│   12    │ 2500 │ 2500 │ 2500 │ 2500             │  │
│  │ ...                                                            │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                  < [1] [2] [3] >    │
└───────────────────────────────────────────────────────────────────┘
```

### 「回上一層」按鈕(top-left)

- 樣式:**紫色填滿 pill** + 左側 ← icon + 文字
- 文字:`t('common.btn.back')` 或新 key `referral.backToList`(等 i18n 補)— 先 fallback `"回上一層"`
- 點下去:`emit('back')`
- Token(初步,codex 開 Chrome 確認):
  - bg:`--button-button-bg-secondary-right-enabled` 或 abyss-700 系
  - text/icon:`--brand-brand-text`(white)
  - radius:full pill 或 12px

### 「結算範圍」顯示(top-right,搜尋列右側)

```
結算範圍  2023/09/01 00:00 - 2023/09/30 23:59
^灰 label  ^橘字
```

- 「結算範圍」灰字 → `--card-card-subtitle-primary-enabled`(neutral-400)
- 日期橘字 → `--text-text-accent`(brand-primary)
- 文字內容由父層 `statementRange` prop 帶入,本元件 format
- 與「搜尋」一行對齊(同 row),桌面寬度足夠時靠右;窄一點時可換行

### 表格欄位

```ts
const columns = computed(() => [
  {
    name: 'member_account',
    label: t('menu.userAccount'),        // 「會員帳號」
    field: 'member_account',
    align: 'center',
  },
  {
    name: 'cashback_count',
    label: t('menu.directMemberCount'),  // 「下級數量」
    field: 'cashback_count',
    align: 'center',
    // ⭐ >0 藍字 / =0 灰字,不可點(同 list)
  },
  ...currencyColumns.value,              // 各幣別,金額(非 %)
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

> ⚠️ **本子頁沒有「操作」欄**(沒有編輯也沒有再下鑽);columns 結束在最後一個幣別。

### 「返佣金額」group header

跟 [referral-details-list.md](referral-details-list.md) §5 同 pattern:雙層表頭,「返佣金額」colspan 所有幣別欄。

---

## 6. Mobile Layout(對齊 Figma `13118-111467`)

```
┌─ ReferralDetailsSubDetail (Mobile) ──────┐
│  ┌──────────────────┐                     │
│  │ ← 回上一層        │  ← 紫色填滿          │
│  └──────────────────┘                     │
│  [Label: 會員帳號]                          │
│  ┌──────────────────┐                     │
│  │ 請輸入 ...        │                     │
│  └──────────────────┘                     │
│  ┌──────────────────┐                     │
│  │      搜尋        │  ← 全寬填滿           │
│  └──────────────────┘                     │
│  結算範圍 2023/09/01 00:00 - 2023/09/30 ...│
│  ↑ 灰 label / 橘字(換行多行可,小字)          │
│                                            │
│  <ReferralDetailsSubMobileCard> × N        │
│                                            │
│            < [1] [2] [3] >                 │
└────────────────────────────────────────────┘
```

### 順序

1. 「回上一層」按鈕
2. 「會員帳號」label + input
3. 「搜尋」按鈕(全寬)
4. 「結算範圍」一行(灰 label + 橘字)
5. 卡片列表
6. 分頁

### ReferralDetailsSubMobileCard.vue(單張卡)

⚠️ **與明細列表的 mobile 卡同樣有 `▼` icon,但**:
- **expanded 後沒有「查看」按鈕**(這已經是子頁終點)
- expanded 內容是「該下級各幣別的返佣金額」

#### Layout(collapsed)

```
┌─ Card (collapsed) ───────────────────────────┐
│  cckk881333                12               ▼│
│  會員帳號                  下級數量              │
└──────────────────────────────────────────────┘
```

#### Layout(expanded)

```
┌─ Card (expanded) ──────────────────────────────┐
│  cckk881333                12                 ▲│
│  會員帳號                  下級數量                │
├────────────────────────────────────────────────┤
│   PHP                                   2,500   │
│   VND                                   2,500   │
│   SGD                                   2,500   │
│   MYR                                   2,500   │
└────────────────────────────────────────────────┘
```

> 沒有「查看」按鈕,沒有底部 action 區。卡底是最後一個幣別 row。

#### Props
```ts
defineProps<{
  row: ReferralStatementDetailItem
  currencyColumns: Array<{ id: string; code: string }>
}>()
```

> 不需要 emit(沒有任何 action)。

#### 內部
- `expanded` 本地 ref,點 header 任何位置或 `▼` 切換

---

## 7. 互動細節

### 7.1 搜尋

跟 setting / list 同 pattern。

### 7.2 翻頁

跟 list 同 pattern;`keepPreviousData` 不閃爍。

### 7.3 返回明細列表

```
user 點「回上一層」
  └─ emit('back')
        → 父層 showingSubDetails = false / selectedStatementId = 0
        → v-if/v-else 切回 <ReferralDetailsTable>
```

> 不需要二次確認(無未保存資料)。

---

## 8. Mobile 分頁 size

⚠️ **沿用舊版「mobile 子明細 size 寫死 20」**(referral-old-api-reference.md §11 已記:Mobile SubDetails 強制 size = 20)。

PC 用預設 10;Mobile 在本元件內判斷:
```ts
const pageSize = ref(isMobile.value ? 20 : 10)
```
或 mobile 卡列表獨立用 size=20。看 codex 偏好,但**結果要對齊舊版「mobile 一頁 20 筆」**。

---

## 9. 邊界 & 錯誤狀態

| 狀態 | 呈現 |
|---|---|
| `isPending && !data` | Loading skeleton(可選保留 statementRange 顯示) |
| `data.list.length === 0` | `<BaseNoData>`(對齊 setting / list 決策) |
| `isError` | error + 「重試」 |
| 搜尋無結果 | 同 list 空 → `<BaseNoData>`,搜尋欄保留輸入 |
| `cashback_count === 0` | 顯示「0」灰字 |
| `statementId` 不合法(例如直接刷新進來)| 顯示 error 並提供「返回明細列表」按鈕 → emit('back') |

---

## 10. Token 對照

| 元件區塊 | token |
|---|---|
| 「回上一層」按鈕 bg | ⚠️ codex 開 Chrome 自查 — 可能 `--button-button-bg-secondary-*` 或新 indigo/abyss-700 系 |
| 「回上一層」按鈕 文字/icon | `--brand-brand-text`(white) |
| 「結算範圍」灰 label | `--card-card-subtitle-primary-enabled`(neutral-400) |
| 「結算範圍」橘字 | `--text-text-accent`(brand-primary) |
| 搜尋 input / button | 同 list / setting |
| 表格 header bg | `--table-table-header-bg` |
| 雙層表頭分隔 | 同 list |
| 下級數量 >0 藍字 | `--link` |
| 下級數量 =0 灰字 | `--container-container-field-secondary` |
| 表格 cell | `--table-table-content-title-enabled` |
| Mobile 卡 bg / divider | 同 list 的 mobile 卡 token |
| Pagination | `--pagination-pagination-bg-active` |

---

## 11. i18n key 對照

| UI | i18n key | 備註 |
|---|---|---|
| 會員帳號 | `menu.userAccount` | ✅ |
| 下級數量 | `menu.directMemberCount` | ✅ |
| 返佣金額(group)| `menu.commissionAmount` | fallback `"返佣金額"` |
| 結算範圍(label)| `menu.settlementRange` | ✅ |
| 回上一層 | 新 key `referral.backToList` 或復用 `common.btn.back` | fallback `"回上一層"` |
| 請輸入 placeholder | `common.placeholder.pleaseEnter` | |
| 搜尋按鈕 | `common.btn.search` | |

---

## 12. 驗收

- [ ] PC 上方有「← 回上一層」紫色 pill button
- [ ] PC 搜尋列右側顯示「結算範圍 / 日期橘字」
- [ ] PC 表格雙層表頭:`會員帳號 / 下級數量 / 返佣金額(colspan)`,**沒有操作欄**
- [ ] 幣別欄顯示金額(`moneyFormat`)
- [ ] Mobile 順序:回上一層 → 搜尋 → 結算範圍 → 卡片
- [ ] **Mobile 卡 expanded 後沒有「查看」按鈕**(別不小心做了)
- [ ] Mobile 分頁 size = 20
- [ ] 點「回上一層」emit('back') 切回明細列表
- [ ] 子頁狀態與明細列表狀態獨立(本元件 unmount 時釋放,回到 list 時 list 還保有原狀態)
- [ ] 搜尋按鈕送出後才打 API
- [ ] Loading / Empty / Error 三態
- [ ] Token 全 var,沒寫死 hex

---

## 13. 顏色不確定 — codex 開 Chrome 自查

1. **「回上一層」紫色按鈕**精確 token — 看起來像 abyss-700 / brand-secondary-contrast(abyss-600),codex 直接看 Figma 7820-85146 inspect
2. Mobile 卡片底色(較 list 的卡是否不同)
3. 雙層表頭分隔線顏色

若 Chrome 自查仍不確定,記回本 spec §13 等 UI 補。
