# GSI-280 ARG1 全遊戲固定使用 Full-screen Dialog

> 交接合約：Spec 作者（Codex）產出，指定實作者依此實作，reviewer 對照「驗收條件」逐條 review。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-280-arg1-force-game-dialog.md`（版控於 ai-config）。
> 本 spec 已包含需求、repo 現況與實作決策；實作者不得依對話記憶自行擴張需求。

## 背景 / 目標

- 需求來源：[Jira GSI-280](https://gamingsoft.atlassian.net/browse/GSI-280)。
- Jira 狀態：待處理；Priority：Highest；建立日：2026-07-16。
- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 目標站點：STG、總代 `ARGM`、代理代碼 `ARG1`、會員端 `https://obtn.gsiwl.com/`。
- 目標 template：`template/set_r022`。Jira GSI-278 對同一會員端網址明確標示為 `set_r022｜R022`；repo 本身沒有維護 domain → siteKey mapping，因此此 mapping 以 Jira 為外部需求依據。
- MGA 審核指出 sportsbook 未維持在同一 domain；需求方與 GS 確認改用 Full-screen Dialog 後可通過，因此 ARG1 的所有遊戲都必須固定以 maximized dialog + iframe 開啟。
- 「全部遊戲」的判斷點是 shared `useGame().customGameOpenMethod()`：ARG1 必須在所有 product/game-specific 規則之前固定回傳 `FORCE_USE_GAME_DIALOG`。

## 現況與研究結論

### 既有參考站 Fa11 / Fa21 / ZPL1

- `Fa11`、`Fa21`、`ZPL1` 不是 template 目錄，而是 runtime `agentCode`。
- `src/common/hooks/useAgentCode.ts` 已分別定義 `FA11_AGENTS = ["fa11"]`、`FA21_AGENTS = ["fa21"]`、`ZPL1_AGENTS = ["zpl1"]`，並暴露 `isFA11`、`isFA21`、`isZPL1`。
- `src/common/composables/useGame.ts` 的 `customGameOpenMethod()` 先判斷上述三個 agent；命中時直接回傳 `OPEN_GAME_MODE.Enums.FORCE_USE_GAME_DIALOG`，優先於後續 product/game-specific 規則。
- Fa11/Fa21 由 commit `c9b1a5ef7` 加入；ZPL1 由 commit `e04fde1ec` 延伸同一條 OR guard，三者 runtime 行為相同。

### Full-screen Dialog 實際行為

- `OPEN_GAME_MODE.Enums.FORCE_USE_GAME_DIALOG` 的定義是「遊戲彈窗 + iframe」。
- launch API 成功後，`useGame.ts` 會顯示 `launchGameDialog`，並把 response 的 `game_url` 與 `game_content` 寫入 store；不走 `openURL()`、`window.location.href` 或自訂 route。
- `src/common/components/dialog/LaunchGame.vue` 使用 persistent、`maximized=true` 的 Quasar dialog，內容由 100% 寬度 iframe 顯示；這就是 Jira 所稱的 Full-screen Dialog。
- `template/set_r022/pages/HomePage/index.vue` 已掛載 shared `<LaunchGameDialog />`；FreeSpin 頁也有掛載，因此本需求不需新增或重做 dialog UI。

### ARG1 現況

- `src/common/hooks/useEnv.ts` 與 `src/stores/envStore.ts` 已能辨識 `ARG1`，但 `useAgentCode.ts` 尚無 ARG1 專用 predicate。
- `set_r022` 的遊戲入口使用 shared `useGame().openGame()`；template-only 修改無法完整覆蓋所有遊戲 launch path。
- 目前 default 成功流程在拿到絕對 `game_url` 時通常呼叫 `openURL()`，會離開目前 top-level domain 或另開視窗；只有部分 mobile/relative URL 或 `game_content` 才自動使用 dialog。
- GSI-280 只要求改「開啟方式」，沒有要求改 launch API endpoint、request payload、legacy/v2 protocol 或 response contract。

## 範圍

1. 在 `src/common/hooks/useAgentCode.ts` 新增語意獨立的 ARG1 agent 判斷：
   - 新增 `ARG1_AGENTS = ["arg1"]`（命名可依既有風格微調，但不得把 ARG1 塞進 FA11/FA21/ZPL1 的常數）。
   - 新增 computed `isARG1`，沿用既有 `checkAgentCode()` 的 case-insensitive 判斷。
   - 從 `useAgentCode()` return object 暴露 `isARG1`。
2. 在 `src/common/composables/useGame.ts`：
   - 從 `useAgentCode()` 取得 `isARG1`。
   - 將 ARG1 加入 `customGameOpenMethod()` 最前面的強制 dialog guard。
   - ARG1 命中時，任何 product code / game code 都回傳 `FORCE_USE_GAME_DIALOG` 與 `routeName: undefined`。
   - 保留 Fa11、Fa21、ZPL1 的既有行為與優先序。
3. 以 ARG1 / `set_r022` 驗證 sportsbook 與至少一個非 sport 遊戲都使用現有 maximized LaunchGameDialog，且 top-level 頁面不離開 `obtn.gsiwl.com`。

## Out of scope（明確不做）

- 不修改代理端 `Whitelabel_GSI_Dashboard`。
- 不把需求擴大到 ARGM 旗下所有代理、所有 R022 站、所有 MGA 站或其他 agentCode；runtime 只匹配 `ARG1`。
- 不修改 Fa11、Fa21、ZPL1 的 agent list 或既有行為。
- 不修改 launch API endpoint、`Request.LaunchGame`、`is_v2`、integration/game type/wallet/currency/language payload 或 response types。
- 不恢復或混入歷史 commit `75c0b2476` 的 ARGM legacy launch payload 變更；那是不同議題，且會擴大跨站風險。
- 不修改 product-specific `customGameOpenList` 規則；ARG1 只透過最前面的 agent override 取得更高優先序。
- 不新增 dialog、route、template-local hook、iframe 元件或 UI 樣式；沿用現有 `LaunchGame.vue`。
- 不調整 dialog close button、transition、z-index、header、iframe sandbox 或 RWD。
- 不修改登入、錢包/幣別、loading、錯誤通知、currency support dialog、favorite/free spin 或其他遊戲業務流程。
- 不搜尋、建立或修改 local locale JSON；不新增 i18n copy/key。
- 不 inspect、修改、格式化或提交 `src/env/environment.json`。
- 不順手修 ESLint warning、重構 agent flags 或整理無關 launch code。
- 不在本需求內 commit、push、merge、開 MR/PR 或部署；皆需使用者另行明確指示。

## 受影響範圍

- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 目標 runtime scope：僅 `agentCode === "ARG1"`（case-insensitive）。
- 目標 template/siteKey：`template/set_r022`，但預期不修改 template 檔案。
- 預期修改檔案：
  - `src/common/hooks/useAgentCode.ts`
  - `src/common/composables/useGame.ts`
- 預期只讀驗證檔案：
  - `src/common/utils/constants/openGameMode.ts`
  - `src/common/components/dialog/LaunchGame.vue`
  - `src/stores/gameDialogStore.ts`
  - `template/set_r022/pages/HomePage/index.vue`
  - `template/set_r022/pages/FreeSpin/Index.vue`
  - `template/set_r022/pages/GameLobby/GameList.vue`
- 跨站影響：會修改兩個 shared 檔案，但 branch 必須以 `isARG1` 精確 guard；其他 agent 的 runtime 分支、default behavior 與 product-specific 規則不得改變。採 shared agent guard 是既有 Fa11/Fa21/ZPL1 pattern，也是覆蓋所有 ARG1 launch 入口的最窄可行方案。

## 參考實作 / 要遵循的現有 pattern

1. `src/common/hooks/useAgentCode.ts:46-55,123-128,152-157`
   - 參考 Fa11、Fa21、ZPL1 的常數、computed 與 return exposure 寫法。
   - `checkAgentCode()` 已負責 lower-case 比對與空值保護，不另寫第二套比對邏輯。
2. `src/common/composables/useGame.ts:125,683-705`
   - 參考既有 `isFA11 || isFA21 || isZPL1` 的最前置 override。
   - ARG1 必須加入同一優先層級，不在每個 product entry 重複設定。
3. `src/common/composables/useGame.ts:853-921`
   - `FORCE_USE_GAME_DIALOG` 成功分支是唯一要觸發的既有 open behavior；不得複製 response handling。
4. `src/common/utils/constants/openGameMode.ts:1-15`
   - 沿用 `FORCE_USE_GAME_DIALOG`，不新增 enum。
5. `src/common/components/dialog/LaunchGame.vue:1-32,89-93`
   - 現有 maximized Quasar dialog + iframe 就是 Full-screen Dialog 的 source of truth。
6. `template/set_r022/pages/HomePage/index.vue:45,68-69`
   - 已掛載 shared dialog，禁止新增第二個 instance。

## 關鍵決策與理由 (Key decisions)

1. **沿用 Fa11/Fa21/ZPL1 的 agent-code override。**
   - 使用者指定這三站作為參考；repo 顯示它們共用完全相同的 `FORCE_USE_GAME_DIALOG` pattern。
   - 這個判斷位於所有 product/game-specific 規則之前，能客觀滿足「全部遊戲」。
2. **新增獨立 `isARG1`，不把 ARG1 併入其他品牌常數。**
   - Agent identity 與行為需求應分離；把 ARG1 塞入 FA11 list 會造成錯誤語意，也讓後續維護無法知道 MGA 特規來源。
3. **shared file + exact runtime guard，而非 template-only patch。**
   - `set_r022` 各入口最後都走 shared `openGame()`；template-only patch 容易漏掉 sport、free spin 或未來入口。
   - 只匹配 ARG1，讓 shared code 變更不改變其他站點 runtime behavior。
4. **只改開啟策略，不改 API protocol。**
   - Jira 沒有 payload/endpoint 需求；歷史 ARGM legacy payload 問題屬不同風險面。
   - Dialog mode 只決定成功 response 如何呈現，應與 launch request 保持正交。
5. **不新增 Full-screen UI。**
   - 既有 `LaunchGame.vue` 已 persistent + maximized，且 set_r022 已掛載；新增 dialog 會造成重複狀態與視覺分歧。

## 驗收條件

> Reviewer 必須逐條判定通過／不通過，不得只以「有看到 iframe」概括驗收。

- [ ] `useAgentCode()` 對 `agentCode = "ARG1"` 與 `"arg1"` 都使 `isARG1.value === true`；空字串、`ARGM`、`FA11`、`FA21`、`ZPL1` 與任意其他 code 不會誤命中 `isARG1`。
- [ ] `customGameOpenMethod()` 在 ARG1 環境中，對任意 `product_code` / `game_code` 都優先回傳 `FORCE_USE_GAME_DIALOG` 與 `routeName: undefined`。
- [ ] ARG1 的 sportsbook 實際 launch 成功後顯示現有 maximized `LaunchGameDialog`；top-level location 不跳至 game provider domain、不另開新分頁/視窗。
- [ ] ARG1 至少一個非 sportsbook 遊戲也使用相同 maximized dialog，證明規則不是只綁單一 product code。
- [ ] API 回 `game_url` 時 iframe `src` 使用該 URL；API 回 `game_content` 時沿用現有 iframe document write 流程；兩種 response 形式都不走 `openURL()` 或 `window.location.href`。
- [ ] Dialog 可用既有 close button 關閉；關閉後 store 的 show/url/content 依既有 `closeDialog()` 行為清除，下一次 launch 可正常開啟。
- [ ] Fa11、Fa21、ZPL1 仍固定使用 dialog，沒有 predicate 或優先序 regression。
- [ ] 至少抽驗一個非 ARG1/FA11/FA21/ZPL1 agent：default open behavior 與 product-specific override 保持原樣。
- [ ] `Request.LaunchGame` payload、launch endpoint、login/currency/wallet/loading/error handling 沒有 diff。
- [ ] 沒有新增或修改 `template/set_r022` UI、route、dialog instance、local locale JSON 或 `src/env/environment.json`。
- [ ] Diff 僅包含本 spec 預期的兩個 production files；臨時測試/harness 在 commit 前已刪除或 unstage。
- [ ] Targeted Prettier/ESLint 與 `git --no-pager diff --check` 通過；未執行 `tsc --noEmit`。

## 邊界情況 / 例外

- `agentCode` 可能是大寫或小寫；沿用 `checkAgentCode()` case-insensitive 行為，不在 call site 手動重複 lower-case。
- 未登入、沒有 active currency/wallet、launch API error 或 currency/wallet restriction 時，不應打開空 dialog；維持現有前置檢查與錯誤流程。
- API 可能只回 `game_url`、只回 `game_content` 或兩者皆有；沿用現有 dialog renderer，不改 response precedence。
- Provider iframe 可能跨網域；top-level 保持 `obtn.gsiwl.com` 是預期，iframe 內容跨域本身不是失敗。
- 若某個 ARG1 遊戲因 provider 的 `X-Frame-Options` / CSP 無法嵌入，記錄 product/game 與 browser console/network evidence，停止擴大修改並先更新 spec；不得自行改回 new tab 或放寬全站安全設定。
- 若 runtime 取得的 agentCode 不是 `ARG1`，先回報實際值並更新 spec；不得擅自把 `ARGM`、hostname 或整個 R022 納入 allowlist。
- 若某個 set_r022 launch 入口沒有掛載 `LaunchGameDialog`，先補齊研究證據並更新 spec；不得在多頁任意複製 dialog。

## 測試計畫

> Repo `package.json` 沒有 test script，也沒有宣告 Vitest/Jest。依專案規則仍需寫測試驗證，但不得為本需求引入測試 framework；臨時測試/harness 驗證後刪除，不可進 commit。

### 1. Agent predicate / open strategy 臨時測試

- 建立臨時、不可提交的 unit-style test/harness，至少覆蓋：
  1. `ARG1` / `arg1` 命中 `isARG1`。
  2. 空字串、`ARGM` 與其他 agent 不命中。
  3. ARG1 對一般 game、sport product 與原本有 product-specific override 的 product 都得到 `FORCE_USE_GAME_DIALOG`，證明 agent guard 優先。
  4. Fa11/Fa21/ZPL1 仍命中 dialog；一般 agent 仍走原規則。
- 優先用 repo 已有 dependencies 與 Node.js 22 執行；不得新增 dependency。若 composable mocking 成本迫使 production code 大幅重構，停止並回報，改以最小 runtime harness + browser evidence，不為測試擴張 production scope。
- 驗證後刪除臨時檔；commit 不含任何 test/harness。

### 2. Browser / runtime 驗證（Chrome extension）

- 依專案規則，所有 URL 使用 Chrome extension，不使用 in-app browser。
- 使用 QA 提供的 ARG1 帳號登入 `https://obtn.gsiwl.com/`；帳密不得寫入 spec、程式、測試或 commit。
- 至少驗證：
  1. 一個 sportsbook。
  2. 一個非 sport 遊戲。
  3. 一個回 `game_content` 的遊戲（若測試資料可用）。
- 每次 launch 記錄：agentCode、product/game 類型、desktop/mobile viewport、top-level URL 是否維持 `obtn.gsiwl.com`、是否沒有新 tab/window、dialog 是否 maximized、iframe 是否完成載入、close/reopen 是否正常。
- Desktop 與 360px mobile viewport 各至少跑一個案例。
- 若尚未部署到可測環境，先完成 static/temporary-test verification，將 STG E2E 明確標為「待部署後驗證」，不得宣稱已通過 MGA 情境。

### 3. Targeted validation

- 對 touched files 執行：
  - `pnpm exec prettier --check src/common/hooks/useAgentCode.ts src/common/composables/useGame.ts`
  - `pnpm exec eslint src/common/hooks/useAgentCode.ts src/common/composables/useGame.ts`
  - `git --no-pager diff --check`
- ESLint 只處理本次新增且會阻擋驗證的 error；不清理無關既有 warning。
- 檢查 `git status --short` 時排除 `src/env/environment.json`，並確認沒有臨時測試、環境設定、帳密或無關檔案。
- 不執行 `tsc --noEmit`。

## Git Flow

- 基底分支：`main`。
- 工作分支名稱：`feat/gsi-280-arg1-force-game-dialog`。
- 實作者開始前：
  1. 保留目前工作樹的使用者修改，不得覆蓋或帶入本 feature。
  2. 切到 `main`；拉取前先以 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` 非互動確認 HTTPS token / Keychain 可用。失敗時停止回報，不改用 SSH。
  3. 更新最新 `main`，再從它建立並切換到 `feat/gsi-280-arg1-force-game-dialog`。
  4. 未切到上述工作分支前不得實作；不可直接在 `main`、`develop`、`staging` 或目前的其他工作分支修改。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging/MGA 驗證）→ `main`（正式），每階段測試通過才可進下一關，不得跳關。
- 每一次 commit 都必須先取得使用者針對該次 commit 的明確確認；本次「先研究再寫 spec」不構成 commit 授權。
- 合併進任何分支前都必須再次取得使用者明確確認；有 conflict 時停止/abort 並回報，不自行解 conflict 或改 merge strategy。
- 不預設 rebase，不主動把 develop/staging/main 合回工作分支。
- 不主動開 MR/PR；push 後只提供 GitLab 回傳連結，由使用者決定。
- merge 到環境分支不等於發版；只有使用者明確要求「發版/release」才可執行 `yarn deploy`，並選擇 ARG1 實際使用的 template。不得因 Jira 標示 set_r022 就在未確認部署選項時自行選版型。

## 交接備註給實作者

- 先從最新 `main` 建立 `feat/gsi-280-arg1-force-game-dialog`，再依本 spec 實作。
- 建議順序：臨時 predicate/strategy test → `useAgentCode.ts` 新增 ARG1 → `useGame.ts` 加入最前置 guard → targeted checks → ARG1 browser verification → 刪除臨時 test/harness。
- Spec 研究快照：2026-07-16，專案 commit `05c9af0516a7817349f14664facf756e05ee9819`。
- 撰寫 spec 時專案 checkout 位於無關分支 `fix/gsi-70-deposit-qrcode-all-templates`；實作者不可在該分支直接修改 GSI-280。
- 如果 main 在實作前已調整 agent predicates、`customGameOpenMethod()` 或 dialog mount，先重新對照 Fa11/Fa21/ZPL1 pattern並更新本 spec，再開始修改。
- 完成後 reviewer 必須逐條 review「驗收條件」與 Out of scope；任何需求變更先改 spec，再改 code。
