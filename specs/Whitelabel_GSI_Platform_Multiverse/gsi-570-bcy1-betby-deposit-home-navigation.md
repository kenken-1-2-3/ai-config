# GSI-570 BCY1 BETBY 存款與首頁導向修正

> 交接合約：本 spec 是 GSI-570 的單一實作來源；實作者依此實作，reviewer 依「驗收條件」逐條檢查。
> 正式位置：`~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-570-bcy1-betby-deposit-home-navigation.md`（版控於 ai-config）。
> 本 spec 只涵蓋 GSI-570；不得從舊 ticket、對話或鄰近程式擴張需求。
> 狀態：規格完成；production 實作前仍需使用者確認本 spec 所列的兩個 shared optional API touch。

## 1. 背景與目標

- 需求來源：[Jira GSI-570](https://gamingsoft.atlassian.net/browse/GSI-570)。
- Jira 標題：`[問題 會員端]BCY1 產品BETBY頁面，存款按鈕異常`。
- Jira 快照（2026-08-11）：狀態「待處理」、Priority Medium、Assignee Unassigned、無留言、無 linked issue。
- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 環境：測試、正式。
- 總代／代理：BCYM／BCY1。
- 目標 template/siteKey：`template/set_r031`。
- 產品：BETBY，現有 launch 固定使用 `product_code = 1244`。
- 測試站：[https://bcy1.gsiwl.com/](https://bcy1.gsiwl.com/)。
- 正式站：[https://bcy1.gpsriowdl.com/](https://bcy1.gpsriowdl.com/)。
- 相關已完成需求：
  - [GSI-257](https://gamingsoft.atlassian.net/browse/GSI-257)：BCY1 H5 BETBY container、sidebar、login、z-index。
  - [GSI-409](https://gamingsoft.atlassian.net/browse/GSI-409)：PC/H5 Login/Register callback、Desktop offset、z-index。
  - [GSI-480](https://gamingsoft.atlassian.net/browse/GSI-480)：container、offset 與語系同步；2026-08-10 PROD 驗證通過。

本需求只完成兩件事：

1. PC 與 H5 的 BETBY 存款／充值入口必須前往 BCY1 站點既有的會員存款頁。
2. 點擊站點 Header Logo 回首頁時，必須重走初次開站的 BETBY 初始化；網址與 renderer 內容都回到預設 `live-section`，不得只改網址而保留舊內容。

## 2. Jira 附件證據

GSI-570 共 7 個附件：5 張 PNG、2 段 MOV。2026-08-11 已在登入 Jira 的 Chrome 逐張檢查 5 張 PNG：

- `image-20260810-070207.png`：PC BETBY betslip 的 Deposit 按鈕。
- `image-20260810-070225.png`：PC 點擊站內／BETBY 存款入口後仍停在 BETBY，底部出現餘額不足提醒；沒有進會員存款頁。
- `image-20260810-070235.png`：H5 sidebar 的 Deposit（Swahili：Amana）入口後仍出現餘額不足提醒。
- `image-20260810-070359.png`：H5 正確目標是 BCY1 站內會員存款頁。
- `image-20260810-070421.png`：PC 正確目標是 BCY1 站內會員存款頁，網址為 `/member/deposit`。
- 兩段 MOV 用於重現互動；Logo 的精確期待以 Jira description 明文為準：回到 root 後應像初次開站，自動形成 `/?bt-path=%2Flive-section` 並顯示相符內容。

## 3. 研究基準與現況

> 研究日期：2026-08-11。程式基準：本機 `origin/main` commit `fa822797dfd632a2197ab3eafdca48eef7663b0e`。
> 撰寫時 checkout 在已被 `origin/main` 收錄、但目前落後 main 的舊分支 `fix/gsi-480-bcy1-betby-container-options-language`；實作者不得在該分支直接修改 GSI-570。

### 3.1 BCY1 與 route 現況

- `src/common/hooks/useAgentCode.ts` 以既有 `isBCYM` 判斷 `agentCode === BCY1`（case-insensitive）。
- `template/set_r031/router/routes.ts`：
  - BCY1 `/` 的 child route name 是 `home`，但 component 會動態載入 `template/set_r031/pages/BetByPage/Index.vue`。
  - 會員存款 route name 是 `MemberDeposit`，path 是 `/member/deposit`，位於 `MemberPage` 的 `needAuth` 範圍。
- `template/set_r031/pages/BetByPage/Index.vue` 已用 `isBCYM` 為 BCY1 注入 BETBY 的 z-index、offset、Login/Register 與 H5 sidebar options；本需求沿用同一個 caller opt-in pattern。

### 3.2 存款問題現況與 root cause

- `src/common/hooks/useBetByGame.ts` 的 `BTRenderer.initialize()` 現在固定設定：
  - `onRecharge: () => showNotification(t("common.alarm.insufficientBalance"))`
- `UseBetByGameOptions` 沒有 `onRecharge` extension point。
- `src/common/components/BetByArea/Index.vue` 也沒有可由 template 傳入的 recharge callback prop。
- 因此 BETBY SDK 在 PC 或 H5 觸發 recharge/deposit 時，只能顯示「餘額不足」通知，不可能導向 BCY1 已存在的 `MemberDeposit` route。

### 3.3 Logo 問題現況與 root cause

- `template/set_r031/components/Header/Index.vue` 的 Logo 目前直接使用 `@click="$router.push('/')"`。
- BCY1 root 與帶 `bt-path` 的 root 都是同一個 Vue route record／同一個 `home` component：
  - 目前：`/?bt-path=...`
  - 點 Logo 後：`/`
- 這個 SPA navigation 只移除 query；`BetByPage` 不會 unmount/remount，`useBetByGame` 也沒有因 query 被清空而重新 initialize。
- 結果就是 Jira 所述「URL 換了，但是內容沒換」。
- 初次開站會建立新的 renderer；BETBY 會把預設內頁同步為 `/?bt-path=%2Flive-section`。Logo 需求明確要求與初次開站相同，因此 BCY1 Logo 應做真正的 root navigation/reload，而不是只對同一個 route 執行 SPA push。

## 4. 功能需求

### REQ-1：BETBY Deposit / Recharge 導向站內存款頁

#### 4.1 Shared hook：新增 default-off optional callback

修改 `src/common/hooks/useBetByGame.ts`：

- 在 `UseBetByGameOptions` 新增 backward-compatible optional live getter：

  ```ts
  onRecharge?: () => (() => void) | undefined
  ```

- `BTRenderer.initialize()` 的 `onRecharge` 每次被 SDK 觸發時才讀取 getter：
  1. caller 有提供 handler：執行 handler 並 return。
  2. caller 未提供 handler：完整保留既有 `showNotification(t("common.alarm.insufficientBalance"))` fallback。
- Shared hook 不得 import R031 route、router、BCY1 template 或 hardcode `MemberDeposit`。
- 不改變 `onLogin`、`onRegister`、`onSessionRefresh`、token refresh、wallet、language、themeName、offset 或 launch lifecycle。

#### 4.2 Shared component：只做 prop plumbing

修改 `src/common/components/BetByArea/Index.vue`：

- 新增 optional prop：

  ```ts
  onRecharge?: () => void
  ```

- 傳入 `useBetByGame()` 時使用 live getter `onRecharge: () => props.onRecharge`。
- 未傳 prop 的所有既有 BETBY consumers 必須保持目前 notification fallback。
- 不新增 route、agent、siteKey 判斷。

#### 4.3 R031 caller：只讓 BCY1 opt in

修改 `template/set_r031/pages/BetByPage/Index.vue`：

- 使用現有 `useRouter()`；新增 BCY1-only computed callback，沿用本頁 Login/Register callback pattern。
- `isBCYM === true` 時，BETBY recharge callback 執行：

  ```ts
  void router.push({ name: "MemberDeposit" })
  ```

- `isBCYM === false` 時不傳 handler，讓 shared fallback 維持原樣。
- PC 與 H5 使用同一個 callback；不得只修一個 breakpoint。
- `MemberDeposit` 的既有 auth guard 是唯一權限入口：
  - 已登入：到 `/member/deposit`。
  - 未登入：沿用既有全站 needAuth/login 行為。
- 不在 callback 內另做登入判斷、通知、modal、hardcoded URL 或 `window.open()`。

### REQ-2：BCY1 Logo 回首頁必須重建 BETBY

修改 `template/set_r031/components/Header/Index.vue`：

- 將 template inline `$router.push('/')` 改成明確的 `handleLogoClick()`。
- Handler 必須使用既有 `isBCYM`：
  - BCY1：以 router resolve 取得 root/home href，再用 `window.location.assign(rootHref)` 做同頁 hard navigation。
  - 非 BCY1：維持目前 SPA `router.push('/')` 行為。
- 建議概念：

  ```ts
  const handleLogoClick = () => {
    if (isBCYM.value) {
      window.location.assign(router.resolve({ name: "home" }).href)
      return
    }
    void router.push("/")
  }
  ```

- 不 hardcode 測試／正式 domain；必須保留同 origin、base path 與部署設定。
- 不用 `window.location.reload()` 保留現有 `bt-path` query；目標是先回乾淨 root，再由 fresh BETBY initialize 建立預設 `bt-path`。
- 不在 shared router guard 加 BCY1 reload，不 watch 所有 query 做 global renderer relaunch，不新增 `:key="$route.fullPath"` 讓每個 BETBY 內部 route change 都重建 component。
- Hard navigation 只限使用者點擊 BCY1 Header Logo；其他 route navigation、Logo 以外的 CMS navigation、非 BCY1 R031 站維持 SPA 行為。

## 5. Scope 與受影響檔案

### 預期修改的 production files

1. `src/common/hooks/useBetByGame.ts`
2. `src/common/components/BetByArea/Index.vue`
3. `template/set_r031/pages/BetByPage/Index.vue`
4. `template/set_r031/components/Header/Index.vue`

### 預期只讀參考

- `template/set_r031/router/routes.ts`
- `template/set_r031/layout/Index.vue`
- `template/set_r031/pages/Member/MemberDeposit.vue`
- `template/set_r031/layout/AsideMenu.vue`
- `template/set_r031/components/Header/components/WalletDropdown.vue`
- `src/common/hooks/useAgentCode.ts`
- `src/router/index.ts` 與既有 auth guard
- GSI-257／GSI-409／GSI-480 specs、Jira 與 commits

### 跨站影響 gate

- 前兩個檔案是 shared BETBY surface；GSI-570 是 BCY1 單站需求。
- Shared 只允許新增 optional、default-off callback plumbing；未 opt in 時 outcome 必須與現況相同。
- Agent/site 決策只能存在於 `template/set_r031`。
- 使用者本次只要求分析與寫 spec，尚未授權 production shared touch。實作者開始修改前，必須取得使用者對上述兩個 shared files 的明確確認。

## 6. Out of scope

- 不修改代理端 `Whitelabel_GSI_Dashboard`。
- 不擴大到其他 agent、其他 set_r031 站或所有 BETBY consumer。
- 不把 BCY1 的存款 route 設為 shared default。
- 不修改 BETBY product code 1244、launch endpoint、request/response types、JWT、wallet/currency、language mapping、themeName、offset、z-index、container、scroll、sidebar hide、Login/Register 或 session refresh。
- 不把 `onRecharge` 改名成未經現有 SDK 驗證的 callback，不 patch BETBY iframe/shadow DOM/private method。
- 不改站內 Header Deposit、Aside Deposit 或會員存款頁本身；它們已使用 `MemberDeposit`。
- 不新增／修改 user-facing copy、notification 文案或 remote i18n key。
- 不新增 local locale JSON，不 inspect／修改／格式化／提交 `src/env/environment.json`。
- 不順手修 ESLint warning、console、`/* eslint-disable */`、import ordering以外的無關程式。
- 不在本需求內自行 commit、push、merge、開 MR/PR 或部署；每一步需使用者另行明確指示。

## 7. i18n 狀態

- 本需求沒有新增或修改 user-facing copy。
- `common.alarm.insufficientBalance` 只作為「未 opt in consumer」的既有 fallback 保留；BCY1 成功導向時不新增通知。
- Remote i18n mapping：N/A；無 `REUSED`／`CREATED`／`BLOCKED` 項目。

## 8. 關鍵決策與理由

1. **使用既有 `onRecharge` SDK callback，不攔截 DOM click。**
   - 現有 integration 已明確接收 `onRecharge`；Jira 畫面與 current fallback 直接對上問題。
   - DOM/iframe hack 會依賴 BETBY internal markup，風險不可接受。
2. **Shared 只提供 callback extension point，BCY1 route 決策留在 template。**
   - Renderer instance 與 initialize options 封裝在 shared hook，完全 template-only 無法安全處理 SDK callback。
   - Default-off getter/prop 能隔離其他站，延續 GSI-409 已採用的 Login/Register pattern。
3. **Logo 使用 hard navigation，而不是 watch `route.query`。**
   - Jira 明確要求「像初次開啟網址一樣」；hard navigation 會完整重建 renderer。
   - `bt-path` 是 BETBY 正常內部導覽狀態；若全域 watch query 並 reinitialize，使用者每次瀏覽賽事都可能重建，會造成迴圈、狀態遺失或額外 launch API。
4. **以 router resolve 產生 root href，不 hardcode domain。**
   - 同一實作必須同時支援測試與正式站，也要尊重 Quasar/router base 設定。
5. **不改 auth contract。**
   - `MemberDeposit` 已在 `needAuth` route tree；callback 只表達目的地，登入與權限仍由既有 route guard 管理。

## 9. 驗收條件

### REQ-1 存款導向

- [ ] BCY1 PC 已登入會員在 BETBY betslip 點 Deposit／Recharge 後，前往 route name `MemberDeposit`，網址為 `/member/deposit`，顯示 PC 站內會員存款頁。
- [ ] BCY1 H5 已登入會員在 BETBY sidebar／recharge 入口點 Deposit（包含 remote locale 顯示的等價文字）後，前往 `/member/deposit`，顯示 H5 站內會員存款頁。
- [ ] 上述兩個流程不再顯示 `common.alarm.insufficientBalance` 作為點 Deposit 的結果，也不繼續停留在 BETBY 頁。
- [ ] BCY1 未登入狀態觸發 recharge 時，沿用 `MemberDeposit` route 的既有 needAuth/login 行為；不得進空白存款頁或繞過登入。
- [ ] BCY1 recharge callback 不使用 hardcoded domain/path、新分頁、iframe query 或 DOM click interception。
- [ ] 非 BCY1／未傳 `onRecharge` 的 BETBY consumer 仍執行既有餘額不足通知；不會被導向 R031 `MemberDeposit`。
- [ ] `onLogin`、`onRegister`、`onSessionRefresh`、token refresh、wallet/language relaunch、themeName、offset、z-index 與 sidebar hide 沒有 regression。

### REQ-2 Logo 回首頁

- [ ] BCY1 在 `/?bt-path=%2Flive-section` 之外的 BETBY 內容／更深 `bt-path` 狀態點站點 Header Logo，會發生一次同頁 hard navigation 到乾淨 root。
- [ ] Fresh initialize 後網址形成 `/?bt-path=%2Flive-section`（接受瀏覽器等價 encoding），renderer 顯示預設 live-section；網址與內容一致。
- [ ] 不再出現「網址已移除／改變 `bt-path`，內容仍停在點擊前 BETBY 畫面」的狀態。
- [ ] 快速點 Logo 不造成重複 renderer、navigation loop、空白頁或持續 reload。
- [ ] 從 `/member/deposit` 或 BCY1 其他 route 點 Logo 也回到 BCY1 root BETBY，沒有 hardcoded測試／正式 domain。
- [ ] 非 BCY1 set_r031 Logo 仍使用 SPA navigation；其首頁、history 與 state behavior 不變。
- [ ] BETBY 正常內部 `bt-path` 變更不觸發 renderer reinitialize 或 hard reload；只有站點 Header Logo click 觸發。

### Scope / quality

- [ ] Production diff 僅包含本 spec 預期的 4 個 production files；若需要新增檔案或改 router/auth，先更新 spec並取得確認。
- [ ] Shared `UseBetByGameOptions.onRecharge` 與 `BetByArea.onRecharge` 都是 optional/default-off；shared files 不含 R031、BCY1、route name 或 siteKey hardcode。
- [ ] 無新增 user-facing copy；沒有 local locale file、`src/env/environment.json`、帳密、token、Jira附件或臨時 harness 進入 commit。
- [ ] Targeted formatter/lint 與 `git --no-pager diff --check` 通過；未執行 `tsc --noEmit`。

## 10. 邊界情況與 blocker

- Jira 使用 BCY1/BCYM；實作只沿用現有 `isBCYM` runtime predicate。若目標站 runtime agentCode 不等於 BCY1，停止並更新 spec，不自行新增 alias。
- 若目標 BETBY SDK 實際不觸發 `onRecharge`，先記錄 SDK version、initialize options、console與操作錄影，再由需求方／BETBY 確認 callback contract；不得改用 DOM hack。
- 若 `onRecharge` 在同一次點擊被 SDK 重複呼叫，使用 Vue Router 的相同 navigation handling；不得加入全域 disabled state。只有觀察到實際 duplicate side effect 才能新增最小 in-flight guard，且需先更新 spec。
- 若 `router.resolve({ name: "home" }).href` 在目標部署不是 root，應以 resolve 結果為準；不得硬改成正式 domain。
- 若 hard navigation 後 BETBY 沒有自行建立 `bt-path=/live-section`，先確認 GSI-480 main 基準、launch成功與 SDK route同步；不得用 timer 強塞 query 假裝內容已同步。
- 若未登入 recharge 的產品期待改為只開 Login Dialog、不嘗試 `MemberDeposit`，需求方需明確確認後先更新 spec。

## 11. 測試計畫

> Repo `package.json` 沒有 test script，也沒有 Vitest/Jest。不得為本 fix 引入 test framework；依專案規則使用臨時 harness + Chrome/runtime 驗證，臨時檔不可提交。

### 11.1 臨時 renderer harness（不可提交）

以最小 fake `BTRenderer.initialize()`／callable handler 驗證：

1. 未傳 `onRecharge` option 時，SDK callback仍呼叫既有 insufficient-balance notification。
2. 傳入 `onRecharge` getter 時，SDK callback只呼叫 caller handler一次，不同時呼叫 fallback notification。
3. Getter 在 SDK event 當下讀取；prop/handler 更新後不需要重建第二個 hook instance。
4. `BetByArea` 未傳新 prop時 shared behavior 不變。
5. BCY1 caller產生 `router.push({ name: "MemberDeposit" })`；非 BCY1 caller回傳 `undefined`。
6. Logo handler：BCY1只呼叫一次 hard navigation至 router-resolved root；非 BCY1只呼叫 SPA push。

如果 mocking Vue/Quasar/router 迫使 production code 大幅重構，停止並以 focused code assertion + Chrome evidence補足；不得為測試擴張 production scope。驗證後刪除／unstage臨時 harness。

### 11.2 Chrome / runtime 驗證

- 所有 URL 依專案規則使用 Chrome extension，不使用 in-app browser。
- 使用 BCY1 測試環境與 QA 提供的登入測試資料；帳密不得寫入 spec、程式、log或 commit。
- Viewport：
  - Desktop：至少 1366×768。
  - H5：至少 390×844，另以實機或 360×800 smoke。
- PC/H5 各執行：
  1. 登入並等待 BETBY/wallet 完成初始化。
  2. 從 BETBY Deposit／Recharge 入口前往 `/member/deposit`。
  3. 返回 BETBY，導覽至非預設 `bt-path` 內容。
  4. 點站點 Header Logo，確認 hard navigation、fresh launch、預設 URL與內容一致。
  5. 檢查沒有 duplicate launch、infinite reload、console error與舊餘額不足 toast。
- 未登入 smoke：recharge 仍走既有 auth/login flow；不出現空白存款頁。
- 非 BCY1 regression：至少一個使用 shared `BetByArea` 的 consumer未傳 callback，recharge fallback與 Logo SPA navigation維持原樣。
- 記錄 agentCode、viewport、起訖 URL、route name、initialize 次數、recharge callback、存款頁可見內容、Logo 後的 `bt-path`與 console error。

### 11.3 Targeted static validation

```sh
pnpm exec prettier --check src/common/hooks/useBetByGame.ts src/common/components/BetByArea/Index.vue template/set_r031/pages/BetByPage/Index.vue template/set_r031/components/Header/Index.vue
pnpm exec eslint src/common/hooks/useBetByGame.ts src/common/components/BetByArea/Index.vue template/set_r031/pages/BetByPage/Index.vue template/set_r031/components/Header/Index.vue
git --no-pager diff --check
```

- ESLint 只處理本次新增且阻擋驗證的 error；不清理無關既有 warning。
- `git status --short`／diff/review 排除 `src/env/environment.json`，確認沒有臨時測試、帳密、環境設定或無關檔案。
- 不執行 `tsc --noEmit`。

## 12. Git Flow

- 基底分支：`main`。
- 工作分支：`fix/gsi-570-bcy1-betby-navigation`。
- 實作者開始前：
  1. 取得使用者對兩個 shared files 新增 backward-compatible optional callback API 的明確確認。
  2. 保留目前工作樹與其他 ticket 的使用者修改，不得覆蓋或帶入本 fix。
  3. 切到 `main`；pull 前先以 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` 非互動確認 HTTPS token / Keychain 可用。失敗時停止回報，不改用 SSH。
  4. 更新最新 `main`，再從它建立並切換到 `fix/gsi-570-bcy1-betby-navigation`。
  5. 未切到上述工作分支前不得實作；不可直接在目前的 GSI-480 分支、`main`、`develop` 或 `staging` 修改。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging QA）→ `main`（正式）；不得跳關。
- 每一次 commit 都必須先取得使用者針對該次 commit 的明確確認；本次分析／寫 spec 不構成 commit 授權。
- 合併進任何分支前必須再次取得使用者明確確認；有 conflict 時停止／abort並回報，不自行 resolve或改 merge strategy。
- 不預設 rebase，不主動把 target branch 合回工作分支。
- 不主動開 MR/PR；push 後只提供 GitLab回傳連結，由使用者決定。
- Merge 到環境分支不等於發版；只有使用者明確要求「發版/release」才可執行 `yarn deploy`，並選 `set_r031`、版號接受預設、最後確認 `y`。

## 13. 交接給實作者 / reviewer

- 建議順序：shared touch確認 → 更新 main／建分支 → 臨時 harness → shared `onRecharge` optional plumbing → BCY1 BetByPage callback → BCY1 Header Logo hard navigation → static checks → PC/H5 Chrome驗證 → non-BCY1 smoke → 刪除臨時 harness。
- 不要把 GSI-257／409／480 的已完成調整重做或回退；本 ticket只新增 recharge導向與 Logo fresh-start行為。
- 實作前若最新 main 已修改 `useBetByGame`、`BetByArea`、R031 BetByPage、Header Logo或 routes，先更新本 spec 的 current-state anchors與決策，再改 code。
- Reviewer 必須逐條標記「驗收條件」通過／不通過；無法在可用 BETBY地區／帳號驗證的 runtime項目標記「待 QA」，不得用 code inspection宣稱已通過。
- 任何需求變更先更新 spec，再繼續實作。
