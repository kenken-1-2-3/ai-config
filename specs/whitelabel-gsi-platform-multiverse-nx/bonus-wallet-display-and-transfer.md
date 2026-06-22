# R017 贈金錢包顯示與轉出 Spec

> **角色**：把舊 Multiverse `set_r017` 的贈金錢包顯示、轉出條件、遊戲幣別/錢包選擇邏輯，遷移到 `whitelabel-gsi-platform-multiverse-nx` 的 R017 tenant。
>
> **視覺來源**：Figma `R017_優化中`
>
> **行為來源**：舊專案 `Whitelabel_GSI_Platform_Multiverse`

---

## 1. 重要名詞與 wallet type

本功能最容易混淆的是「Bonus」字樣。實作時必須以 enum 為準：

| 顯示概念 | NX enum | number | 說明 |
|---|---:|---:|---|
| 現金錢包 | `WALLET_TYPE_ENUMS.CASH` | `1` | cash / normal wallet |
| 撲滿錢包 | `WALLET_TYPE_ENUMS.BONUS` | `2` | vault wallet，不是本 spec 的「贈金錢包」 |
| 贈金錢包 | `WALLET_TYPE_ENUMS.REWARD` | `3` | gift / reward wallet，本 spec 的主角 |

既有 enum 在 `libs/shared/ui-layer/src/lib/constants/enums/walletType.ts` 已正確定義；不要改 enum 值。

Figma 卡片文字有出現 `Bouns`，判定為設計稿 typo。實作一律使用 i18n wallet type label，不硬寫 `Bouns`。

---

## 2. 參考資料

### 2.1 Figma 節點

PC：
- 主畫布：`8822:44818`
- Header 錢包 dropdown：`14807:127486`
- 轉出贈金錢包彈窗：`14807:23329`
- 大廳點擊遊戲後的錢包選擇彈窗：`14895:14279`

H5：
- 會員頁/主畫面參考：`12113:29274`
- Header 錢包 dropdown：`14900:9712`
- 轉出贈金錢包彈窗：`14895:30118`
- 大廳點擊遊戲後的錢包選擇彈窗：`14895:30578`

### 2.2 舊專案行為來源

舊 repo：`/Users/kenyu/wow/Whitelabel_GSI_Platform_Multiverse`

- Header 錢包 dropdown：`template/set_r017/components/Header/components/WalletDropdown.vue`
- 轉出彈窗：`template/set_r017/components/Dialog/BonusTransferDetail.vue`
- 轉出規則解析：`src/common/utils/bonusWalletTransferRule.ts`
- wallet 資料整理：`src/common/composables/useUserInfo.ts`
- API：`src/api/userInfo.ts`
- request/response types：`src/api/request.type.ts`、`src/api/response.type.ts`
- wallet enum：`src/common/utils/constants/walletType.ts`

### 2.3 NX 既有基礎

- wallet enum：`libs/shared/ui-layer/src/lib/constants/enums/walletType.ts`
- wallet list API：`libs/shared/ui-layer/src/lib/api/apiFunctions/userInfo_getUserWalletList.ts`
- set active wallet API：`libs/shared/ui-layer/src/lib/api/apiFunctions/userInfo_setUserActiveWallet.ts`
- currency composable：`libs/shared/ui-layer/src/lib/composables/useCurrencyInfo.ts`
- game launch：`libs/shared/ui-layer/src/lib/composables/useOpenGame.ts`
- generic alert dialog：`libs/shared/ui-layer/src/lib/components/dialogs/AlertDialog.vue`
- setting API：`libs/shared/ui-layer/src/lib/api/apiFunctions/setting_getSetting.ts`

---

## 3. 範圍

**做**：

1. R017 header 錢包 dropdown 顯示現金/贈金/撲滿錢包，PC/H5 對齊 Figma。
2. 贈金錢包卡片提供「轉出」入口，只對 `WALLET_TYPE_ENUMS.REWARD` 顯示。
3. 新增/遷移「轉出贈金錢包」彈窗，包含餘額、最高可轉出、任務進度、條件清單、任務說明、轉出 API 行為。
4. 遊戲 launch 回傳幣別不支援時，彈出 Figma 的幣別/錢包選擇彈窗，支援選擇 currency + wallet type 後再次 launch。
5. 補齊 NX shared API types/functions/hooks：bonus transfer status、bonus transfer submit、setting `bonus_wallet_transfer_rule` 欄位、game launch `wallet_type` 欄位。
6. 抽出可共用的 wallet grouping / card view-model，避免 header dropdown 與 game popup 各自重做排序與 label。

**不做**：

- 不重做存款、提款、優惠、歷史紀錄頁。
- 不移除舊的 `/v1/player/wallet/transfer/bonus` wrapper；它是舊撲滿/舊轉出流程，保留相容。
- 不改 wallet enum 值或後端資料結構。
- 不主動新增/猜測翻譯文案；缺 key 時列出並請產品/i18n 補齊。
- 不調整與本需求無關的 header、遊戲列表、會員中心樣式。

---

## 4. 檔案建議

實作時可依現有命名微調，但責任邊界要維持：

```txt
libs/shared/ui-layer/src/lib/
├── api/
│   ├── apiFunctions/
│   │   ├── userInfo_getBonusTransferStatus.ts       // new
│   │   └── userInfo_postBonusTransfer.ts            // new
│   ├── commonTypes/
│   │   └── bonusWalletTypes.ts                      // new
│   └── endpointPaths/index.ts                       // add platform endpoints
├── composables/
│   ├── useWalletGroups.ts                           // new, shared wallet view-model
│   ├── useBonusTransferDialog.ts                    // new
│   └── useOpenGame.ts                               // update currency-not-support flow
├── components/
│   ├── wallet/
│   │   ├── WalletDropdownPanel.vue                  // new or app-local if only R017
│   │   └── WalletOptionCard.vue                     // new shared visual card
│   └── dialogs/
│       ├── BonusTransferDialog.vue                  // new
│       └── GameWalletSelectDialog.vue               // new or extend AlertDialog carefully
└── utils/
    └── bonusWalletTransferRule.ts                   // new

apps/r017/src/
├── layouts/default.vue                              // mount dialogs if global
└── components/header/...                            // wire dropdown into R017 header
```

Prefer app-local components if the current R017 header is app-local. Put API, pure utils, and composables in shared lib.

---

## 5. API 與型別

### 5.1 Endpoint paths

Add under `ENDPOINT_PATHS.USER_INFO`:

```ts
BONUS_TRANSFER_STATUS: "/platform/v1/player/wallet/bonus-transfer/status",
BONUS_TRANSFER: "/platform/v1/player/wallet/bonus-transfer",
```

Keep existing:

```ts
TRANSFER_BONUS_WALLET: "/v1/player/wallet/transfer/bonus"
```

Do not reuse the legacy endpoint for the new R017 transfer dialog.

### 5.2 Bonus transfer request/response types

Mirror old project types:

```ts
export type BonusWalletTransferEligibilityMode = "turnover" | "balance"

export interface GetBonusTransferStatusParams {
  currency_id: number
}

export interface PostBonusTransferParams {
  currency_id: number
  amount: number
}

export interface BonusWalletTransferRule {
  enabled: boolean
  eligibility_mode: BonusWalletTransferEligibilityMode
  first_deposit_required: boolean
  history_deposit_thresholds: unknown[]
  min_vip_level: number
  kyc_required: boolean
  active_downline?: {
    enabled?: boolean
    [key: string]: unknown
  }
  blocked_label_ids?: number[]
  remaining_balance_thresholds?: unknown[]
  single_transfer_limits?: unknown[]
}

export type BonusWalletTransferRuleSetting = BonusWalletTransferRule | string | null

export type BonusTransferConditionCode =
  | "active_downline"
  | "blocked_label"
  | "first_deposit"
  | "history_deposit"
  | "kyc"
  | "turnover_or_balance"
  | "vip"

export interface BonusTransferCondition {
  code: BonusTransferConditionCode | string
  enabled: boolean
  passed: boolean
  current?: Record<string, unknown>
  required?: Record<string, unknown>
}

export interface BonusTransferStatus {
  blocked_reason: string
  cash_wallet_balance: number | string
  conditions: BonusTransferCondition[]
  currency_id: number
  eligible: boolean
  enabled: boolean
  max_transfer_amount: number | string
  reward_wallet_balance: number | string
}
```

### 5.3 Setting type

Add to `ISetting`:

```ts
bonus_wallet_transfer_rule?: BonusWalletTransferRuleSetting
```

### 5.4 API functions

```ts
export const getBonusTransferStatus = (params: GetBonusTransferStatusParams) =>
  requestFn<GetBonusTransferStatusParams, BonusTransferStatus>(
    ENDPOINT_PATHS.USER_INFO.BONUS_TRANSFER_STATUS,
    params,
    { name: "getBonusTransferStatus", method: "get" }
  )

export const postBonusTransfer = (params: PostBonusTransferParams) =>
  requestFn<PostBonusTransferParams, null>(
    ENDPOINT_PATHS.USER_INFO.BONUS_TRANSFER,
    params,
    { name: "postBonusTransfer", method: "post" }
  )
```

Transfer submit needs the full `ApiResponse` because old error handling branches on `status`, `code`, and `eligible` after refresh.

### 5.5 Game launch request

Current NX `LaunchGameRequest` only has `currency`. Extend it:

```ts
wallet_type?: WALLET_TYPE_ENUMS
```

Update `buildLaunchGamePayload` and `openGame(...)` so callers can pass `walletType`. Existing callers can omit it and continue to use current behavior.

---

## 6. Wallet grouping rules

Create a shared view-model helper/composable for wallet cards. Inputs:

- `UserWalletItem[]`
- active wallet from `wallet.in_use`
- i18n `t`

Ordering:

```ts
const WALLET_CARD_ORDER = [
  WALLET_TYPE_ENUMS.CASH,
  WALLET_TYPE_ENUMS.REWARD,
  WALLET_TYPE_ENUMS.BONUS
]
```

Group by `currency_code`. Within a currency group, include wallet cards sorted by `WALLET_CARD_ORDER`.

Each card view-model should include:

```ts
interface WalletCardViewModel {
  id: number
  currencyId: number
  currencyCode: string
  walletType: WALLET_TYPE_ENUMS
  walletTypeLabel: string
  balance: number | string
  balanceLabel: string
  isActive: boolean
  canTransferOut: boolean // true only for WALLET_TYPE_ENUMS.REWARD
}
```

Label source:

- Use `WALLET_TYPE_I18N_KEYS[walletType]` where possible.
- If product wants newer wording, use existing keys such as `common.cash_wallet` / `common.gift_wallet` only after confirming exact multilingual copy.

Active wallet:

- Source of truth is `wallet.in_use`.
- `useCurrencyInfo` currently tracks only `selectedCurrencyCode`; do not rely on it to determine active wallet type.
- When user selects a wallet card, call existing `setUserActiveWallet(wallet.id)`, then refetch wallet list / update store.

---

## 7. Header wallet dropdown

### 7.1 Trigger and current wallet

Show the current active wallet row at top:

- Label: `目前使用中` via existing i18n key if available.
- Wallet type label.
- Currency code pill.
- Balance.

If there is no `in_use` wallet, fall back to the first wallet from wallet list, matching current `useCurrencyInfo` fallback.

### 7.2 Dropdown layout

Match Figma:

- Width: `320px`.
- Radius: `8px`.
- Background: dark dialog background (`#000025` equivalent token if available).
- Shadow/glow: purple dialog shadow.
- Max height should not exceed viewport; body scrolls if content is taller.
- H5 uses the same 320px panel centered below the mobile header.

For each currency group:

- Currency code heading, e.g. `PHP`.
- Render wallet cards for Cash / Reward / Vault if the wallet exists.
- Active card uses the orange/red gradient from Figma.
- Inactive cards use dark card background.
- Only `WALLET_TYPE_ENUMS.REWARD` card shows the small `轉出` button.

### 7.3 Actions

Card click:

1. Close dropdown.
2. Call `setUserActiveWallet(card.id)`.
3. Refetch wallet list and update active wallet.

Reward card `轉出` click:

1. Stop card selection event.
2. Close dropdown.
3. Open `BonusTransferDialog` with `currencyId = card.currencyId`.

Top-right `一鍵轉回`:

- Old project did not have this direct action in `WalletDropdown.vue`.
- Implementation assumption: clicking it opens the same `BonusTransferDialog` for the active currency's reward wallet. It must not directly call `postBonusTransfer` unless product confirms direct one-click transfer behavior.
- If active currency has no reward wallet, hide or disable the button.

---

## 8. BonusTransferDialog

### 8.1 Open flow

Inputs:

```ts
interface BonusTransferDialogPayload {
  currencyId?: number
}
```

When opened:

1. Resolve target `currencyId` from payload, otherwise active wallet currency id.
2. Fetch `getBonusTransferStatus({ currency_id })`.
3. Fetch setting via existing `useSetting()` / `getSetting()`.
4. Parse `setting.bonus_wallet_transfer_rule` using shared `parseBonusWalletTransferRule`.
5. Render loading state until data is ready.

### 8.2 Rule parser

Port old behavior:

- `null` / `undefined` => `null`
- object => return as rule
- string => `JSON.parse`
- invalid string or non-object result => throw/log and treat as no configured conditions

### 8.3 Summary section

Render two summary cards:

1. `贈金錢包餘額` -> `status.reward_wallet_balance`
2. `最高可轉出額度` -> `status.max_transfer_amount`

Use target currency code from wallet list. Desktop is two columns with divider; H5 stacks vertically.

### 8.4 Transfer amount

```ts
transferAmount = min(
  numeric(status.reward_wallet_balance),
  numeric(status.max_transfer_amount)
)
```

Transfer button enabled only when:

```ts
status.enabled && status.eligible && transferAmount > 0 && !isTransferring
```

Button text should follow Figma/current i18n after confirmation. Old code used `cash.transferAllToCashWallet`; Figma shows `全部轉進現金錢包`.

### 8.5 Condition list source

Build the visible condition order from parsed rule:

1. `turnover_or_balance` if rule exists and `rule.enabled`
2. `first_deposit` if `rule.first_deposit_required`
3. `history_deposit` if `rule.history_deposit_thresholds.length > 0`
4. `vip` if `rule.min_vip_level > 0`
5. `kyc` if `rule.kyc_required`
6. `active_downline` if `rule.active_downline.enabled`

For each configured code, find matching `status.conditions` where:

```ts
condition.enabled === true && condition.code === configuredCode
```

Do not render disabled backend conditions.

### 8.6 Condition labels and routes

Port old mappings:

| Condition | Label | CTA route |
|---|---|---|
| `turnover_or_balance` + turnover mode | `cash.remainingTurnover` | Home |
| `turnover_or_balance` + balance mode | `cash.balanceThreshold` | Home |
| `first_deposit` | `cash.first_deposit` | MemberDeposit |
| `history_deposit` | `cash.totalDeposits` | MemberDeposit |
| `vip` | `menu.vip` | MemberVip |
| `kyc` | `menu.getVerify` | memberProfile |
| `active_downline` | `cash.referralCount` | ReferralRebate |

CTA button text is the old `cash.goTo` / Figma `前往` equivalent. Use existing key if available.

### 8.7 Condition metric extraction

Port old calculations:

`turnover_or_balance`:
- If `current.comparison_mode === "balance"`:
  - current value = `current.balance`
  - required value = `current.remaining_threshold || required.balance_gte_remaining_threshold`
  - remaining = `required - current`
- Otherwise:
  - current value = `current.turnover`
  - required value = `current.audit_turnover`
  - remaining = `current.remaining_threshold || required - current`

`first_deposit`:
- current value = `1` if passed or `current.first_deposit_at` exists or `current.first_deposit_id > 0`, otherwise `0`
- required value = `1`

`history_deposit`:
- current value = `current.total_deposit`
- required value = `required.minimum_total_deposit`

`vip`:
- current value = `current.member_level`
- required value = `required.min_vip_level`

`kyc`:
- current label = `current.approval_status || "-"`
- required label = `required.approval_status || "verified"`
- numeric progress = passed ? `1` : `0`

`active_downline`:
- Choose `current.counts` record matching `status.currency_id`; if not found, use first record.
- current value = `active_count`
- required value = `required.min_count`

Status text:

- Passed: `cash.achieved`
- Turnover mode: `cash.completingTurnover`
- Balance mode: `cash.completingBalance`
- Other unmet conditions: `cash.completeMoreToAchieve` with remaining value

### 8.8 Transfer submit

On button click:

1. Guard disabled state.
2. Call `postBonusTransfer({ currency_id, amount: transferAmount })`.
3. Always refetch wallet list and status after response.
4. Success: show success toast and keep/refresh dialog state.
5. Failure:
   - If blocked-label condition exists, is enabled, and not passed: show blocked-label specific error.
   - Else if refreshed status is not eligible: show task-not-complete error.
   - Else show generic error with response code.

Old project hardcoded Chinese for success/failure. NX implementation must use i18n keys or request missing keys; do not hardcode new multilingual copy.

### 8.9 Responsive behavior

Desktop:
- Dialog width `600px`.
- Header height `60px`.
- Body scrolls only if viewport is shorter than content.

H5:
- Dialog width roughly `343px` inside `375px` viewport.
- Dialog max height must fit viewport with internal scroll.
- Content in Figma is taller than viewport; do not let page behind scroll instead of dialog body.

---

## 9. Game wallet selection popup

### 9.1 Trigger

Update `useOpenGame.ts` error branch for `P_LAUNCH_GAME_CURRENCY_NOT_SUPPORT`.

Current NX only displays one option per currency and uses hardcoded `metaLabel: "Cash"`. Replace with grouped wallet cards matching Figma.

### 9.2 Dialog copy

Figma popup header appears reused as `轉出贈金錢包`, while current NX code uses `遊玩幣別`.

Implementation assumption:
- Use `遊玩幣別` / existing i18n key for the title unless product explicitly confirms the Figma title should replace it.
- Body copy follows Figma/current code: `此款遊戲僅支援下列幣別投注，請選擇要優先投注的幣別`.
- Buttons: `取消` and `立刻遊玩`.

Do not hardcode these strings in final implementation; use existing i18n keys or request missing keys.

### 9.3 Option data

Backend response currently typed as:

```ts
currencies: string[]
```

Build groups from `response.data.currencies` and current wallet list:

- Include only currency groups present in response.
- Inside each group, render wallet cards available in wallet list for that currency.
- Sort wallet cards by Cash -> Reward -> Vault.
- If product/backend later returns allowed wallet types per currency, filter by that list too.

Selection value must be an object, not a string:

```ts
interface GameWalletSelection {
  currencyCode: string
  currencyId: number
  walletType: WALLET_TYPE_ENUMS
}
```

Default selection:

1. Active wallet if its currency is supported.
2. Otherwise first supported currency's Cash wallet.
3. Otherwise first available wallet in first supported currency group.

### 9.4 Confirm behavior

On confirm:

```ts
await openGame(
  integrationId,
  productCode,
  gameCode,
  typeId,
  pup,
  lang,
  selected.currencyCode,
  selected.walletType
)
```

`buildLaunchGamePayload` must send:

```ts
currency: selected.currencyCode,
wallet_type: selected.walletType
```

If launch succeeds, open target as current code does. If it fails again, reuse existing error handling.

### 9.5 Dialog implementation choice

Do not force this into current `AlertDialog.vue` if it makes the generic API awkward. Preferred:

- Create a dedicated `GameWalletSelectDialog.vue` and composable/store for structured wallet options.
- Keep `AlertDialog.vue` for simple string options.

If extending `AlertDialog.vue`, preserve existing simple option behavior for all current callers.

---

## 10. i18n rules

Follow repo rule: reuse old keys and do not invent translations.

Known old keys used by transfer dialog:

- `cash.transferOutBonusWallet`
- `cash.bonusWalletBalance`
- `cash.maxTransferableAmount`
- `cash.completeTasksToTransfer`
- `cash.overallProgress`
- `cash.transferAllToCashWallet`
- `cash.remainingTurnover`
- `cash.balanceThreshold`
- `cash.first_deposit`
- `cash.totalDeposits`
- `cash.referralCount`
- `cash.achieved`
- `cash.completingTurnover`
- `cash.completingBalance`
- `cash.completeMoreToAchieve`
- `cash.taskDescription`
- `cash.transferAmountLimit`
- `cash.transferSuccessDescription`
- `cash.bonusBalanceReset`
- `menu.vip`
- `menu.getVerify`

Known wallet labels:

- `walletType.normal`
- `walletType.vault`
- `walletType.bonus`
- `common.cash_wallet`
- `common.gift_wallet`

Implementation must first check existing locale/i18n source. If any required copy is missing, stop and ask for exact multilingual wording instead of guessing.

---

## 11. Verification

Use focused validation for touched surface. Do not run `tsc --noEmit`.

Suggested checks:

1. `pnpm nx lint r017` or the closest existing lint target for R017/shared changes.
2. Build or dev smoke for R017 if lint/build target exists.
3. Browser smoke:
   - PC header wallet dropdown.
   - H5 header wallet dropdown.
   - Open transfer dialog from reward wallet card.
   - Transfer dialog scroll behavior on H5.
   - Game currency-not-support dialog and confirm relaunch payload.
4. Visual compare against Figma nodes listed in §2.1.

Tests:

- Add temporary/focused tests for pure helpers if useful:
  - wallet grouping and ordering
  - transfer rule parser
  - condition metric extraction
  - game wallet default selection
- Per project rule, do not include test files in commits unless the user explicitly changes that instruction.

---

## 12. Acceptance Criteria

- [ ] `WALLET_TYPE_ENUMS.REWARD = 3` is treated as 贈金錢包 everywhere; `BONUS = 2` remains 撲滿錢包.
- [ ] Header dropdown PC matches Figma `14807:127486` in width, grouping, active card treatment, and reward transfer button placement.
- [ ] Header dropdown H5 matches Figma `14900:9712` and stays within mobile viewport with scroll when needed.
- [ ] Wallet cards are grouped by currency and sorted Cash -> Reward -> Vault.
- [ ] Active wallet is determined by `in_use`, not only selected currency.
- [ ] Selecting a wallet card calls `setUserActiveWallet(wallet.id)` and refreshes wallet state.
- [ ] `轉出` appears only for reward wallet cards and opens the transfer dialog with the card currency.
- [ ] `一鍵轉回` behavior follows the assumption in §7.3 or is updated after product confirmation.
- [ ] New platform endpoints `/platform/v1/player/wallet/bonus-transfer/status` and `/platform/v1/player/wallet/bonus-transfer` are added and used by the transfer dialog.
- [ ] `ISetting` includes `bonus_wallet_transfer_rule`, and parser supports object/string/null.
- [ ] Transfer dialog PC matches Figma `14807:23329` layout and content hierarchy.
- [ ] Transfer dialog H5 matches Figma `14895:30118`, with internal scroll and no background page scroll leakage.
- [ ] Transfer amount is `min(reward_wallet_balance, max_transfer_amount)`.
- [ ] Transfer button is enabled only when status is enabled, eligible, transfer amount > 0, and not submitting.
- [ ] Condition list is derived from parsed rule, filtered against enabled backend conditions, and ordered per §8.5.
- [ ] Condition labels, metric extraction, progress, status text, and routes follow old project behavior.
- [ ] Submit success/failure refreshes wallet list and status before showing final feedback.
- [ ] Game launch `P_LAUNCH_GAME_CURRENCY_NOT_SUPPORT` opens the Figma wallet selection dialog instead of the old simple `AlertDialog` options.
- [ ] Game wallet selection groups options by supported currency and wallet type, sorted Cash -> Reward -> Vault.
- [ ] Game launch retry sends both `currency` and `wallet_type`.
- [ ] Existing simple `AlertDialog` callers continue to work if it is extended.
- [ ] No new hardcoded multilingual user-facing copy is introduced; missing copy is confirmed before implementation.
- [ ] Focused validation passes, and implementation diff does not include temporary test files unless explicitly approved.

---

## 13. Product confirmations needed before implementation

1. Figma game popup title currently looks reused as `轉出贈金錢包`; confirm whether actual title should remain `遊玩幣別`.
2. Confirm `一鍵轉回` should open the transfer dialog, or should directly transfer all available reward balance.
3. Confirm final wording for `全部轉進現金錢包` vs old key `cash.transferAllToCashWallet`.
4. Confirm whether game launch backend already accepts `wallet_type`; if not, backend contract must be updated before the game popup can launch non-cash wallets.
