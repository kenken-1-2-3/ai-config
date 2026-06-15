# R017 會員代理 — 編輯彈窗 Spec

> **角色**:設定 Tab 中點「編輯」開出的**返佣比例編輯彈窗**。
>
> **同套件 spec**:
> - 資料層 ─ [referral-setting-data-layer.md](referral-setting-data-layer.md) ⚠️ 先做
> - 列表 ─ [referral-setting-list.md](referral-setting-list.md)(從這裡呼叫本彈窗)
> - 本份 ─ 編輯彈窗
>
> **先決條件**:[referral-old-api-reference.md](referral-old-api-reference.md)
>
> **參考 Figma**(`R017_優化中`):
> - PC 編輯彈窗(550×556):node-id `13130-132989` / `7785-67744` / `13129-121219`
> - Mobile 編輯彈窗(343×556):node-id `13103-110996`

---

## 1. 範圍

只做 ReferralSettingEditDialog 單一元件 — 接收 `memberId` / `memberAccount`,內部抓資料、渲染表單、送出更新。

**不做**:列表、popover、頁面外殼。

---

## 2. 檔案位置

```
apps/r017/src/components/referral/
└─ ReferralSettingEditDialog.vue
```

依賴:
- 容器:`BaseDialog`(shared)
- Base 元件:`BaseInput`、`BaseBtn`、`BaseIcon`(info icon、close icon)
- Composables:
  - `useReferralSettingDetailQuery`(資料層 spec §6.2)
  - `useUpdateReferralSettingMutation`(資料層 spec §6.3)
- Store/data:`useAccountInfo()` 取 `accountInfo.uid`(用來抓自己的上級上限);`useAuthStore.loginData` 不保證有 userId
- i18n key:**復用 `menu.commissionRate`**(舊版既有,不新增)

---

## 3. Props / Events

```ts
defineProps<{
  memberId: number
  memberAccount: string
}>()

const visible = defineModel<boolean>('visible')   // v-model:visible
```

> 父層(List 元件)用 `v-if + v-model:visible` 控制掛載,關閉時整個 unmount 釋放表單 state。

---

## 4. Layout(對齊 Figma)

PC 550×556 / Mobile 343×556,**內容結構兩端相同**,只差寬度。

```
┌─ BaseDialog (以 `classObj.root` override radius 12px / width) ────────────────────────┐
│ ┌── header bg: --dialog-dialog-bg-header ──────┐ │
│ │            編輯                          [×]   │ │
│ └──────────────────────────────────────────────┘ │
│ ┌── content bg: --dialog-dialog-bg-content ────┐ │
│ │ ┌──────────────────────────────────────────┐ │ │
│ │ │ ⓘ  Rebate ratio setting, up to 100%       │ │ │ ← info banner
│ │ └──────────────────────────────────────────┘ │ │
│ │                                                │ │
│ │ 會員帳號  abtest01                              │ │
│ │                                                │ │
│ │ PHP                                            │ │
│ │ ┌──────────────────────────────────────────┐ │ │
│ │ │  25                                   %  │ │ │
│ │ └──────────────────────────────────────────┘ │ │
│ │                                                │ │
│ │ VND / SGD / MYR ... 同樣 pattern              │ │
│ │                                                │ │
│ └────────────────────────────────────────────────┘ │
│ ┌── footer ──────────────────────────────────┐  │
│ │  ┌──────────┐    ┌──────────┐               │  │
│ │  │   取消    │    │   確定    │ ← 確定漸層     │  │
│ │  └──────────┘    └──────────┘               │  │
│ └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### 區塊細節

| 區塊 | 內容 |
|---|---|
| Header | 標題「編輯」(`t('common.edit')`),右上 `×` close icon,點 close 等同按取消 |
| Info banner | `<i>` icon + 文字復用既有 `menu.commissionRate` 類 key;若現有 key 沒有 rate 參數,先用 computed string / replacement 產出 `100%` 橘字,避免新增 i18n |
| 會員帳號列 | label `t('table_header.member_account')` 灰字 + `{memberAccount}` 橘字加粗 |
| 每幣別 input | 上方 label(幣別 code,白字)+ BaseInput + 右側 `%` 後綴 |
| Footer | 取消(outline)/ 確定(漸層 fill),兩顆等寬,中間 gap |

> **i18n 注意**:`menu.commissionRate` 既有 i18n string 內含一個 `<span class="text-rate-number">40</span>` 寫死 40 的 placeholder。我們**先用 100 取代**(對齊新 Figma),classname 沿用既有或改為 `text-accent`(看 codex 偏好)。

---

## 5. 資料流

```
visible = true (父層觸發)
  ├─ useReferralSettingDetailQuery(memberId)        → currentVal
  ├─ useAccountInfo() → accountInfo.uid
  ├─ useReferralSettingDetailQuery(accountInfo.uid) → upperLimit(自己=上級上限)
  └─ 兩個 query 都 ready 後:
        editing = structuredClone(currentVal.currency_limit)
        origin  = structuredClone(currentVal.currency_limit)

每幣別 input:
  ├─ label = currencyCode
  ├─ v-model = editing[currencyId]
  └─ disabled = origin[currencyId] > 0    ← 沿用舊版「設過一次就鎖住」

按「確定」:
  ├─ validate(見 §6)
  ├─ updateMutation.mutate({ member_id, currency_limit })
  ├─ onSuccess: visible = false; toast 顯示成功;invalidate 由 mutation 處理
  └─ onError:   不關彈窗;顯示錯誤訊息

按「取消」/「×」/ overlay click(可選):
  └─ visible = false(本期不做二次確認)
```

---

## 6. 驗證規則

對每個非 disabled 的 input:

| 條件 | 處理 |
|---|---|
| 空字串 | 視同 0,**不送出該幣別**(沿用舊版邏輯,可改為要求填) |
| 非數字 | input 變紅、顯示紅字 hint「請輸入數字」(只擋送出,不擋鍵入,鍵入時用 `inputmode="decimal"`) |
| 小於 0 | 變紅、hint「不可小於 0」 |
| 大於該幣別 upperLimit | 變紅、hint「不可超過 N%」(N = upperLimit[id]) |
| 大於 100 | 大於上限的特例之一 — 用同一個 hint 也可,或單獨 hint「不可超過 100%」 |

**「紅字」實作**:
- input border:`var(--input-input-negative)`(red-500)
- error hint:input 下方 1 行,字色 `var(--text-text-negative)` 或 `var(--input-input-negative)`
- 只在「焦點失去 (blur)」或「按確定」時觸發,**不要邊打邊報錯**

整體都通過才呼叫 mutation。

---

## 7. 元件樣式 token

| 區塊 | token | primitive |
|---|---|---|
| Dialog header bg | `--dialog-dialog-bg-header` | abyss-800 `#301d8a` ✅ 對齊 Figma |
| Dialog content bg | `--dialog-dialog-bg-content` | abyss-900 `#1d125d` |
| Dialog footer bg | `--dialog-dialog-bg-footer` | abyss-800 |
| Dialog 標題「編輯」白字 | `--dialog-dialog-title-header` | brand-text(white) |
| Dialog close icon | `--icon-icon-primary-enabled` | light-500 |
| Info banner bg | `--card-card-subtitle-secondary-enabled-3` | light-200(白 20%) |
| Info banner icon / 文字 | `--dialog-dialog-subtitle-content` | neutral-400 |
| Info banner 內「100%」橘字 | `--dialog-dialog-accent-content` | brand-primary(orange-500) |
| 「會員帳號」灰 label | `--card-card-subtitle-primary-enabled` | neutral-400 |
| 「abtest01」橘字加粗 | `--text-text-accent` | brand-primary |
| 幣別 input label(PHP / VND…)| `--input-input-title-primary-enabled` | container-field-primary(light-500) |
| input bg | `--input-input-bg-primary-enabled` | abyss-950 |
| input border(預設)| `--input-input-border-primary-enabled` | light-200 |
| input border(hover)| `--input-input-border-primary-hover` | brand-secondary-contrast(abyss-600) |
| input border(error)| `--input-input-negative` | red-500 |
| input 內字色(有值)| `--brand-brand-text` | white |
| input placeholder 灰字 | `--input-input-title-primary-disabled` | container-field-secondary(light-300) |
| input 後綴 `%` 灰字 | `--input-input-title-primary-enabled` | container-field-primary(light-500) |
| 取消 outline button border/字 | `--button-button-title-border-enabled` | brand-primary |
| 取消 hover | `--button-button-title-border-hover` | orange-600 |
| 取消 active | `--button-button-title-border-active` | orange-700 |
| 確定填滿 button bg(漸層) | `--button-button-bg-primary-left-enabled` → `--button-button-bg-primary-right-enabled` | brand-primary 橘 → brand-primary-contrast 紅 |
| 確定 button 字 | `--button-button-title-primary-enabled` | brand-text(white) |
| 確定 disabled | `--button-button-bg-primary-disabled` / `--button-button-title-primary-disabled` | neutral-300 / neutral-500 |

> 確定的「漸層」用 CSS linear-gradient:
> ```css
> background: linear-gradient(90deg,
>   var(--button-button-bg-primary-left-enabled),
>   var(--button-button-bg-primary-right-enabled));
> ```

---

## 8. 驗收

- [ ] 彈窗開啟時同時抓「自己上限」+「該下級當前值」,兩個 query 都 ready 才渲染表單
- [ ] 已設過的幣別(origin > 0)input 為 disabled
- [ ] 未設的幣別 input 可編輯
- [ ] 輸入超過上限 → input 變紅 + 下方紅字 hint
- [ ] 按取消 / × / overlay → 直接關閉,不二次確認
- [ ] 按確定 → 送出 mutation,成功後關閉 + toast,失敗不關
- [ ] 關閉後列表自動 refetch(由 mutation invalidate 觸發,本元件不需手動)
- [ ] Header 文字、info banner 100% 橘字、會員帳號橘字 — 全部走 token 不寫死 hex
- [ ] PC 寬度 550 / Mobile 寬度 343(用 BaseDialog `classObj.root` override;不要改 shared BaseDialog 預設)
- [ ] 確定按鈕漸層方向(左→右橘→紅)正確

---

## 9. 顏色不確定 — 需要 UI 貼圖

下列幾個我從 Figma 看不夠清楚,**請補圖或確認 token**:

1. **取消按鈕填滿底色** — 我假設是「透明 + 橘外框」(outline);但 Figma 看起來底色有一點點深紫疊在 dialog footer 上,可能也是有底色。請確認是純透明 outline,還是「透明深紫 + 橘外框」。
2. **確定按鈕的漸層方向** — 我寫 `90deg`(左到右),Figma 看起來確實是橫向,但**橘在左、紅在右**還是反過來?請確認。
3. **「會員帳號 abtest01」** 中橘色帳號是 `var(--text-text-accent)`(brand-primary)還是另有專屬 token?
4. **info banner 內 ⓘ icon 顏色** — 我假設用 `--dialog-dialog-subtitle-content`(neutral-400 灰)。如果是橘色或藍色請告知。
5. **input border `radius` 值** — 從 Figma 看起來圓角很大(膠囊?),數值多少?(目前先用 `8px`)
6. **input 內 placeholder「請輸入 ...」** 是否有 icon prefix?(目前無)

待 UI 補圖或指定 token 後再決定;其他全部可以照本 spec 開工。
