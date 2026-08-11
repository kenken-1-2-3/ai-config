# R017 會員中心利息寶完整頁面

> 交接合約：Spec 作者產出，實作者依此實作，reviewer 對照「驗收條件」逐條 review。
> 本版涵蓋 `/member/interest` 的「當前活動」「詳情」兩個 tab，以及說明、最低本金、確認領回彈窗。

## 背景 / 目標

- 在會員端新世代 Nx 專案完成 R017 利息寶頁面，讓登入會員可瀏覽活動、查看利率方案、試算利息、存入本金、查看參加紀錄並申請領回。
- 原始需求：[Notion－前端 AI Agent 考題](https://app.notion.com/p/AI-Agent-390075a7f6b280d69520fb854ae25b2e)。Notion 明列：R017 利息寶頁面、實際串接 API、RWD、檔案位置合理；指定基底為 `ai-agent-test`。

## Figma 視覺來源

### 當前活動 tab

- PC：[node `13771:119371`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=13771-119371)
- 平板：[node `15047:97926`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15047-97926)
- H5：[node `14982:47055`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=14982-47055)

### 彈窗

- 最低本金提示：PC [node `14982:63233`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=14982-63233)、H5 [node `14982:63278`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=14982-63278)
- 利息寶說明：PC [node `15047:93263`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15047-93263)、H5 [node `14978:9638`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=14978-9638)
- 確認申請領回：PC node `14982:31884`、H5 node `14982:31915`（位於使用者提供的利息寶 Figma canvas 內，為詳情 tab「領回」操作的必要狀態）。

### 詳情 tab

- 寬版 PC：[node `15047:94409`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15047-94409)
- 窄版 PC／平板水平捲動狀態：[node `15047:95242`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=15047-95242)
- 使用者提供的 H5 連結 [canvas node `6279:103257`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=6279-103257) 指向整個「⭕ 利息寶」canvas；實際 H5 詳情 frame 為子節點 `14978:25226`（`mb/利息寶/詳情`，375 × 809）。實作與視覺驗收以該子節點為準。

## 範圍

- 在 R017 tenant 提供會員路由 `/member/interest`，沿用會員中心既有 layout、登入保護、desktop aside 與 H5 返回行為。
- 顯示「當前活動」「詳情」兩個 tab；預設為「當前活動」，切換不建立新 route。
- 當前活動包含活動輪播、方案矩陣、存放試算、存放本金、說明入口與最低本金提示。
- 詳情包含活動紀錄、狀態、分頁、PC table、窄版 table 水平捲動、H5 accordion card 與領回操作。
- 實際串接既有 shared interest API：
  - GET `ENDPOINT_PATHS.INTEREST.ACTIVITY_LIST`
  - GET `ENDPOINT_PATHS.INTEREST.ACTIVITY_DESCRIPTION`
  - GET `ENDPOINT_PATHS.INTEREST.ACTIVITY_DETAIL_LIST`
  - POST `ENDPOINT_PATHS.INTEREST.APPLY_ACTIVITY`
  - POST `ENDPOINT_PATHS.INTEREST.APPLY_ACTIVITY_REDEMPTION`
- 使用既有 `requestFn`、TanStack Query `useApiQuery`／`useApiMutation`、query keys、shared types 與共用 error handling。
- 活動內容依目前 locale 從 `contents` 選取；日期使用既有 RFC3339／UTC offset formatter。
- 所有 UI 固定文案使用既有或經使用者確認的 i18n keys；說明內容使用 description API 的 locale 對應資料，不把 Figma 範例文字硬編碼進 component。

## Out of scope

- 不新增或改動後端 endpoint、payload 或 response contract。
- 不新增詳情日期篩選；API 雖接受 `start_time`／`end_time`，Figma 未提供對應控制項。
- 不修改其他 tenant、代理端 Dashboard、舊版 Multiverse 或 Capacitor shell。
- 不修改 shared 預設導覽、全域顯示條件、Base component API、PrimeVue preset、Tailwind preset 或全域 theme tokens；若為符合設計必須改 shared surface，先提出跨站影響並取得確認。
- 不自行補造翻譯、改名既有 i18n key，或硬編碼 Figma 中的中文範例資料。
- 不增加 Figma 未定義的動畫、transition 或額外成功頁面。

## 受影響範圍

- 端別：會員端 `whitelabel-gsi-platform-multiverse-nx`。
- tenant：僅 `apps/r017` 掛載 route；shared feature 技術上可供其他 tenant 使用，但不得讓其他 tenant 自動顯示此頁。
- 預期 route：`apps/r017/src/pages/member/interest.vue`。
- 預期 shared 實作面：
  - `libs/shared/ui-layer/src/lib/components/interest/`
  - `libs/shared/ui-layer/src/lib/composables/useInterest/`
  - `libs/shared/ui-layer/src/lib/api/hooks/useInterestQueries.ts`
  - `libs/shared/ui-layer/src/lib/constants/tanstackQueryKeys/interestKeys.ts`
  - `libs/shared/ui-layer/src/lib/constants/enums/interestStatus.ts`
  - 既有 `interest_*` API wrappers。
- 跨站影響：僅允許新增 R017 route wrapper 與不改變其他 consumer 行為的 shared feature。任何共用預設值或既有元件 API 變更都需先停下確認。

## 參考實作 / 既有 pattern

- 以 `origin/ai-agent-test` 的下列結構作為責任邊界參考，不把既有檔案視為已通過驗收：
  - `apps/r017/src/pages/member/interest.vue`
  - `libs/shared/ui-layer/src/lib/components/interest/InterestPage.vue`
  - `InterestActivityPanel.vue`、`InterestPlanMatrix.vue`、`InterestCalculatorCards.vue`
  - `InterestRecordsPanel.vue`
  - `InterestDescriptionDialog.vue`、`InterestMinPrincipalDialog.vue`、`InterestRedeemDialog.vue`
  - `libs/shared/ui-layer/src/lib/composables/useInterest/`
  - `libs/shared/ui-layer/src/lib/api/hooks/useInterestQueries.ts`
- 沿用 `MemberContainer`、`MemberAsideInfo`、`useMemberAsideNavigation`、`useCustomBreakpoints`、`BaseTab`、`BaseSwiper`、`BaseInput`、`BaseBtn`、`BaseDialog`、`BasePagination` 與既有 mobile list/card pattern。
- tenant page 保持薄層，只組裝 shared feature；禁止在 page/component 內直接建立 axios/fetch 呼叫。

## 關鍵決策與理由

- 同一頁完成兩個 tab，因使用者已將詳情 tab 加入本次需求；舊版 spec 中「詳情 out of scope」作廢。
- 說明內容來自 `ACTIVITY_DESCRIPTION` API，而非複製 Figma 中文，確保 locale 與後端設定一致；Figma只定義 dialog 視覺與排版。
- 最低本金提示同時服務試算與存入：兩者低於當前活動最低 plan principal 時皆阻止後續動作並開啟同一提示 dialog。
- 詳情資料首次切到詳情 tab 才抓取，之後分頁依 offset/size refetch，避免當前活動初次載入時發送不需要的 detail request。
- PC 用 9 欄表格；容器不足以顯示完整欄位時只讓表格區水平捲動。H5 改為 accordion card，避免把桌面 table 壓縮成不可讀欄位。
- 僅 `ACTIVE` 狀態允許領回；其他狀態按鈕 disabled。確認後才呼叫 redemption API，以免誤操作。
- Figma 精確值優先於一般 utility scale；須讀完整子節點並保留必要的 Tailwind arbitrary values，不得自行圓整。

## 功能與狀態規格

### 當前活動與活動切換

- 進入頁面取得 activity list，請求期間顯示既有 loading；空清單顯示 i18n empty state，不顯示矩陣與表單。
- 活動卡顯示 locale title/image 與格式化 `start_time - end_time`；圖片使用既有 image base resolver，完整 HTTP(S) URL 可直接使用。
- 多活動顯示左右導覽；單活動置中且不顯示無效導覽。
- 切換活動同步更新 plans、footer 與 apply activity id，並清除上一活動的試算結果與存入本金。

### 方案矩陣

- 從當前活動 `plans` 推導唯一天數與本金門檻並以數值升冪排列；交叉格顯示對應 `interest_rate%`，找不到組合顯示 `-`。
- footer 顯示 `maximum_interest_limit`、`audit_rate`、`currency_code`；利息上限缺值或 0 顯示 `--`，不得出現 `undefined`／`null`。
- 超過設計容量時僅矩陣容器可水平捲動，不得造成整頁水平溢出。

### 存放試算

- 存放時間只接受正整數；存放額度只接受正數／正小數，沿用 normalization helper。
- 缺值、非正數或無當前活動時，結果維持 `0`／`0.00`；不得產生 `NaN`、`Infinity` 或科學記號。
- 合法輸入依當前 plans 找到匹配方案，顯示年利率與利息；公式沿用既有 helper 與需求定義，不新增試算 API。
- 本金低於最低門檻時不試算，開啟最低本金提示 dialog。

### 存放本金

- 本金只接受正數／正小數；空值、0、非法值時按鈕 disabled。
- 低於最低門檻時不可呼叫 API，開啟最低本金提示 dialog。
- 送出時顯示 loading、防止重複提交；payload 精確為 `{ activity_id, principal }`。
- 成功後清空本金並 refresh activity list；失敗沿用共用 error handling，不顯示假成功。

### 最低本金提示 dialog

- 觸發：試算金額或存入本金低於當前活動最低 principal。
- PC 固定寬 550px；H5 在 375px viewport 中寬 343px、左右各 16px。
- 標題為 i18n「提示」，內容語意為「存入本金額度不得低於最低門檻」，右上 close 與底部單一全寬 primary「確定」皆可關閉。
- dialog 高度、header/content/footer、20px padding、12px radius、文字規格與 48px button 依 Figma node 精確實作。

### 利息寶說明 dialog

- 點擊頁面「說明」後開啟；PC／平板入口位於內容標題右側，H5 位於頁面標題同列右側。
- 開啟時使用 locale 對應的 description API content；loading、空內容與失敗不得造成 dialog runtime error。
- PC 寬 550px；H5 寬 343px。右上 close 與底部全寬「確定」皆可關閉。
- API description 若為 rich text，使用專案既有安全渲染方式；不得直接信任並執行 script/event attributes。
- Figma 的規則清單是排版範例，不作為硬編碼翻譯來源。

### 詳情清單與分頁

- 第一次切換到「詳情」後 GET detail list；參數使用 `offset`、`size`，預設 page 1，page size 沿用 shared hook 常數。
- PC table 欄位依序為：活動名稱、存入時間、存入金額、幣別、利率、存放時間(日)、可領利息、狀態、操作。
- 欄位映射：locale content title（fallback `activity_name`）、formatted `apply_time`、`principal`、`currency_code`、`interest_rate%`、`days`、`expected_interest`、status i18n、領回。
- table 使用深淺交錯 row、狀態 pill 與右下 pagination；無資料使用既有 no-data pattern，loading/失敗不可殘留上一頁錯誤資料。
- PC 寬度足夠時完整顯示 9 欄；較窄容器維持表格最小寬並顯示水平 scrollbar，pagination 固定在可視容器右下，不隨 table 寬度跑出畫面。
- 換頁更新 offset 後 refetch；total/page count 使用 API `pagination.total`，不得以目前 list length 推算總筆數。

### H5 詳情 accordion

- 每筆紀錄以 343px 寬 accordion card 顯示；collapsed summary 依序為幣別 pill、活動名稱（副標「活動名稱」）、存入金額（副標「存入金額」）、chevron。
- 點擊唯一 card header 展開／收合；expanded body 顯示存入時間、幣別、利率、存放時間(日)、可領利息、狀態及領回按鈕。
- expanded card 右側狀態色 border 與狀態 tag 顏色需依 Figma／status mapping；collapsed cards 仍保留相同狀態辨識邊線。
- 列表可垂直捲動且不得被底部 mobile navbar 遮住；不得出現整頁水平捲動。

### 領回與確認 dialog

- 僅 `INTEREST_STATUS_ENUMS.ACTIVE` 顯示 enabled「領回」；其他狀態顯示 disabled。PC table 與 H5 expanded card 規則一致。
- 點擊 enabled 領回只開啟確認 dialog，不立即發 API。
- dialog 標題語意為「確認申請領回？」；內容依 Figma 說明未滿一日會放棄利息；右上 close／「取消」只關閉並清除 pending record。
- 點擊「確定」呼叫 redemption API，payload 精確為 `{ application_id: selectedRecord.id }`；mutation 期間防止重複送出並呈現 loading。
- 成功後關閉 dialog、清除 pending record 並 refetch 當前 detail page；失敗保留可理解狀態並沿用共用 error handling，不擅自改 status。
- PC dialog 寬 550px；H5 343px；footer 為等寬取消 border button與確定 primary button。

## 視覺 / RWD 規格

- 當前活動 PC (`1014 × 948`)：tabs 在內容卡上方、活動卡置中、導覽靠兩側、矩陣滿寬、試算／存入等寬並排。
- 當前活動平板 (`755 × 948`)：維持並排卡但按容器縮放，不裁切、不產生頁面水平捲動。
- 當前活動 H5 (`375 × 1202`)：返回鍵＋標題＋說明、雙等寬 tabs、活動卡、矩陣、單欄試算／存入；試算結果兩格橫排。
- 詳情寬版 PC (`15047:94409`)：完整 9 欄、6 筆可視 row、右下 pagination。
- 詳情窄版 PC／平板 (`15047:95242`)：表格局部水平捲動並呈現 scrollbar；容器、標題與 pagination 不水平位移。
- 詳情 H5 (`14978:25226`, 375 × 809)：雙等寬 tabs、343px accordion list、展開內容與固定 mobile navbar 安全區。
- 彈窗：desktop 550px、H5 343px；背景 overlay、定位、header shadow、色彩、padding、gap、radius、字級、行高與 button 均逐節點量測。
- 所有 breakpoint 的 spacing、font-size、line-height、尺寸、色彩、border、radius、shadow、圖片裁切與 overflow 必須對照完整 Figma 子樹，不以慣用值近似。

## 驗收條件

- [ ] 本地工作分支名稱為 `feat/interest-current-activity`，基底仍為最新 `origin/ai-agent-test`；未直接在共享分支實作。
- [ ] R017 登入會員可進入 `/member/interest`，desktop aside 與 H5 返回會員中心正確。
- [ ] 兩個 tab 均可切換，預設當前活動；詳情首次切換才發 detail request。
- [ ] Activity list、description、detail list、apply、redemption 五個流程均使用既有真實 API wrapper，無 mock／component 內直接 request。
- [ ] 當前活動 loading、empty、success、failure 均無 runtime error；活動切換同步卡片、矩陣、footer、試算與 apply id。
- [ ] plans 動態產生正確矩陣；試算 normalization、匹配利率與計算結果正確，所有非法／缺 plan 輸入不產生無效數字。
- [ ] 低於最低本金時，試算與存入都不繼續並開啟 Figma 對應提示 dialog；close／確定可關閉。
- [ ] 說明入口開啟 locale API 內容的 dialog；desktop／H5 尺寸與排版符合指定節點，rich text 安全渲染。
- [ ] Apply payload 為當前 `{ activity_id, principal }`，loading 防重複；成功清空並 refresh，失敗無假成功。
- [ ] PC 詳情 9 欄映射、交錯 row、status pill、enabled/disabled 領回與 pagination 正確。
- [ ] 窄版詳情只在 table 區水平捲動，整頁、標題與 pagination 不橫向溢出。
- [ ] H5 詳情使用 accordion card；summary、展開欄位、chevron、狀態 border/tag、領回按鈕與底部安全區符合 `14978:25226`。
- [ ] 僅 ACTIVE 可領回；點擊先開確認 dialog，取消／close 不發 API，確定 POST `{ application_id }` 並防重複。
- [ ] 領回成功 refetch 目前頁並反映新狀態；失敗不擅自改 UI status。
- [ ] detail pagination 以 API total 計算，換頁 offset 正確；empty/loading/failure 不顯示 stale 或錯位內容。
- [ ] 所有固定 UI 文案使用既有且已確認的 i18n key；API localized content 有 fallback，無硬編碼翻譯或自行發明文案。
- [ ] 當前活動 PC／平板／H5、詳情寬版／窄版／H5，以及三種 dialog 的 Playwright screenshots 對照 Figma 皆無明顯差異。
- [ ] 實作符合 tenant thin route + shared feature/API/composable pattern，未改動其他 tenant 可見行為。
- [ ] R017 focused lint、build、browser smoke test 通過；未執行 `tsc --noEmit`，未順手修 unrelated ESLint。
- [ ] 測試已執行；依 repo 規則，測試檔在 commit 前移除或 unstage，不包含於提交。

## 邊界情況 / 例外

- `contents` 缺目前 locale/title/image、description 缺 locale/內容、activity list/detail list 空資料時均不得 crash。
- plans 空、重複、未排序、缺交叉組合或超過設計欄數時仍可讀、可局部捲動。
- detail status 不在 enum mapping 時顯示安全 fallback（如 `-`），領回 disabled；不得猜測狀態。
- 快速切活動、切 tab、換頁、展開多筆或連點 mutation，不得套用錯誤 id、發重複 request 或讓舊 response 覆蓋新狀態。
- redemption 後目前頁已無資料時，頁碼需回到仍有效的最後一頁並重新查詢，不留空白失效頁。
- API 缺 `maximum_interest_limit`、`audit_rate`、`currency_code` 或 detail 欄位時不得顯示 `undefined`／`null`。
- 缺少必要 i18n key 時停止並請使用者確認各語系，不自行翻譯。

## 測試計畫

- 單元測試（使用 repo 既有 infrastructure）：plans 排序/matrix lookup、利息計算、input normalization、locale fallback、status mapping、pagination offset。
- Composable/component 測試：
  - activity loading/empty/data 與切換重設。
  - 低本金 dialog 的試算／存入兩條觸發路徑。
  - description loading/locale/empty/error。
  - detail lazy fetch、換頁、empty/error、ACTIVE 與 disabled statuses。
  - H5 accordion 展開／收合與單筆 pending selection。
  - apply/redemption disabled、loading、防重複、payload、成功 refresh、失敗路徑。
- Focused validation：從目標 branch 的 `apps/r017/project.json` 取得正確 Nx target，執行 R017 lint 與 build；禁止 `tsc --noEmit`。
- Browser smoke：使用真實或可控測試 API，驗證 PC、窄版 PC／平板、375px H5；涵蓋兩 tab、三 dialog、分頁與領回確認。
- 視覺驗證：對所有 Figma source 節點產生 Playwright screenshot，逐項比較 spacing、font、位置、尺寸、顏色、圓角、陰影、overflow、圖片裁切與互動狀態；修正後重拍直到無明顯差異，回報 screenshot 絕對路徑與剩餘差異。
- 測試不可省略，但 test files 不進 commit；commit 前移除或 unstage。

## Git Flow

- 指定基底：最新 `origin/ai-agent-test`（依 Notion 題目；fetch 前先依 repo 規則做 HTTPS non-interactive auth probe）。
- 工作分支名稱：`feat/interest-current-activity`（已由 `feat/ai-agent-test/interest-current-activity` 改回 repo 原本習慣）。
- 實作者開始前必須切換到上述分支，確認其基底與工作區；不得直接在 `main`、`develop`、`staging` 或其他共享分支實作。
- 既有 `stash@{0}` 保留，標籤仍記錄建立時舊分支名；需要續作時只在 `feat/interest-current-activity` 上套回，套回前先確認 stash 內容與工作區乾淨。
- 本考題先依使用者指定的 `ai-agent-test` 流程交付；若後續進正式環境，需另行確認並依序推進 `develop` → `staging` → `main`。
- Commit、push、merge 均需取得使用者對該次操作的明確確認；conflict 時停止，不自行解 conflict 或改策略。

## 交接備註給實作者

- 先讀本 spec 與 repo `AGENTS.md`，切到 `feat/interest-current-activity`，確認 base 與 stash 後才開始。
- `origin/ai-agent-test` 與 stash 中已有 interest 相關檔案；逐檔對照本 spec 與 Figma，不以「檔案已存在」視為完成，也不要誤刪本版重新納入的 records/dialog 元件。
- Figma H5 詳情應讀子節點 `14978:25226`，不要用整個 canvas `6279:103257` 做 screenshot baseline。
- 所有指定節點需讀完整 design context／子節點，不可只看外層 frame 或縮圖。
- 發現 API contract、i18n、Figma 狀態或跨站影響與 spec 矛盾時，先更新 spec／取得確認再繼續。
