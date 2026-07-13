# 會員端代理中心－代理報表新增「30天」快捷日期選項

> 交接合約：Spec 作者（Claude）產出，指定實作者依此實作，reviewer 對照「驗收條件」review。Claude 與 Codex 的角色可互換。
> 位置慣例：`~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/agent-center-30-day-quick-date.md`（版控於 ai-config）
> 本 spec 已含實作所需全部需求資訊與 repo 佐證，實作者不需回頭開 Notion。

## 背景 / 目標

- 需求來源：Notion「[需求 會員端] 代理中心－新增『30天』的快捷日期選項」（ID 3659）
  https://app.notion.com/p/wowgaming/30-2b0fc5d788a980cf855ee5ae10309d5d
- 端別：會員端（`Whitelabel_GSI_Platform_Multiverse`）。站台／版型：全站。環境：測試、正式。
- 功能位置：會員端 → 代理中心 → 代理報表（代理中心 = 各版型的 `MembershipManagement` 頁；代理報表 = 其中 `agentReport` 分頁）。
- 現況：代理報表查詢表單的快捷日期只有「今天」「昨天」「7天」。
- 調整：新增「30天」，完成後選項依序為「今天」「昨天」「7天」「30天」。

## 範圍

1. 在代理報表查詢表單的快捷日期 toggle 中新增第 4 個選項「30天」，排在「7天」之後（今天 → 昨天 → 7天 → 30天）。
2. 點選「30天」時，草稿日期區間帶入「今天往前共 30 個日曆天（含今天）」：`from = 今天-29天`、`to = 今天`（本地時間、`YYYY-MM-DD`）。
3. 查詢行為沿用既有流程：選快捷鍵只更新草稿區間，按「查詢」才送出；API 參數與時間邊界處理完全不變。

## Out of scope（明確不做）

- 不改「今天」「昨天」「7天」三個既有選項的任何行為、順序、樣式。
- 不改預設選取（進入頁面／`reset()`／`initTab()` 仍預設「7天」）。
- 不改 31 天上限驗證（`useAgentReport.ts:592`）與其錯誤訊息。
- 不改 `src/common/utils/constants/reportDateTypes.ts` 與 `reportDateType.ts`（enum、I18nKeys、SubtractDays 皆已存在，照用即可，禁止增刪改）。
- 不動其他功能的快捷日期：`useHistory.ts`、`usePendingOrder.ts`、`MemberHistory` / `MemberOrder` 共用元件、各 template 的 History / Orders / Refer / ShareholderPlatform 等自有 `dayTypeTabs` 一律不碰。
- 不動 API：`src/api/userInfo.ts`、`src/api/request.type.ts`、`src/api/response.type.ts` 不需要也不允許修改。
- 不處理「部分版型（如 okbet_green、set_amuse、set_r024、set_r025）的代理中心 tab 列出現 agentReport 但沒有對應 panel」的既有現象——那是既存狀態，與本需求無關，禁止順手修。
- 不新增／搬移任何版型的代理報表入口，不做其他報表、其他分頁、無關 UI 的調整。
- 不新增 local locale 檔（本 repo i18n 為 runtime 遠端載入），不發明新 i18n key。
- 不動 local 開發環境設定檔（active skin 設定屬 local-development-only，不 inspect、不修改、不入 commit）。

## 受影響範圍

- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- **預期 diff 只有一個檔案**：`src/common/composables/useAgentReport.ts`（兩處小改，見「參考實作」）。
- 例外允許：若新增第 4 顆按鈕後 toggle 版面實際跑版，才允許最小幅度調整代理報表自身樣式面（`src/common/components/AgentReport/agentReport.scss` 或三個受影響版型的 `template/<siteKey>/assets/css/agentReport.scss`），並在回報中說明。已檢查現有樣式（shared scss `agent-report__date-toggle` 為 flex、無固定寬 / 按鈕數假設；okbet `assets/css/agentReport.scss:25-28`、okbet_red `:83-86` 只有 `flex-shrink: 0`），預期不需要改。
- **跨站影響（shared path，已證實、屬需求本意）**：
  - 代理報表整個 UI 與邏輯只有一份共用實作：`src/common/components/AgentReport/`（元件）＋ `src/common/composables/useAgentReport.ts`（狀態/邏輯，`createSharedComposable`，經 `AGENT_REPORT_KEY` provide/inject）。
  - 全 repo 掛載此元件的只有 3 個版型，各自的 wrapper 都只是 `import AgentReport from "src/common/components/AgentReport/Index.vue"`：
    - `template/okbet/pages/MemberCenter/components/MembershipManagement/AgentReport.vue`
    - `template/okbet_blackGold/pages/MemberCenter/components/MembershipManagement/AgentReport.vue`
    - `template/okbet_red/pages/MemberCenter/components/MembershipManagement/AgentReport.vue`
  - 沒有任何 template-local 的代理報表 fork（以 `rg -l -i "agentreport" template` 全查證實，僅上述 3 版型的 wrapper + 各自 agentReport.scss）。
  - 因此「全站」= 改這條 shared path 即覆蓋所有有代理報表的站台（上述 3 版型），不多不少。Notion 需求明寫全站，此 shared 修改即需求本意，不需再徵求隔離方案。
  - `useAgentReport` composable 只被 `src/common/components/AgentReport/Index.vue:40` import；`dayTypeTabs` 只被 `AgentReportSearchForm.vue` 消費——改它不會外溢到代理報表以外的功能。

## 參考實作 / 現況導覽（實作者必讀的精確位置）

現有快捷日期的完整鏈路（全部在 shared path）：

1. **選項清單** `src/common/composables/useAgentReport.ts:304-317` — `dayTypeTabs` computed，目前依序 Today、Yesterday、LastSevenDays，每項 `{ label: t(REPORT_DATE_TYPES.I18nKeys[...]), value: REPORT_DATE_TYPES.Enums.<X> }`。
2. **渲染** `src/common/components/AgentReport/components/AgentReportSearchForm.vue` — desktop 變體 `:45-52`、mobile 變體 `:125-132`，皆為 `<q-btn-toggle v-model="report.dateType" :options="report.dayTypeTabs" />`。兩個變體吃同一份 `dayTypeTabs`，選項加在 composable 一處即同時生效；variant 由 `useMediaQuery().isMobile` 決定（`Index.vue:55`）。
3. **選取 → 帶入草稿區間** `useAgentReport.ts:766` `watch(dateType, applyDateTypeToDraft, { immediate: true })`；`applyDateTypeToDraft`（`:337-353`）switch：
   - Today：`from = to = getToday()`
   - Yesterday：`from = to = getYesterday()`
   - LastSevenDays：`{ from: getLastOrOverDay(-6), to: getLastOrOverDay(0) }` ← **本需求要模仿的 pattern**
4. **手動改日期會清掉快捷選取** `useAgentReport.ts:328-335` — `clearDateTypePreset()` 把 `dateType` 設為 `-1`（型別 `AgentReportDateType = REPORT_DATE_TYPES.Enums | -1`，`:54`，已涵蓋 LastThirtyDays，不需改型別）。
5. **查詢** `useAgentReport.ts:581-625` `handlerSearchAgentReport`：驗證區間天數 ≤ 31（`:592`，`getAgentReportRangeDays`），commit 草稿後呼叫 `getMemberAgentReportData`（`:698-718`）與 `getMemberTeamAgentReportData`（`:720-`），API 參數 `start_time: range.startDate`、`end_time: range.endDate` 皆為 `YYYY-MM-DD` 字串（request 型別 `src/api/request.type.ts:1000-1014`）。
6. **時間邊界語意** `src/common/components/AgentReport/utils/search.ts:18-52` — `from` 補 `T00:00:00`、`to` 補 `T23:59:59` 計算天數與驗證；此層不需改，30天選項只提供 from/to 日期字串，邊界處理自動沿用。
7. **日期工具** `src/common/utils/dayjsUtils.ts` — `dateFormat = "YYYY-MM-DD"`（`:10`）、`getToday`（`:29`）、`getYesterday`（`:33`）、`getLastOrOverDay(n)` = `dayjs().add(n, "day")`（`:81`），皆本地時間。
8. **常數（已存在，直接用）** `src/common/utils/constants/reportDateTypes.ts` — `Enums.LastThirtyDays`（=3，`:8-9`）、`I18nKeys[LastThirtyDays] = "common.btn.withinThirtyDays"`（`:24`）；由 `src/common/utils/constants/index.ts:86` 以 `REPORT_DATE_TYPES` 匯出，`useAgentReport.ts:6` 已 import。

### 預期 diff（示意，兩處都在 `src/common/composables/useAgentReport.ts`）

- `dayTypeTabs`（`:304-317`）末尾追加：
  ```ts
  {
    label: t(REPORT_DATE_TYPES.I18nKeys[REPORT_DATE_TYPES.Enums.LastThirtyDays]),
    value: REPORT_DATE_TYPES.Enums.LastThirtyDays
  }
  ```
- `applyDateTypeToDraft`（`:337-353`）switch 增加：
  ```ts
  case REPORT_DATE_TYPES.Enums.LastThirtyDays:
    dateRange.value = { from: getLastOrOverDay(-29), to: getLastOrOverDay(0) }
    break
  ```

## 關鍵決策與理由 (Key decisions)

1. **30天區間 = `getLastOrOverDay(-29) .. getLastOrOverDay(0)`（含今天共 30 個日曆天），不用 `SubtractDays[LastThirtyDays]`（-30）。**
   理由：代理報表自己的「7天」是 `-6..0` = 恰好 7 天（含今天），30天必須沿用同一 inclusive 語意 → `-29..0` = 恰好 30 天。`useHistory.ts:574-576` 的另一套 pattern 用 `SubtractDays`（7天實為 `-7..0` = 8 個日曆天、30天實為 31 天），與代理報表既有語意不一致；本 feature 內部一致性優先。附帶效果：`-29..0` 的 `rangeDays` = 30，穩過 `> 31` 驗證（`useAgentReport.ts:592`），不需動驗證。
2. **文字直接沿用既有遠端 i18n key `common.btn.withinThirtyDays`，零新增 copy。**
   repo 佐證：該 key 早已定義於 `reportDateTypes.ts:24` 並在多個上線功能使用（如 `src/common/composables/useHistory.ts:80-81` 的 30天快捷、各版型 History/Orders 頁）。因此**沒有 copy/翻譯 blocker**；不得發明新 key、不得新增 local locale 檔。
3. **改 shared composable 是需求本意，不做 per-template 隔離。** 需求明寫全站；repo 證實所有有代理報表的版型（okbet、okbet_blackGold、okbet_red）都走同一 shared 元件，無任何 fork（見「受影響範圍」佐證）。
4. **不改 enum / 常數檔。** `LastThirtyDays` enum 值、I18nKeys、SubtractDays 都已存在；動它會外溢到 useHistory 等其他功能。
5. **不改預設選取與 reset 行為。** 需求只加選項；`dateType` 預設（`:81`）、`reset()`（`:465-466`）、`initTab()`（`:492-493`）維持 LastSevenDays。
6. **選項順序用「追加在 7天 之後」實現**，符合需求指定順序 今天→昨天→7天→30天。
7. **不需 API/型別變更。** `start_time`/`end_time` 本來就是任意 `YYYY-MM-DD` 字串；30 天區間只是既有參數的另一組值。

## 驗收條件

> 逐條、可勾選、可客觀判斷。Review 依此判斷過／不過。

- [ ] 代理報表查詢表單的快捷日期 toggle 顯示 4 個選項，順序為：今天、昨天、7天、30天（desktop 變體與 mobile 變體皆然；兩者共用 `dayTypeTabs`，diff 上只允許一處定義）。
- [ ] 「30天」的 label 來自 `t(REPORT_DATE_TYPES.I18nKeys[REPORT_DATE_TYPES.Enums.LastThirtyDays])`（即遠端 key `common.btn.withinThirtyDays`），value 為 `REPORT_DATE_TYPES.Enums.LastThirtyDays`；無任何硬編碼文字、無新造 key。
- [ ] 點選「30天」後，草稿日期區間為 `from = dayjs().add(-29, "day")`、`to = dayjs().add(0, "day")`（`YYYY-MM-DD`、本地時間）——含今天共整 30 個日曆天，與「7天 = -6..0 共 7 天」同一 inclusive 語意；時間邊界仍由既有 `buildAgentReportSearchTimeRange` 以 `T00:00:00`/`T23:59:59` 處理，該檔無 diff。
- [ ] 選「30天」後按「查詢」：送出 `getMemberAgentReport` 與 `getMemberTeamAgentReport`，`start_time`/`end_time` 等於上述 from/to 字串，且不觸發 31 天上限錯誤訊息。
- [ ] 選「30天」後手動改任一日期欄位，快捷選取被清除（`dateType` 回 `-1`）——與既有三個選項行為一致（沿用既有 `clearDateTypePreset` 機制，該處無 diff）。
- [ ] 既有三選項不回歸：今天 = `getToday()..getToday()`；昨天 = `getYesterday()..getYesterday()`；7天 = `getLastOrOverDay(-6)..getLastOrOverDay(0)`；三者的 case 與 `dayTypeTabs` 前三項 diff 上完全未動。
- [ ] 預設行為不變：初次進入代理報表分頁、`reset()`、`initTab()` 後選取仍為「7天」且以 7 天區間自動查詢。
- [ ] 程式 diff 僅含 `src/common/composables/useAgentReport.ts` 的 `dayTypeTabs` 追加一項與 `applyDateTypeToDraft` 新增一個 case；無其他檔案變更（除非觸發樣式例外條款，且已附跑版證據與說明）。
- [ ] 未修改：`reportDateTypes.ts`、`reportDateType.ts`、`src/api/*`、`utils/search.ts`、`AgentReportSearchForm.vue`、useHistory/usePendingOrder 等其他功能、任何 template 檔、任何 local 開發環境設定。
- [ ] 驗證通過：對觸及檔案跑 targeted Prettier/ESLint 無新錯誤、`git --no-pager diff --check` 乾淨；未執行 `tsc --noEmit`。
- [ ] commit 不含任何測試檔／臨時驗證 script（驗證後移除或 unstage）。

## 邊界情況 / 例外

- **跨月／月底點選 30天**：`dayjs().add(-29, "day")` 為日曆天運算，自動跨月（例：today = 3/15 → from = 2/14），無需特別處理；驗證時抽查一次跨月結果即可。
- **手動選出 30–31 天的自訂區間**：與本需求無關，維持既有 `> 31` 驗證行為，不改。
- **`dateType = -1`（自訂狀態）**：q-btn-toggle 無選中項，屬既有行為，不改。
- **某語系遠端缺 `common.btn.withinThirtyDays`**：該 key 已被 History 等功能長期使用，預期各語系已有值；若 QA 在特定語系看到 key 缺字，屬遠端 i18n 資料問題，回報使用者處理，不在前端 repo 內修。
- **mobile 窄幅（約 360px）**：toggle 由 3 顆變 4 顆，需目視確認不溢出、不換行跑版（三個受影響版型皆為同一共用表單 + 各自 scss 覆蓋，抽驗 mobile 變體時特別看 okbet_blackGold 的漸層邊框樣式）。
- **未掛載代理報表的版型**（okbet_green、set_amuse、set_r024、set_r025 等）：不受影響（它們不 mount 共用 AgentReport 元件）；其 tab 列的既有狀態禁止順手動。

## 測試計畫

> repo 無測試 runner（package.json 無 test script、無 vitest/jest）；依規則：寫測試驗證但**測試檔不入 commit**，**不引入新測試基礎設施**，**不執行 `tsc --noEmit`**。

1. **日期區間算術驗證（臨時 Node script，驗完刪除）**：在 repo 根目錄建臨時檔（如 `verify-30d.mjs`，勿加入 git）：
   ```js
   import dayjs from "dayjs"
   const from = dayjs().add(-29, "day"), to = dayjs().add(0, "day")
   const days = to.startOf("day").diff(from.startOf("day"), "day") + 1
   console.log(from.format("YYYY-MM-DD"), "→", to.format("YYYY-MM-DD"), "days:", days)
   if (days !== 30) throw new Error("30天視窗不等於 30 個日曆天")
   ```
   以 `node verify-30d.mjs` 執行，預期輸出 30 天且 `to` 為今天。此步驟驗證選定常數 `-29` 的語意，與「7天=-6..0 共 7 天」對齊。
2. **手動 UI 驗證（dev server）**：受影響版型為 okbet / okbet_blackGold / okbet_red；local active skin 由 local-development-only 設定決定，**實作者不得自行改動該設定**——若目前 active skin 不是受影響版型，請使用者協助切換後再驗。以代理帳號（`is_member_agent`）登入 → 會員中心 → 代理中心 → 代理報表：
   - 確認 toggle 依序顯示 今天／昨天／7天／30天（desktop 視窗與 mobile 視窗各一次；mobile 併驗窄幅不跑版）。
   - 點「30天」→ 日期欄位顯示 `今天-29 ～ 今天`；按「查詢」→ 於 DevTools Network 確認兩支報表 API 的 `start_time`/`end_time` 等於該區間，查詢成功無 31 天錯誤提示。
   - 回歸：依序點 今天、昨天、7天，確認區間分別為 今天、昨天、`今天-6 ～ 今天` 且查詢正常；點 30天 後手動改起始日，確認快捷選取取消。
   - 依 AGENTS.md 慣例，回報中記錄實測的 tenant、breakpoint 與平台；未實測的版型／語系明列為「未驗證」。
3. **靜態檢查**：`npx prettier --check src/common/composables/useAgentReport.ts`、`npx eslint src/common/composables/useAgentReport.ts`、`git --no-pager diff --check`。
4. **收尾**：刪除臨時 script，確認 `git status --short` 無測試/臨時檔後再進入 commit 流程。

## Git Flow

- 基底分支：`main`。實作前先更新 `main`（更新前可用非互動探測 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` 確認 HTTPS 憑證有效；失敗即停止並回報，不改用 SSH）。
- 工作分支名稱：`feat/agent-center-30-day-quick-date`，從最新 `main` 開出。
- 實作者必須先開出上述工作分支才能動工；不可直接在 `main`、`develop`、`staging` 或其他共享分支上實作。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（上線），每階段測試通過才進下一關，不跳關。
- 每一次 commit 都需使用者針對該次提交明確確認；先前的確認不可沿用。
- 合併進任何分支（含 develop/staging/main 每一關）前都需使用者確認；合併衝突時停下回報，不自行解。
- 不主動開 MR/PR；push 後把回傳連結給使用者即可。
- 合併/推進不等於發版；「發版」是另一獨立步驟，僅在使用者明確要求時執行。

## 交接備註給實作者

- 先依上方 Git Flow 從 `main` 開出 `feat/agent-center-30-day-quick-date`，再開始實作。
- 本需求無已知 blocker：enum、遠端 i18n key、驗證上限、API 參數皆為現成，純加選項。唯一可能停下來的點：(a) 手動驗證需 active skin 為受影響版型且需代理身分帳號——缺任一請使用者協助，勿自行改 local 設定；(b) 若第 4 顆按鈕實測跑版，觸發「受影響範圍」的樣式例外條款，最小修並回報。
- 實作中若發現 spec 與 repo 現況矛盾（例如行號漂移、`dayTypeTabs` 結構已變），以 repo 現況為準對照本 spec 意圖，先回報／更新 spec 再繼續；行號為 spec 撰寫當下（main @ 7c8a2f812，2026-07-13）快照，請以符號（函式／變數名）定位。
