# Spec: GSI-353 會員公告圖片新增超連結與開啟方式

> 交接合約：實作者只依本 spec 實作，reviewer 逐條對照「驗收條件」驗收。

- Jira：[GSI-353｜[需求 代理端]會員公告-圖片顯示公告添加超連結功能](https://gamingsoft.atlassian.net/browse/GSI-353)
- 端別：代理端 `Whitelabel_GSI_Dashboard`
- Jira 指定環境／站點：正式環境、總代 `FA1M`、代理 `FA11`
- 功能位置：內容管理／公告管理／會員公告／新增、編輯
- 目標：讓每個語系的會員公告圖片可各自設定超連結與開啟方式；空連結時會員端圖片維持不可點擊。

## 背景 / 目標

目前代理端會員公告的每語系 `details[]` 可設定標題、內容與圖片，但圖片沒有連結資料。GSI-353 要求在圖片顯示公告的新增／編輯畫面，為每個語系的圖片補上：

- `link`：圖片超連結；空字串代表圖片不可點擊。
- `opening_method`：連結開啟方式；`0` 代表另開分頁，`1` 代表本頁導轉，預設 `0`。

代理端需正確初始化、顯示、回填並送出這兩個欄位。會員端如何依欄位執行導轉由會員端／後端承接，不在本 spec 的程式變更範圍。

### 跨站範圍決策（已確認）

Jira 只指定 `FA1M`／`FA11`，但本需求預期修改的會員公告型別、Pinia store 與表單元件是共用程式，直接實作會讓所有使用會員公告功能的代理站點都取得相同行為。

使用者已於 2026-07-28 明確確認採 **全站共用**：

- 所有使用會員公告功能的代理站點都新增相同的每語系圖片連結與開啟方式。
- 不加入 `FA11`、siteKey、agent code 或 template-specific 條件。
- 跨站 blocker 已解除，可依本 spec 的 Git Flow 開始實作。

## 現況基線

- `src/api/announcement.ts`
  - `getMemberAnnouncementDetail()` 使用 `GET /announcement/member`。
  - `addMemberAnnouncement()` 使用 `POST /announcement/member`。
  - `updateMemberAnnouncement()` 使用 `PUT /announcement/member`。
  - `buildMemberAnnouncementPayload()` 已將 `params.details` 原樣放入 payload，不需為本需求重寫 endpoint 或額外拆解 `details[]`。
  - `/v1/agent` 前綴由既有 request layer 處理；wrapper 繼續使用目前的 relative path pattern。
- `src/api/request.type.ts`
  - `AddMemberAnnouncementDetailItem` 目前只有 `lang`、`title`、`content`、`image`、`image_path`、`imageFileName?`。
- `src/api/response.type.ts`
  - `MemberAnnouncementDetailItem` 目前同樣沒有 `link`、`opening_method`。
- `src/stores/memberAnnouncement.ts`
  - 新增公告時會依 `siteStore.langList` 建立每語系 detail 預設物件。
- `src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue`
  - 每個語系 panel 左側已有圖片上傳區。
  - 「套用至其他語系」目前會複製標題、內容、圖片與圖片暫存欄位。
- `src/pages/MessageCenter/MemberAnnouncement/Edit.vue`
  - GET detail 後會直接將 `data.details` 回填至 store，並將 `image_path` 組成預覽 URL。
- `src/pages/WebsiteSettings/BannerSettings/component/BannerTable.vue`
  - 已有相同語意的連結輸入與開啟方式選項，可作為 UI 與 remote i18n key 參考。
- `src/utils/constants/cmsOpeningMethod.ts`
  - 已定義 `CMS_OPENING_METHOD.Enums.NEW_TAB = 0`、`REDIRECT = 1`，以及對應的既有 remote i18n keys。

## 範圍

### 1. 擴充每語系 API contract

在 request 與 response 的會員公告 detail item 型別補上：

```ts
link: string
opening_method: CMS_OPENING_METHOD.Enums
```

實際 JSON contract：

```json
{
  "lang": "語系代碼",
  "title": "公告標題",
  "content": "公告內容",
  "image": "既有欄位",
  "image_path": "既有圖片路徑",
  "link": "",
  "opening_method": 0
}
```

欄位規則：

| 欄位 | 型別 | 預設值 | 規則 |
|---|---:|---:|---|
| `link` | `string` | `""` | 空字串表示圖片不可點擊；非空字串原樣送後端 |
| `opening_method` | `int` / `CMS_OPENING_METHOD.Enums` | `0` | `0`＝另開分頁；`1`＝本頁導轉 |

不要新增前端自訂值，也不要將 `opening_method` 轉成字串。

### 2. 新增公告的預設 state

`src/stores/memberAnnouncement.ts` 建立每個語系 detail 時，加入：

```ts
link: "",
opening_method: CMS_OPENING_METHOD.Enums.NEW_TAB
```

要求：

- 所有 `siteStore.langList` 產生的語系物件都必須有這兩個欄位。
- 預設開啟方式固定為 `0`（另開分頁）。
- 不改動其他會員公告預設值。

### 3. 每語系圖片區塊新增控制項

在 `src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue` 每個語系的左側圖片上傳區，於既有圖片操作下方加入：

1. 圖片連結文字輸入框，雙向綁定 `item.link`。
2. 開啟方式下拉選單，雙向綁定 `item.opening_method`。

UI 行為：

- 每個語系獨立保存自己的 `link` 與 `opening_method`。
- 連結欄位可留空，不設 required rule。
- 本需求未要求 URL 格式限制；不要新增協定、domain 或 URL regex 驗證，也不要自動補 `https://`。
- 開啟方式只提供兩個選項：
  - `0`：另開分頁。
  - `1`：本頁導轉。
- 沿用既有 remote i18n keys，不建立 local locale file：
  - `common.link`
  - `common.enter_link`
  - `common.redirect_method`
  - `common.new_tab`
  - `common.redirect`
- 選項值優先沿用 `CMS_OPENING_METHOD.Enums` 與 `CMS_OPENING_METHOD.I18nKeys`，避免在會員公告再建立另一份 magic numbers。
- 欄位放在既有每語系圖片區域內；不要改動標題、Editor、圖片上傳限制、圖片比例或整體 wizard 結構。
- 維持目前圖片區塊的顯示方式，不因本需求重寫 `display_options` 的顯示／隱藏邏輯。

### 4. 「套用至其他語系」同步新欄位

既有 `applyToOtherLanguage()` 在複製來源語系到目標語系時，除既有欄位外，也必須複製：

```ts
target.link = source.link
target.opening_method = source.opening_method
```

這兩個欄位必須與同一張圖片一起被套用，避免目標語系留下與圖片不一致的舊連結設定。

### 5. 編輯公告回填與向下相容

GET detail 回填每個 `details[]` item 時：

- 正常保留後端回傳的 `link`。
- 正常保留後端回傳的 `opening_method`。
- 舊公告若缺欄位或回傳 `null` / `undefined`：
  - `link` 正規化為 `""`。
  - `opening_method` 正規化為 `CMS_OPENING_METHOD.Enums.NEW_TAB`（`0`）。
- 正規化時不可用會把合法數值 `0` 視為 falsy 的寫法覆蓋使用者值；應使用 nullish fallback 或明確判斷。
- 維持既有 `image_path` 轉預覽 URL 的行為。

### 6. POST / PUT payload

POST 與 PUT 繼續由既有 `buildMemberAnnouncementPayload()` 原樣送出 `details`。送出時每個語系物件都必須包含：

```ts
{
  // 既有欄位
  link: string,
  opening_method: 0 | 1
}
```

範例：

```json
{
  "details": [
    {
      "lang": "zh-tw",
      "title": "公告",
      "content": "",
      "image": "",
      "image_path": "announcement/example.png",
      "link": "https://example.com/promotion",
      "opening_method": 0
    },
    {
      "lang": "en",
      "title": "Announcement",
      "content": "",
      "image": "",
      "image_path": "announcement/example-en.png",
      "link": "",
      "opening_method": 0
    }
  ]
}
```

不得因 `link === ""` 而移除 `link` 或 `opening_method`；空字串是正式 contract，表示會員端圖片不可點擊。

### 7. API 權限契約

以下為後端提供的 API action permission；它們不是 request body 欄位：

| API | 舊權限樹 | 新權限樹 |
|---|---|---|
| `GET /v1/agent/announcement/member` | `A_A_MEMBER_ANNOUCEMENT_VIEW` (`3130201`) | `A_A_MEMBER_ANNOUCEMENT_VIEW_NEW` (`3480201`) |
| `POST /v1/agent/announcement/member` | `A_A_MEMBER_ANNOUCEMENT_EDIT` (`3130202`) | `A_A_MEMBER_ANNOUCEMENT_EDIT_NEW` (`3480202`) |
| `PUT /v1/agent/announcement/member` | `A_A_MEMBER_ANNOUCEMENT_EDIT` (`3130202`) | `A_A_MEMBER_ANNOUCEMENT_EDIT_NEW` (`3480202`) |

本需求的前端權限行為：

- 保留會員公告 route entry 與現有 `usePermission().edit` 行為。
- 不因 action permission 資訊而把 permission id 加進 API body、query 或 header。
- 不重命名現有 permission constants，不改造全域 permission store。
- 若實作時發現測試帳號無法進頁或無法操作，先確認後端回傳的 permission tree 與既有 route function permission；不要在本需求內自行擴大成 route 權限遷移。

## Out of scope

- 不實作會員端圖片點擊、`window.open`、router navigation 或 target 行為。
- 不修改會員端 repo。
- 不修改後端 API 或 permission 設定。
- 不新增會員公告 list 欄位、搜尋／篩選條件或預覽功能。
- 不調整會員公告排序、刪除、啟停用、派發對象、阻擋標籤／層級或時間邏輯。
- 不修改最新公告、代理公告、舊 `src/pages/Announcement/*`。
- 不調整 route entry、menu visibility 或全域 permission architecture。
- 不新增 `FA11`、siteKey、agent code 或 template-specific 隔離判斷。
- 不新增 URL 格式驗證、自動補協定或清洗連結。
- 不建立、搜尋或修改 local locale JSON。
- 不修改 `src/assets/env/environment.json`。
- 不處理 unrelated ESLint 問題、版面優化、動畫或重構。

## 受影響範圍

- 端別：代理端 `Whitelabel_GSI_Dashboard`。
- Jira 目標：正式環境 `FA1M`／`FA11`。
- 共用程度：預期修改位置是會員公告功能內的共用多語表單資料；若直接修改，所有使用此功能的代理站點都會受影響。
- 跨站決策：**使用者已於 2026-07-28 確認全站共用；所有使用會員公告功能的代理站點均納入範圍。**
- 預期修改：
  - `src/api/request.type.ts`
  - `src/api/response.type.ts`
  - `src/stores/memberAnnouncement.ts`
  - `src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue`
  - `src/pages/MessageCenter/MemberAnnouncement/Edit.vue`
- 預期不需修改，但需確認資料仍原樣通過：
  - `src/api/announcement.ts`
  - `src/pages/MessageCenter/MemberAnnouncement/Add.vue`
- 不新增 shared component 或 exported function。

## 參考實作 / 要遵循的現有 pattern

- 會員公告多語表單與圖片：
  - `src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue`
- 新增預設值：
  - `src/stores/memberAnnouncement.ts`
- 編輯 detail hydration：
  - `src/pages/MessageCenter/MemberAnnouncement/Edit.vue`
- request / response contract：
  - `src/api/request.type.ts`
  - `src/api/response.type.ts`
- payload pass-through：
  - `src/api/announcement.ts` 的 `buildMemberAnnouncementPayload()`
- 連結欄位與開啟方式 UI：
  - `src/pages/WebsiteSettings/BannerSettings/component/BannerTable.vue`
- 開啟方式 enum 與 remote i18n：
  - `src/utils/constants/cmsOpeningMethod.ts`
  - `src/utils/constants/index.ts` 的 `CMS_OPENING_METHOD` export

## 關鍵決策與理由

1. **連結設定放在 `details[]`，不是公告最外層。** 後端 contract 明確指定每個語系物件新增欄位，因此每個語系可有不同圖片與連結。
2. **沿用 `CMS_OPENING_METHOD`。** 現有 enum 的 `0/1` 語意與本需求完全一致，可避免重複 magic numbers 與 i18n mapping。
3. **空連結仍送 `link: ""` 與預設 `opening_method: 0`。** 空字串本身是「圖片不可點擊」的正式狀態，不能省略欄位。
4. **不新增 URL 驗證。** 需求與 API 只定義 `string`，沒有規定 URL scheme 或合法格式；額外驗證可能阻擋既有可接受的相對／內部連結。
5. **舊資料採 nullish fallback。** 既有公告可能沒有新欄位；前端必須可編輯且預設為空連結／另開分頁。
6. **跨語系套用會複製連結設定。** 現有功能已連圖片一起套用，新欄位若不跟隨會造成圖片與 CTA 不一致。
7. **API action permission 只記錄為授權契約。** 現有頁面已透過 route meta 與 `usePermission()` 處理 view/edit；本需求不做 permission migration。
8. **跨站生效範圍採全站共用。** 使用者已於 2026-07-28 明確接受共用會員公告程式會影響所有代理站點，因此不加入 `FA11` 專屬判斷，避免產生不必要的 site-specific 分支。

## 驗收條件

- [ ] `AddMemberAnnouncementDetailItem` 與 `MemberAnnouncementDetailItem` 都包含 `link`、`opening_method`，且 `opening_method` 使用數值 enum／型別。
- [ ] 新增公告初始化後，每個語系 detail 都是 `link: ""`、`opening_method: 0`。
- [ ] 每個語系圖片區域都有連結輸入框與開啟方式選單，且分別綁定該語系 item。
- [ ] 開啟方式只有「另開分頁」值 `0` 與「本頁導轉」值 `1`，預設選中 `0`。
- [ ] 連結可留空，不會被表單驗證擋下，也不會被自動修改。
- [ ] 「套用至其他語系」會同步複製 `link` 與 `opening_method`。
- [ ] GET 編輯頁可正確回填每個語系既有的 `link` 與 `opening_method`。
- [ ] 舊公告 detail 缺少／回傳 nullish 新欄位時，畫面分別顯示空連結與 `0`，且無 runtime error。
- [ ] 新增 POST 的每個 `details[]` item 都包含 `link` 與 `opening_method`。
- [ ] 編輯 PUT 的每個 `details[]` item 都包含目前表單值；空連結明確送 `""`，不省略欄位。
- [ ] 切換語系後，各語系連結與開啟方式互不污染。
- [ ] 既有標題、內容、圖片上傳、圖片刪除、時間、顯示方式、派發對象與 wizard 流程沒有回歸。
- [ ] 未新增 local locale file，畫面文案沿用 spec 指定的既有 remote i18n keys。
- [ ] 未修改 route/menu/global permission wiring，API permission id 未被誤加進 payload。
- [ ] 功能透過共用會員公告程式對所有代理站點生效，且未加入 `FA11`、siteKey、agent code 或 template-specific 條件。
- [ ] 未修改 `src/assets/env/environment.json`，未包含 unrelated 變更。

## 邊界情況 / 例外

- `link === ""`：合法；會員端應只顯示圖片且不可點擊。
- `link` 為非空字串：前端原樣保存與送出；導轉結果由會員端依 `opening_method` 處理。
- `opening_method === 0`：必須保留 `0`，不可因 falsy fallback 變成其他值。
- 舊公告沒有新欄位：編輯頁使用 `""` / `0` 顯示並可正常儲存。
- 多語系資料：每個語系可有不同連結與開啟方式；只有使用「套用至其他語系」時才複製。
- 使用者先填連結再刪除／替換圖片：本需求不自動清除連結；既有圖片必填驗證與提交流程維持原行為。
- 選擇非圖片顯示方式：不改動現有圖片欄位 visibility 或既有 payload 行為。

## 測試計畫

### 實作時的 focused tests

本 repo 目前 `package.json` 沒有實際 unit test runner，不為本需求引入新的正式測試框架。實作者必須建立不納入 commit 的暫時 executable test／harness，並記錄實際檔案路徑、執行命令與通過輸出。手動 Network／UI 驗證只能補充，不能取代 executable test。Commit 前必須移除或 unstage 測試檔。

暫時 test／harness 必須執行下列案例：

1. 新增 state：至少兩個語系都產生 `link: ""`、`opening_method: 0`。
2. 回填 normalization：
   - `{ link: undefined, opening_method: undefined }` 轉成 `""` / `0`。
   - `{ link: "https://example.com", opening_method: 0 }` 保留原值。
   - `{ link: "/promotion", opening_method: 1 }` 保留原值。
3. 跨語系套用：來源語系的 `link` / `opening_method` 複製到指定目標語系。
4. payload：以 network interception 或 API mock 驗證 POST 與 PUT 的每個 `details[]` 都包含新欄位，包含空連結案例。

若現有程式結構無法在不擴大 production scope 的前提下建立可執行測試，先回報並更新本 spec，不可只留下文字驗證紀錄。

### 手動驗證

使用 Chrome extension 開啟本機頁面，至少驗證：

1. 新增公告：
   - 兩個語系分別填不同連結與不同開啟方式。
   - 其中一個語系留空連結。
   - 送出時檢查 POST request body。
2. 跨語系套用：
   - 設定來源語系圖片、連結與開啟方式後套用，確認目標語系三者一致。
3. 編輯新資料：
   - GET response 含 `link` / `opening_method`，確認正確回填。
   - 修改後檢查 PUT request body。
4. 編輯舊資料：
   - GET response 缺少新欄位時，頁面顯示空連結與另開分頁，且可成功儲存。
5. 回歸：
   - 圖片顯示模式仍維持原本每語系圖片必填驗證。
   - 公告時間在 Step 1 → Step 2 → Step 1 後值不變。
   - `all`／`member`／`level`／`label` 四種派發對象各操作一次，皆可進入 Step 2 且返回 Step 1 後選擇仍保留。
   - 圖片上傳、圖片刪除、語系切換與完成流程各成功操作一次。
   - view-only 帳號仍看不到既有 edit actions；edit 帳號可進新增／編輯。

### Focused validation commands

依實際 touched files 執行：

```bash
git --no-pager diff --check -- \
  src/api/request.type.ts \
  src/api/response.type.ts \
  src/stores/memberAnnouncement.ts \
  src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue \
  src/pages/MessageCenter/MemberAnnouncement/Edit.vue

pnpm exec prettier --check \
  src/api/request.type.ts \
  src/api/response.type.ts \
  src/stores/memberAnnouncement.ts \
  src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue \
  src/pages/MessageCenter/MemberAnnouncement/Edit.vue

pnpm exec eslint \
  src/api/request.type.ts \
  src/api/response.type.ts \
  src/stores/memberAnnouncement.ts \
  src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue \
  src/pages/MessageCenter/MemberAnnouncement/Edit.vue

pnpm quasar build
```

- 本 repo 不執行 `tsc --noEmit`。
- ESLint 若只報既有、非阻塞問題，記錄結果但不要順手清理 unrelated lint。

## Git Flow

- 基底分支：`main`。
- 工作分支：`feat/gsi-353-member-announcement-image-link`。
- 跨站開始條件：已完成；使用者於 2026-07-28 確認全站共用。
- 實作者開始前：
  1. 確認 Dashboard worktree 沒有會被覆蓋的使用者變更。
  2. 依 repo 規則先做 HTTPS non-interactive auth probe。
  3. pull 最新 `main`。
  4. 從最新 `main` 建立並切換到上述工作分支。
- 不可直接在目前的 `feat/0728`、`main`、`develop`、`staging` 或其他共享分支實作。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（上線）。
- 每一階段測試通過後才能進下一階段，不可跳階。
- Commit 前需取得使用者針對該次 commit 的明確確認，不得自行 commit。
- 合併到任何分支前需取得使用者確認；若有 conflict，停止並回報，不自行解衝突或改策略。

## 交接備註給實作者

- 跨站範圍已確認全站共用；依 Git Flow 從最新 `main` 建立 `feat/gsi-353-member-announcement-image-link` 後開始實作。
- 只做本 spec 列出的會員公告每語系圖片連結需求。
- `src/api/announcement.ts` 現有 `details` pass-through 已符合 contract；除非驗證發現實際欄位被移除，否則不要為了「有改 API」而改 wrapper。
- 若後端實際回傳欄位型別、permission tree 或 UI 文案與本 spec 不一致，先更新 spec／取得確認再繼續，不自行猜測。
- 實作完成後，reviewer 必須逐條對照本 spec 的驗收條件。
