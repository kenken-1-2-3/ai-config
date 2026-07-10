# R017 會員中心利息寶－當前活動 tab

> 交接合約：Spec 作者產出，實作者依此實作，reviewer 對照「驗收條件」逐條 review。
> 本次只實作 `member/interest` 的「當前活動」tab；「詳情」tab 留待後續 spec。

## 背景 / 目標

- 會員端新世代 Nx 專案需新增 R017 利息寶頁面的第一階段功能，讓已登入會員可瀏覽目前利息活動、查看方案利率、試算利息並存入本金。
- 原始需求：[Notion－前端 AI Agent 考題](https://app.notion.com/p/AI-Agent-390075a7f6b280d69520fb854ae25b2e)。Notion 明列：R017 利息寶頁面、需實際串接 API、需為 RWD 頁面、檔案放置位置合理；指定實作分支為 `ai-agent-test`。
- 設計來源（視覺 source of truth）：
  - PC：[Figma node `13771:119371`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=13771-119371)
  - 平板：[Figma node `15047:97926`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15047-97926)
  - H5：[Figma node `14982:47055`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=14982-47055)

## 範圍

- 在 R017 tenant 建立會員路由 `/member/interest`，沿用會員中心既有 layout、會員登入保護、aside/navigation 與手機返回行為。
- 頁面顯示「當前活動」與「詳情」兩個 tab；本次僅讓「當前活動」具備內容與互動。「詳情」只保留可辨識的 tab 外觀，不實作其資料表與流程。
- 「當前活動」內容包含：
  - 頁面標題「利息寶」與「說明」入口（說明內容／dialog 不在本次範圍）。
  - 活動輪播：活動圖片、活動期間、依目前 locale 選出的活動標題、前後導覽；選中卡片需有 accent border。
  - 活動方案矩陣：存放額度、存放時間（日）、各本金／天數組合的利率，以及「利息上限／出款流水倍數／活動支援幣別」摘要。
  - 存放試算：存放時間、存放額度、試算按鈕、年利率與利息結果。
  - 存放本金：本金輸入與存入按鈕。
- 實際串接既有 shared interest API：
  - GET `ENDPOINT_PATHS.INTEREST.ACTIVITY_LIST`：取得活動清單與 plans。
  - POST `ENDPOINT_PATHS.INTEREST.APPLY_ACTIVITY`：送出 `{ activity_id, principal }`。
- 使用 TanStack Query 既有 `useApiQuery`／`useApiMutation` pattern 管理 loading、response selection、mutation 與成功後 refresh。
- 活動標題／圖片依目前 locale 從 `contents` 選取；無完全相符語系時，沿用專案既有 localized-content fallback，不另造翻譯文字。
- 日期使用專案既有 RFC3339／UTC offset 格式化方式，不直接顯示未格式化 API 字串。
- 所有 UI 文案使用既有 remote/local i18n key；不得在 template/composable 新增硬編碼翻譯。若缺 key，先回報並向使用者確認各語系文案。
- RWD 必須分別符合指定 PC、平板、H5 節點；尺寸、間距、字級、行高、色彩、圓角、陰影與 breakpoint 行為以各節點完整子樹量測值為準，不得以近似 spacing/token 取代。

## Out of scope

- 不實作「詳情」tab 的紀錄列表、日期篩選、分頁、狀態顯示、贖回／提前贖回及其 dialog。
- 不實作「說明」內容取得、說明 dialog 或 CMS rich text；本次只保留 Figma 所示入口。
- 不新增或修改全新後端 endpoint；API contract 以 repo 既有 wrapper 為準。
- 不修改其他 tenant、代理端 Dashboard、舊版 Multiverse 或 Capacitor native shell。
- 不重構 Base components、PrimeVue preset、Tailwind preset、全域 theme token 或 shared member-center 架構。
- 不自行補造任何 i18n 翻譯或更名既有 translation key。
- 不額外增加動畫、transition、微互動或 Figma 未定義的視覺效果。

## 受影響範圍

- 端別：會員端 `whitelabel-gsi-platform-multiverse-nx`。
- tenant：`apps/r017`。
- 預期路由／入口：`apps/r017/src/pages/member/interest.vue`、既有會員導覽的 interest route/key。
- 預期 shared 實作面：
  - `libs/shared/ui-layer/src/lib/components/interest/`
  - `libs/shared/ui-layer/src/lib/composables/useInterest/`
  - `libs/shared/ui-layer/src/lib/api/hooks/useInterestQueries.ts`
  - `libs/shared/ui-layer/src/lib/constants/tanstackQueryKeys/interestKeys.ts`
  - 既有 `interest_getInterestActivityList.ts`、`interest_applyInterestActivity.ts`
- 跨站影響：shared layer 技術上可被其他 tenant 載入，但本需求只授權 R017 route 使用。不得修改 shared 預設導覽、全域顯示條件或其他 tenant route；若實作需要改變其他站點可見行為，先停下並取得使用者確認。

## 參考實作 / 要遵循的現有 pattern

- 以 `origin/ai-agent-test` 目前存在的下列結構作為檔案責任與 project pattern 參考，不代表可直接視為已驗收：
  - `apps/r017/src/pages/member/interest.vue`：tenant route 僅組裝 shared feature。
  - `libs/shared/ui-layer/src/lib/components/interest/InterestPage.vue`
  - `libs/shared/ui-layer/src/lib/components/interest/InterestActivityPanel.vue`
  - `libs/shared/ui-layer/src/lib/components/interest/InterestPlanMatrix.vue`
  - `libs/shared/ui-layer/src/lib/components/interest/InterestCalculatorCards.vue`
  - `libs/shared/ui-layer/src/lib/composables/useInterest/index.ts`
  - `libs/shared/ui-layer/src/lib/composables/useInterest/helpers.ts`
  - `libs/shared/ui-layer/src/lib/api/hooks/useInterestQueries.ts`
- 沿用 `MemberContainer`、`MemberAsideInfo`、`useMemberAsideNavigation`、`useCustomBreakpoints`、`BaseTab`、`BaseSwiper`、`BaseInput`、`BaseBtn`、`BaseIcon` 等既有元件與 composable API。
- API wrapper 沿用 `requestFn`、`ENDPOINT_PATHS.INTEREST` 與 shared type；不可在頁面內自行建立 axios/fetch 呼叫。

## 關鍵決策與理由 (Key decisions)

- 本次交付單位固定為「當前活動」tab，因使用者明確要求先做此 tab；詳情紀錄與贖回流程拆到後續，避免把第一階段擴成整頁功能。
- tenant page 保持薄層、主要 feature 放 shared UI layer，因 repo 既有會員功能採 tenant route 組裝 shared feature 的結構；但只在 R017 掛載，避免擴散到其他站點。
- 活動卡、矩陣與計算／存入區依當前選中活動同步更新；這是畫面資料關係，也是 POST 必須帶正確 `activity_id` 的前提。
- 試算為前端純計算，不新增試算 API：依選中活動 plans 找到符合存放額度與天數的方案，年利率取 `interest_rate`，利息依既有 helper 的公式計算；若找不到方案，結果回到空／零值，不猜測利率。
- 存入必須呼叫實際 apply API；不得以 mock、timeout 或只更新前端狀態代替。成功後清空本金欄位並重新取得活動清單。
- 多活動時顯示左右導覽並可切換；單一活動不顯示無效導覽且卡片置中。
- H5 採設計稿的垂直資訊順序：標題／說明 → tabs → 活動卡 → 方案矩陣 → 存放試算 → 存放本金。PC／平板則將試算與存入卡並排，且 PC 活動內容區維持設計指定寬度。
- Figma 精確值優先於一般 utility scale；實作者需讀完整子節點並使用量測值（必要時保留 Tailwind arbitrary values）。

## 功能與狀態規格

### 活動清單

- 進入頁面後取得活動清單，請求期間顯示既有 loading 視覺。
- API 回傳空陣列時顯示 i18n empty state；不顯示矩陣、試算與存入表單。
- 卡片期間由 `start_time` 與 `end_time` 組成；圖片使用既有 image base resolver，完整 HTTP(S) URL 可直接使用。
- 切換活動時同步切換方案矩陣、footer 摘要與 apply 的 activity id，並重設試算結果及存入本金，避免沿用上一活動輸入／結果。

### 方案矩陣

- 從選中活動的 `plans` 推導唯一天數（由小到大）與本金門檻（數值由小到大），交叉格顯示對應 `interest_rate` 加 `%`。
- 找不到交叉方案的格子顯示 `-`，不得帶用相鄰方案。
- footer 顯示 `maximum_interest_limit`、`audit_rate`、`currency_code`；利息上限缺值或為 0 時顯示 `--`。
- H5 需在 375px 設計寬度完整呈現指定三個天數欄，不得造成整頁水平捲動；若 API 欄數超過設計容量，僅矩陣容器允許水平捲動。

### 存放試算

- 存放時間只接受正整數；存放額度只接受正數／正小數，需沿用 input normalization helper。
- 缺少任一必要輸入、輸入非正數或無選中活動時，按試算不產生無效數字，結果維持 `0` 與 `0.00`（或專案既有等價空結果）。
- 輸入本金低於最低方案本金時，不執行試算；錯誤呈現須沿用既有 feedback/dialog pattern，文案必須來自已確認 i18n key。
- 有匹配方案時顯示年利率與利息，結果不得為 `NaN`、`Infinity` 或科學記號。

### 存放本金

- 本金只接受正數／正小數；0、空值、非法值時存入按鈕 disabled。
- 低於最低方案本金時不可呼叫 API，需以既有 feedback/dialog pattern 告知最低本金。
- 送出期間顯示 loading 並防止重複送出。
- POST payload 必須是目前活動 id 與 normalized principal：`{ activity_id, principal }`。
- API 成功後清空本金並 refresh 活動清單；API 失敗沿用共用 request/mutation error handling，不吞錯、不顯示假成功。

## 視覺 / RWD 規格

- PC (`1014 × 948` 節點)：tabs 位於內容卡上方；標題／說明靠左；活動卡置中、左右導覽靠容器兩側；方案矩陣滿寬；試算與存入等寬並排。
- 平板 (`755 × 948` 節點)：結構同 PC，但活動卡、矩陣、並排卡依 755px 容器縮放；不得裁切右側內容或造成頁面水平捲動。
- H5 (`375 × 1202` 節點)：頂部顯示手機返回鍵、利息寶與說明；tabs 各佔一半；活動卡寬度與卡內圖片按 Figma；矩陣緊接卡片；試算與存入改為單欄，試算結果兩格橫向排列。
- 所有 breakpoint：背景、tab active gradient、容器深色層級、card/border accent、表頭／內容底色、input、button gradient、字級、行高、padding、gap、radius 與 shadow 均須對照指定節點完整子樹逐項實作。

## 驗收條件

- [ ] 實作者從 `origin/ai-agent-test` 建立／切換到本 spec 指定工作分支後才開始修改，未直接在 `main`、`develop`、`staging` 上實作。
- [ ] R017 登入會員可由既有會員導覽進入 `/member/interest`，桌面會員 aside 與 H5 返回會員中心行為正確。
- [ ] 頁面顯示「當前活動」「詳情」tab，預設 active 為「當前活動」；本次沒有實作或假造詳情資料表／贖回功能。
- [ ] GET activity list 為實際 API 請求，loading、成功、空清單、失敗狀態均不造成 runtime error。
- [ ] 活動卡顯示 locale 對應 title/image、格式化期間與選中態；多活動可透過左右控制切換，單活動置中且無無效導覽。
- [ ] 切換活動後，卡片、矩陣、footer、試算與 POST 使用的 activity id 全部同步，上一活動的試算結果與存入本金已重設。
- [ ] 方案矩陣由 API plans 動態產生天數、本金與利率；缺少交叉方案顯示 `-`，footer 顯示利息上限、流水倍數與支援幣別。
- [ ] 試算輸入經過 normalization；合法且匹配方案時年利率／利息正確，非法、非正數、低於最低本金或無方案時不出現 `NaN`／`Infinity`／錯誤利率。
- [ ] 存入按鈕僅在合法本金與選中活動時可用；送出期間 loading 且不可重複送出。
- [ ] 存入使用 POST apply activity 實際 API，payload 精確為當前 `activity_id` 與 normalized `principal`；成功後清空輸入並 refresh 清單，失敗不顯示假成功。
- [ ] 所有新增／修改 UI 文案均使用既有且已確認的 i18n key，無硬編碼翻譯、無自行發明語系文案。
- [ ] PC 在 Figma `13771:119371` 對應 viewport 截圖比對無明顯差異。
- [ ] 平板在 Figma `15047:97926` 對應 viewport 截圖比對無明顯差異，無頁面水平捲動或裁切。
- [ ] H5 在 375px 寬度與 Figma `14982:47055` 截圖比對無明顯差異；內容順序、雙等寬 tabs、矩陣、單欄 cards 與橫排結果格正確，無頁面水平捲動。
- [ ] 實作檔案責任符合 tenant thin route + shared feature/API/composable pattern，未在 page 內直接發 request，未改動其他 tenant 可見行為。
- [ ] focused lint/build 與瀏覽器 smoke test 通過；若 repo 既有非本次造成的 ESLint 問題，需列出但不順手修復。
- [ ] 測試檔已用於驗證，但 commit 前已移除或 unstage，不包含在提交內容。

## 邊界情況 / 例外

- 活動 `contents` 缺目前 locale、title 或 image 時，使用既有 fallback；無任何可用內容時不得 crash，圖片區使用專案既有 fallback／空態。
- `plans` 空陣列、重複 plan、非排序資料、缺特定本金×天數組合時，矩陣仍可穩定渲染。
- `maximum_interest_limit` 缺值／0、`audit_rate` 或 `currency_code` 缺值時不得顯示 `undefined`／`null`。
- API 回傳超過三種天數或多個本金級距時，矩陣資料不可被截斷；容器可局部水平捲動，但不得讓整頁橫向溢出。
- 使用者快速切換活動或連點存入，不得將 apply 套到錯誤 activity 或發出重複 mutation。
- 本 spec 不定義未提供的多語翻譯；發現缺 key 必須停下確認，不可自行翻譯。

## 測試計畫

- 單元測試（使用 repo 既有 test infrastructure；不得為此另建測試框架）：
  - plans 的 unique days/principals 排序與 matrix lookup。
  - 合法、非法、邊界本金／天數的利息試算。
  - positive integer／decimal normalization。
  - locale content fallback 與缺圖／缺標題情況。
- 元件／composable 測試：
  - activity list loading／empty／data 狀態。
  - 切換活動重設結果並更新 apply payload。
  - apply disabled、loading、防重複送出、成功 refresh 與失敗路徑。
- Focused validation：對 R017 執行其 `project.json` 既有 lint 與 build target；本 repo禁止執行 `tsc --noEmit`。
- Browser smoke test：以實際或可控測試 API 資料驗證 `/member/interest`，至少覆蓋 PC、755px 平板、375px H5。
- 視覺驗證：每個 breakpoint 產生 Playwright screenshot，逐項比較 Figma 的 spacing、font-size、位置、尺寸、顏色、圓角、字重、行高、圖片裁切與狀態；修正後重拍直到無明顯差異。回報三張 screenshot 絕對路徑與仍存在的差異（若無則明寫「無明顯差異」）。
- 依專案規則，測試不可省略，但 test files 不得包含在 commit；commit 前移除或 unstage。

## Git Flow

- 指定基底：`origin/ai-agent-test`（依 Notion 題目指定；開始前先 fetch 並確認 remote 可達）。
- 工作分支名稱：`feat/ai-agent-test/interest-current-activity`。
- 實作者開始前必須從最新 `origin/ai-agent-test` 建立／切換到上述工作分支；不得直接在 `main`、`develop`、`staging` 或其他共享分支上實作。
- 本考題交付先回到使用者指定的 `ai-agent-test` 流程；若後續要進正式環境，仍須依 repo Git Flow 另行確認並依序推進 `develop` → `staging` → `main`，不可跳階段。
- Commit 前需取得使用者針對該次提交的明確確認；本 spec 的產出不等於 commit 授權。
- 合併到任何分支與 push 前均需依專案規則取得使用者確認；發生 conflict 時停止，不自行解 conflict 或改策略。

## 交接備註給實作者

- 先讀本 spec 與 repo `AGENTS.md`，fetch 後從 `origin/ai-agent-test` 建立 `feat/ai-agent-test/interest-current-activity`，再開始實作。
- 開始前用 `git status --short`、targeted `rg` 與 `git diff origin/ai-agent-test...HEAD` 確認工作區與既有實作；保留使用者未相關的變更。
- Figma 三個節點需取得完整 design context／子節點，而非只看 screenshot 或外層 frame。
- `origin/ai-agent-test` 已有 interest 相關檔案；先逐檔對照本 spec 與 Figma，修正缺口，不以「檔案已存在」視為完成。
- 實作中若發現 API contract、i18n key、Figma 狀態或跨站影響與 spec 不一致，先回報並更新 spec，再繼續。
