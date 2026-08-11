# GSI-352 R017 NX 推廣連結新增 QR Code

> 交接合約：Spec 作者（Codex）產出，指定實作者依此實作，reviewer 對照「驗收條件」逐條 review。Claude 與 Codex 的角色可以互換。
> 位置：`~/wow/ai-config/specs/whitelabel-gsi-platform-multiverse-nx/gsi-352-r017-referral-qrcode.md`（版控於 ai-config）。
> 本 spec 只處理 NX repo 的 R017 app。R003 舊架構使用獨立 spec、branch、驗收與發版，不得混入本次 diff。

## 背景 / 目標

- 需求來源：[Jira GSI-352](https://gamingsoft.atlassian.net/browse/GSI-352)。
- Jira 目標：把會員現有的推廣註冊網址轉成可掃描 QR Code，方便會員代理分享。
- 目標 repo：`~/wow/whitelabel-gsi-platform-multiverse-nx`。
- 目標 app：`apps/r017`。
- 本階段覆蓋三個已登入會員入口：
  1. 會員代理 `/referral`。
  2. 上級返佣 `/referralRebate`。
  3. 合營計畫 `/collaboration`。
- PC 與 H5 都要顯示 inline QR；click／tap inline QR 後顯示同一網址的放大 QR Dialog。

## Figma 視覺來源

以下四個 R017 節點是視覺 source of truth。實作與 review 必須讀取完整 child tree 與 screenshot，不得以舊 Multiverse、R003 或現有近似卡片代替：

- PC card：[card/number，node `16530:158044`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=16530-158044)。
- H5 card：[card/number，node `16530:158161`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=16530-158161)。
- PC dialog：[dialog/notify，node `16530:157516`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=16530-157516)。
- H5 dialog：[dialog/notify，node `16530:158024`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=16530-158024)。

`apps/r017` 與 shared UI layer 目前沒有相關 `DESIGN.md`。視覺值遵循順序：

1. 上述 Figma 節點。
2. `apps/r017/src/assets/styles/_variables*.scss` 中數值完全相符的 semantic token。
3. 若沒有完全相符的 token，只能在 R017-local component 內使用本 spec 指定的 Figma raw value；不得把 R017 專屬值寫進 shared component。

## NX 現況與既有 contract

### Active routes

- `/referral`：
  - app entry：`apps/r017/src/pages/referral/index.vue`。
  - shared page：`libs/shared/ui-layer/src/lib/components/referral/ReferralPage.vue`。
  - referral summary：`libs/shared/ui-layer/src/lib/components/referral/ReferralSummaryCards.vue`。
- `/referralRebate`：
  - app entry：`apps/r017/src/pages/referralRebate.vue`。
  - shared page：`libs/shared/ui-layer/src/lib/components/referralRebate/ReferralRebatePage.vue`。
  - flow：`libs/shared/ui-layer/src/lib/composables/useReferralRebateFlow.ts`。
- `/collaboration`：
  - app entry：`apps/r017/src/pages/collaboration.vue`。
  - shared page：`libs/shared/ui-layer/src/lib/components/agentCollaboration/AgentCollaborationPage.vue`。
  - flow：`libs/shared/ui-layer/src/lib/composables/useAgentCollaborationFlow.ts`。
- route source of truth：`libs/shared/ui-layer/src/lib/constants/routePath.ts`。
- 三個 route 都在 `AUTH_REQUIRED_ROUTES`；本需求不得修改 auth middleware 或 route guard。

### 推薦資料

- 既有 API wrapper：
  - `libs/shared/ui-layer/src/lib/api/apiFunctions/referral_getReferralInfo.ts`。
  - response：`ReferralInfo { url: string; code: string }`。
- 既有 TanStack Query hook：
  - `libs/shared/ui-layer/src/lib/api/hooks/useReferralInfoQuery.ts`。
- `/referral` 與 `/referralRebate` 已使用 `useReferralInfoQuery()`。
- `/collaboration` 現在只從 collaboration statistics 取得 `referral_code`，沒有 URL；R017 app entry 必須額外讀取同一個 `useReferralInfoQuery()`，再把 referral info 以 opt-in prop 傳入 shared collaboration page。
- `ReferralInfo.url` 是本 NX repo 的 canonical 分享網址：
  - share action 複製此值。
  - inline QR 與 dialog QR 都逐字 encode 此值。
  - 不自行用 origin、route、query 或 referral code 重建 URL。
  - 不 trim、decode、encode 或重新排序 query。

### 既有 QR / Dialog / i18n pattern

- repo 已安裝 `uqr@0.1.2`；不得新增 `qrcode.vue` 或另一套 QR dependency。
- `libs/shared/ui-layer/src/lib/components/dialogs/DepositDialog.vue` 已示範 `renderSVG()` 與 SVG data URL；本需求沿用該 pattern。
- Dialog 使用 `libs/shared/ui-layer/src/lib/components/base/BaseDialog.vue`：
  - PrimeVue Dialog。
  - 支援 `classObj.root/header/title/closeBtn/body/footer`。
  - 支援 backdrop、Escape 與 close event。
- 文案沿用既有 key：
  - card label：`collaboration.exclusive_referral_code`。
  - dialog title／QR alt：remote locale的`member.bank.qrCode`。
  - 關閉：`common.close`。
  - 複製成功：`common.alarm.copySuccess`。
- 已以`https://locale.templates.gsiwl.com/locale/frontend/<locale>.json`唯讀確認repo現有16個locale的`member.bank.qrCode`都有非空值；不得改用local `edit_form.qr_code`，因其韓文值為空。
- 不新增、修改或補 local locale JSON。

## 受影響範圍

- 端別：會員端 NX repo `whitelabel-gsi-platform-multiverse-nx`。
- tenant：只啟用於 `apps/r017`。
- 預期新增的 R017-local files：
  - `apps/r017/src/components/referral/ReferralQRCodeCard.vue`
  - `apps/r017/src/components/referral/ReferralQRCodeDialog.vue`
- 預期修改的 R017 app entries：
  - `apps/r017/src/pages/referral/index.vue`
  - `apps/r017/src/pages/referralRebate.vue`
  - `apps/r017/src/pages/collaboration.vue`
- 預期修改的 shared extension points：
  - `libs/shared/ui-layer/src/lib/components/referral/ReferralPage.vue`
  - `libs/shared/ui-layer/src/lib/components/referral/ReferralSummaryCards.vue`
  - `libs/shared/ui-layer/src/lib/components/referralRebate/ReferralRebatePage.vue`
  - `libs/shared/ui-layer/src/lib/composables/useReferralRebateFlow.ts`
  - `libs/shared/ui-layer/src/lib/components/agentCollaboration/AgentCollaborationPage.vue`

### 跨 tenant 邊界

- R017 視覺 component、Figma geometry 與 QR Dialog 必須留在 `apps/r017`。
- shared layer 只允許增加 opt-in named slot 與必要的 scoped data／optional prop。
- 沒有傳入 slot／optional prop 的既有 consumer，rendered DOM、API request、clipboard action與視覺必須保持原樣。
- `/collaboration` 的 referral-info request 只從 `apps/r017/src/pages/collaboration.vue` 發起；不得讓所有 tenant 的 shared collaboration page無條件多打一支 API。
- 不複製整份 shared page 到 `apps/r017`，也不把 R017 class 硬寫進 shared page；兩者都違反 NX shared-first 與 tenant isolation。

## 範圍

### 1. 建立 R017-local `ReferralQRCodeCard`

新增 `apps/r017/src/components/referral/ReferralQRCodeCard.vue`：

- props：
  - `referralCode: string`
  - `referralUrl: string`
- component 負責：
  - 顯示 `t("collaboration.exclusive_referral_code")`。
  - 顯示 referral code。
  - share button 複製 `referralUrl`。
  - copy button 複製 `referralCode`。
  - 顯示 80×80 dynamic QR。
  - click／tap／keyboard activate QR tile 後開啟 `ReferralQRCodeDialog`。
- clipboard：
  - 使用 repo 既有 `useClipboard()`／`navigator.clipboard` pattern。
  - 成功後以 `useToastQueue()` 顯示 `t("common.alarm.copySuccess")`。
  - clipboard unavailable、拒絕或 payload 空值時不得 throw。
- component 不 fetch API、不自行建立分享 URL、不保存 URL 到 store。
- PC/H5 共用同一 component，以 repo `phone` breakpoint（`<= 768px`）切換 geometry。

### 2. 建立 R017-local `ReferralQRCodeDialog`

新增 `apps/r017/src/components/referral/ReferralQRCodeDialog.vue`：

- props：
  - 必須使用`defineModel<boolean>("visible")`提供`v-model:visible`。
  - `referralUrl: string`。
- wrapper必須以`v-model:visible`綁定shared `BaseDialog`；BaseDialog的`update:visible`需一路回寫至page持有的state。
- BaseDialog `close` event與footer button都必須把同一個model設為`false`。
- 不得只用`:visible`加`@close`的單向綁定；該寫法不能可靠承接backdrop／Escape產生的model update。
- 必須使用 shared `BaseDialog`，不直接引入 Quasar，也不修改 `BaseDialog.vue` 的 default behavior。
- 透過 `classObj` 與 R017-local scoped class 覆寫 QR variant：
  - PC 550×428。
  - H5 343×428。
  - H5 不可沿用 BaseDialog 預設 full-screen geometry。
- 若 Tailwind class precedence 無法覆寫 BaseDialog 的 phone default，只能在本 R017-local component 以唯一 class 加 scoped override；不得為此修改 shared BaseDialog。
- header：
  - title 使用 `t("member.bank.qrCode")`。
  - close icon 沿用 BaseDialog，aria-label 使用既有 `common.close`。
- footer：
  - 使用 shared `BaseBtn` 或符合既有 button pattern的原生 button。
  - 文字使用 `t("common.close")`。
- close icon、footer button、backdrop click、Escape（desktop）都能關閉。
- dialog 不 persistent。

### 3. QR renderer contract

- `ReferralQRCodeCard.vue` 以 computed 呼叫 `renderSVG(referralUrl, options)`。
- options：
  - `ecc: "M"`。
  - `border: 4`，quiet zone包含在 SVG viewBox內。
  - 白底。
  - 深色 modules；優先沿用 R017 最深背景 token，且需保持足夠掃描對比。
- 將 SVG 轉成 encoded data URL再交給 `<img>`，沿用 `DepositDialog.vue` pattern；不得用未消毒的 `v-html`。
- inline 與 dialog共用同一份 computed SVG data URL，不各自重算不同 options。
- `<img>`：
  - inline rendered size固定 80×80。
  - dialog rendered size固定 240×240。
  - `alt` 使用 `t("member.bank.qrCode")`。
- Figma 中的恐龍與固定 QR modules 是示意：
  - 不下載、不提交、不疊加恐龍 logo。
  - 實際 modules 隨 referral URL改變。
- `referralUrl` 為空時：
  - 不呼叫 `renderSVG`。
  - 不 render `<img>`。
  - QR trigger disabled，不能開空 dialog。

### 4. Shared opt-in slot contract

#### Referral

- `ReferralSummaryCards.vue` 增加 named slot `referral-code-card`。
- scoped payload：
  - `referralCode`：API raw code，空值為 `""`，不得傳 display fallback `"-"`。
  - `referralUrl`：API raw URL，空值為 `""`。
- slot 未提供時，保留現有 referral code article、share/copy action與 DOM。
- `ReferralPage.vue` 只負責把同名 slot轉發給 `ReferralSummaryCards.vue`。
- `apps/r017/src/pages/referral/index.vue` 傳入 slot並 render R017-local `ReferralQRCodeCard`。

#### Referral Rebate

- `ReferralRebatePage.vue` 在 referral-code summary card位置增加 named slot `referral-code-card`。
- scoped payload：
  - `referralCode`：`useReferralRebateFlow()`新增輸出的`rawReferralCode`，空值為`""`。
  - `referralUrl`：API raw URL，空值為 `""`。
- `useReferralRebateFlow.ts`：
  - 保留現有帶`"-"` fallback的`referralCode`，避免改變default UI。
  - 新增並return `rawReferralCode = computed(() => referralInfoQuery.data.value?.code || "")`。
  - slot只能使用`rawReferralCode`；不得用`referralCode === "-" ? "" : referralCode`反推raw data。
- slot 未提供時，既有三張 summary card與 copy behavior完全不變。
- `apps/r017/src/pages/referralRebate.vue` 傳入 slot並 render R017-local `ReferralQRCodeCard`。
- current/events/detail flow、access判斷、filter、pagination不得改。

#### Collaboration

- `AgentCollaborationPage.vue` 增加 optional prop：
  - `referralInfo?: { code: string; url: string } | null`，default `null`。
- 增加 named slot `referral-code-card`，scoped payload：
  - `referralCode`：`statistics.referral_code` raw value，空值為 `""`。
  - `referralUrl`：只有下列條件都成立才傳 API URL，否則為 `""`：
    1. `referralInfo.code` 非空。
    2. `statistics.referral_code` 非空。
    3. 兩個 code 完全相等。
    4. `referralInfo.url` 非空。
- `apps/r017/src/pages/collaboration.vue`：
  - 呼叫既有 `useReferralInfoQuery()`。
  - 把 query data傳給 `SharedAgentCollaborationPage` 的 `referralInfo` prop。
  - 傳入 slot並 render R017-local `ReferralQRCodeCard`。
- slot 未提供時：
  - 不需要 `referralInfo`。
  - 不新增 referral-info request。
  - 保留現有 referral code card、copy code 與 description Dialog行為。
- R017 slot提供後，Figma share button改為複製 canonical referral URL；不得繼續以 share glyph開啟 description Dialog。
- 現有 collaboration description Dialog component與內容不得刪除或重構；本需求不新增 Figma 未提供的第三顆 action。

### 5. Summary layout integration

- 只調整容納 referral-code card的 summary container，讓 389.333px desktop card與343px H5 card可呈現。
- shared summary container只有在 `referral-code-card` slot存在時套用 opt-in layout class；未提供 slot時 class不變。
- 允許：
  - desktop summary grid由四欄調整為可容納 QR card的三欄／wrap。
  - tablet intermediate width改為兩欄或stack。
  - H5 referral-code card跨滿 summary row。
- 不得修改其他 statistic card的資料、文案、順序或互動。
- 不得為符合 QR card寬度而讓 summary section或整頁 horizontal overflow。

## Figma 精確規格

### PC card（node `16530:158044`）

- reference size：`389.3333435058594px × 104px`。
- width：`min(100%, 389.3333435058594px)`；可用空間足夠時需達 reference width。
- height：`104px`。
- layout：horizontal、垂直置中。
- padding：horizontal `16px`、vertical `12px`。
- main item gap：`16px`。
- background：`var(--card-card-bg-purple)`，R017值為 `rgba(109, 92, 231, 0.3)`。
- border：`1px solid var(--brand-brand-secondary-contrast)`，R017值為 `#573EDC`。
- radius：`12px`。
- left content reference：`245.33334350585938px × 56px`，vertical gap `8px`。
- label：
  - Open Sans 400。
  - `14px / 20px`。
  - `var(--color-neutral-400)`，值為 `#A3A3A3`。
- code/action row：reference `172px × 28px`，gap `12px`。
- code：
  - Open Sans 700。
  - `24px / 28px`。
  - white。
- share/copy button hit area不得小於20×20；visible glyph各20×20。
- divider：
  - height `42px`。
  - color `rgba(255, 255, 255, 0.09)`。
- QR tile與 `<img>`：`80×80`、白底、radius `8px`、overflow hidden。

### H5 card（node `16530:158161`）

- 375px viewport：`343×104`，左右 margin各16px。
- width：`min(100%, 343px)`，置中。
- padding、background、border、radius、label、code、icon、divider與 QR size同 PC。
- left content：reference `199×56`。
- code/action row：reference `156×28`。
- code與 action gap：`4px`。
- 最小支援 viewport為320px。
- 320–374px：
  - width `calc(100vw - 32px)`。
  - height仍104px。
  - horizontal padding可由16px降為12px。
  - main item gap可由16px降為8px。
  - left content使用 `minmax(0, 1fr)`。
  - code區可自身 horizontal scroll；不可縮字、截斷完整 code或讓整頁 overflow。

### PC dialog（node `16530:157516`）

- outer：`550×428`，radius `12px`，overflow hidden。
- header：
  - `550×60`。
  - background `var(--dialog-dialog-bg-header)`，R017值 `#301D8A`。
  - padding `16px 20px`。
  - title Open Sans 700、`20px / 28px`、白色、置中。
- content：
  - `550×288`。
  - background `var(--dialog-dialog-bg-content)`，R017值 `#1D125D`。
  - padding `24px 20px`。
  - QR與 `<img>`：`240×240`，置中、白底、radius `8px`。
- footer：
  - `550×80`。
  - background `var(--dialog-dialog-bg-footer)`。
  - padding `16px 20px`。
- close button：
  - `510×48`。
  - radius `8px`。
  - gradient `var(--button-button-bg-primary-left-enabled)` → `var(--button-button-bg-primary-right-enabled)`，R017值 `#F97316` → `#DC2626`。
  - Open Sans 700、`16px / 24px`、白色。

### H5 dialog（node `16530:158024`）

- 375px viewport：outer `343×428`，左右 margin各16px。
- header：`343×60`。
- content：`343×288`。
- QR與 `<img>`：`240×240`，置中。
- footer：`343×80`。
- close button：`303×48`。
- 320–374px：outer width `calc(100vw - 32px)`，最大343px；height維持428px，QR維持240px。
- 不可變成 full-screen Dialog。

### Responsive contract

- desktop：viewport `> 768px`。
- H5：viewport `<= 768px`，使用 Tailwind `phone:`／`useCustomBreakpoints`既有 contract。
- 最小支援320px。
- 驗收 viewport至少包含：320、375、390、768、769與 desktop 1200以上。

### Icon / asset rules

- 先比對既有 `BaseIcon`：
  - share：`mdi:share-variant`。
  - copy：`mdi:content-copy`。
  - close：BaseDialog既有 `mdi:close`。
- 只有 glyph、stroke/fill、size與 Figma一致時才重用。
- 若 share/copy不一致，從 Figma export精確 SVG到 `apps/r017/src/assets`，不得放 shared assets，也不得提交會過期的 Figma MCP URL。
- Figma share/copy visible glyph opacity為48%；不得沿用橘色 icon。
- 不手繪或憑記憶重建 Figma SVG path。

## Reactive / empty / error behavior

- raw code或URL尚未載入、為`undefined`、`null`或空字串：
  - 顯示 code fallback `"-"`。
  - 對應 share/copy disabled。
  - 不產生 QR、不開 Dialog。
- API 後續成功或資料更新：
  - code、share/copy payload、inline QR、dialog QR同步更新。
- Dialog已開啟時URL變為空：
  - 立即關閉 Dialog。
- `renderSVG` throw：
  - component保持可用、不讓頁面 crash。
  - 不 render破損圖片。
  - 不截短或改寫 URL規避錯誤。
- collaboration的 statistics code與ReferralInfo code不一致：
  - code仍顯示 statistics值。
  - share與QR disabled。
  - 不用不匹配URL，也不自行建URL。

## Out of scope

- 不修改舊 repo `Whitelabel_GSI_Platform_Multiverse`。
- 不實作或發版 R003。
- 不新增或修改 API endpoint、response type、auth、route、middleware、access guard。
- 不新增 QR dependency，不使用 `qrcode.vue`。
- 不修改 shared `BaseDialog.vue`、DepositDialog或全域PrimeVue preset。
- 不把 R017 visual class、asset或theme override放進 shared layer。
- 不修改其他 tenant的default DOM、visual、API request或behavior。
- 不把 QR payload改成raw referral code、image URL、base64頁面或自行組裝的register URL。
- 不使用Web Share/system share；share button仍是複製完整 URL。
- 不改 statistic、currency、banner、tabs、tables、filters、pagination、header、footer或其他頁面功能。
- 不新增／修改 local locale JSON。
- 不處理無關 lint、format、style、animation或refactor。
- 不在本需求內 commit、push、merge、開MR/PR或deploy；以上需要使用者另外明確指示。

## 參考實作 / 要遵循的現有 pattern

- R017 app wrappers：
  - `apps/r017/src/pages/referral/index.vue`
  - `apps/r017/src/pages/referralRebate.vue`
  - `apps/r017/src/pages/collaboration.vue`
- shared referral：
  - `libs/shared/ui-layer/src/lib/components/referral/ReferralPage.vue`
  - `libs/shared/ui-layer/src/lib/components/referral/ReferralSummaryCards.vue`
- shared rebate：
  - `libs/shared/ui-layer/src/lib/components/referralRebate/ReferralRebatePage.vue`
  - `libs/shared/ui-layer/src/lib/composables/useReferralRebateFlow.ts`
- shared collaboration：
  - `libs/shared/ui-layer/src/lib/components/agentCollaboration/AgentCollaborationPage.vue`
  - `libs/shared/ui-layer/src/lib/composables/useAgentCollaborationFlow.ts`
- referral API/query：
  - `libs/shared/ui-layer/src/lib/api/apiFunctions/referral_getReferralInfo.ts`
  - `libs/shared/ui-layer/src/lib/api/hooks/useReferralInfoQuery.ts`
- QR renderer pattern：`libs/shared/ui-layer/src/lib/components/dialogs/DepositDialog.vue`。
- Dialog：`libs/shared/ui-layer/src/lib/components/base/BaseDialog.vue`。
- breakpoints：`libs/shared/ui-layer/src/lib/constants/breakpoints.ts`。
- routes：`libs/shared/ui-layer/src/lib/constants/routePath.ts`。
- R017 tokens：`apps/r017/src/assets/styles/_variables*.scss`。

## 關鍵決策與理由

1. **使用 NX shared-first + tenant opt-in slot。**
   - 三個功能頁已在 shared layer；複製整頁到R017會分叉資料流。
   - slot讓R017注入專屬視覺，其他tenant fallback完全不變。
2. **R017 visual component留在 `apps/r017`。**
   - Figma與需求只指定R017，不應把其geometry變成所有tenant的shared default。
3. **`ReferralInfo.url` 是唯一QR/share payload。**
   - NX API已提供完整URL；自行重建會重複舊專案contract並可能與後端配置不一致。
4. **使用既有 `uqr`。**
   - repo已有dependency與production pattern，不增加第二套QR runtime。
5. **使用 `BaseDialog`，以R017-local override形成固定尺寸variant。**
   - 保留PrimeVue、accessibility、backdrop與Escape pattern，同時避免修改shared default。
6. **Collaboration只在R017 entry查ReferralInfo。**
   - 避免shared page讓其他tenant無條件多打一支API。
7. **Collaboration code必须與ReferralInfo code一致才啟用URL。**
   - 防止把一個code顯示在卡片上，卻分享另一個code對應的網址。
8. **QR tile是放大trigger。**
   - Figma沒有額外View Larger文字；80×80 tile是唯一新增affordance。
9. **i18n只使用既有key。**
   - 不硬碼`QRcode`／`關閉`，不發明或補local翻譯。

## 驗收條件

> Reviewer 必須逐條判定通過／不通過，不可只以「有顯示QR」概括。

### 架構與scope

- [ ] 實作只存在NX repo工作分支，沒有修改舊Multiverse或R003。
- [ ] R017 visual component位於`apps/r017`，shared layer只有opt-in slot／optional prop。
- [ ] 未提供slot的shared component fallback DOM與behavior不變。
- [ ] 非R017 tenant不會因本次改動新增`getReferralInfo` request。
- [ ] 沒有複製整份shared page到`apps/r017`，也沒有把R017 class硬碼到shared layer。

### 功能矩陣

- [ ] `/referral` PC顯示PC card，H5顯示H5 card。
- [ ] `/referralRebate` PC/H5顯示對應card；current/events/detail與access flow不回歸。
- [ ] `/collaboration` PC/H5顯示對應card；statistics/table/filter/pagination不回歸。
- [ ] 三個入口各自只有一張referral QR card與最多一個visible QR Dialog。

### QR / clipboard

- [ ] 三個入口的share clipboard、inline QR解碼與dialog QR解碼逐字等於同一個`ReferralInfo.url`。
- [ ] copy button只複製referral code。
- [ ] QR使用`uqr` dynamic SVG，不是Figma image、static asset或raw code。
- [ ] inline與dialog共用同一SVG data URL與`ecc: "M"`、`border: 4` options。
- [ ] inline wrapper與image都是80×80；dialog wrapper與image都是240×240。
- [ ] QR有白色quiet zone、足夠對比且可實際掃描。
- [ ] empty code／URL時不產生無效QR、不開空Dialog、不throw。
- [ ] collaboration兩個code不一致時share/QR disabled。
- [ ] clipboard成功顯示既有copy-success toast；失敗不讓頁面crash。

### Dialog

- [ ] click、tap、Enter與Space可由inline QR tile開啟Dialog。
- [ ] PC Dialog 550×428；H5 Dialog 343×428且不是full-screen。
- [ ] close icon、footer button、backdrop與Escape（desktop）都可關閉。
- [ ] Dialog title與QR alt使用remote `member.bank.qrCode`，footer與aria-label使用`common.close`；韓文不為空白。
- [ ] wrapper、BaseDialog與page state使用同一條`v-model:visible`，backdrop／Escape更新會回寫父層，不會被舊的`true`值重新打開。
- [ ] URL變空時已開啟的Dialog自動關閉。
- [ ] 反覆開關不累積Dialog、listener或QR instance。

### Pixel parity / responsive

- [ ] PC card可用空間足夠時為389.3333435058594×104，對齊node`16530:158044`。
- [ ] 375px viewport card為343×104、左右margin 16px，對齊node`16530:158161`。
- [ ] PC Dialog header/content/footer/button對齊node`16530:157516`。
- [ ] H5 Dialog header/content/footer/button對齊node`16530:158024`。
- [ ] 使用數值完全相符的R017 semantic tokens；缺token的Figma值只存在R017-local component。
- [ ] share/copy/close glyph、opacity、位置對齊Figma；沒有誤用橘色icon。
- [ ] 320、375、390、768、769與desktop viewport沒有整頁horizontal overflow、重疊或裁切。
- [ ] QR modules與Figma示意不同不算mismatch；tile尺寸、位置、白底、radius與quiet zone仍需一致。
- [ ] Chrome screenshot與Figma並排／疊圖後無明顯spacing、font-size、position、color、radius差異。

### Quality

- [ ] 未修改API contract、auth、route、BaseDialog、global preset或local locale JSON。
- [ ] `useReferralRebateFlow()`明確輸出raw code，slot未把display fallback `"-"`當payload。
- [ ] 沒有新增QR dependency或lockfile churn。
- [ ] imports無unused/missing，targeted Prettier/ESLint與Nx build通過。
- [ ] `git diff --check`通過。
- [ ] commit不含臨時test、screenshot、Figma MCP URL、帳密、environment、`.nx`或generated build output。

## 邊界情況 / 例外

- URL可能含非ASCII、`+`、`%`、`&`等字元；不得二次encode/decode或手動重組。
- referral code過長：
  - 不縮小24px font。
  - 不把icon或QR推出card。
  - 只允許code自身區域horizontal scroll；不可讓整頁overflow。
- 真實payload在80px下若特定相機無法辨識：
  - 先以同URL的240px dialog QR確認。
  - 記錄payload長度、裝置與結果。
  - 不得截短URL或擴大Figma card。
- `/referralRebate`無權限帳號看不到頁面是既有預期；不得繞過guard。
- referral query失敗時保留layout與disabled state，不顯示偽造URL。
- Figma或API contract在實作前已變動時，先更新本spec再修改code。

## 測試計畫

### 1. 臨時 component / contract tests

- repo已有Vitest基礎設施；建立臨時spec驗證，完成後移除或unstage，不進commit。
- 至少覆蓋：
  1. empty code／URL不產生QR、不啟用action、不開Dialog。
  2. URL更新後SVG data URL同步更新。
  3. share、inline QR、dialog QR使用同一payload。
  4. collaboration code match才啟用URL。
  5. slot未提供時render fallback。
- 不為測試創造不必要的production abstraction。

### 2. Chrome browser / DOM verification

- 所有URL使用Chrome extension，不使用in-app browser。
- 使用可取得非空referral info且有三頁權限的QA帳號；帳密不得寫入script、output、spec或commit。
- 六個主case：
  - 3 routes × PC/H5。
- 每個case驗證：
  - card、inline QR與Dialog數量。
  - clipboard payload。
  - inline 80×80、dialog 240×240。
  - QR解碼結果。
  - close icon/footer/backdrop/Escape。
- 額外驗證320、390、768、769與long-code情境。

### 3. 視覺比對

- 產出但不commit：
  - PC card screenshot vs `16530:158044`。
  - H5 card screenshot vs `16530:158161`。
  - PC dialog screenshot vs `16530:157516`。
  - H5 dialog screenshot vs `16530:158024`。
- 以並排或overlay檢查spacing、font、position、color、radius。
- QR modules與恐龍圖案不列為pixel mismatch。

### 4. Targeted validation

- 對所有touched `.vue`／`.ts`跑targeted Prettier check。
- 對所有touched `.vue`／`.ts`跑targeted ESLint；只修本次blocking error，不清無關warning。
- 跑`pnpm exec nx build r017`。
- 跑`git --no-pager diff --check`。
- 確認status不含臨時test、screenshot、environment、`.nx`、`dist`、無關lockfile或其他使用者修改。
- 不執行`tsc --noEmit`。

## Git Flow

- 基底分支：`main`。
- 工作分支：`feat/gsi-352-r017-referral-qrcode`。
- 實作者開始前：
  1. 先確認working tree並保留使用者既有修改；本任務應使用乾淨、隔離的worktree。
  2. 執行`GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD`確認HTTPS token／macOS Keychain可用；失敗即停止，不切SSH。
  3. 更新最新`main`。
  4. 從最新`main`建立並切換`feat/gsi-352-r017-referral-qrcode`。
  5. 未切到工作分支前不得實作。
- 推進：工作分支 → `develop`（dev測試）→ `staging`（staging測試）→ `main`（正式），不得跳關。
- 每次commit前都需取得使用者針對該次commit的明確確認；本次改spec不構成commit授權。
- merge任何分支前都需使用者確認；發生conflict時停止／abort並回報，不自行解conflict或改策略。
- 不預設rebase，不主動把target branch合回工作分支。
- 不主動開MR/PR。
- merge不等於deploy；NX發版命令與目標必須由使用者另行明確指定，不得沿用舊repo的`yarn deploy`。

## 交接備註給實作者

- 先依Git Flow從最新`main`建立工作分支，再開始實作。
- 建議順序：
  1. 重新讀Jira、四個Figma節點、本spec與目標shared components。
  2. 建立R017-local card與Dialog。
  3. 在shared pages加入具fallback的opt-in slot。
  4. 接入三個R017 app entries；collaboration加入R017-only referral query與code-match gate。
  5. 執行臨時tests、6-case browser matrix、QR scan與四節點pixel comparison。
  6. 跑targeted formatting、lint、Nx build與diff checks。
- 本spec以2026-07-27 repo快照為基準。若最新`main`的route、API、slot surface、breakpoint或theme token已改，先更新spec。
- 完成後reviewer必須逐條review驗收條件；需求變更必須先改spec再改code。
