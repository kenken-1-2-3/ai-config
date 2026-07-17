# GSI-257 BCY1 BETBY H5 頁面調整

> 交接合約：Spec 作者（Codex）產出，指定實作者依此實作，reviewer 對照「驗收條件」逐條 review。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-257-bcy1-betby-h5-adjustments.md`（版控於 ai-config）。
> 本 spec 只涵蓋 GSI-257；實作者不得依對話記憶擴張需求。

## 背景 / 目標

- 需求來源：[Jira GSI-257](https://gamingsoft.atlassian.net/browse/GSI-257)。
- Jira 標題：`[需求 會員端]BYC1 H5首頁產品BETBY 1244 頁面調整`。
- Jira 狀態：待處理；Priority：Medium；建立日：2026-07-15。
- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 環境：測試；總代：Jira 寫 `BYCM`；代理：Jira 寫 `BYC1`；版型欄位：`set_r031(R031)(R017改色)`；客戶專案：Betcapy。
- Runtime 實際資料與 Jira 拼字不同：2026-07-17 從 `https://bcy1.gsiwl.com/` console 確認為 `agentCode: BCY1 / isBCYM: true`。Repo 也只定義 `BCYM_AGENTS = ["bcy1"]`。本 spec 以 runtime `BCY1` / predicate `isBCYM` 為實作範圍，不新增 `BYC1` alias；若 QA 環境實際回傳不同 code，先更新 spec。
- 產品：BETBY，`product_code = 1244`，H5 首頁。
- Jira 要求：
  1. 移除 OVERFLOW。
  2. 打開 SIDE BAR 時，投注單要被隱藏。
  3. 點擊投注單上的登錄鍵，應打開會員端登錄頁面／登入 Dialog。
  4. `BETSLIPZINDEX` 數值至少為 `100`。

## 現況與研究結論

### 1. OVERFLOW 是 host layout，不是 BETBY SDK option

- Jira 附件 `image-20260715-073115.png` 的箭頭明確指向 H5 DOM `.inner-content.scroll` 的 `overflow-y: auto`。
- `template/set_r031/layout/Index.vue` 目前永遠把 Quasar `scroll` class 掛在 `.inner-content`，本地 CSS 也永遠設定 `overflow-y: auto`。
- BETBY dev/prod renderer bundle 的 initialize defaults 沒有 `overflow` option；不得在 `BTRenderer.initialize()` 中自行發明 `overflow` 參數。
- `isBetByPage` 目前只判斷 `route.name === "BetByPage"`；但 BCY1 `/` 實際 route name 是 `home`，只是動態載入相同 BetBy page，所以首頁不會套用現有 `betby-flex-col` branch。
- 2026-07-17 對 BCY1 實頁只讀檢查：`.inner-content` class 是 `inner-content scroll`，computed `overflow` / `overflow-y` 都是 `auto`，與 Jira 截圖一致。

### 2. Sidebar 與 betslip 現況

- `template/set_r031/layout/Index.vue` 的 header 與 AsideMenu 共用 local `isAsideShow`，並同步到 `useGlobalStore().globalState.isAsideShow`。
- 命名與畫面語意相反：`isAsideShow === true` 會套用 AsideMenu `.isClose`；在 H5 上 sidebar 開啟是 `isAsideShow === false`，即 `sidebarOpen = !globalState.isAsideShow`。
- 2026-07-17 BCY1 實頁可重現 sidebar 開啟時右下 BETSLIP 仍顯示。BETBY 內容因地區限制顯示 `Access is forbidden from your location`，因此登入與實際下注流程仍須由可用 QA 地區／帳號驗證。
- Shared hook 現在的 `onBetSlipStateChange` 是 no-op，沒有保存 `{ isOpen }`；sidebar state 也沒有傳入 BETBY integration。
- 現行 BETBY renderer instance 公開 `action("toggleBetSlip")`，而 `onBetSlipStateChange` 會回報 `{ isOpen }`。`toggleBetSlip` 只切換 expanded panel，H5 收合後的 `BETSLIP` launcher/bar 仍會顯示；單用 toggle 不符合 Jira 的「隱藏」。
- SDK 公開 option `hideMobileClosedBetslip` 會在 mobile view 隱藏收合狀態的 launcher/bar；public `btInstance.updateOptions({ hideMobileClosedBetslip })` 可在 runtime 切換。
- 完整 hide sequence：sidebar open 時先 `updateOptions({ hideMobileClosedBetslip: true })`，再只於 `{ isOpen: true }` 時呼叫一次 `action("toggleBetSlip")`。Sidebar close 時只把 option 還原為 `false`，不得 toggle／自動重開。
- SDK 內部雖有 `HIDE_BETSLIP` state action，但不在 public actions map；不得呼叫不存在的 `action("hideBetSlip")`，否則會收到 `Unknown action`。

### 3. Login 與 z-index 現況

- Shared hook 的 `onLogin` 現在只顯示 `common.alarm.pleaseLogin` notification，沒有開啟 R031 登入 UI。
- R031 header 的既有登入 pattern 是 `eventbus.emit("openLogin", true, forcePasswordLogin?)`；R031 `LoginRegister.vue` 已監聽同一 event。`FBSportsArea` 也使用 `eventbus.emit("openLogin", true)` 處理 embedded sportsbook login。
- Shared hook 現在寫死 `betslipZIndex: 1`。雖然目前 SDK 內部會把小於 100 的值 normalize 至 100，本需求仍必須把 caller 傳入值明確設為 `100`，不可依賴 SDK 修正錯誤設定。

### 4. Shared scope 風險

- `src/common/components/BetByArea/Index.vue` / `useBetByGame.ts` 也被 okbet、okbet_blackGold、set_r017、set_r022、set_r027、set_r030、set_r032、set_r033 等 template 使用。
- 不得把 BCY1 的 sidebar、登入 Dialog 或 z-index 行為無條件寫進 shared default。
- 最窄可維護方案是：shared 層只新增 backward-compatible、default-off 的 options/props 與 renderer control；`template/set_r031/pages/BetByPage/Index.vue` 針對 `isBCYM` opt in。這會修改 shared API surface，但其他 consumers 不傳 props 時行為必須完全保持原樣。
- 依專案 Scope Control，開始修改兩個 shared files 前，實作者必須取得使用者對這個跨站 API surface touch 的確認；若未確認，不得改 code。

## 範圍

1. 修正 `template/set_r031/layout/Index.vue` 的 BETBY page context：
   - 使用既有 `useMediaQuery().isMobile` 定義 H5 breakpoint；不得只用 agent/template 判斷把需求套到 desktop。
   - `isBetByH5Context`（命名可微調）必須同時要求 `isMobile === true`，並涵蓋 named `BetByPage` route，以及 `isBCYM && route.name === "home"` 的 BCY1 首頁。
   - 只有 BETBY H5 context 移除／不套用 `.inner-content` 的 Quasar `scroll` class 與 `overflow-y: auto`。
   - 非 BETBY routes 的 `.inner-content` scroll 行為完全保留。
   - BCY1 desktop BetBy page 的既有 scroll/layout 行為也完全保留。
   - 保留 `.home-page`、`.layout-main` 等 viewport shell 的 `overflow: hidden`；Jira 圖未指向這些 ancestor，不得全域移除。
2. 擴充 `src/common/hooks/useBetByGame.ts` 為 backward-compatible options：
   - 支援 caller 覆寫 `betslipZIndex`，default 仍為現有值 `1`；BCY1 caller 傳 `100`。
   - 支援 caller 提供 `onLogin` handler；未提供時仍執行現有 please-login notification。
   - 支援 caller 傳入初始 `hideMobileClosedBetslip`；未提供時不得新增或改變其他 consumers 的 option/default。
   - 在 `onBetSlipStateChange` 保存 SDK 回報的 open/closed state。
   - 暴露 betslip visibility state 與一個 idempotent `setBetSlipHidden(hidden: boolean)`（名稱可依既有風格微調）：
     - renderer instance 存在時，先 `btInstance.updateOptions({ hideMobileClosedBetslip: hidden })`。
     - `hidden === true` 且 state 為 open 時，才呼叫一次 `btInstance.action("toggleBetSlip")` 收合 expanded panel。
     - `hidden === false` 時只還原 launcher availability，不得 toggle／自動展開。
     - 增加 `closeInFlight`（或等效 optimistic guard）：呼叫 toggle 前先設為 true；在 state callback 回報 false、action 失敗或 cleanup 時重設。Callback 尚未回 false 前的重複 hide calls 不得送出第二次 toggle。
   - Initial initialize 與每次 relaunch/reinitialize 都必須帶入 caller 當下的 hide condition，避免 sidebar 已開啟時 launcher 先閃現。
   - Renderer kill / cleanup / reinitialize 時清除 stale betslip state。
3. 擴充 `src/common/components/BetByArea/Index.vue` 為 backward-compatible props：
   - 接受 `betslipZIndex`、`onLogin` 與 site 提供的 hide condition（命名可依 Vue 現有風格微調）。
   - 把 options 傳入 `useBetByGame()`。
   - Watch hide condition 與 renderer 回報的 betslip open state：sidebar 已開啟時，只要 betslip 變成 open 就立即呼叫 idempotent full hide；sidebar 從關閉變開啟時，也要更新 SDK option 並按 state 收合 expanded panel。
   - Sidebar 關閉時不得自動重新開啟 betslip。
4. 在 `template/set_r031/pages/BetByPage/Index.vue` 做 BCY1 opt-in：
   - 使用 `useMediaQuery().isMobile`；透過 `useGlobalStore()` 建立 `sidebarOpen = computed(() => isMobile.value && !globalStore.globalState.isAsideShow)`。
   - 只對 `isBCYM && isMobile` 傳入 `betslipZIndex = 100`、`hideMobileClosedBetslip` 初始值／sidebar hide condition。
   - 只對 `isBCYM && isMobile` 的 BETBY `onLogin` 以現有 typed EventBus 發出 `openLogin(true)`，打開 R031 `LoginRegisterDialog`；desktop 維持現有 notification-only default。
   - 不強制 password login flag；沿用 R031 登入 Dialog 的 default login mode。若產品另有明確要求，先更新 spec。
   - 若 `BetByPage` 也可能被非 BCY1 站使用，所有 opt-in 值需以 `isBCYM` guard；不得讓整個 set_r031 無條件取得 BCY1 特規。

## Out of scope（明確不做）

- 不修改代理端 `Whitelabel_GSI_Dashboard`。
- 不擴大到 BYCM/BCYM 旗下其他 agent、所有 R031 站或所有 BETBY consumers；runtime scope 只匹配現有 `isBCYM` (`BCY1`)。
- 不新增 `BYC1`/`BYCM` agent-code alias；Jira 拼字與 runtime 不一致已由 live console 確認，以 runtime 為準。
- 不修改 BETBY launch API endpoint、product code 1244、request/response types、token parse、guest launch、wallet/currency、language、themeName、offset、session refresh、recharge 或 relaunch protocol。
- 不自行發明 `overflow` renderer option，不 patch BETBY iframe/shadow DOM/internal class，不依賴 private SDK implementation。
- 不把 sidebar 開關邏輯搬到 shared global behavior；shared 只提供 opt-in plumbing。
- 不重命名全域 `isAsideShow`，即使其語意反向；本次只在 R031 BetBy caller 轉成清楚的 `sidebarOpen` computed。
- 不修改 R031 其他頁面的 scroll、頁高、footer、header、aside animation、desktop BETBY 行為、desktop layout 或 breakpoint。
- 不建立新登入頁、route、Dialog、notification copy 或 i18n key；沿用現有 `openLogin` event 與 Dialog。
- 不改註冊按鈕行為；`onRegister` 維持現況。
- 不修改 local locale JSON；不 inspect、修改、格式化或提交 `src/env/environment.json`。
- 不順手清理 shared hook 現有 `/* eslint-disable */`、console、imports、格式或其他非阻擋 lint 問題。
- 不在本需求內 commit、push、merge、開 MR/PR 或部署；皆需使用者另行明確指示。

## 受影響範圍

- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 目標 runtime：`agentCode === "BCY1"`（case-insensitive，由 `isBCYM` 判斷）。
- 目標 template/siteKey：`template/set_r031`。
- 預期修改檔案：
  - `template/set_r031/layout/Index.vue`
  - `template/set_r031/pages/BetByPage/Index.vue`
  - `src/common/components/BetByArea/Index.vue`
  - `src/common/hooks/useBetByGame.ts`
- 預期只讀參考／驗證檔案：
  - `template/set_r031/router/routes.ts`
  - `template/set_r031/components/Header/Index.vue`
  - `template/set_r031/components/Dialog/LoginRegister.vue`
  - `template/set_r031/layout/AsideMenu.vue`
  - `src/common/components/FBSportsArea/Index.vue`
  - `src/common/hooks/useAgentCode.ts`
  - `src/stores/globalStore.ts`
  - `src/boot/eventbus/types.ts`
- 跨站影響：兩個 shared files 會新增 optional API，但 default 路徑不得改變。Reviewer 必須 smoke 一個非 R031 BETBY template，並確認沒有 sidebar/login/z-index regression。

## 參考實作 / 要遵循的現有 pattern

1. `template/set_r031/router/routes.ts:13-20,25-33,318-343`
   - `/` 的 route name 是 `home`，但 `isBCYM` 時載入 BetByPage；不可只靠 component path 猜 route。
2. `template/set_r031/layout/Index.vue:4-15,112-135,345-381`
   - Sidebar local state、globalStore mirror、BetBy context 與 overflow 都在此。
3. `template/set_r031/layout/AsideMenu.vue:321-349`
   - H5 `.isClose` 的實際視覺語意；據此 `sidebarOpen = !isAsideShow`。
4. `src/common/hooks/useBetByGame.ts:127-191,194-200`
   - 只在現有 renderer initialize / cleanup path 加 options 與 state，不建立第二個 BTRenderer instance。
5. `src/common/components/BetByArea/Index.vue:15-25,47-60,65-109`
   - 沿用單一 hook instance、init/relaunch/cleanup lifecycle；新增 watchers 不得重複 launch。
6. `template/set_r031/components/Header/Index.vue:156-161`
   - R031 的 `openLogin` event pattern。
7. `src/common/components/FBSportsArea/Index.vue:93-108`
   - Embedded sportsbook 點登入後以 `eventbus.emit("openLogin", true)` 開會員端登入的既有參考。
8. `template/set_r031/components/Dialog/LoginRegister.vue:75-89`
   - 現有 Dialog listener；不得另做 router push 或新 Dialog。
9. `src/boot/eventbus/types.ts:61-64`
   - 使用 typed EventBus signature，禁止 `any` event 名稱。

## 關鍵決策與理由 (Key decisions)

1. **把 OVERFLOW 修在 R031 layout，不傳進 BTRenderer。**
   - Jira 截圖指向 host `.inner-content.scroll`；SDK 沒有該 option。
   - Conditional BetBy context 能保留 R031 其他頁面的 scroll，避免全站 layout regression。
2. **補齊 BCY1 首頁 route 判斷。**
   - BCY1 `/` route name 是 `home`，現有 `route.name === "BetByPage"` 不足；不修這點，任何 BetBy-only layout class 都不會作用於 Jira 指定的 H5 首頁。
   - 同時以現有 responsive `isMobile` guard 限制 H5，讓 desktop 維持原狀。
3. **shared 只加 optional plumbing，BCY1 在 template local opt in。**
   - Renderer instance 封裝於 shared hook，template 無法安全呼叫 official action；完全 template-only 做不到。
   - Default-off props/options 讓其他 BETBY consumers 維持現況，並把品牌行為決策留在 `template/set_r031`。
4. **使用 SDK public option + state + public action，不做 DOM hack。**
   - `hideMobileClosedBetslip` 負責隱藏 H5 collapsed launcher/bar；guarded `toggleBetSlip` 負責收合已展開面板，兩者缺一不可。
   - 先 `updateOptions({ hideMobileClosedBetslip: true })`，再看 `{ isOpen }` 決定是否 `action("toggleBetSlip")`，可避免收合過程短暫露出 launcher，也不會把已關閉 slip 反向打開。
   - 不跨 shadow DOM 改 style，避免 SDK 更新後失效。
5. **登入沿用 R031 EventBus Dialog。**
   - Header 與 FB Sports 已證明 `openLogin(true)` 是現有正式入口；notification-only 不符合 Jira。
6. **caller 明確傳 `betslipZIndex: 100`。**
   - 即使 SDK 會 normalize，小於 100 的 source config 仍違反廠商要求，也會讓未來 SDK 行為不透明。
7. **不把 Jira 的 BYC1 拼字帶進 code。**
   - Live console 與 repo predicate 都確認實際 agent 是 BCY1；加入 alias 會擴大未知 runtime scope。

## 驗收條件

> Reviewer 必須逐條判定通過／不通過；BETBY 因地區限制未完成的項目需明標「待 QA」，不得宣稱全數通過。

- [ ] BCY1 `/`（route name `home`）與 `/betByPage` 都被辨識為 BetBy context；非 BCY1 的 `home` 不會被誤判。
- [ ] BCY1 BetBy H5 context（`isMobile === true`）的 immediate `.inner-content` 不含 Quasar `scroll` class，且 computed `overflow` / `overflow-y` 不再是 `auto`；Jira 截圖所指的 host scroll 已移除。
- [ ] BCY1 desktop BetBy context 不套用本需求的 H5-only overrides；scroll、login callback、betslip visibility 與 z-index caller config 維持既有 behavior。
- [ ] R031 任一非 BetBy page 仍保留 `.inner-content` scrolling；長內容可正常捲動，desktop/H5 都無 regression。
- [ ] `.home-page` / `.layout-main` 的 viewport-shell overflow 沒有無關 diff。
- [ ] BCY1 H5 傳給 `BTRenderer.initialize()` 的 `betslipZIndex` 精確為 number `100`（不是字串、不是 `1`、不是只依賴 SDK normalize）；BCY1 desktop 維持 caller default `1`。
- [ ] 非 opt-in consumer 未傳 prop 時仍使用現有 default `betslipZIndex: 1`、notification-only `onLogin` 與既有 launch/relaunch 行為。
- [ ] `onBetSlipStateChange({ isOpen: true/false })` 正確同步 local state；cleanup / kill / reinitialize 後沒有 stale `true`。
- [ ] Sidebar 關閉、slip 已開啟時，打開 H5 sidebar 後 expanded panel 與 collapsed `BETSLIP` launcher/bar 都不可見，不再覆蓋 sidebar 或頁面。
- [ ] Sidebar 已開啟時，renderer 初始化、relaunch 或使用者嘗試開 slip，都不會留下 expanded panel 或 collapsed launcher/bar，也沒有可見 flash。
- [ ] Full hide 只使用 public `updateOptions({ hideMobileClosedBetslip: true })` + guarded `action("toggleBetSlip")`；沒有呼叫不存在的 `hideBetSlip` action，也沒有 query/style SDK DOM。
- [ ] Slip 原本已關閉時打開 sidebar，不會因 blind toggle 被打開。
- [ ] Sidebar/open-state watchers 在 close callback 尚未回報 false 前被連續觸發時，`closeInFlight`／等效 guard 確保只 dispatch 一次 toggle，不會 toggle 兩次重新展開。
- [ ] 關閉 sidebar 只 `updateOptions({ hideMobileClosedBetslip: false })` 恢復 launcher availability，不會自動打開 slip；使用者之後仍可正常手動打開投注單。
- [ ] BCY1 H5 Guest 在 BETBY 投注單點「登錄／Login」會開啟 R031 `LoginRegisterDialog` 的登入模式；不再只出現 please-login notification，也不跳錯 route／新分頁；desktop 維持既有 notification-only behavior。
- [ ] Login 成功後既有 wallet 取得與 `relaunchBetByGame()` 流程仍正常；不得產生重複 renderer 或重複 API request。
- [ ] `onRegister`、recharge、token expired、session refresh、language/wallet change、themeName、offset 與 product 1244 launch payload沒有行為 regression。
- [ ] 至少 smoke 一個非 set_r031 的 BETBY consumer，確認不會開 R031 Login Dialog、不讀 R031 sidebar 語意、z-index/default/scroll 維持原樣。
- [ ] Diff 僅包含本 spec 預期的四個 production files；臨時 test/harness 在 commit 前已刪除或 unstage。
- [ ] Targeted Prettier/ESLint 與 `git --no-pager diff --check` 通過；未執行 `tsc --noEmit`。

## 邊界情況 / 例外

- Jira 寫 `BYC1/BYCM`，runtime 是 `BCY1`。若實作環境 console 不是 BCY1，停止並更新 spec，不自行加多個 aliases。
- Sidebar state 命名反向；任何 watcher 都必須以實際 H5 畫面驗證 `sidebarOpen = !isAsideShow`，不可只看 variable 名稱。
- `onBetSlipStateChange` payload 若在實際 SDK 版本不是 `{ isOpen: boolean }`，先記錄 payload 並更新 spec；不得以 truthy object 猜狀態。
- `btInstance.updateOptions`、`hideMobileClosedBetslip`、`btInstance.action` 或 `toggleBetSlip` 在目標 SDK 不可用時，停止並提供 SDK version/console evidence；不得改用 shadow DOM query、iframe injection 或 private method。
- `toggleBetSlip` 已確認只收合內容；不得把「panel 收合但 launcher/bar 仍可見」判定為 Jira 的隱藏完成。
- Sidebar 已開啟後 renderer 可能延遲回報 open state；watch 必須同時涵蓋 sidebar condition 與 state callback，避免 init/relaunch race。
- 多次快速開關 sidebar 時，只允許 open → close 的必要 action；`closeInFlight`／等效 optimistic guard 必須在 dispatch 前鎖住，直到 false callback、action failure 或 cleanup 才重設，不得因 watcher race 連續 toggle。
- 未登入、無錢包、API error、地區限制時不應開空 Dialog 或修改原有錯誤通知流程；只有 SDK 的 login request 改開登入 Dialog。
- BCY1 `/` 的 route name 仍是 `home`；本需求不重構 dynamic route 或更名 route。

## 測試計畫

> Repo `package.json` 沒有 test script，也沒有 Vitest/Jest。依專案規則仍需寫測試驗證，但不得為本需求引入測試 framework；臨時 harness 驗證後刪除，不可進 commit。

### 1. 臨時 hook/component harness（不可提交）

- 以最小 fake renderer / callable object 驗證：
  1. 未傳 options 時 initialize args 仍是既有 defaults。
  2. 傳 `betslipZIndex: 100` 時 initialize 收到 number `100`。
  3. `onLogin` 有 caller handler 時呼叫 handler；未傳時仍呼叫現有 notification path。
  4. `onBetSlipStateChange({ isOpen: true })` 後 `setBetSlipHidden(true)` 依序呼叫一次 `updateOptions({ hideMobileClosedBetslip: true })` 與一次 `action("toggleBetSlip")`。
  5. Full hide 先呼叫 `updateOptions({ hideMobileClosedBetslip: true })`；`isOpen === false` 時不呼叫 toggle，但 launcher/bar 仍被 option 隱藏。
  6. 還原 visibility 只呼叫 `updateOptions({ hideMobileClosedBetslip: false })`，不呼叫 toggle。
  7. Renderer 尚未建立、已 cleanup 時不丟錯；下一次 initialize 會使用當下 hide condition。
  8. Sidebar condition 已 true 後 slip 才回報 open，仍會被 full hide；condition false 不會自動打開。
  9. 在 state 尚為 open、第一次 toggle 尚未收到 false callback 前連續呼叫 hide，action count 仍為 1；false callback、throw/reject、cleanup 後 guard 正確重設。
  10. `isMobile === false` 時 BCY1 不傳 H5-only overrides，維持 desktop defaults。
- 不新增 dependency；若 composable mocking 迫使 production code 大幅重構，停止並回報，以 browser/manual evidence 補足，不為測試擴 scope。
- 驗證後刪除臨時檔或 unstage；commit 不含 test/harness。

### 2. Chrome / runtime 驗證

- 依專案規則，所有 URL 使用 Chrome extension；不使用 in-app browser。
- 使用 QA 提供的 BCY1 測試環境、可用地區與 guest/login 測試資料；帳密不得寫入 spec、程式、log 或 commit。
- H5 viewport 至少驗證 360×800 與實際手機；desktop 至少做 scroll regression smoke。
- BCY1 `/` 與 `/betByPage` 各檢查一次 DOM computed style 與 route name。
- Guest 流程：
  1. 開啟 BETBY product 1244。
  2. 加入 selection 並打開 betslip。
  3. 開 sidebar，確認投注單隱藏／關閉且不覆蓋 sidebar。
  4. 關 sidebar，確認 slip 不自動重開、之後可手動重開。
  5. 在 slip 點 Login，確認 R031 LoginRegisterDialog 進入登入模式。
- Race/重複操作：sidebar 已開啟後 reload renderer、快速開關 sidebar、slip 已關閉時開 sidebar、login 後 relaunch。
- 記錄：agentCode、route name、viewport、initialize `betslipZIndex`、state callback、action 次數、登入 Dialog、scroll computed style、console error。
- 因目前本機位置會收到 BETBY `Access is forbidden from your location`，無法在此研究階段完成 selection/login；實作驗證必須使用可用 QA 網路，否則相關項目明標待驗證。

### 3. Cross-template regression

- 至少選一個仍使用 shared `BetByArea` 的非 set_r031 template：
  - 不傳新 props/options。
  - Renderer 可正常 init/cleanup/relaunch。
  - Login 仍走原 notification behavior。
  - 不讀 R031 sidebar state，不觸發 `toggleBetSlip`。
  - Existing z-index/default 與 layout scroll 不變。

### 4. Targeted static validation

- 對 touched files 執行：
  - `pnpm exec prettier --check template/set_r031/layout/Index.vue template/set_r031/pages/BetByPage/Index.vue src/common/components/BetByArea/Index.vue src/common/hooks/useBetByGame.ts`
  - `pnpm exec eslint template/set_r031/layout/Index.vue template/set_r031/pages/BetByPage/Index.vue src/common/components/BetByArea/Index.vue src/common/hooks/useBetByGame.ts`
  - `git --no-pager diff --check`
- ESLint 只處理本次新增且阻擋驗證的 error；不清理無關既有 warning。
- 檢查 `git status --short` 時排除 `src/env/environment.json`，確認沒有臨時測試、帳密、環境設定或無關檔案。
- 不執行 `tsc --noEmit`。

## Git Flow

- 基底分支：`main`。
- 工作分支名稱：`fix/gsi-257-bcy1-betby-h5`。
- 實作者開始前：
  1. 先取得使用者對「兩個 shared files 新增 backward-compatible optional API」的跨站範圍確認。
  2. 保留目前工作樹的使用者修改，不得覆蓋或帶入本 fix。
  3. 切到 `main`；pull 前先以 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` 非互動確認 HTTPS token / Keychain 可用。失敗時停止回報，不改用 SSH。
  4. 更新最新 `main`，再從它建立並切換到 `fix/gsi-257-bcy1-betby-h5`。
  5. 未切到上述工作分支前不得實作；不可直接在 `main`、`develop`、`staging` 或目前的其他 feature branch 修改。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging QA）→ `main`（正式），每階段測試通過才可進下一關，不得跳關。
- 每一次 commit 都必須先取得使用者針對該次 commit 的明確確認；本次「研究／寫 spec」不構成 commit 授權。
- 合併進任何分支前都必須再次取得使用者明確確認；有 conflict 時停止/abort 並回報，不自行解 conflict 或改 merge strategy。
- 不預設 rebase，不主動把 develop/staging/main 合回工作分支。
- 不主動開 MR/PR；push 後只提供 GitLab 回傳連結，由使用者決定。
- merge 到環境分支不等於發版；只有使用者明確要求「發版/release」才可執行 `yarn deploy`，並選擇 `set_r031`。版本接受預設值，最後確認 `y`。

## 交接備註給實作者

- 先取得 shared touch 確認，再從最新 `main` 建立 `fix/gsi-257-bcy1-betby-h5`。
- 建議順序：臨時 renderer harness → shared hook optional options/state/control → shared BetByArea props/watch → R031 caller opt-in/login event → R031 BetBy context/overflow → targeted checks → BCY1 QA → non-R031 smoke → 刪除臨時 harness。
- Spec 研究快照：2026-07-17，專案 commit `92dbbf277f904fe1eef2fca89191d4cc276d5461`。
- 撰寫 spec 時專案 checkout 位於無關分支 `feat/gsi-280-arg1-force-game-dialog`；實作者不可在該分支直接修改 GSI-257。
- 若 main 在實作前已調整 `useBetByGame`、`BetByArea`、R031 routes/sidebar/layout 或 Login Dialog event，先重新對照本 spec 並更新 references/decisions，再開始修改。
- Reviewer 必須逐條 review「驗收條件」與 Out of scope；需求方若改變「隱藏投注單」定義或 SDK contract，先更新 spec，再改 code。
