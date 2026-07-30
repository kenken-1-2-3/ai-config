# Spec: NS-257 會員端進入提現頁觸發錢包稽核自動歸零

> 交接合約：本 spec 是 `Whitelabel_GSI_Platform_Multiverse` 後續實作與 review 的單一依據。需求、backend contract 或全版型範圍若有變更，必須先更新本 spec，再繼續實作。
>
> 狀態：**需求已確認／修正完成，待合併 develop 與 DEV 驗證**。

## 背景 / 目標

- 來源需求：[Notion — `[需求 代理端]新增錢包稽核歸零邏輯`](https://app.notion.com/p/wowgaming/37dfc5d788a9800e86eed341c42988ae)。
- 關聯 Jira：[NS-257](https://gamingsoft.atlassian.net/browse/NS-257)。
- 關聯代理端 spec：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/ns-257-wallet-audit-auto-reset.md`。
- API 文件：[Apifox project 4860774](https://app.apifox.com/project/4860774)，搜尋 `audit-turnover-reset`。
- 問題背景：玩家可能已消耗完可用餘額，但錢包仍保留舊的流水／稽核。Backend 已提供會員端查詢 API，在會員進入提現頁時重新檢查所有啟用中的錢包；符合條件時由 backend 原子地將 `turnover` 與 `audit_turnover` 同時歸零，再回傳最新結果。
- 本會員端 feature 的目標：
  1. 每次會員進入提現頁／開啟提現表單時，先呼叫會員端稽核歸零 API。
  2. 使用 API 回傳的最新 wallet 結果更新提現畫面顯示的餘額與剩餘稽核。
  3. 讓所有具提現功能的 templates 共用相同行為，不遺漏頁面型、路由彈窗型或 template 家族。

## Backend API contract

- Endpoint：`GET /platform/v1/player/wallet/audit-turnover-reset`
- Auth：既有會員 `AuthJwt`；不新增 permission code、不使用 `needToken: false`、不新增特殊 header。
- Request：
  - 無 path params。
  - 無 query params。
  - 無 request body；wrapper request generic 使用 `null`。
- Response data：

```ts
interface WalletAuditResetResult {
  currency_id: number
  wallet_type: WALLET_TYPE.Enums
  reset: boolean
  skip_reason: string
  balance: string
  turnover: string
  audit_turnover: string
}

interface WalletAuditResetResponse {
  wallets: WalletAuditResetResult[]
}
```

- Backend 行為：
  - 對會員所有啟用中的 wallets 做 best-effort 檢查與歸零。
  - 單一 wallet 不符合條件或檢查失敗，不阻擋其他 wallets 與整體 response。
  - `reset=false`／`skip_reason` 是正常檢查結果，不等同 HTTP request failure。
  - Backend 負責五項資格條件、再次確認、transaction／lock、provider wallet 查詢、雙向歸零與 audit log；前端不得重做判斷。
- Consumer 不需要完整 response envelope；使用既有 `requestApi`／`useApi` 的 unwrapped data 即可，不使用 `requestApiFullResponse`。

## 範圍

### A. 新增會員端 API wrapper 與 central response types

- 在 `src/api/userInfo.ts` 新增 wallet-domain wrapper；建議命名：
  - `getWalletAuditTurnoverReset`
- Wrapper：

```ts
requestApi<null, Response.WalletAuditResetResponse>(
  "/platform/v1/player/wallet/audit-turnover-reset",
  null,
  {
    name: "getWalletAuditTurnoverReset",
    method: "get",
  },
)
```

- 在 `src/api/response.type.ts` 新增 additive contracts：
  - `WalletAuditResetResult`
  - `WalletAuditResetResponse`
- 不修改既有 `Response.UserWallet` 欄位名稱；reset API response 沒有 `remaining_turnover`，不得將其 raw wallets 直接合併進既有 UI/store。
- 無 request payload，不在 `src/api/request.type.ts` 建立空 interface。

### B. 共用會員錢包結果同步

- 在 `src/common/composables/useUserInfo.ts` 提供單一用途的方法，建議命名：
  - `refreshWalletAuditTurnoverReset`
- 方法行為：
  1. 呼叫 `userInfoApi.getWalletAuditTurnoverReset`。
  2. Reset request success 時，立即呼叫既有 `refreshUserWalletList()`，重新查詢 `GET /v1/player/center/wallets`。
  3. 由 wallet list response 透過既有 setter 完整更新 `userWalletList`；提現畫面使用其中的 `balance` 與 `remaining_turnover`。
  4. Reset response 的 `balance`、`turnover`、`audit_turnover` 僅代表本次檢查結果，不直接合併進 `Response.UserWallet`，也不在前端自行計算 `remaining_turnover`。
  5. Reset HTTP request failure 時不呼叫額外 wallet refresh，保留原有 wallet state，回傳 failure／`null` 供 caller 判斷，但不自行顯示需求外文案。
  6. Reset success、後續 wallet refresh failure 時，沿用 `refreshUserWalletList()` 的既有失敗處理並保留原有 wallet state；提現流程仍繼續初始化。
- 將方法從 `useUserInfo()` return object 暴露給共用提現流程使用；不要新增全域 event、route guard 或 template-specific adapter。

### C. 全版型提現進入流程

- 在 `src/common/composables/useBank.ts` 的 `getWithdralPaymentList()` 共用初始化流程中：
  1. 先 `await refreshWalletAuditTurnoverReset()`。
  2. 再呼叫既有 `bankApi.withdrawPaymentList`。
  3. 後續 `handleWithdralCurrencyClick()` 必須讀到同步後的 `userWalletList`，將最新 `balance` 與 `remaining_turnover` 帶入 `withdrawState.form`。
- 稽核 API HTTP failure 不得阻止既有出款支付資訊、銀行卡、gateway 或 payment type 載入；提現頁仍須可使用既有 wallet state 繼續初始化。
- 不在 25 個 template callers 逐一複製 API call。需求明確為全版型，且 repo 盤點證明所有具提現功能的 callers 都會在表單 mount 時呼叫共用 `getWithdralPaymentList()`；shared fix 是本需求的預期跨站行為。
- 每次進入／開啟行為：
  - 一般 route page：component 每次進入後 mount，呼叫一次。
  - 以 `v-if` 建立的提現 modal/form：每次切到／開啟提現表單後 mount，呼叫一次。
  - 同一次 mount 不得因新增 watcher 或 reactive update 重複呼叫。

## 受影響範圍

- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 預期直接修改：
  - `src/api/userInfo.ts`
  - `src/api/response.type.ts`
  - `src/common/composables/useUserInfo.ts`
  - `src/common/composables/useBank.ts`
- 預期不修改：
  - `src/api/request.type.ts`
  - `src/router/**`
  - `template/**` 的個別提現頁／表單
  - local locale JSON
  - `src/env/environment.json`
- 已盤點的 25 個直接提現 callers 所屬 templates：
  - `bmm_set_obtd`
  - `okbet`
  - `okbet_blackGold`
  - `okbet_green`
  - `okbet_red`
  - `okbet_redBlack`
  - `set33_GREEN`
  - `set33_RED`
  - `set_DBO88`
  - `set_ed3`
  - `set_ed8888`
  - `set_jokerhill`
  - `set_r016`
  - `set_r017`
  - `set_r022`
  - `set_r023`
  - `set_r024`
  - `set_r025`
  - `set_r027`
  - `set_r029`
  - `set_r030`
  - `set_r031`
  - `set_r032`
  - `set_r033`
  - `set_royalslot88`
- 特殊範圍：
  - `set_r022_mga` 直接重用 `set_r022` 的頁面／提現表單，因此由 shared fix 與 `set_r022` 實作共同覆蓋，不另做 duplicate patch。
  - `set_amuse` 目前沒有提現 route／提現表單，不新增不存在的功能。
  - `cordova_app` 是 shell，不是獨立提現 UI template。
- 跨站影響：需求方明確要求「全版型更新」，因此修改 shared composables 並影響所有提現 templates 是預期行為，不需 siteKey hardcode 或 feature flag。

## 參考實作 / 要遵循的現有 pattern

- 既有會員 wallet wrapper：`src/api/userInfo.ts` 的 `getUserWalletList()`。
- 既有 wallet contracts：`src/api/response.type.ts` 的 `UserWallet`／`UserWalletList`。
- 既有 wallet fetch、store setter 與 active-wallet 保護：
  - `src/common/composables/useUserInfo.ts` 的 `refreshUserWalletList()`。
  - `src/common/composables/useUserInfo.ts` 的 `getUserWalletList()`。
  - `src/stores/userInfoStore.ts` 的 `setStoreUserWalletList()`。
- 全版型共同入口：
  - `src/common/composables/useBank.ts` 的 `getWithdralPaymentList()`。
  - `src/common/composables/useBank.ts` 的 `handleWithdralCurrencyClick()`。
- Template 盤點指令：

```bash
rg -l 'getWithdralPaymentList\(\)' template --glob '*.vue'
```

- 代表性 caller：
  - route page：`template/okbet/pages/MemberCenter/MemberWithdrawal.vue`
  - member page：`template/set_r017/pages/Member/MemberWithdraw.vue`
  - dialog form：`template/set_r022/components/Dialog/DepositWithWithdrawal/WithdrawalForm.vue`
  - modal form：`template/set_ed3/components/Modal/DepositWithWithdrawal/WithdrawalForm.vue`
  - combined order modal：`template/set_royalslot88/components/modal/DepositWithdrawalOrder/Withdrawal.vue`

## 關鍵決策與理由 (Key decisions)

- 使用新 endpoint，不以既有 `GET /v1/player/center/wallets` 代替：backend contract 明確指定會員端稽核歸零觸發 API；一般 wallet list query 不等同觸發歸零。
- API wrapper 放 `src/api/userInfo.ts`：endpoint 屬 player wallet domain，且最接近既有 `getUserWalletList()`；不為單一 endpoint 新增 domain file。
- Reset 成功後重查既有 wallet endpoint：`GET /v1/player/center/wallets` 才提供完整 `Response.UserWallet` shape 與 authoritative `remaining_turnover`；reset endpoint 僅負責觸發檢查／歸零。
- 不從 reset response 合併 wallet：其 response 沒有 `currency_code`、`remaining_turnover`、`in_use`、`withdrawable_balance` 等既有欄位，直接合併會把 `remaining_turnover` 寫成 `undefined`。
- 不在前端計算 `audit_turnover - turnover`：剩餘流水直接採用 wallet API 的 `remaining_turnover`，避免重複 backend domain logic 與財務小數運算。
- 共用修正而非逐 template patch：需求本身是全版型，且所有提現 callers 已經共用 `useBank`；逐一 patch 會增加遺漏與行為漂移風險。
- 稽核 API failure 不阻擋提現初始化：本 feature 是進頁重新檢查，不能因額外檢查服務失敗讓既有提現頁完全不可用；錯誤呈現沿用 global request handling，不新增 Toast／Modal。
- 不在前端判斷五項歸零條件、不直接把數值寫成 `0`：資格、原子歸零與競態處理由 backend authoritative transaction 負責。

## Out of scope

- 代理端網站設定、會員列表「更新稽核狀態」按鈕、permission、operation log UI；這些由 Dashboard spec 負責。
- Backend 五項資格條件、再次確認、transaction／lock、provider balance query、最多等候 5 秒、雙向歸零、audit log 與 race-condition handling。
- 存款成功、提款成功、人工出入款、投注、結算、獎勵、利息寶、轉帳錢包等 backend system-event triggers。
- 稽核歸零後因 Void／派彩補回清除前稽核；Notion 最新決議已移除此判斷。
- 新 route、menu、button、dialog、loading design、成功／失敗結果文案或新 i18n key。
- 個別 template 的 UI、spacing、style、responsive、animation 或其他提現流程重構。
- 修改既有 `getUserWalletList()` endpoint 語意，或讓 app 啟動時的一般 wallet fetch 自動觸發稽核歸零。
- 發版、merge、commit、MR／PR。

## 驗收條件

> Reviewer 必須對照以下 checklist 逐條判斷過／不過。

### API 與 contracts

- [ ] `src/api/userInfo.ts` 新增 `GET /platform/v1/player/wallet/audit-turnover-reset` wrapper，request 為 `null`，使用既有 token，沒有 full-response helper 或額外 header。
- [ ] `src/api/response.type.ts` 的 reset response types 完整包含 `currency_id`、`wallet_type`、`reset`、`skip_reason`、`balance`、`turnover`、`audit_turnover` 與 `{ wallets }` wrapper，且沒有 backend 未回傳的 `remaining_turnover`。
- [ ] 沒有為空 request 新增 request interface，沒有改動既有 `UserWallet` contract。

### Wallet state 同步

- [ ] Reset request success 後重新呼叫既有 `GET /v1/player/center/wallets`，且呼叫順序為 reset → wallets → withdrawal payment list。
- [ ] Store 的 `balance`、`remaining_turnover` 與其他 wallet 欄位完整來自 wallet list response；沒有從 reset response 合併或自行計算。
- [ ] Reset response contract 與 consumer 都沒有讀取 backend 未回傳的 `remaining_turnover`。
- [ ] Reset HTTP request failure 時不額外重查 wallet、不修改原 wallet state，且仍繼續 withdrawal payment list。
- [ ] Reset success、wallet refresh failure 時保留原 wallet state，且仍繼續 withdrawal payment list。

### 全版型進入流程

- [ ] `getWithdralPaymentList()` 每次執行時，稽核歸零 API 一定早於 `withdrawPaymentList` 與 `handleWithdralCurrencyClick()` 使用 wallet state。
- [ ] 同一次提現 form mount 只呼叫一次稽核歸零 API；沒有 watcher、active-wallet callback 或 reactive loop 重複觸發。
- [ ] 稽核 API HTTP failure 後仍會繼續載入 withdrawal payment list、gateway、bank card 與 payment type。
- [ ] 25 個直接 caller templates 均透過 shared flow 生效；`set_r022_mga` 透過 `set_r022` 生效，沒有遺漏或 duplicate patch。
- [ ] `set_amuse` 沒有被新增需求外提現功能；`template/**`、router 與 UI 樣式沒有不必要修改。
- [ ] 任一幣別／wallet type 符合歸零時，提現畫面的 balance 與剩餘稽核顯示 backend 最新值；不符合時亦顯示 backend 回傳的最新值。

### Scope 與回歸

- [ ] 沒有在前端複製 backend 五項資格條件、沒有新增稽核歸零按鈕或結果 Modal。
- [ ] Deposit、wallet switch、header wallet display 與既有一般 `getUserWalletList()` 行為沒有被改成自動觸發稽核歸零。
- [ ] 稽核歸零 endpoint 只由提現初始化流程觸發，沒有加到 app bootstrap、一般 wallet refresh 或其他非提現入口。
- [ ] 沒有修改 local locale JSON、`src/env/environment.json` 或需求外檔案。
- [ ] 最終 diff 僅包含本 spec 允許的必要 production files；temporary test artifacts 未納入 commit。

## 邊界情況 / 例外

- Reset response `wallets=[]`：仍視為 request success 並重新查詢完整 wallet list，再繼續既有提現初始化。
- Reset response 的順序、未知 wallet 或重複 key：consumer 不直接合併 raw wallets，因此不得影響既有 store。
- Wallet list response 的 `balance`、`remaining_turnover` 為 decimal string；沿用既有 setter 原值保存，不得轉成 JavaScript number 後再存回。
- `skip_reason` 可能是空字串或未知字串；本會員端 UI 不顯示它，不建立前端 mapping。
- Endpoint 可能因 provider 查詢耗時；不得在前端自行假定 5 秒即失敗，沿用既有 request timeout／error handling。
- 使用者在 request 尚未完成前離開頁面：不得在已卸載元件新增 template-local state write；shared store 是否接受 response 依既有 request lifecycle pattern，不新增需求外 cancel framework。

## 測試計畫

- Repo 現況沒有一般 feature test script；不得為本 feature引入新的 test framework，也不得執行 `tsc --noEmit`。
- 仍須建立並執行最小 temporary test artifact，完成驗證後移除或 unstage，不納入 production commit。至少覆蓋：
  - API wrapper method、path、request `null` 與 response contract。
  - Reset response contract 不宣告 backend 未回傳的 `remaining_turnover`。
  - API success 時呼叫順序：audit reset → wallet list refresh → withdrawal payment list。
  - Reset response 不直接合併至既有 wallet store，也不在前端計算 `remaining_turnover`。
  - API failure 時仍呼叫 withdrawal payment list，且原 wallet state 不變。
- Focused validation：

```bash
pnpm exec prettier --check <touched-files>
pnpm exec eslint <touched-files>
git --no-pager diff --check -- <touched-files>
```

- ESLint 既有 non-blocking warnings 不在本需求清理；只處理本次新增的 error／warning。
- 不要求逐一 build 25 個 templates；shared path 已由 caller inventory 證明。若需要 build smoke test，使用 repo-pinned Node.js 22，選一個 route-page 代表 template 與一個 modal 代表 template，且不得讀寫 `src/env/environment.json`。
- 手動驗證至少涵蓋：
  1. route-page template：進入提現頁時 Network 只出現一次 audit-reset GET，且早於 withdrawal payment list。
  2. modal template：每次開啟／切到提現 form 時各觸發一次，同一次開啟不重複。
  3. Backend 回 `reset=true`：balance／剩餘稽核顯示歸零後最新值。
  4. Backend 回 `reset=false`：頁面正常載入並顯示回傳最新值，不出現需求外結果 UI。
  5. Audit-reset GET failure：頁面仍完成其餘出款初始化，原 wallet 顯示保留。
- Manual evidence 記錄受影響 template、viewport／platform、Network request 順序與畫面數值；不得記錄 Authorization、token 或會員個資。

## Git Flow

- 基底分支：`main`。
- 工作分支：`feat/ns-257-member-wallet-audit-auto-reset`。
- 實作者開始前：
  1. 確認目前產品 repo 的工作樹，不讀、不 diff、不修改 `src/env/environment.json`。
  2. 依 HTTPS token 規則執行 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` auth probe。
  3. 切到 `main` 並 pull 最新。
  4. 從最新 `main` 建立並切換至 `feat/ns-257-member-wallet-audit-auto-reset`。
- **完成上述工作分支建立／切換前，不得開始修改產品程式碼。**
- 不可直接在 `main`、`develop`、`staging` 或其他共享／功能分支實作。
- 推進路徑：工作分支 → `develop`（DEV 測試）→ `staging`（staging 測試）→ `main`（production）；前一環境測試通過後才能進下一階段。
- Commit 前需取得使用者針對該次提交的明確確認；不得沿用先前確認自行 commit。
- 合併到任何分支前需取得使用者確認；若發生 merge conflict，停止並回報，不自行 resolve 或改變策略。
- 發版是獨立步驟；只有使用者明確要求「發版／release」時才執行 `yarn deploy`／`yarn deploy:all`。

## 交接備註給實作者

- 先取得需求方對本 spec 的確認，再依 Git Flow 建立／切換工作分支；不要在目前的其他 feature branch 上直接實作。
- 實作前重新讀：
  - 本 spec 的 Backend API contract。
  - `~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/ns-257-wallet-audit-auto-reset.md` 中會員端 endpoint 的已確認 contract。
  - 本 spec 列出的 `userInfo.ts`、`useUserInfo.ts`、`useBank.ts` reference code。
- 若實際 DEV response 欄位與本 spec 不同，先記錄 redacted raw response、更新本 spec 並請需求方確認，再調整 production code；不得在 code 裡私下猜測欄位。
- 完成後由另一 context 對照本 spec 驗收條件逐條 review；若需求中途變更，先更新 spec 再繼續。
