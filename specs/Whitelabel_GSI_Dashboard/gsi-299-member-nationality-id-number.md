# GSI-299 — 代理端會員國籍與身分證字號欄位

> 交接合約：Spec 作者產出，實作者依此實作，reviewer 對照「驗收條件」逐條 review。
>
> 狀態：**實作中**。使用者已於 2026-08-07 補齊國籍設定 endpoint、代理端會員欄位 shape、payload key 與三個錯誤碼；三個錯誤碼對應的確切 remote i18n key 仍待提供，該 mapping 不得自行命名。國籍變更後清除舊證號的提示屬建議 UX，尚無確切 copy / key，不列入本次驗收。

## Ticket / 目標專案

- Jira：[GSI-299](https://gamingsoft.atlassian.net/browse/GSI-299)
- 目標端別：代理端
- 目標 repository：`Whitelabel_GSI_Dashboard`
- Jira 標題：`[需求 會員端/代理端]新增會員資料欄位(越南身分證號)`
- 本 spec 的 implementation unit：
  1. 網站設定的會員欄位設定與「國籍－下拉選項設定」彈窗。
  2. 代理端會員新增／編輯時，國籍與身分證字號的連動顯示及送出。

## 來源優先序

1. Jira 最新留言 `354683`（2026-07-28 13:56 更新）的 18 項決議為最高優先來源。
2. Jira 描述只提供背景；其中「依站點經營國家」已被決議 #1 改為「依會員所選國籍」。
3. Jira 附件 `需求_會員端代理端新增會員資料欄位(越南身分證號) 20260728.pdf` 與 `id-number-country-rules-v12-with-admin.html` 只補充畫面、國家代碼與格式資料；和最新留言衝突時失效。

以下舊附件內容已明確失效，不得實作：

- 獨立的「身分證字號－各國使用規則」彈窗。
- 規則 V1 / V2 版本選單。
- 自訂格式條件或規則編輯器。
- 依站點經營國家同時比對多國規則。

## 背景 / 目標

會員資料需要新增身分證字號能力，並把既有自由文字國籍改為站長可配置的下拉選項。身分證格式只依會員目前選擇的單一國籍決定；格式規則、標準化與唯一性均由後端負責。

代理端需達成：

- 站長可設定哪些國家會出現在國籍下拉選單。
- 16 個支援國家可個別開啟身分證格式檢查。
- 代理端新增／編輯會員時，只有選到已開啟檢查的國籍才顯示身分證字號欄位並套用必填。
- 既有站點預設完全不受影響；新欄位與各國檢查預設全關閉。
- 舊會員自由文字國籍與既有資料不回溯清洗、不批次重驗。

本功能是格式與唯一性檢查，**不是 KYC**；不驗證證件真偽、有效性或政府核發狀態。

## 已確認的現況基線

### Route 與權限

- 網站設定入口為 `WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings`，沿用 parent route 的 `A_F_WEB_SETTINGS` 權限：
  - `src/router/routes.ts:2323`
  - `src/router/routes.ts:2334`
  - `src/router/routes.ts:2352`
  - `src/pages/WebsiteSettings/ClientSideSettings/Index.vue:47`
- 會員新增／編輯沿用 `A_F_MEMBER_LIST` 與既有 edit permission：
  - `src/router/routes.ts:420`
  - `src/router/routes.ts:437`
  - `src/router/routes.ts:446`
  - `src/pages/MemberManagement/MemberList/List.vue:19`
- 本需求不新增 route 或 permission ID。

### 網站登入／註冊設定

- `ClientWebSiteRegSettings.vue` 目前會把 `GET /member_customize_column/list` 回傳的每一列直接渲染，並提供四個 surface 的設定：
  - 會員端註冊：`player_register_*`
  - 會員中心：`player_center_*`
  - 代理端新增會員：`agent_create_*`
  - 代理端編輯會員：`agent_edit_*`
- 參考位置：
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:184`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:236`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:291`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:383`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:438`
- 目前只有 `account`、`password` 有設定彈窗；`nationality` 尚無選項設定 UI：
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:216`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:536`
- 儲存會把完整 `member_customize_columns` list PUT 回後端：
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:1029`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:1070`
  - `src/api/webSiteSetting.ts:98`
  - `src/api/webSiteSetting.ts:108`

### 會員新增／編輯

- 網站設定的身分證列仍由 `column_name = "uid"` 辨識，沿用既有 `MEMBER_COLUMN_NAME.Enums.UID`；代理端會員欄位下發與 create / detail / update 則使用新契約的 **`column_name = "id_number"`**，因此需新增不同值的 `MEMBER_COLUMN_NAME.Enums.ID_NUMBER`：
  - `src/utils/constants/memberColumnName.ts:16`
  - `src/utils/constants/memberColumnName.ts:28`
- `ClientWebSiteRegSettings.vue` 原本把 `UID` 排除在多個 required / display / edit toggle 之外。GSI-299 必須移除這 8 個 UID guard，讓網站設定 API 回 `column_name = "uid"` 時可設定四個 surface：
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:259`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:279`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:324`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:374`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:407`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:426`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:469`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:513`
- 新增會員會取得 `type=register` 動態欄位，通用地渲染 `INPUT` / `SELECT` / `DATE`，最後把完整動態 form POST 至 `/member`：
  - `src/pages/MemberManagement/MemberList/Settings/Add/Step1.vue:6`
  - `src/pages/MemberManagement/MemberList/Settings/Add/Step1.vue:37`
  - `src/pages/MemberManagement/MemberList/Settings/Add/Step2.vue:30`
  - `src/api/member.ts:137`
- 編輯會員會取得 `type=manage` 動態欄位，依 `column_name` 填入會員明細，並把完整動態 form PUT 回後端：
  - `src/pages/MemberManagement/MemberList/Edit/Info.vue:186`
  - `src/pages/MemberManagement/MemberList/Edit/Info.vue:887`
  - `src/pages/MemberManagement/MemberList/Edit/Info.vue:915`
  - `src/pages/MemberManagement/MemberList/Edit/Info.vue:1184`
- 通用欄位元件已接受後端 `required` / `edit` / `values`：
  - `src/pages/MemberManagement/MemberList/components/SelectColumn.vue:7`
  - `src/pages/MemberManagement/MemberList/components/SelectColumn.vue:65`
  - `src/pages/MemberManagement/MemberList/components/InputColumn.vue:6`
- 會員動態欄位 API 為 `GET /member/customize_column/list?type=register|manage`：
  - `src/api/member.ts:978`
  - `src/utils/constants/memberColumnType.ts:1`
  - `src/api/response.type.ts:2886`

### 不可誤用的既有資料

- `country` 是電話國碼，不是國籍：`src/composables/useMember.ts:42`。
- AI-KOL 的 hardcoded nationality list 是 feature-local 資料，不得作為會員國籍主檔：`src/utils/constants/kolOptions.ts:557`。
- KYC 的 `profile.document_number` 與 `/auth/kyc/...` API 是另一個 domain，不得拿來當本需求身分證欄位：
  - `src/pages/MemberManagement/KycVerification/Edit.vue:70`
  - `src/pages/MemberManagement/KycVerification/Edit.vue:107`
  - `src/api/member.ts:1099`

## 範圍

### 1. 登入／註冊設定欄位列

- 沿用既有四個 surface 的欄位列，不建立第五個全域顯示開關。
- 下列 `*_display`、`*_required`、`*_edit` 都是**新身分證字號 customize-column row 本身的 flags**，不是 `nationality` row 的 flags。
- 本 spec 將身分證字號 row 每個 surface 的 `*_display` 視為該 surface 的「身分證欄位顯示總開關」：
  - `player_register_display`
  - `player_center_display`
  - `agent_create_display`
  - `agent_edit_display`
- 對某 surface 而言，身分證欄位實際顯示只取決於身分證字號 row 在該 surface 的 `*_display = true`。
- 是否有 `nationality` row、會員是否已選國籍及該 option 的 `id_check` 都不得控制身分證欄位顯示。
- 身分證字號 row 的 `*_required` 在該 surface 的 display 開啟時直接生效，不受 nationality / `id_check` 影響；只有 display 關閉時不觸發 required validation。
- `player_center_edit` / `agent_edit_edit` 繼續沿用既有可編輯設定。
- `nationality` 列新增設定按鈕，開啟「國籍－下拉選項設定」彈窗。
- 身分證字號列**不提供**獨立國家規則設定按鈕；舊附件中的齒輪與獨立規則彈窗作廢。
- 不改動 account / phone registration mode 現有互斥與 disable 行為。

### 2. 「國籍－下拉選項設定」彈窗

彈窗在同一列呈現國籍選項與身分證檢查設定。每個國家至少包含：

- 排序。
- ISO-like 穩定國家代碼（後端提供、唯讀）。
- 繁體中文名稱（後端提供、唯讀）。
- 英文名稱（後端提供、唯讀）。
- 「啟用國籍」開關：決定此國是否出現在會員端與代理端的國籍下拉選單。
- 「檢查身分證」開關：決定此國是否啟用身分證格式檢查。
- 後端提供 `has_rule`：只有 `has_rule = true` 的國家可開啟「檢查身分證」。前端不得複製或維護格式 regex。

互動規則：

- 國籍可單獨啟用，不要求同時啟用身分證檢查。
- 國籍尚未啟用時，「檢查身分證」不可開啟。
- 「檢查身分證」仍開啟時，該國籍開關鎖灰、不可關閉；使用者需先關閉檢查，不新增未確認的提示 copy。
- 不以 silent cascade 自動改掉另一顆開關，避免站長未察覺設定被連帶變更。
- 儲存前在前端檢查非法組合；後端仍必須再次驗證，前端不能是唯一防線。
- 取消需恢復開啟彈窗前的狀態，不可污染主頁尚未儲存資料。
- 儲存成功後重取或更新 authoritative state；重新開啟彈窗必須和後端一致。
- 不實作舊附件的「全部檢查／全部不檢查」、規則預覽、格式範例 editor、規則版本與自訂條件。

### 3. 支援格式檢查的 16 國

以下清單是 Jira 決議 #5 的定版集合；格式規則必須由後端維護，前端只讀取「是否支援／是否啟用」：

| Code | 國家     |
| ---- | -------- |
| `CN` | 中國     |
| `KR` | 南韓     |
| `ID` | 印尼     |
| `MX` | 墨西哥   |
| `NG` | 奈及利亞 |
| `BD` | 孟加拉   |
| `BR` | 巴西     |
| `JP` | 日本     |
| `TH` | 泰國     |
| `AU` | 澳洲     |
| `MM` | 緬甸     |
| `US` | 美國     |
| `KE` | 肯亞     |
| `PH` | 菲律賓   |
| `VN` | 越南     |
| `MY` | 馬來西亞 |

國家主檔可包含 16 國以外的國家，且站長可啟用任意數量的國籍選項；不支援格式規則的國家必須呈現為「可啟用國籍、不可啟用身分證檢查」。前端不得把國籍 master 限死為 16 國。

### 4. 代理端新增會員

- 國籍欄位必須是 `SELECT`，options 只包含該代理已啟用的國家，value 使用穩定國家代碼，不使用顯示文字作 payload。
- `agent_create_display = true` 時直接顯示身分證欄位；`agent_create_required` 決定是否必填。
- 未選國籍或選到未開啟身分證檢查的國籍時仍顯示身分證欄位；`id_check` 只控制後端格式檢查。
- 新增過程只要國籍改變或清空，就清掉尚未提交的身分證值，避免把舊國籍證號送給新國籍。
- 送出時國籍代碼與身分證字號必須在同一次 request 中提交。
- 前端不實作 16 國 regex、標準化或唯一性預檢；以後端回應為準。

### 5. 代理端編輯會員

- 有 `A_F_MEMBER_LIST` edit 權限時，沿用 `agent_edit_edit` 控制可編輯狀態；沒有 edit 權限時保持 read-only，且不得送出變更。
- API 回正式國家代碼時，以國籍 select 顯示對應 label。
- API 回 legacy 自由文字國籍時：
  - 原樣顯示既有文字。
  - 使用者只改手機、信箱等其他欄位時，不要求重選國籍，也不得被新驗證阻擋。
  - 一旦使用者主動變更國籍，必須從目前啟用的國家 options 選擇正式代碼，不能再儲存任意自由文字。
- 會員原有國籍與身分證皆未改變時，即使現有 form 原樣回送全部 dynamic fields，也不得在前端主動重驗；後端必須以 DB 舊值判斷是否真的變更。
- 國籍主動變更時，立即清掉舊身分證值：
  - `agent_edit_display = true` 時欄位保持顯示，並依 `agent_edit_required` 要求輸入新證號，不受新國籍 `id_check` 影響。
  - `agent_edit_display = false` 時欄位維持隱藏且 required 不生效。
- 站長日後開啟某國檢查，不回溯既有會員；既有會員沒有主動變更國籍或身分證時不受影響。
- API 回傳 `id_number` 全碼。代理端 read-only 顯示需遮罩至僅露出尾 4 碼，且不可改寫原始 form model；具 edit 權限且欄位可編輯時使用全碼 input，避免把遮罩字串送回後端。

### 6. 後端錯誤顯示

前端按後端錯誤碼映射遠端 i18n，不比對英文 message 字串。新錯誤碼涵蓋：

| 情境                         | PDF 提供的 zh-TW 文案        | PDF 提供的英文文案                     |
| ---------------------------- | ---------------------------- | -------------------------------------- |
| 必填未輸入                   | 請輸入身分證字號。           | Please enter your ID number.           |
| 格式不符                     | 請輸入正確的身分證字號格式。 | Please enter a valid ID number format. |
| 同代理、同國籍、標準化後重複 | 此身分證字號已被使用。       | This ID number is already in use.      |

- 上表只記錄來源文案，不授權新增自創 key 或自行翻譯其他語系。
- 未選國籍沿用 `nationality` row 既有 required validation／既有後端錯誤，不新增第四個 GSI-299 error code。
- 實作者必須先搜尋現有 remote / shared i18n 是否有語意相容的 key。
- 若無相容 key，由 PM 提供確切 key 與各語系內容後再實作。
- 不搜尋、建立或編輯 local locale JSON。

已確認的既有 key 重用：

- 代理端 member form 的資料欄位仍使用正式契約 `id_number`，但顯示標籤沿用現有且語意相符的 `website_settings_reg.uid`；網站設定 `uid` row 與管理彈窗的身分證檢查欄名也沿用同一顯示 key。此重用只影響 label，不得把 member payload / dynamic-column key 改回 `uid`。

## API / error code / remote i18n contract

以下契約由使用者於 2026-08-07 提供。Dashboard core implementation 可依此開始；只有三個新錯誤碼的 remote i18n key 仍為前置缺口。

### A. 國家主檔與代理級設定

- `GET /v1/agent/nationality_options`：取得管理彈窗的完整國籍設定；每筆至少包含 `code`、`enabled`、`id_check`、`sort`、`langs`、唯讀能力 `has_rule` 與唯讀提示 `format_example`。
- `PUT /v1/agent/nationality_options`：整份覆蓋，body 必須精確為：

  ```json
  {
    "options": [
      {
        "code": "VN",
        "enabled": true,
        "id_check": true,
        "sort": 1,
        "langs": {}
      }
    ]
  }
  ```

- PUT 會拒收未知欄位；前端必須顯式 pick `code`、`enabled`、`id_check`、`sort`、`langs`，不得把 `has_rule` 或 `format_example` spread 回去。
- `id_check` 只有 `has_rule = true` 的 16 國可開；其他國家鎖灰。
- 開啟 `id_check` 時該國 `enabled` 必須同時為 true；關閉仍有 `id_check` 的國籍時阻擋並提示，不 silent cascade。

### B. Member customize-column contract

- Dashboard 使用 `GET /v1/agent/member/customize_column/list`（現有 wrapper 為 `/member/customize_column/list?type=register|manage`）。
- `nationality` row 的 `values` 新 shape：

  ```ts
  {
    label: string;
    zh_tw: string;
    value: string;
    id_check: boolean;
    format_example: string;
    langs: Record<string, string>;
  }
  ```

- 國籍 payload 一律使用 `value` 的 ISO code。
- label 解析順序：locale `zh-tw` 使用 `zh_tw`、`en` 使用 `label`、其他語系使用 `langs[locale]`，缺值 fallback `label`。
- 下發新增 `column_name = "id_number"` row，包含該入口既有的顯示／必填／可編輯設定；Dashboard 不以 `uid` 或 KYC `document_number` 當 member-form fallback。
- `id_number` row 是否實際渲染只依該入口的 display 總閘；未選國籍或 option `id_check = false` 時仍直接顯示。
- `format_example` 只作即時輸入提示；前端不複製 regex。

### C. Member create / detail / update contract

- Dashboard `POST /v1/agent/member` 與 `PUT /v1/agent/member`：body 頂層使用 `nationality`（ISO code）與 `id_number`。
- 會員 detail / info 類查詢在既有 payload 頂層增加 `id_number`，回標準化後全碼；現有 generic `data[e.column_name]` 可透傳，不另建 KYC envelope。
- 身分證輸入可含分隔符並原樣送出；後端負責標準化。
- 編輯表單未變更時原樣回送安全，後端不重驗。
- 主動變更國籍且原有證號時：
  - 前端清除舊值；若 `id_number` display / required 開啟，就直接要求新證號，不受新國籍 `id_check` 影響；未送回傳 `407035`。
  - `id_check` 只決定後端是否執行該國格式檢查。提示屬建議 UX，待 PM 提供確切 copy / remote key 後再加。
- 會員端另有 `POST /v1/player/user` body 頂層 `id_number`、`PUT /v1/player/center/basic/info` 的 `customize_column.id_number`，但其 UI 實作不在 Dashboard repo 範圍。

### D. 驗證與錯誤契約

後端負責：

- 依目前單一國籍套用格式規則。
- 去除該國允許分隔符、轉大寫後標準化。
- 唯一鍵 `(代理, 國籍代碼, 標準化身分證字號)`。
- 同代理同國籍重複要拒絕；跨代理或不同國籍同號碼不得互擋。
- 無規則或未開檢查國籍：不驗格式，但若收到證號仍做基本輸入衛生與唯一性。
- 新註冊、主動改國籍或主動改證號才重驗；原值未變不重驗。

- `407035`：身分證必填未輸入。
- `407036`：身分證格式錯誤。
- `407037`：身分證已被使用。
- 三個 code 均需依確切 remote i18n key 顯示，不比對英文 message。使用者目前只提供 zh-TW / en 建議文案來源，尚未提供 key；不得自行發明。

## Out of scope

- `Whitelabel_GSI_Platform_Multiverse` 或 `whitelabel-gsi-platform-multiverse-nx` 的會員註冊／會員中心實作。
- 後端格式規則、DB migration、唯一索引與 API 實作。
- KYC 真偽驗證、OCR、政府資料查詢或 KYC `document_number` 整合。
- 會員列表欄位、搜尋條件、filter、sorting、匯出欄位或匯出格式變更。
- 獨立身分證規則彈窗、規則版本、規則 editor、自訂條件、regex editor、規則預覽與批次「全部檢查」。
- 在前端 hardcode 16 國格式 regex、標準化或唯一性演算法。
- AI-KOL nationality constants 的共用化或重構。
- 新 route、新 permission ID 或變更 page entry behavior。
- local locale files。
- `src/assets/env/environment.json` 的任何檢查或變更。
- 無關頁面、共用表格、filter、modal、layout、動畫或 lint cleanup。

## 受影響範圍

### 預期必要檔案

- `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue`
- `src/api/webSiteSetting.ts`
- `src/api/request.type.ts`
- `src/api/response.type.ts`

若國籍設定彈窗過大，可在同一 feature 目錄抽出聚焦 component，例如：

- `src/pages/WebsiteSettings/ClientSideSettings/components/NationalityOptionSettingsDialog.vue`

### 依正式 API contract 需要

- `src/composables/useMember.ts`
- `src/api/member.ts`
- `src/pages/MemberManagement/MemberList/Settings/Add/Step1.vue`
- `src/pages/MemberManagement/MemberList/Edit/Info.vue`
- `src/pages/MemberManagement/MemberList/components/InputColumn.vue`
- `src/pages/MemberManagement/MemberList/components/SelectColumn.vue`

若 backend 以既有 generic `INPUT` / `SELECT` contract 完整描述欄位，優先讓既有通用元件工作；不要為 GSI-299 複製一套表單。

### 不應改動

- `src/router/routes.ts`
- `src/utils/constants/permission.ts`
- `src/pages/MemberManagement/KycVerification/**`
- `src/utils/constants/kolOptions.ts`
- 會員列表與匯出相關檔案
- `src/assets/env/environment.json`

### 跨站／跨專案影響

- 這些 route 同時供 `agent`、`anibetAgent`、`amusevip` 使用，不能加入單一 `siteKey` hardcode。
- Jira 決議 #17 明訂新身分證字號 row 的 display 與各國 `id_check` 對既有站點預設全關閉，再由各站長自行啟用；既有 `nationality` row surface flags 不得被前端重設。這是 shared feature，但設定值必須以代理隔離。
- 同一個設定頁也會設定 `player_register_*` / `player_center_*`。Dashboard 只負責設定 UI 與資料送出；會員端實際顯示／驗證由會員端 repository 的獨立 spec／實作負責。
- 至少用兩個不同代理驗證設定不互相污染。

## 參考實作 / 要遵循的現有 pattern

- 網站設定欄位 row、動態語系、四 surface flags、儲存：
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:184`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:1029`
- 既有 account / password 設定 dialog 開啟與狀態管理：
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:216`
  - `src/pages/WebsiteSettings/ClientSideSettings/ClientWebSiteRegSettings.vue:536`
- Dynamic member field option / label 轉換：
  - `src/composables/useMember.ts:23`
  - `src/composables/useMember.ts:34`
- 新增會員 generic columns：
  - `src/pages/MemberManagement/MemberList/Settings/Add/Step1.vue:37`
  - `src/pages/MemberManagement/MemberList/components/SelectColumn.vue:7`
  - `src/pages/MemberManagement/MemberList/components/InputColumn.vue:6`
- 編輯會員 generic columns、permission 與完整 payload：
  - `src/pages/MemberManagement/MemberList/Edit/Info.vue:186`
  - `src/pages/MemberManagement/MemberList/Edit/Info.vue:645`
  - `src/pages/MemberManagement/MemberList/Edit/Info.vue:1184`
- Website API wrapper 放在 `src/api/webSiteSetting.ts`；shared request / response contract 分別放在 `src/api/request.type.ts`、`src/api/response.type.ts`。

## 關鍵決策與理由 (Key decisions)

1. **本 spec 只交付 Dashboard implementation unit。** GSI-299 同時涉及會員端與後端；拆開可讓每個 repository 獨立實作、驗收，不讓一份 spec 混入不可修改的專案。
2. **最新 Jira 留言優先於 PDF / HTML v12。** 最新決議已明確推翻舊 UI 與規則設定方案。
3. **國籍與身分證檢查合併到同一彈窗。** 避免兩個設定入口產生互相矛盾狀態，符合決議 #3。
4. **新身分證字號 row 現有四個 surface 的 display flag 分別作為該 surface 的總開關。** 既有資料模型已區分會員註冊、會員中心、代理新增、代理編輯；不新增無來源的第五個 global flag。
5. **實際顯示同時要求 nationality row display、ID row display、已選國籍與該國籍已開檢查。** 這直接落實決議 #7；若沒有可見的國籍欄位就不推測國籍，欄位隱藏時也不會誤觸 required。
6. **不 silent cascade 國籍／檢查開關。** 最新決議要求「關國籍需先關檢查」；阻擋並提示比自動關閉更符合明文決議，也避免站長無意間改掉設定。
7. **前端不維護國家格式。** 決議 #6 要求規則寫死在後端；Dashboard 只管理 enable state，避免前後端規則漂移。
8. **國家主檔不限 16 國，16 國只是格式規則支援集合。** 決議 #2 說選項數量不限，決議 #8 又定義無規則國籍的 fail-open 行為；兩者合併後，非 16 國仍可作為國籍選項。
9. **legacy 自由文字國籍使用 temporary display，不做前端 migration。** 符合決議 #14，且只改其他欄位不會被新 select 阻擋。
10. **是否真的變更由後端比較 DB 舊值。** 現有 edit form 會原樣回送所有 dynamic fields，單靠 request 是否含欄位無法判斷變更；決議 #16 必須由後端保證。
11. **網站設定與會員表單使用不同 contract key。** 網站設定 row 的 `uid` 沿用 `MEMBER_COLUMN_NAME.Enums.UID`；代理端會員 dynamic row 與 payload 使用 `id_number`，新增 `MEMBER_COLUMN_NAME.Enums.ID_NUMBER`，兩者不可互相 fallback。
12. **不重用 KYC document number。** Jira 已把本功能定位為格式＋唯一性而非 KYC，兩者 API、權限與資料生命週期不同。
13. **代理端 read-only 顯示尾四遮罩。** 原始 model 保持全碼，只有不可編輯顯示層遮罩，避免把遮罩字串回送。
14. **Core API contract 已確認，i18n key 仍不猜。** API、shape 與 `407035`–`407037` 可實作；三個錯誤碼的 remote i18n key 需另行補齊。國籍變更提示為非阻擋建議 UX，沒有 copy / key 前不實作。

## 驗收條件

### A. 設定頁

- [ ] `nationality` 列有設定按鈕，開啟合併後的「國籍－下拉選項設定」彈窗。
- [ ] 身分證字號列沒有獨立國家規則設定入口。
- [ ] 彈窗顯示後端國家主檔的代碼、中文、英文、排序、國籍啟用與身分證檢查狀態。
- [ ] 代碼、中文與英文依契約為唯讀；本需求沒有其他語系翻譯編輯欄位。
- [ ] 國家主檔可顯示 16 國以外的國家；非支援國家可啟用國籍但不能開啟身分證檢查。
- [ ] 可只開啟國籍而不開啟身分證檢查。
- [ ] 國籍未啟用時不能開啟身分證檢查。
- [ ] 身分證檢查仍開啟時，該國籍開關鎖灰且不能關閉；先關閉檢查後才可關閉國籍。
- [ ] Cancel 不送 request 且完整恢復彈窗開啟前狀態。
- [ ] Save 送出正式 API contract；成功後重新載入仍保持相同排序與開關。
- [ ] 後端回非法組合或 concurrency error 時，UI 顯示錯誤且不呈現假成功狀態。
- [ ] Mock API 回傳尚未設定的 GSI-299 config 時，身分證字號 row 的四個 surface display 與所有 `id_check` 都呈現關閉；前端不自行開啟。
- [ ] 既有 `nationality` row 的 surface flags 不因載入 GSI-299 config 被前端重設；國籍 option migration/default 完全採後端 authoritative response，不從空值推導並回寫。
- [ ] 沒有獨立規則彈窗、規則版本、自訂條件、regex editor、規則預覽或全部檢查按鈕。
- [ ] 沒有網站設定 edit 權限時，既有 overlay / read-only 行為仍能阻止修改與送出。
- [ ] account / phone registration mode 切換不會改壞 nationality / ID-number row 的 flags 或 disable state。
- [ ] `nationality` row 在某 surface 隱藏、未選國籍或 option.id_check=false 時，只要身分證字號 row 的 display 開啟，該 surface 仍直接顯示身分證欄位並依其 required 設定驗證。
- [ ] 後端回 `column_name = "uid"` 時，設定頁對該 row 顯示各 surface 原本適用的 controls：會員註冊 required / display、會員中心 required / display / edit、後台新增 required / display、後台編輯 required / display / edit；既有 UID exclusions 已逐一盤點並只保留仍有產品理由的限制。
- [ ] `memberColumnName.ts` 保留 `UID = "uid"` 並新增不同值的 `ID_NUMBER = "id_number"`；設定頁與 member form 各用自己的正式 key。

### B. 代理端新增會員

- [ ] 代理端身分證字號動態欄位只以 `column_name = "id_number"` 辨識；不使用設定頁 `uid` 或 KYC `document_number` 作 fallback。
- [ ] 國籍欄位為 select，且只顯示目前代理已啟用的國家；payload 使用國家代碼。
- [ ] `agent_create_display = true` 時直接顯示身分證欄位，不受 nationality 是否已選或 option.id_check 影響。
- [ ] 欄位顯示後，`agent_create_required = true` 直接觸發必填。
- [ ] 國籍改變或清空時，未提交身分證值被清除；欄位依 display 設定保持顯示。
- [ ] 國籍代碼與身分證字號能在同一 create request 中正確提交。
- [ ] 前端沒有 16 國 regex、標準化或唯一性 hardcode。

### C. 代理端編輯／檢視會員

- [ ] 正式國家代碼能映射並顯示正確 option label。
- [ ] Legacy 自由文字國籍原樣顯示；只改手機／信箱等其他欄位可成功儲存，不被迫重選國籍。
- [ ] Legacy 國籍一旦主動變更，只能選擇目前啟用的正式國家代碼。
- [ ] 國籍未改、身分證未改時，即使完整 dynamic form 原樣回送也不觸發新格式／唯一性驗證。
- [ ] 國籍不變、使用者只修改身分證字號時，會提交新值並由後端重新執行該國格式與唯一性驗證；前端能顯示對應錯誤。
- [ ] 國籍主動變更會清掉舊證號，不會把舊國籍證號留給新國籍。
- [ ] agent edit display / required 開啟時，無論新國籍是否開啟檢查，都顯示並要求重新輸入新證號。
- [ ] 新國籍未開檢查時，舊證號清空，但欄位仍依 agent edit display 設定顯示。
- [ ] 站長事後開啟某國檢查，不會使未修改資料的既有會員無法儲存其他欄位。
- [ ] 沒有 member-list edit 權限時，國籍與身分證都保持 read-only，且 submit 不會送出變更。
- [ ] Read-only 身分證只顯示尾 4 碼；form model 仍保留 API 全碼，具 edit 權限時不會把遮罩字串送出。

### D. Dashboard API error handling（可用 mock 驗證）

- [ ] `407035`、`407036`、`407037` 均映射到已確認的 remote i18n key。
- [ ] Mock API 回同代理、同國籍重複 error code 時，畫面顯示重複錯誤並保留可修正的 form state。
- [ ] 前端不對跨代理或不同國籍的相同證號做本地 duplicate 判斷；一律提交給 API。
- [ ] 未開格式檢查的國籍不顯示格式錯誤；若 API 收到證號，後端基本衛生與唯一性錯誤仍可正確顯示。
- [ ] 所有錯誤 mapping 依 error code，不依英文 message 字串。

### E. Regression / scope

- [ ] 會員列表沒有新增欄位、filter 或 search。
- [ ] 會員匯出 payload 與輸出欄位完全不變。
- [ ] KYC 頁面與 `profile.document_number` 沒有改動。
- [ ] AI-KOL nationality constants 沒有改動。
- [ ] Route 與 permission constants 沒有改動。
- [ ] 不存在 local locale JSON 變更。
- [ ] 不存在 `src/assets/env/environment.json` 變更或 diff。
- [ ] Dashboard 設定頁仍可保存 `player_register_*` / `player_center_*`，但本 repo 不新增會員端 UI 邏輯。

### F. Integration / release gates（需正式後端環境）

> 本節不要求 Dashboard repository 實作後端，但在 dev / staging 判定 GSI-299 可推進前必須通過；review Dashboard diff 時，先以 A–E 的 mock／靜態驗收為準。

- [ ] 正式 API 對新、舊代理的未設定狀態回傳：身分證字號 row display 與所有 `id_check` 為關閉，且不改寫既有 `nationality` row surface flags。
- [ ] 國籍／檢查設定 Save 後重載一致，且代理 A 修改不影響代理 B。
- [ ] 同代理、同國籍、標準化後相同證號在 create / update 被拒絕並顯示重複錯誤。
- [ ] 跨代理使用相同證號可 create / update 成功，不顯示重複錯誤。
- [ ] 同代理但不同國籍使用相同證號可 create / update 成功，不顯示重複錯誤。
- [ ] 國籍與身分證皆未變，只改其他會員欄位可 update 成功，不觸發新格式／唯一性驗證。
- [ ] 國籍不變但身分證主動修改時，後端會重新執行該國格式與唯一性驗證。

## 邊界情況 / 例外

- API 國家主檔暫時回空：彈窗顯示既有 empty / error state，不得把空清單誤存回後端覆蓋設定。
- 後端回傳未知國家代碼：保留原始值並顯示 fallback，不 crash；不得靜默轉成別的國家。
- 國家在會員開啟 edit form 後被站長停用：若會員國籍／身分證未改、只改其他欄位，仍須遵守既往不咎並可成功；只有使用者提交已失效的**新國籍選擇**時，才顯示後端錯誤並重取設定。
- Legacy nationality 文字剛好等於某個新 option label：只有後端明確提供正式 code 時才視為正式值，不以 label 猜 code。
- 國籍切換多次：每次離開原國籍都不得復原或偷偷保留先前證號。
- 身分證欄位 display 關閉但 API detail 有舊值：不顯示、不要求清空，除非使用者主動變更國籍；避免回溯改資料。
- 身分證 required 開啟但所選國籍未開檢查：欄位仍顯示且 required 生效；`id_check` 只影響後端格式檢查。
- 不支援格式規則的國家：不可開檢查，但可正常成為國籍選項。
- 後端回 duplicate / format error 後，保留使用者可修正的 form state；不要整頁清空。
- API 全碼只用於授權編輯流程，不寫入 log、toast 或 analytics payload。

## 測試計畫

### 自動／程式化驗證

本 repo 沒有可用的單元測試 framework；`npm test` 為 no-op。不得為本需求引入新的永久測試 infrastructure。

實作者仍需寫並執行**暫時性、不可提交**的 focused tests：

- 以下二選一，但不可省略：
  1. 抽出 feature-local pure state helper，使用 Node 22 內建 `node:test` 或同等最小 harness 驗證；或
  2. 若不抽 helper，建立暫時性 component/API-mock harness，實際驅動彈窗與新增／編輯欄位並斷言 DOM、payload、清值與 error mapping。
- 自動測試至少覆蓋：
  - surface display / required / nationality check 的狀態矩陣。
  - nationality row 隱藏但 ID row 開啟的狀態。
  - 設定頁 `column_name = "uid"` row 的既有 UID guards 已正確調整，四個 surface controls 符合本 spec。
  - 會員表單 `column_name = "id_number"` 不會誤用 `uid`。
  - 國籍／檢查兩顆開關的合法與非法 transition。
  - create / edit 國籍變更時清除 stale ID value。
  - 國籍不變、只修改身分證時送出新值並處理 validation error。
  - legacy raw nationality 與正式 country code 的分流。
  - `407035`、`407036`、`407037` 的 mock mapping。
- 測試檔放在暫存位置或明確標記為不提交；commit 前移除或 unstage。
- 不要為了測試新增 package、test runner 或 repo-wide config。

### Focused validation

對所有 touched files 執行：

```sh
git --no-pager diff --check -- <touched-files>
npx prettier --check <touched-files>
npx eslint -c ./eslint.config.js <touched-ts-and-vue-files>
npm run build:testing
```

- 不執行 `tsc --noEmit`。
- 不修與本需求無關、且不阻擋 build / required validation 的 lint issue。

### 手動 smoke matrix

1. 有／無網站設定 edit permission。
2. Account registration mode 與 phone registration mode。
3. 國籍 only、國籍＋身分證檢查、非支援國家三種設定。
4. 設定 modal save / cancel / reload / API error。
5. 代理端新增會員：未選國籍、無檢查國籍、有檢查且 optional、有檢查且 required。
6. 代理端編輯會員：正式 code、legacy raw text、無 edit permission。
7. 國籍與證號皆不變、只改證號、國籍改成有檢查、國籍改成無檢查。
8. `407035` 必填、`407036` 格式、`407037` 重複三種後端 error。
9. 第二個代理的 isolation，以及跨代理／不同國籍相同證號可成功的整合驗證。
10. 會員列表與匯出 regression。

## Git Flow

- 基底分支：`main`。
- 開始前先完成 HTTPS non-interactive auth probe，再 pull 最新 `main`；若 token / Keychain 驗證失敗就停止，不切 SSH。
- 工作分支名稱：`feat/gsi-299-member-nationality-id-number`。
- 實作者開始前必須從最新 `main` 開出上述分支；不可直接在 `main`、`develop`、`staging` 或其他共享分支實作。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（上線）。每階段測試通過後才能進下一階段。
- Commit 前需取得使用者針對該次提交的明確確認；不得沿用先前確認。
- 不得在 commit message、MR title 或 MR body 放 AI / tool attribution。
- 合併到任何分支前需使用者確認；遇到 conflict 停止並回報，不自行解 conflict 或改 merge strategy。
- 不主動建立 MR；若使用者要求 push，完成後提供 remote 回傳的 MR link 讓使用者決定。

## 交接備註給實作者

1. 使用者已確認 core API / error-code contract，可開始實作；三個 error code 的 remote i18n key 未補齊前，不完成該 mapping。國籍變更提示 copy / key 也未提供，但屬建議 UX，不阻擋 core implementation。
2. 不要從 Jira 英文 message、PDF 欄位名或舊 HTML 猜 remote i18n key。
3. 從最新 `main` 建立 `feat/gsi-299-member-nationality-id-number` 後才開始改碼。
4. 優先讓既有 generic member-column architecture 承接新欄位；只有國籍／身分證連動無法由 contract 表達時，才做 feature-local 邏輯。
5. 若實作中發現需求需改動會員列表、匯出、KYC、route、permission 或單一 siteKey special case，先停止並更新 spec，再繼續。
6. 完成後由不同 context 的 reviewer 對照本 spec 驗收條件逐條 review，不能只靠實作者自評。
