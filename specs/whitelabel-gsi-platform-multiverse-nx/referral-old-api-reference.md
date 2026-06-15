# 舊專案「會員代理 / Referral」(`/referral`) API 使用方式與流程

> 目的:在重做新 r017「會員代理 (`/referral`)」前,把舊專案 `Whitelabel_GSI_Platform_Multiverse` 既有 API 與資料流盤點清楚,作為新版實作的參考來源。
>
> 範圍:**僅描述舊專案現況**,不含新版設計決策。
>
> **首要參考檔案**(舊專案 r017 tenant 自己的實作,**最貼近新版的目標**):
> - `template/set_r017/pages/Referral/Index.vue`(RWD 切換 Desktop/Mobile)
> - `template/set_r017/pages/Referral/DesktopReferral.vue`
> - `template/set_r017/pages/Referral/MobileReferral.vue`
> - `template/set_r017/pages/Referral/Components/{DesktopSettingTable,DesktopDetailsTable,DesktopSubDetailsTable,MobileSettingList,MobileDetailsList,MobileSubDetailsList}.vue`
>
> **共用 API / Composable / Types**:
> - `src/api/referral.ts`
> - `src/api/request.type.ts` / `src/api/response.type.ts`
> - `src/common/composables/useReferral.ts`
>
> **附帶對照**(舊版單檔結構,作為對照不是首要參考):
> - `template/set33_RED/pages/MemberCenter/Referral.vue` + `components/Referral/{SettingTable,DetailsTable,SubDetailsTable}.vue`

---

## 1. API 端點總表

所有端點都掛在 `/v1/player/commission/*` 底下(邀請獎勵另計),透過 `requestApi` 包裝。

| # | 用途 | Method | Path | Function | Request | Response |
|---|---|---|---|---|---|---|
| 1 | 取得我的推薦碼/推薦連結 | GET | `/v1/player/commission/me/referral/info` | `getReferralInfo` | — | `ReferralInfo` |
| 2 | 取得返水統計(玩家數/有效投注/輸贏) | GET | `/v1/player/commission/summary` | `getReferralSummary(currency_id?)` | `{ currency_id?: string }` | `ReferralSummary` |
| 3 | 取得直屬下級佣金設定列表 | GET | `/v1/player/commission/settings` | `getReferralSetting(params)` | `GetReferralSetting` | `ReferralSetting` |
| 4 | 取得單一會員佣金設定詳情(編輯彈窗用) | GET | `/v1/player/commission/settings/:member_id` | `getReferralSettingDetail(member_id)` | — | `ReferralSettingDetail` |
| 5 | 更新單一會員佣金設定 | PUT | `/v1/player/commission/settings/:member_id` | `putReferralSetting(params)` | `UpdateReferralSetting` | — |
| 6 | 取得代理佣金結算明細列表(逐期) | GET | `/v1/player/commission/statements` | `getReferralStatementList(params)` | `GetReferralStatementList` | `ReferralStatementList` |
| 7 | 取得單一結算期的下級明細 | GET | `/v1/player/commission/statements/:statement_id/details` | `getReferralStatementDetail(id, params?)` | `GetReferralStatementDetail` | `ReferralStatementDetail` |
| 8 | 取得單一結算期的總計 | GET | `/v1/player/commission/statements/:statement_id/details/total` | `getReferralStatementDetailTotal(id)` | — | `ReferralStatementDetailTotal` |
| 9 | (相關)邀請獎勵總覽 | GET | `/v1/player/referral_signup/overview` | `getReferralSignupOverview` | — | `ReferralSignupOverview` |

> 註:`useReferral` composable 已把第 9 項(邀請獎勵)順帶包進來,但「代理詳情」頁面本身不會呼叫,屬獨立功能。

---

## 2. 資料型別

### 2.1 推薦資訊

```ts
interface ReferralInfo {
  url: string   // 推薦連結
  code: string  // 推薦碼
}
```

### 2.2 返水統計

```ts
interface ReferralSummary {
  member_count: number                    // 推薦玩家總數
  total_valid_betted_amount: string       // 有效投注額(字串,可能含千分位)
  total_profit: string                    // 輸贏(字串)
  deposit_threshold: number               // 玩家計入有效的存款門檻
  valid_bet_threshold: number             // 玩家計入有效的有效投注門檻
}
```

### 2.3 佣金設定(列表 / 詳情 / 更新)

```ts
// 列表分頁 query
interface GetReferralSetting {
  size?: number
  offset?: number
}

// 共用結構
type ReferralSettings = {
  currency_limit: { [currencyId: string]: number }  // 例 { "1": 25, "2": 30 }
  is_limit_configured: boolean                       // 上級是否已設定上限
}

// 列表單列
interface ReferralSettingItem {
  account: string
  direct_member_count: number       // 該下級之直屬人數
  settings: ReferralSettings        // 當前已設定比例
  member_id: number
}
type ReferralSetting = PaginatedList<ReferralSettingItem>

// 編輯彈窗讀取的詳情(也用於讀取「自己的上限」)
interface ReferralSettingDetail extends ReferralSettings {}

// 更新
interface UpdateReferralSetting {
  member_id: number
  currency_limit: { [currencyId: string]: number }
}
```

### 2.4 結算明細(列表 / 子明細 / 總計)

```ts
type Revenue = { [currencyId: string]: string }     // 各幣別金額,字串

// 列表(每期一列)
interface ReferralStatementList extends PaginatedList<{
  statement_id: number
  billing_date: string     // 結算日
  billing_start: string    // 計算區間起
  billing_end: string      // 計算區間迄
  cashback_count: number   // 該期下級人次
  revenues: Revenue        // 該期各幣別返佣總額
}> {}

// 子明細(每下級一列)
interface ReferralStatementDetail extends PaginatedList<{
  member_account: string
  cashback_count: number
  revenues: Revenue
}> {
  page_summary: {
    cashback_count: number
    revenue_total: Revenue   // 本頁列加總
  }
}

// 整期總計(搜尋結果總計)
interface ReferralStatementDetailTotal {
  cashback_count: number
  revenue_total: { [currencyId: string]: string }
}
```

---

## 3. 頁面組成

**首要參考(舊專案 r017)**:`template/set_r017/pages/Referral/`

```
Index.vue
├─ useMediaQuery().isMobile
│   ├─ DesktopReferral.vue   ← PC 主頁
│   └─ MobileReferral.vue    ← Mobile 主頁
└─ Components/
    ├─ DesktopSettingTable.vue    / MobileSettingList.vue
    ├─ DesktopDetailsTable.vue    / MobileDetailsList.vue
    └─ DesktopSubDetailsTable.vue / MobileSubDetailsList.vue   ⭐「查看」子明細
```

### DesktopReferral.vue 結構(從上到下)

```
DesktopReferral.vue
├─ 上方 Banner (q-img,site 自訂)
├─ 「會員代理」標題
├─ 幣別 Select(下拉,切換 currency_id)
├─ Summary 區
│   ├─ 三項:玩家數 / 有效投注 / 輸贏
│   └─ 提示文字(v-html summaryTips,每 N 分鐘更新)
├─ 推薦碼區
│   ├─ referralInfoData.code 顯示
│   └─ 兩個 icon-only 按鈕:
│       ├─ share icon → copyMessage(inviteCodeUrl({ inviteCode })) 複製邀請連結
│       └─ content_copy icon → copyMessage(code) 複製推薦碼
└─ 雙 Tabs(tabs-pill 樣式)
    ├─ Setting tab → SettingTable
    │    └─ 點某列「設定」→ 開彈窗編輯 currency_limit
    ├─ Details tab → DetailsTable
    │    └─ 點某列「詳情」→ showingSubDetails=true,切到 SubDetailsTable
    └─ Tab 列右側 v-if="showingSubDetails":
         「返回」按鈕(material-icons reply + 文字) → handleBack 返回 DetailsTable
```

### 與舊版 (set33_RED) 結構差異

| | set33_RED(舊單檔) | **set_r017(首要參考)** |
|---|---|---|
| 檔案組織 | 單一 `Referral.vue` + 三個 sub-component | 拆出 `Index.vue` + `Desktop/MobileReferral.vue` + `Components/` 內 Desktop/Mobile 兩套 |
| RWD 切法 | 同檔內用 `useWindowSize().width >= 576` 判斷 + v-if/v-else | 用 `useMediaQuery().isMobile` 在 Index.vue 切兩個獨立子元件 |
| 推薦碼按鈕 | code 顯示 + 一顆 copy icon + Copy Link 文字按鈕 | code 顯示 + share icon(複製連結) + content_copy icon(複製碼) |
| 推薦連結來源 | `referralInfoData.url`(後端回傳) | `inviteCodeUrl({ inviteCode: code })`(前端組合,從 `useUserInfo`) |
| 複製通知 | `$q.notify` 內呼叫 | 統一封裝在 `useCommon().copyMessage()` |
| 返回按鈕 | 從子明細 component 內部觸發 emit | 提升到 DesktopReferral.vue 的 tab 列右側,只在 `showingSubDetails` 時顯示 |
| SubDetails 底部加總 | 「本頁總計 / 搜尋結果總計」實際渲染 | 程式碼**已註解掉**(`<!-- ... -->`),功能 disabled |
| Banner | 無 | 有,從 `useSiteImg().referralBannerImg` |

### Desktop vs Mobile 差異(set_r017 自己內部)

| | DesktopReferral / Desktop\*Table | MobileReferral / Mobile\*List |
|---|---|---|
| 上方 Statistics label | ✅ 有(幣別下拉前 `$t("menu.statistics")`) | ❌ 沒有(直接幣別下拉) |
| Summary 三卡呈現 | 一行 3 卡 | 一行 3 圓角藥丸(`rounded-[3rem]`,iphone 寬度縮小) |
| Setting / Details 表格元件 | `q-table`(DesktopSettingTable / DesktopDetailsTable / DesktopSubDetailsTable) | `q-card + q-expansion-item` 卡片堆疊(MobileSettingList / MobileDetailsList / MobileSubDetailsList) |
| SubDetails 底部加總 | **註解掉** | **保留並渲染兩張總計卡**(`mobile-page-total-card` × 2: 本頁總計 + 搜尋結果總計) |
| 返回機制 | tab 列右側「返回」按鈕(Reply icon + 文字) | 同樣 tab 右側按鈕 **+** 子明細卡內 expand 後底部多一顆 `mobileBackBtnImg` 圖示返回(SubDetailsList 內 `emit("back")` 給父層) |
| 預設分頁 size | 沿用 `referralPagination.size` | MobileSubDetailsList 把 `handlePagination(..., size=20)` 第 4 參寫死成 20(覆蓋 store) |
| Mounted 順序 | SubDetails 先 `fetchReferralStatementDetail` 再 `fetchReferralStatementDetailTotal` | 先 `handlePagination(1, "statementDetail", id, 20)` 再 `fetchReferralStatementDetailTotal`(走分頁機制起手) |
| 樣式檔 | `app/template/set_r017/assets/css/referral.scss` | 同檔 + Mobile 樣式區塊 |

> ⚠️ **Mobile 預設 size 寫死 20** 是個容易忘的細節:Desktop 跑預設值(可能與後端預設不同),Mobile 強制 20。新版要不要統一到一個值(例如 10 或 20)可重新決定。

### 共用規則

Referral 容器的 tab 切換邏輯有個重要規則:
**切回 `setting` tab 時會 reset `showingSubDetails=false` 與 `selectedStatementId=0`**,確保再次切到 details 時不會殘留前一次的子明細狀態。Desktop 與 Mobile 都沿用此規則。

兩個容器的 `onMounted` 順序完全一致:
```
$q.loading.show()
  → getUserWalletList()
  → fetchReferralInfo()
  → 若 walletDropdown 非空:
       selectedItem = walletDropdown[0]
       fetchReferralSummary(currency_id)
$q.loading.hide()
```

幣別切換 `changeCurrency(item)` 流程也一致(只更新 `selectedItem` + 重抓 summary)。

---

## 4. 資料流(時序)

### 4.1 進入頁面

```
mount Referral.vue
  ├─ $q.loading.show()
  ├─ getUserWalletList()                 // 取得幣別下拉選項
  ├─ fetchReferralInfo()                 // 推薦碼/連結
  ├─ if walletDropdown.length > 0
  │    selectedItem = walletDropdown[0]
  │    fetchReferralSummary(currency_id) // 用第一個幣別取統計
  └─ $q.loading.hide()

mount SettingTable.vue (Setting tab 預設掛載)
  ├─ $q.loading.show()
  ├─ fetchReferralSetting()              // 直屬下級列表(分頁)
  ├─ getAvailCurrencyList()              // 幣別 id → code 對照
  └─ $q.loading.hide()
```

### 4.2 切換幣別

```
user 選下拉某幣別
  └─ changeCurrency(item)
       └─ fetchReferralSummary(item.value) // 重抓統計
```

### 4.3 複製推薦碼/連結

```
copyReferralCode() → navigator.clipboard.writeText(ReferralInfo.code)
copyReferralUrl()  → navigator.clipboard.writeText(ReferralInfo.url)
  → $q.notify 提示「複製成功」
```

### 4.4 Setting tab:編輯下級分潤

```
user 點某列「設定」按鈕 (handleSettingClick)
  ├─ fetchReferralSettingDetail(auth.user_id, isUpper=true)
  │    └─ 寫入 upperReferralSettingDetailData(自己 = 上級上限)
  ├─ fetchReferralSettingDetail(member_id)
  │    └─ 寫入 referralSettingDetailData(該下級當前)
  ├─ openSettingDialog = true
  ├─ dialogAccount / dialogMemberId 設值
  └─ editingRateData / originRateData = deep clone(referralSettingDetailData)
       // 用 JSON.parse(JSON.stringify(...)) 做深拷貝

彈窗渲染:
  ├─ combinedCurrencyData 合併「上級上限」與「當前值」每個 currency_id
  ├─ 表頭顯示 `${code} (上限: X%)`
  └─ Input v-model="editingRateData.currency_limit[id]"
       :disabled="originRateData.currency_limit[id] > 0"
       // 已設定過的列被 disable(只能設一次,改不了)

按下「確認」(handleConfirm)
  ├─ Number(parsed) 把字串轉數字
  ├─ updateReferralSetting({ member_id, currency_limit })
  └─ 成功 → openSettingDialog = false
              fetchReferralSetting()  // 重抓列表
              $q.notify("編輯成功")
```

> Mobile (RWD < 576) 使用 `q-expansion-item` 展開,結構不同但 API 流程一致。

### 4.5 Details tab:看結算列表

```
mount DetailsTable.vue (Details tab 首次掛載)
  └─ fetchReferralStatementList()  // 取每期結算總覽

user 點某列「詳情」按鈕
  └─ emit("show-sub-details", row.statement_id)
       → Referral.vue 收到後
            selectedStatementId = statement_id
            showingSubDetails = true
       → 父層 v-if 切到 SubDetailsTable
```

### 4.6 SubDetailsTable:看某期下級明細

```
mount SubDetailsTable.vue
  ├─ props.statementId 由父層帶入
  ├─ fetchReferralStatementDetail(statementId)
  │    └─ 寫入 referralStatementDetailData(含 list + page_summary)
  └─ fetchReferralStatementDetailTotal(statementId)
       └─ 寫入 referralStatementDetailTotalData(整期總計)

表格底部呈現兩列:
  ├─ 本頁總計    → page_summary.{cashback_count, revenue_total}
  └─ 搜尋結果總計 → referralStatementDetailTotalData.{cashback_count, revenue_total}

按下「返回」按鈕 (BackBtn) → emit back → 父層 showingSubDetails = false
```

---

## 5. 分頁機制(共用)

`useReferral` 提供一個共用的 reactive 分頁狀態:

```ts
const referralPagination = reactive({ offset: 0, size: 20 })

handlePagination(page, tableType, statementId?, size?)
  // tableType: "setting" | "statement" | "statementDetail"
  // 1. 更新 offset = (page - 1) * size
  // 2. 視 tableType 重抓對應列表
  // 3. statementDetail 需要傳 statementId
  // 4. 期間以 $q.loading.show()/.hide() 包住
```

**注意陷阱**:`referralPagination` 是同一份 reactive 物件,同時被 SettingTable / DetailsTable / SubDetailsTable 共用。跨表切換時前一個 table 的 offset 會殘留,如果新表沒手動 reset 可能會跳到非首頁。新版實作時要明確處理。

`PaginatedList<T>`(專案共用結構)推測為:

```ts
type PaginatedList<T> = {
  list: T[]
  total: number
}
```

`totalPages = Math.max(1, Math.ceil(total / size))`

---

## 6. 跨元件互動與全域依賴

| 依賴 | 用途 |
|---|---|
| `useUserInfo` | `getUserWalletList()`、`userWalletMap` 提供幣別下拉 |
| `useBank` | `currencyIdMap` 把 currency_id 對應到 currency code(例:`1` → `"USD"`) |
| `useAuth` | `auth.user_id` 用來查「自己」當作上級上限的依據 |
| `useLogo` | `getWideLogo()` 給 no-data 樣式用 |
| `useApi` (`src/common/hooks/useApi`) | 包裝 axios call,統一回傳 `{ status, data }` 與錯誤處理 |
| `dateformat` (`src/common/utils/dayjsUtils`) | 格式化 `billing_start` / `billing_end` |
| `moneyFormat` (`src/common/hooks/useCommon`) | 金額千分位 |
| `useQuasar` (`$q.loading`, `$q.notify`) | Loading / Toast 提示 |

---

## 7. 已知細節與隱性規則

1. **「上限可改一次」邏輯** — `originRateData.currency_limit[id] > 0` 時 input 被 disable。代表後端規則:某幣別一旦設過比例就鎖住,只能設定原本為 0 的幣別。新版需確認此規則是否保留。
2. **幣別 id vs code** — 後端統一回傳 `currency_id`(string/number),前端用 `currencyIdMap` 對應到顯示用 `code`("USD", "PHP" 等)。
3. **Summary 提示文字** — i18n key `menu.summaryTips`,參數 `interval`,內含 `<span class="text-interval">10</span>` 用 `v-html` 渲染。
4. **RWD 切點** — `set_r017` 用 `useMediaQuery().isMobile` 在 Index.vue 切 Desktop/Mobile 兩個獨立子元件(各自寫 RWD 樣式);舊單檔結構(set33_RED)則是同檔內用 `useWindowSize().width >= 576` 判斷再 v-if/v-else。
5. **Setting Detail 同時呼叫兩次** — `handleSettingClick` 內先抓「自己」(上級上限),再抓「該下級」(當前值),用 `isUpper` flag 寫到不同 ref。新版若沿用此模式,需注意 race condition(雖然舊版用 await 串接所以不會踩到)。
6. **Statement Total 與 Page Summary 分開呼叫** — `page_summary` 隨 list 一起回傳(本頁加總),`total` 端點另外取(整期加總)。兩者意義不同,**但 set_r017 已把 SubDetailsTable 的底部加總列註解掉**。新版要不要恢復可重新決定。
7. **推薦碼連結來源變更** — set_r017 不再用 `referralInfoData.url`,改用 `useUserInfo().inviteCodeUrl({ inviteCode: code })` 前端組合連結,這樣連結域名/格式可由前端控制。
8. **複製動作** — set_r017 統一走 `useCommon().copyMessage(text)`,內含 clipboard 寫入 + 通知,新版沿用即可。
9. **Mobile SubDetailsList 內藏第二個返回入口** — 除了 tab 列右側的「返回」按鈕,展開某個下級卡後底部還有一顆 `mobileBackBtnImg` 圖示,點下去 `emit("back")` 給父層。新版若 mobile 採同樣 expansion 形式可考慮要不要保留(可能多餘)。
10. **Mobile 強制 size = 20** — `MobileSubDetailsList.onMounted` 與 pagination handler 都把 size 寫死 20。原因應是行動裝置上一頁更多筆比較順手。新版若 desktop / mobile 要對齊一致值,記得這裡有寫死。

---

## 8. 新版銜接決策

| 項目 | 決策 | 備註 |
|---|---|---|
| 沿用同一組 8 個端點 | ✅ 是 | 路徑與 payload 形狀保留 |
| 「設定一次後鎖住」規則 | ✅ 保留 | `originRateData.currency_limit[id] > 0` 時 input disabled |
| Summary 幣別取法 | ✅ 維持單幣別下拉切換 | 不改成一次取所有幣別,UI 上沿用 `currency_id` query param |
| 表格內多幣別呈現 | ✅ 橫向並列(各幣別一欄) | 與 Summary 切幣別解耦 — 表格本就回傳 `revenues: { [currencyId]: string }` 多幣別 |
| 子明細「返回」機制 | ✅ 父層 `v-if` 切換 | 沿用 r017 既有 `useMemberAsideNavigation` 的 component-toggle pattern,不走 nested route |
| 分頁 race 問題解法 | ✅ 每張表獨立 ref + TanStack Query `queryKey` 帶分頁參數 | 用既有的 `@tanstack/vue-query`,`queryKey: ['referralStatementList', { offset, size }]` 自動處理 stale/cancel;移除舊版共用 `referralPagination` |
| SubDetails 頁/搜尋總計 | ❌ 全不做 | 不論 Desktop / Mobile 都不渲染 `pageSummary` 與 `referralStatementDetailTotalData`;同時可省去 `getReferralStatementDetailTotal` API 呼叫 |
| Mobile SubDetails 強制 size = 20 | ✅ 維持 | 不改成跟 Desktop 同值,維持 Mobile 一頁 20 筆 |

---

## 附:檔案位置速查

### 共用層(set_r017 跟 set33_RED 都共用)

| 角色 | 檔案 |
|---|---|
| API 包裝 | `src/api/referral.ts` |
| Request types | `src/api/request.type.ts`(`GetReferralSetting` / `UpdateReferralSetting` / `GetReferralStatement*`) |
| Response types | `src/api/response.type.ts`(`ReferralInfo` / `ReferralSummary` / `ReferralSetting*` / `ReferralStatement*`) |
| Composable | `src/common/composables/useReferral.ts` |
| 複製訊息 | `src/common/hooks/useCommon.ts`(`copyMessage`) |
| 推薦連結組合 | `src/common/composables/useUserInfo.ts`(`inviteCodeUrl`) |
| RWD 判斷 | `src/common/hooks/useMediaQuery.ts`(`isMobile`) |

### ⭐ 首要參考:set_r017(舊專案的 r017 自己)

| 角色 | 檔案 |
|---|---|
| 容器(RWD switch) | `template/set_r017/pages/Referral/Index.vue` |
| Desktop 主頁 | `template/set_r017/pages/Referral/DesktopReferral.vue` |
| Mobile 主頁 | `template/set_r017/pages/Referral/MobileReferral.vue` |
| Desktop Setting | `template/set_r017/pages/Referral/Components/DesktopSettingTable.vue` |
| Desktop Details(結算列表) | `template/set_r017/pages/Referral/Components/DesktopDetailsTable.vue` |
| Desktop SubDetails(查看子頁) | `template/set_r017/pages/Referral/Components/DesktopSubDetailsTable.vue` |
| Mobile Setting | `template/set_r017/pages/Referral/Components/MobileSettingList.vue` |
| Mobile Details | `template/set_r017/pages/Referral/Components/MobileDetailsList.vue` |
| Mobile SubDetails | `template/set_r017/pages/Referral/Components/MobileSubDetailsList.vue` |
| 站點 Banner / 返回 icon | `template/set_r017/hooks/useSiteImg.ts`(`referralBannerImg`, `mobileBackBtnImg`) |
| 樣式 | `template/set_r017/assets/css/referral.scss` |

### 對照參考:set33_RED(較舊單檔結構,僅供概念對照)

| 角色 | 檔案 |
|---|---|
| 容器頁 | `template/set33_RED/pages/MemberCenter/Referral.vue` |
| Setting 表 + 編輯彈窗(較完整) | `template/set33_RED/pages/MemberCenter/components/Referral/SettingTable.vue` |
| Details 表 | `template/set33_RED/pages/MemberCenter/components/Referral/DetailsTable.vue` |
| SubDetails 表 | `template/set33_RED/pages/MemberCenter/components/Referral/SubDetailsTable.vue` |
