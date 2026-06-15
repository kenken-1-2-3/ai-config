# R017 會員代理 — 頁面外殼 Spec

> **角色**:`/referral` 路由的**頁面容器** — 包含頁首 4 卡(幣別下拉 / 推薦碼 / 三個統計卡)、雙 Tabs(設定 / 明細)、Tab 內容掛載。
>
> **同套件 spec**:
> - 資料層 ─ [referral-setting-data-layer.md](referral-setting-data-layer.md)
> - 列表(設定 tab 內容)─ [referral-setting-list.md](referral-setting-list.md)
> - 編輯彈窗 ─ [referral-setting-edit-dialog.md](referral-setting-edit-dialog.md)
> - 本份 ─ 頁面外殼
>
> **參考 Figma**(`R017_優化中`):
> - PC 設定 tab(完整):node-id `13126-120233`
> - Mobile 設定 tab(完整):node-id `7822-95268`
> - PC 編輯彈窗:node-id `13130-132989`
>
> **參考實作**(舊專案 `set_r017`):
> - `template/set_r017/pages/Referral/DesktopReferral.vue`(主邏輯)
> - `template/set_r017/pages/Referral/MobileReferral.vue`
> - `template/set_r017/pages/Referral/Index.vue`(RWD 切換)

---

## 1. 範圍

只做頁面外殼:
- 路由 `/referral`
- 上方標題 + 幣別下拉 + 4 卡(PC) / 1+3 卡(Mobile)
- 雙 Tabs(設定 / 明細)
- 切換時掛載對應子元件(`<ReferralSettingTable>` 或 `<ReferralDetailsTable>`)
- 推薦碼複製 / 分享行為

**不做**:設定 tab 內容(列表/彈窗,看其他 spec)、明細 tab 內容(另案)。

---

## 2. 檔案位置

```
apps/r017/src/pages/referral/
└─ index.vue                              // ⭐ 本 spec(對應路由 /referral)
```

對齊舊專案 `template/set_r017/pages/Referral/Index.vue`(top-level `/referral`,不是 `/member/referral`)。

`apps/r017/src/components/referral/` 內子元件由其他 spec 提供:
- `ReferralSettingTable.vue` ← list spec
- `ReferralSettingMobileCard.vue` ← list spec
- `ReferralSettingEditDialog.vue` ← edit-dialog spec

---

## 3. Layout

### 3.1 PC(對齊 Figma `13126-120233`)

```
┌─ /referral PC ────────────────────────────────────────────┐
│  會員代理                                                    │
│  幣別                                                        │
│  ┌─────────┐                                                │
│  │ PHP   ▼ │                                                │
│  └─────────┘                                                │
│  ┌──────────────┐ ┌──────┐ ┌──────────┐ ┌──────────┐       │
│  │ 專屬推薦碼     │ │ 人數  │ │有效投注  │ │ 輸贏       │       │
│  │ Linda122 ⊠ ⊐ │ │ 598  │ │111,238  │ │888,238   │       │
│  └──────────────┘ └──────┘ └──────────┘ └──────────┘       │
│  ┌──────┬──────┐                                            │
│  │ 設定 │ 明細  │ ← Tabs                                     │
│  └──────┴──────┘                                            │
│                                                              │
│  <ReferralSettingTable /> 或 <ReferralDetailsTable />         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**4 卡橫向並排**(等寬或自適應),順序固定:
1. 專屬推薦碼(含分享 / 複製 icon)
2. 人數
3. 有效投注
4. 輸贏

### 3.2 Mobile(對齊 Figma `7822-95268`)

```
┌─ /referral Mobile ──────────┐
│  幣別                         │
│  ┌────────────────────────┐ │
│  │ PHP                 ▼ │ │  ← 全寬下拉
│  └────────────────────────┘ │
│  ┌────────────────────────┐ │
│  │ 專屬推薦碼              │ │  ← 全寬寬卡(放最上面!)
│  │ Linda122    ⊠   ⊐     │ │
│  └────────────────────────┘ │
│  ┌────┐ ┌──────┐ ┌──────┐  │
│  │人數│ │有效投注│ │ 輸贏 │  │  ← 三個小卡並排在下
│  │598 │ │111,238│ │888,238│  │
│  └────┘ └──────┘ └──────┘  │
│  ┌──────┬──────┐            │
│  │ 設定 │ 明細  │            │
│  └──────┴──────┘            │
│                              │
│  <ReferralSettingTable />    │
│  ...                         │
└──────────────────────────────┘
```

> ⚠️ **Mobile 順序強調**:
> 1. 幣別下拉
> 2. **專屬推薦碼**(獨立寬卡,在最上面)
> 3. 人數 / 有效投注 / 輸贏 **三個小卡並排在下面**
> 4. Tabs
>
> 不要把推薦碼也擠進三卡並排,跟 PC 不同。

---

## 4. i18n key 對照(沿用舊翻譯,不新增)

從 `template/set_r017/pages/Referral/{Desktop,Mobile}Referral.vue` 找到的 key,**新版必須沿用**(後端 i18n 服務同一份):

| UI 文字 | i18n key | 備註 |
|---|---|---|
| 「會員代理」標題 | `t('menu.memberAgent')` | |
| 「幣別」label | `t('menu.statistics')` 或新增 `menu.currency` | 舊版 Desktop label 是「Statistics」,Mobile 沒 label。**先沿用 `menu.statistics`**,翻譯就是「幣別」 |
| 「人數」卡標 | `t('menu.players')` | 對應 `referralSummaryData.member_count` |
| 「有效投注」卡標 | `t('menu.validBet')` | 對應 `referralSummaryData.total_valid_betted_amount` |
| 「輸贏」卡標 | `t('menu.winLoss')` | 對應 `referralSummaryData.total_profit` |
| 「專屬推薦碼」卡標 | `t('menu.referralCode')` | 翻譯就是「專屬推薦碼」 |
| 「設定」tab | `t('menu.referralSettings')` | |
| 「明細」tab | `t('menu.referralDetails')` | |
| 複製成功通知 | `t('common.alarm.copySuccess')` | |

> 不要新增 i18n key — 一律從遠端 i18n 服務拿,新增會打不到。如果某個翻譯不存在或要改字,跟後端反映而不是前端改。

---

## 5. 內部 State

```ts
const tabState = ref<'setting' | 'details'>('setting')
const activeTab = computed({
  get: () => tabState.value,
  set: (val) => {
    tabState.value = val
    // 切回 setting 時 reset details 子明細狀態(沿用舊版 §3 規則)
    if (val === 'setting') {
      showingSubDetails.value = false
      selectedStatementId.value = 0
    }
  },
})

// 子明細狀態(明細 tab 用,本 spec 不實作)
const showingSubDetails = ref(false)
const selectedStatementId = ref<number>(0)

// 幣別下拉
const selectedCurrency = ref<{ label: string; value: string } | null>(null)
const walletDropdown = computed(...)   // 沿用舊版 useUserInfo() / userWalletMap

// 推薦碼資料
const { referralInfoData, fetchReferralInfo } = useReferralInfo()
const { referralSummaryData, fetchReferralSummary } = useReferralSummary()
```

---

## 6. 資料流

### 6.1 進入頁面

```
onMounted:
  ├─ getUserWalletList()                              // 幣別下拉選項
  ├─ fetchReferralInfo()                              // 推薦碼
  └─ if walletDropdown 非空:
       selectedCurrency.value = walletDropdown[0]
       fetchReferralSummary(currency_id)              // 用第一個幣別取統計
```

> 改用 TanStack Query 後,改寫成 `useReferralInfoQuery()` / `useReferralSummaryQuery(currencyId)`;`onMounted` 邏輯改為 query enabled 條件控制即可,**不必手寫 fetchXxx**。

### 6.2 切換幣別

```
selectedCurrency 變更
  └─ fetchReferralSummary(new currency_id)
       → query.refetch 或 queryKey 自動變
```

### 6.3 推薦碼複製 / 分享

```
share icon click:
  └─ copyMessage(inviteCodeUrl({ inviteCode: referralInfoData.code }))

content_copy icon click:
  └─ copyMessage(referralInfoData.code)
```

兩個都呼叫 `useCommon().copyMessage(text)`(內含 clipboard 寫入 + 通知)。

### 6.4 切換 Tab

```
user 點 Tab
  └─ tabState 變更 → v-if/v-else 換掛子元件
```

---

## 7. RWD 切點

對齊 set_r017:

```vue
<template>
  <DesktopReferral v-if="!isMobile" />
  <MobileReferral v-else />
</template>
```

或同檔內用 isMobile flag 分支(視 codex 偏好)。`isMobile` 從 shared layer 既有 composable 取(`useCustomBreakpoints()` 或 `useMediaQuery()`)。

> 不一定要拆兩個 `.vue` — 4 卡 + Tabs 的 PC/Mobile 結構差異不大(主要差 4 卡排列),同檔內用 grid responsive class 也可。看 codex 偏好。

---

## 8. Token 對照

| 元件區塊 | token | primitive |
|---|---|---|
| 頁面背景 | `--surface-surface-backgroup` 或沿用 layout 既有 | gray-950 |
| 標題「會員代理」 | `--text-text-primary` | brand-text(white) |
| 「幣別」label | `--card-card-subtitle-primary-enabled` | neutral-400 |
| 幣別下拉 bg / border | `--dropdown-dropdown-bg-primary-enabled` / 沿用 BaseSelect 預設 | — |
| 4 卡 bg(看起來深紫帶光) | **暫不確定** — 見 §10 | — |
| 4 卡標題(專屬推薦碼/人數/...)| `--card-card-subtitle-primary-enabled` 或 `-secondary-enabled-3` | neutral-400 或 light-200 |
| 4 卡數字(598/111,238/...)| `--text-text-primary` | brand-text(white) |
| 「Linda122」推薦碼大字 | `--text-text-primary` | brand-text |
| 分享 / 複製 icon | `--icon-icon-primary-enabled` | light-500 |
| Tabs 容器底 | `--tab-tab-bg-rounded-primary-enabled` | light-dark(black) |
| 設定 tab active(橘漸層) | `--tab-tab-bg-rounded-primary-left-active`(可能左)+ `--tab-tab-bg-primary-dark-right-active`(右?) 看 Figma 實際是漸層 | brand-primary → primary-contrast |
| 設定 tab active 文字 | `--tab-tab-title-rounded-primary-active` | brand-text |
| 明細 tab 非 active 文字 | `--tab-tab-title-rounded-primary-enabled` | brand-text(顏色淡) |

---

## 9. 驗收

- [ ] PC 頂部一行 4 卡:推薦碼 / 人數 / 有效投注 / 輸贏(順序正確)
- [ ] **Mobile 順序**:幣別下拉 → 專屬推薦碼寬卡 → 三個小卡(人數/有效投注/輸贏)→ Tabs
- [ ] 三卡標題用舊翻譯 key:`menu.players` / `menu.validBet` / `menu.winLoss`(對應「人數」/「有效投注」/「輸贏」)
- [ ] 推薦碼分享 icon → 複製邀請連結 + 提示成功
- [ ] 推薦碼複製 icon → 複製推薦碼 + 提示成功
- [ ] 切幣別下拉 → summary 重抓
- [ ] Tab 切換掛載對應子元件;切回 setting 時 details 子明細狀態 reset
- [ ] 路由 `/referral` 可進入,需登入
- [ ] 沒寫死 hex,全部走 token

---

## 10. 顏色不確定 — 開 Chrome 自查

下列點我從 Figma 看不夠精準,**本 spec 改成 codex 開 Chrome MCP 自查 Figma 顏色**(`mcp__Claude_in_Chrome__navigate` + screenshot zoom + 對照 token 列表):

1. 4 卡背景色:「專屬推薦碼」卡看起來偏紫(可能 abyss-700 ~ abyss-800 的 layer),「人數/有效投注/輸贏」三卡看起來偏紅紫(可能 abyss-800 與 brand-primary-contrast 混色)
2. Tab 容器底色(深色 pill)
3. Tab active 漸層方向(左到右 = 橘到紅?或反過來?)
4. 4 卡邊框 / radius

若 Chrome 自查仍不確定,記回本 spec §10 等 UI 補。
