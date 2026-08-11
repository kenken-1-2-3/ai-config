# GSI-409 BCY1 BETBY callback 與 Desktop option 調整

> 交接合約：Spec 作者產出，指定實作者依此實作，reviewer 對照「驗收條件」逐條 review。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-409-bcy1-betby-callback-options.md`（版控於 ai-config）。
> 本 spec 只涵蓋 GSI-409；實作者不得依對話記憶擴張需求。
> 狀態：規格可供使用者確認；實作前仍需確認允許擴充兩個 shared BETBY API surface。

## 背景 / 目標

- 需求來源：[Jira GSI-409](https://gamingsoft.atlassian.net/browse/GSI-409)。
- Jira 標題：`[需求 會員端]BYC1 首頁產品BETBY 1244 頁面調整-7/28`。
- Jira 狀態：待處理；Priority：Medium；建立日：2026-07-28。
- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 環境：測試、正式。
- Jira 總代／代理文字為 `BYCM` / `BYC1`；實際 repo 與既有 GSI-257 實作使用 runtime agent `BCY1`，並由 `useAgentCode().isBCYM` 判斷。本需求沿用 `isBCYM`，不新增拼字 alias。
- 目標站點：[BCY1](https://bcy1.gsiwl.com/)。
- 產品：BETBY，`product_code = 1244`。
- BETBY 廠商要求：
  1. 投注單點擊 Login 時觸發 `onLogin`，開啟會員端登入介面。
  2. 投注單點擊 Join Now 時觸發 `onRegister`，開啟會員端註冊介面。
  3. Desktop 的 `betSlipOffsetBottom` 設為 number `0`，因 Desktop 沒有底部清單。
  4. `betslipZIndex` 至少為 number `100`。
- 實頁補充（2026-07-31）：
  - 一般登入後 BETBY 會更新為會員狀態。
  - 從註冊流程自動登入時，新會員的 gifts、favorites、wallet 依序載入可能超過現有 5 秒等待時間。
  - 現有 timeout 會停止 `activeWalletCurrencyCode` watcher，並在幣別仍為空時 relaunch；`resolveCurrency()` 因此拋出 `No currency available`，後續 wallet 到達時也不再觸發 relaunch，BETBY 會停留在 guest 狀態。
  - 已登入會員選用 USDT 後重整頁面時，auth 可能早於 wallet hydration 恢復；現有 `onMounted()` 會在 `activeWalletCurrencyCode` 仍為空時直接初始化，誤顯示「請選擇幣別」toast 並拋出 `No currency available`。
- Jira 明確驗收補充：
  - PC Login 必須正常開啟登入 Dialog；目前 Jira 記錄為 PC 點擊時報錯。
  - PC/H5 Join Now 都必須正常開啟註冊 Dialog。
  - H5 Login 現況已可正常開啟登入 Dialog，這次必須保留。
- Jira 附件：`image-20260728-062622.png`，文字標示「問題1，PC報錯」。若實作後仍報錯，需取得實際 console stack／Ray 提供的影片再更新 spec，不得以吞錯方式結案。

## Main 現況與本需求差異

> 研究基準：2026-07-31，最新 `origin/main` commit `a612409960e0ed3b46340fb74d2fdd8572e5fd19`。

### 已存在，可直接沿用

- GSI-257 已把 BCY1 H5 的 Login callback 接到 R031 `openLogin(true)`。
- GSI-257 已讓 BCY1 H5 傳入 `betslipZIndex = 100`。
- GSI-257 已完成 H5 sidebar 隱藏投注單及 BETBY host overflow/layout 修正。
- `src/common/hooks/useBetByGame.ts` 已使用 getter 形式取得 `betslipZIndex` 與 `onLogin`，避免 component setup 時快照舊 props。
- `template/set_r031/components/Dialog/LoginRegister.vue` 已監聽：
  - `openLogin(show, isPasswordLogin?)`
  - `openRegister(show)`，並在表單 ready 後切換至註冊模式。
- typed EventBus 已定義 `openLogin` 與 `openRegister`，不需新增 event。

### 尚未符合 GSI-409

- `template/set_r031/pages/BetByPage/Index.vue` 目前只在 `isBCYM && isMobile` 時提供 Login callback 與 z-index，因此 Desktop 仍未 opt in。
- Shared `BetByArea` props 與 `useBetByGame` options 尚未提供 `onRegister`。
- `BTRenderer.initialize()` 的 `onRegister` 目前是空函式。
- `betSlipOffsetBottom` 目前在 shared hook 寫死為 `64`，沒有 caller override。
- `betslipZIndex` 在 BCY1 Desktop 仍落到 shared default `1`，不符合廠商至少 `100` 的要求。

## 範圍

### 1. 擴充 shared `useBetByGame` options

修改 `src/common/hooks/useBetByGame.ts`：

- 在 `UseBetByGameOptions` 新增 optional getter：
  - `betSlipOffsetBottom?: () => number | undefined`
  - `onRegister?: () => (() => void) | undefined`
- Getter 形式需與現有 `betslipZIndex` / `onLogin` 一致，不可在 `useBetByGame()` setup 時把值或 callback 快照到 local constant。
- `BTRenderer.initialize()` 設定：
  - `betSlipOffsetBottom: options?.betSlipOffsetBottom?.() ?? 64`
  - `betslipZIndex` 保留現有 `options?.betslipZIndex?.() ?? 1`
  - `onLogin` 保留現有 custom handler／please-login notification fallback。
  - `onRegister` 每次由 SDK callback 觸發時，才取得 `options?.onRegister?.()` 的當下 handler；有 handler 才執行，未提供時維持目前 no-op。
- Initialize 與任何既有 relaunch/reinitialize 都必須走同一個 `setupBTRenderer()`，並在當次 setup 讀取最新 getter 值。
- 不新增 BCY1、R031 或 EventBus import 到 shared hook；shared hook 只提供通用 optional plumbing。

### 2. 擴充 shared `BetByArea` props

修改 `src/common/components/BetByArea/Index.vue`：

- 新增 optional props：
  - `betSlipOffsetBottom?: number`
  - `onRegister?: () => void`
- 傳給 `useBetByGame()` 時仍使用 live getter：
  - `betSlipOffsetBottom: () => props.betSlipOffsetBottom`
  - `onRegister: () => props.onRegister`
- 保留既有 `betslipZIndex`、`onLogin`、`hideBetslip` props、watchers、renderer lifecycle、wallet/language/login relaunch 行為。
- 不在 shared component 內判斷 agent、template 或 viewport；站點與平台決策留在 R031 caller。

### 3. 在 R031 BetByPage 對 BCY1 opt in

修改 `template/set_r031/pages/BetByPage/Index.vue`：

- 保留現有 `useAgentCode().isBCYM`、`useMediaQuery().isMobile`、global sidebar state 與 GSI-257 hide-betslip 行為。
- 將站點與平台條件拆清楚：
  - `isBcym`：`isBCYM.value`，PC/H5 共用。
  - `isBcymH5`：`isBCYM.value && isMobile.value`，只供既有 sidebar hide 行為使用。
  - `isBcymDesktop`：`isBCYM.value && !isMobile.value`，只供 Desktop bottom offset 使用。
- 只在 `isBcym` 時：
  - 傳 `betslipZIndex = 100`。
  - `onLogin` 發出 typed EventBus `openLogin(true)`。
  - `onRegister` 發出 typed EventBus `openRegister(true)`。
- 只在 `isBcymDesktop` 時傳 `betSlipOffsetBottom = 0`。
- H5 不傳 bottom offset override，讓 shared default 保持 `64`；不可把 Desktop 的 `0` 套到 H5。
- 既有 `hideBetslip` 仍只在 `isBcymH5` 時提供；Desktop 不得取得 H5 sidebar hide option。
- Template 上新增的 props 使用 Vue kebab-case，例如：
  - `:bet-slip-offset-bottom="..."`
  - `:on-register="..."`
- Login 不強制 password-login flag；沿用 R031 Dialog 的 default login mode。
- Register 必須走 `openRegister(true)`，不可用 `openLogin(true)` 後自行操作表單 DOM，也不可 router push 到不存在的新頁。

### 4. 修正登入後等待 wallet 的 shared relaunch lifecycle

修改 `src/common/components/BetByArea/Index.vue`：

- 使用可清理的 wallet watcher handle；開始新的登入狀態處理及 component unmount 時，都必須停止舊 watcher。
- 初次 mount 時依當下 auth/wallet 狀態啟動，並確保 wallet/language callbacks 各註冊一次：
  - 已登入且 `activeWalletCurrencyCode` 尚未就緒時，不得直接呼叫 `initBetByGame()`；需等待 wallet code 有值後才初次啟動。
  - 未登入或幣別已就緒時，維持正常初次啟動。
- `isLogin === true` 且 `activeWalletCurrencyCode` 尚未就緒時：
  - 保持等待 wallet，不得用固定 timeout 停止 watcher。
  - 不得在幣別為空時呼叫 `relaunchBetByGame()`。
  - wallet code 有值後才停止 watcher、清除 timeout，並 relaunch 一次。
- 移除既有 5 秒 timer；不得新增 diagnostic console，也不得停止 watcher或觸發無幣別 relaunch。
- 等待期間維持 `isWaitingForWallet = true`，避免 active-wallet callback 與 wallet watcher 同時 relaunch；完成或失敗後以 `finally` 恢復狀態。
- 登出時仍直接 relaunch guest BETBY；既有 wallet change、language change、renderer lifecycle 行為維持不變。
- 此項是 shared lifecycle 修正，會套用所有 `BetByArea` consumers；使用者已於 2026-07-31 確認接受 shared 修正。

### 5. 降低 BCY1 註冊自動登入後的 blocking loading

修改 `template/set_r031/components/Form/ModeLoginRegister.vue`：

- 僅 `isBCYM.value === true` 時，將登入完成後的下列三項資料載入改為 `Promise.all()` 並行：
  - `getGiftsList()`
  - `getFavoriteGames({ isHandleLoadingControl: false })`
  - `getUserWalletList()`
- BCY1 favorites 載入不得開啟 global Quasar loading；wallet request 需立即開始，讓 BETBY wallet watcher 儘早取得幣別。
- 非 BCY1 必須保留既有依序載入與 favorites loading 行為，不得藉此改變其他 R031 站點。
- 本階段不修改 shared `useBetByGame.executeLaunch()` 的 global loading；若 QA 仍感到卡頓，再另行評估 background relaunch。

### 6. 修正 BETBY 選擇遊戲幣別後的 rerender 與 R031 Dialog scroll

- `src/stores/gameDialogStore.ts` 的 currency-support payload/state 新增 optional `confirmFunction`；未提供時所有既有遊戲流程維持原樣，Dialog 關閉時需清除 stale callback。
- `src/common/composables/useCurrencySupportDialog.ts` 在 active wallet 切換完成後：
  - 有 `confirmFunction` 時先執行並等待完成，成功後再關閉 Dialog。
  - 未提供時保留既有 `reOpenGame` / `openGame()` 流程。
- `src/common/hooks/useBetByGame.ts` 開啟 currency-support Dialog 時提供 BETBY 專用 confirm fallback：
  - 記錄 Dialog 開啟時的 successful renderer version。
  - active-wallet callback 已成功 rerender 時，confirm fallback 不得重複 relaunch。
  - active-wallet callback 未造成 successful renderer 時，confirm fallback 必須補做一次 `relaunchBetByGame()`。
- `template/set_r031/components/Dialog/CurrencySupport.vue`：
  - `.dialog-body` 改成可收縮的 column flex container。
  - `.wallet-popup-content` 使用 body 剩餘高度，不得延伸到 `.dialog-actions` 後方。
  - 實際垂直捲動只由 `.wallet-group-list` 負責；PC/H5 最後一張 wallet card 都能完整捲到按鈕列上方。
- 此 Dialog CSS 僅修改 `template/set_r031`，不影響其他版型。

## Out of scope

- 不修改代理端 `Whitelabel_GSI_Dashboard`。
- 不擴大到 BYCM/BCYM 旗下其他未知 agent、所有 R031 站或所有 BETBY consumers；runtime scope 只匹配現有 `isBCYM`（目前 agent list 只有 `bcy1`）。
- 不新增 `BYC1` / `BYCM` agent-code alias；沿用實際 runtime `BCY1` / predicate `isBCYM`。
- 不修改 GSI-257 已完成的 overflow、document scroll、Header/Sidebar fixed layout、sidebar hide、`hideMobileClosedBetslip`、`onBetSlipStateChange` 或 toggle guard。
- 不修改 `template/set_r031/layout/Index.vue`、AsideMenu、Header 或 LoginRegister Dialog 內部流程；本需求只使用既有 events。
- 不改 BETBY `betSlipOffsetTop: 59`、`stickyTop: 0`、themeName、token expired、session refresh、recharge、language、currency resolution 規則、guest launch、product code 1244 或 launch API payload；wallet wait/relaunch lifecycle 僅依本 spec 第 4 節修正。
- 不把 `betSlipOffsetBottom = 0` 或 `betslipZIndex = 100` 變成所有站點的 shared default。
- 不為 non-BCY1 consumer 新增 Register fallback UI；未 opt in 時 `onRegister` 保持 no-op。
- 不新增登入／註冊頁面、route、Dialog、copy 或 i18n key。
- 不 patch BETBY iframe、shadow DOM、SDK internal class 或 private method。
- 不吞掉／忽略 PC console error；若 wiring 後仍錯，先記錄 stack 與 reproduction 再更新 spec。
- 不 inspect、修改、格式化或提交 `src/env/environment.json`。
- 不順手整理 shared hook 現有 `/* eslint-disable */`、imports、console 或其他無關 lint。
- 不在本需求內自行 commit、push、merge、開 MR/PR 或部署；每一步仍需使用者另行明確指示。

## 受影響範圍

- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 目標 runtime：`agentCode === "BCY1"`（case-insensitive，由 `isBCYM` 判斷）。
- 目標 template/siteKey：`template/set_r031`。
- 預期修改的 production files：
  1. `src/common/hooks/useBetByGame.ts`
  2. `src/common/components/BetByArea/Index.vue`
  3. `template/set_r031/pages/BetByPage/Index.vue`
  4. `template/set_r031/components/Form/ModeLoginRegister.vue`
  5. `src/stores/gameDialogStore.ts`
  6. `src/common/composables/useCurrencySupportDialog.ts`
  7. `template/set_r031/components/Dialog/CurrencySupport.vue`
- 預期只讀參考：
  - `template/set_r031/components/Dialog/LoginRegister.vue`
  - `template/set_r031/components/Header/Index.vue`
  - `src/boot/eventbus/types.ts`
  - `src/common/hooks/useAgentCode.ts`
- 跨站影響：
  - 前兩個檔案是所有 BETBY consumers 共用的 shared surface。
  - 只允許新增 optional、default-off API；其他 caller 不傳 props 時，initialize options 與 callbacks 必須維持原樣。
  - 實作前需取得使用者對 shared API surface touch 的確認；若不允許修改 shared，需先更新 spec，不能複製一套 BTRenderer lifecycle 到 R031。

## 參考實作 / 要遵循的現有 pattern

1. `src/common/hooks/useBetByGame.ts:34-41`
   - `betslipZIndex` / `onLogin` 已採 live getter；新增 options 必須遵循同一模式。
2. `src/common/hooks/useBetByGame.ts:194-219`
   - `BTRenderer.initialize()` 的 offset、z-index、Login/Register callback 實際設定位置。
3. `src/common/components/BetByArea/Index.vue:20-38`
   - optional site props 與傳入 hook getter 的現有 pattern。
4. `template/set_r031/pages/BetByPage/Index.vue:1-29`
   - GSI-257 已建立 BCY1 H5 opt-in、typed EventBus 與 sidebar state；本需求在此擴充，不另建 wrapper。
5. `template/set_r031/components/Header/Index.vue:170-177`
   - R031 Login／Register 按鈕既有 pattern：`openLogin(true)` / `openRegister(true)`。
6. `template/set_r031/components/Dialog/LoginRegister.vue:75-88`
   - Dialog 已監聽兩個 events，Register 會在 form ready 後切換到註冊模式。
7. `src/boot/eventbus/types.ts:61-64`
   - typed EventBus signatures；禁止用字串型 `any` event emitter。
8. `src/common/hooks/useAgentCode.ts:54`
   - `BCYM_AGENTS = ["bcy1"]`，不新增 Jira 拼字 alias。
9. `~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-257-bcy1-betby-h5-adjustments.md`
   - 前置需求與既有決策；GSI-409 只能增量擴充，不得回退已驗收行為。

## 關鍵決策與理由 (Key decisions)

1. **Shared 只提供 optional plumbing，BCY1 行為由 R031 caller opt in。**
   - BTRenderer instance 與 initialize config 封裝在 shared hook，完全 template-only 無法安全設定 callback/options。
   - Optional getters 保留其他 BETBY consumers 的 default，避免單站需求變成跨站行為。
2. **Login/Register callback 每次觸發時讀取 live handler。**
   - 避免 setup snapshot 造成 viewport／props 更新後仍呼叫舊 callback，延續 GSI-257 已修正的 reactive option pattern。
3. **Desktop offset 精確設 `0`，H5 保留 `64`。**
   - 廠商明確指出 Desktop 沒有底部清單；H5 仍有底部 UI，不能無條件改 shared default。
4. **BCY1 PC/H5 z-index 都精確傳 `100`。**
   - Jira 要求至少 100；選最小符合值，且不依賴 SDK 對錯誤小值 normalize。
5. **Register 沿用 R031 `openRegister` event。**
   - 既有 Header 與 Dialog 已提供正式入口，可正確切換註冊模式；DOM 操作或新 route 都是多餘且脆弱的重作。
6. **GSI-409 是 GSI-257 增量，不重新修改 layout/sidebar。**
   - `main` 已包含相關修正；重碰 layout 會把 callback/options 小需求擴張成高風險 scroll regression。
7. **以 runtime `BCY1` 為準，不把 Jira 拼字帶進 code。**
   - Repo 既有 agent predicate 已確認對應 bcy1；新增 alias 會擴大未知站點範圍。

## 驗收條件

> Reviewer 必須逐條判定通過／不通過；BETBY 因地區限制未完成的實頁項目需標記「待 QA」，不得宣稱全部完成。

### BCY1 Desktop

- [ ] Guest 在 BETBY 投注單點 Login 時，會開啟 R031 `LoginRegisterDialog` 的登入模式。
- [ ] Desktop Login 不再只顯示 `common.alarm.pleaseLogin` notification，不跳新頁／新分頁，且 console 沒有 Jira 所述錯誤。
- [ ] Guest 在 BETBY 投注單點 Join Now 時，會開啟同一 Dialog 的註冊模式。
- [ ] Register Dialog 開啟後確實顯示註冊表單，不是登入表單，也沒有同時疊兩個 Dialog。
- [ ] 傳給 `BTRenderer.initialize()` 的 `betSlipOffsetBottom` 精確為 number `0`。
- [ ] 傳給 `BTRenderer.initialize()` 的 `betslipZIndex` 精確為 number `100`。
- [ ] Desktop 不會取得 H5-only `hideMobileClosedBetslip` / sidebar hide 行為。

### BCY1 H5

- [ ] 既有 Login 行為保留：點 Login 仍開 R031 登入模式。
- [ ] 點 Join Now 會開 R031 註冊模式。
- [ ] `betslipZIndex` 仍為 number `100`。
- [ ] `betSlipOffsetBottom` 維持 shared default number `64`，不得因 Desktop 特規變成 `0`。
- [ ] GSI-257 的 sidebar hide、投注單收合 guard、overflow/document scroll 行為沒有 regression。

### Shared / 非目標站

- [ ] `UseBetByGameOptions` 與 `BetByArea` 新欄位全部 optional，沒有 BCY1/R031 import 或條件寫進 shared。
- [ ] 未提供 `betSlipOffsetBottom` 的 consumer 仍初始化為 `64`。
- [ ] 未提供 `betslipZIndex` 的 consumer 仍初始化為 `1`。
- [ ] 未提供 custom `onLogin` 的 consumer 仍走既有 please-login notification。
- [ ] 未提供 `onRegister` 的 consumer 維持 no-op，不會開 R031 Dialog 或拋錯。
- [ ] 至少 smoke 一個非 set_r031 的 BETBY consumer，確認 Login/Register/offset/z-index/launch/relaunch 沒有 regression。
- [ ] Callback 與 option getter 沒有在 component setup 時被快照；relaunch/reinitialize 會使用當下 props，SDK callback 會使用當下 handler。
- [ ] Login/logout、wallet change、language change 造成 relaunch 後，BCY1 PC/H5 仍取得正確 options，且沒有重複 renderer instance。
- [ ] 註冊自動登入即使 wallet 超過 5 秒才就緒，也不會在空幣別時 relaunch；wallet code 到達後會重新掛載為會員 BETBY。
- [ ] 已登入且使用 USDT 的會員重整 BETBY 頁面時，wallet hydration 前不會呼叫 launch API、不顯示「請選擇幣別」toast，也不會出現 `No currency available`；USDT wallet code 到達後只初次啟動一次。
- [ ] 等待 wallet 超過 5 秒時 watcher 仍有效，且不會出現 `No currency available` 的 BETBY relaunch failure。
- [ ] wallet 就緒只觸發一次有效 relaunch；等待期間 active-wallet callback 不會造成並行重複 relaunch。
- [ ] 登出或 component unmount 會停止尚未完成的 wallet watcher 與 timer，不留下 stale callback。
- [ ] BCY1 登入／註冊自動登入後，gifts、favorites、wallet 三項 request 會並行開始，不再等待前一項完成才請求 wallet。
- [ ] BCY1 的上述 favorites refresh 使用 `isHandleLoadingControl: false`，不顯示額外 global loading。
- [ ] 非 BCY1 R031 仍維持既有串行 `getGiftsList()`、`getFavoriteGames()`、`getUserWalletList()` 流程。
- [ ] Renderer cleanup/reinitialize 仍先清掉舊 instance reference，再 kill 舊 instance；本需求不得回退既有防 stale instance 修正。
- [ ] BETBY currency-support Dialog 選擇 USDT/USDC wallet 並按 Play Now 後，會以新幣別重新掛載 renderer；若 active-wallet callback 已成功 rerender，不會再啟動第二次。
- [ ] BETBY confirm fallback 未提供給其他遊戲時，既有 `reOpenGame` / `openGame()` 行為完全不變；Dialog 關閉後不保留 stale callback。
- [ ] R031 currency-support Dialog 在 PC/H5 都只有 wallet list 為垂直 scroll container，最後一張 wallet card 可完整捲到固定 actions 上方。

### Diff / 品質

- [ ] Production diff 只包含本 spec 預期的七個檔案；沒有 `template/set_r031/layout/Index.vue` 或其他 layout/sidebar 無關變更。
- [ ] 沒有新增 route、Dialog、i18n key、local locale JSON 或 API request/response type。
- [ ] 臨時 test/harness 在 commit 前已刪除或 unstage，不得進 production commit。
- [ ] Targeted Prettier/ESLint 與 `git --no-pager diff --check` 通過；未執行 `tsc --noEmit`。

## 邊界情況 / 例外

- Jira 寫 `BYC1/BYCM`，repo runtime mapping 是 `BCY1/isBCYM`。若 QA console 顯示不同 agent code，停止並先更新 spec，不自行擴充 aliases。
- SDK callback 可能在 component viewport 切換或 relaunch 後才觸發；handler 必須 live-read，不能保留舊 H5/PC callback。
- `betSlipOffsetBottom = 0` 必須是 number，不可傳字串 `"0"`。
- `betslipZIndex = 100` 必須是 number；不得只依賴 SDK normalize。
- `0` 是合法 offset，fallback 不得用 `|| 64`，否則 `0` 會被錯誤改回 `64`；必須使用 nullish fallback（`?? 64`）或等效明確判斷。
- `onRegister` 未提供時不得直接呼叫 `undefined`，也不得改成 please-login notification。
- Login/Register callback 若在 renderer cleanup 後觸發，不得操作已銷毀 instance；本需求只發 EventBus，不在 callback 內呼叫 instance method。
- Register Dialog 使用 `registerFormReady` / `changeRegisterForm` 既有流程；若實頁出現登入表單，需要檢查 event timing，不用 DOM click 模擬繞過。
- 如果 BCY1 實頁受地區限制無法顯示 BETBY，local stub 可以驗證 options/callback wiring，但實際按鈕流程仍需由可用 QA 地區／帳號驗收。
- 若 PC callback wiring 完成後仍出現 Jira 附件所述錯誤，需記錄完整 stack、SDK version、觸發步驟與影片，先更新 spec；不可擴大 try/catch 吞錯。

## 測試計畫

> Repo 沒有統一 test script；不得為本需求引入新 test framework。依專案規則仍需建立暫時性測試／harness 驗證，並在 commit 前刪除或 unstage。

### 1. 暫時 BTRenderer harness

- Stub `window.BTRenderer().initialize(options)`，保存傳入 options 並回傳具備既有 `kill` / `updateOptions` / `action` 的 fake instance。
- Case A：BCY1 Desktop
  - Assert `betSlipOffsetBottom === 0`。
  - Assert `betslipZIndex === 100`。
  - Invoke `options.onLogin()`，assert 只 emit `openLogin(true)`。
  - Invoke `options.onRegister()`，assert 只 emit `openRegister(true)`。
- Case B：BCY1 H5
  - Assert `betSlipOffsetBottom === 64`。
  - Assert `betslipZIndex === 100`。
  - Assert Login/Register 分別 emit 正確 event。
  - Assert 既有 hide-betslip input 仍會傳入。
- Case C：非 opt-in consumer
  - Assert offset `64`、z-index `1`。
  - Assert Login 保留 notification fallback。
  - Assert Register 不拋錯且不 emit R031 event。
- Case D：live getter
  - 初始化後更換 mock props/callback，再觸發 relaunch與 callback。
  - Assert 使用新值／新 handler，不是 setup 時舊快照。

### 2. BCY1 手動驗證

- Desktop breakpoint（寬度 > 768）Guest：
  1. 開啟 BCY1 BETBY product 1244。
  2. 點投注單 Login，確認登入 Dialog 與 console。
  3. 關閉後點 Join Now，確認註冊 Dialog。
  4. 以 renderer spy／受控 local harness 確認 offset `0`、z-index `100`。
- H5 breakpoint（寬度 <= 768）Guest：
  1. 重複 Login / Join Now。
  2. 確認 offset `64`、z-index `100`。
  3. 開關 sidebar，確認 GSI-257 投注單隱藏與頁面捲動仍正常。
- 登入成功後：
  - 確認既有 wallet wait + relaunch 流程正常，重新掛載後 options 不回退。
  - 以受控 test/harness 將 wallet code 延遲超過 5 秒，確認 timeout 後仍等待，且 wallet 到達前 relaunch 次數為 0、到達後為 1。
- 已登入使用 USDT 後重整：
  - 模擬 mount 時 `isLogin === true`、`activeWalletCurrencyCode === ""`，確認 wallet hydration 前 launch 次數為 0，且沒有 notification／`No currency available`。
  - 將 wallet code 更新為 `USDT`，確認初次 launch 次數精確為 1；active-wallet callback 不得再造成第二次 launch。
- Currency-support Dialog：
  - 模擬 active-wallet callback 已成功 rerender，確認 Play Now 的 confirm fallback 不會啟動第二次。
  - 模擬 active-wallet callback 未 rerender，確認 confirm fallback 以新 wallet 補做一次 BETBY relaunch。
  - 以 PC 與 H5 viewport 檢查 `.wallet-group-list` 的 `scrollHeight > clientHeight` 時，可到達 `scrollTop === scrollHeight - clientHeight`，最後一張卡片不被 actions 遮住。
- 註冊成功並自動登入後：
  - 確認 Header 已登入且 BETBY 不再顯示 guest Login/Join Now。
  - 確認 launch game 使用會員 API/token，console 沒有 `No currency available`。
- 非 BCY1 smoke：
  - 選一個實際使用 shared `BetByArea` 的非 set_r031 template。
  - 確認 shared defaults 與 callback fallback 不變。

### 3. 最小靜態檢查

- `pnpm exec prettier --check src/common/hooks/useBetByGame.ts src/common/components/BetByArea/Index.vue template/set_r031/pages/BetByPage/Index.vue`
- `pnpm exec eslint src/common/hooks/useBetByGame.ts src/common/components/BetByArea/Index.vue template/set_r031/pages/BetByPage/Index.vue`
- `git --no-pager diff --check`
- 不執行 `tsc --noEmit`。

## Git Flow

- Repo：`/Users/kenyu/wow/Whitelabel_GSI_Platform_Multiverse`。
- 工作性質：既有 BETBY integration 行為修正，使用 `fix/`。
- 基底分支：`main`。
- 工作分支名稱：`fix/gsi-409-bcy1-betby-options`。
- 實作者開始前：
  1. 確認使用者允許擴充 shared `useBetByGame` / `BetByArea` optional API。
  2. 確認主工作區僅有的 local `src/env/environment.json` 變更不被 inspect 或帶入。
  3. 依 HTTPS token 規則 probe remote，更新最新 `main`。
  4. 從最新 `main` 建立並切換到 `fix/gsi-409-bcy1-betby-options`。
  5. 未切到上述工作分支前不得實作；不可直接在 `main`、`develop`、`staging` 或目前其他 feature branch 修改。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging QA）→ `main`（正式），每階段測試通過才可進下一關。
- 每一次 commit 都必須先取得使用者針對該次 commit 的明確確認；本次「寫 spec」不構成實作 commit 授權。
- 合併進任何分支前都必須再次取得使用者明確確認；有 conflict 時停止／abort 並回報，不自行解 conflict 或改 merge strategy。
- 不預設 rebase，不主動把 develop/staging/main 合回工作分支。
- 不主動開 MR/PR；push 後只提供 GitLab 回傳連結，由使用者決定。
- merge 到環境分支不等於發版；只有使用者明確要求「發版/release」才執行 `yarn deploy`。本需求版型為 `set_r031`，版本接受預設值，最後確認 `y`。

## 交接備註給實作者

- 先取得 shared touch 確認，再從最新 `main` 建立 `fix/gsi-409-bcy1-betby-options`。
- 建議順序：
  1. 建立暫時 renderer harness。
  2. 擴充 shared hook optional getters。
  3. 擴充 shared BetByArea optional props。
  4. 在 R031 BetByPage 做 BCY1 PC/H5 opt-in。
  5. 跑 harness、targeted checks、BCY1 PC/H5 QA、非 BCY1 smoke。
  6. 刪除／unstage 臨時 harness。
- 不要修改 GSI-257 layout/sidebar/overflow；若發現需改，先說明原因並更新本 spec。
- 若 main 在實作前已加入 `onRegister` 或 `betSlipOffsetBottom` plumbing，先對照現況縮小 diff，不要重複建立第二套 API。
- Reviewer 必須逐條 review「驗收條件」與 Out of scope；需求方若更改平台範圍或 offset 定義，先更新 spec 再改 code。
