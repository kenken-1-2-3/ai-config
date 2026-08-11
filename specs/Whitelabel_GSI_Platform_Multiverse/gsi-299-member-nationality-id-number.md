# GSI-299 — 舊會員端全版型國籍與身分證字號

> 交接合約：本 spec 是舊會員端實作與 review 的單一來源；需求若變更，先更新本文件再繼續實作。
>
> 狀態：**可實作**。範圍已由使用者於 2026-08-07 確認為舊會員端 `Whitelabel_GSI_Platform_Multiverse` 的**全版型**。

## Ticket / 目標專案

- Jira：[GSI-299](https://gamingsoft.atlassian.net/browse/GSI-299)
- 目標端別：舊會員端
- Repository：`Whitelabel_GSI_Platform_Multiverse`
- Jira 標題：`[需求 會員端/代理端]新增會員資料欄位(越南身分證號)`
- Implementation unit：
  1. 所有使用動態註冊欄位 API 的舊會員端版型。
  2. 所有使用動態會員中心欄位 API 的舊會員端版型。
  3. 共用 API contract、欄位型別、國籍顯示名稱解析、條件渲染、payload 與遮罩行為。

## Git Flow

- Base：最新 `origin/main`。
- Work branch：`feat/gsi-299-member-nationality-id-number`。
- 實作只能在建立並切換至上述 work branch 後開始。
- 目前本機 `main` 與 `origin/main` 有既有分岔；不得 merge / rebase 或改寫本機 `main`。功能分支直接由已驗證的最新 `origin/main` 建立。
- 不自行 commit、push、merge 或建立 MR；需使用者針對該動作明確確認。

## 來源優先序

1. 使用者於 2026-08-07 提供的 endpoint、request / response shape、條件渲染、遮罩與錯誤碼移交內容。
2. Jira 最新決議。
3. Jira 附件與 `id-number-country-rules-v12-with-admin.html` 僅供歷史背景；和最新契約衝突時失效。

以下舊設計不屬於會員端，也不得實作：

- 「身分證字號－各國使用規則」管理彈窗。
- 前端規則編輯器、規則版本、規則預覽或自訂 regex。
- 由前端維護 16 國格式規則。
- 依站點經營國家同時比對多國規則。

## 背景 / 目標

註冊與會員中心的國籍欄位改為後端下發的國家選項，payload 一律送 option 的 ISO code。只有同一份欄位設定中存在 `id_number` row，且會員目前選到的國籍 option 為 `id_check = true`，才顯示身分證字號欄位並套用該 row 的 required / edit 設定。

前端只負責顯示、必填與 payload；格式驗證、標準化與唯一性由後端負責。本功能不是 KYC，不驗證證件真偽或政府資料。

## 現況基線

### API 與共用資料流

- 註冊欄位：`GET /v1/player/user/customize_column/list?type=register`，wrapper 位於 `src/api/login.ts`，共用入口為 `src/common/hooks/useAuth.ts` 的 `handleRegisterCustomInput`。
- 註冊送出：`POST /v1/player/user`，共用入口為 `useAuth.handleRegister`。
- 會員中心欄位：同 endpoint、query `type=center`，wrapper 位於 `src/api/userInfo.ts` 的 `getMemberColumn`。
- 會員中心查詢／修改：`GET` / `PUT /v1/player/center/basic/info`。
- 共用會員中心資料流位於 `src/common/composables/useUserInfo.ts`；目前 dynamic fields 會被直接放到 PUT 頂層，GSI-299 的 `id_number` 必須改放 `customize_column.id_number`。
- API response 會把 profile 的 `id_number` 以標準化全碼放在既有 payload 頂層；目前 `BasicInfoResponse` 與 store merge 流程可沿用，只需補 contract。

### 全版型範圍

目前共有 25 個版型、58 個 Vue 檔直接取得註冊 dynamic columns：

`bmm_set_obtd`、`okbet`、`okbet_blackGold`、`okbet_green`、`okbet_red`、`okbet_redBlack`、`set33_GREEN`、`set33_RED`、`set_DBO88`、`set_ed3`、`set_ed8888`、`set_jokerhill`、`set_r016`、`set_r017`、`set_r022`、`set_r023`、`set_r024`、`set_r025`、`set_r027`、`set_r029`、`set_r030`、`set_r031`、`set_r032`、`set_r033`、`set_royalslot88`。

註冊 UI 分為四類，四類都需驗收：

1. `components/Form/ModeLoginRegister.vue` 搭配 `components/ExtraInput/*`。
2. `pages/Register/Index.vue` 獨立註冊頁。
3. `components/Modal/components/RegisterFormAccount.vue` / `RegisterFormPhone.vue` 彈窗。
4. `set_jokerhill`、`set_royalslot88` 的特殊註冊流程。

會員中心現有 consumers 包含 shared `src/common/components/MemberProfileDetail/components/module1.vue`，以及 15 個版型中的 23 個 profile / dialog 元件。所有實際使用 `memberColumnList` 或 `memberNoFilterColumnList` 的會員資料畫面均在範圍內。

### i18n 現況

- 專案使用 remote i18n，不建立或修改 local locale JSON。
- `id_number` 欄位名稱優先使用後端 row 的 `lang[currentLocale]`，沿用既有 dynamic-column label fallback；不得把 payload key 改回 legacy `uid`。
- 新錯誤碼的確切 remote i18n key 尚未提供，不得自行命名。
- 使用者已提供 zh-tw / en 建議文案，可放入既有 `LocalFallbackMessages`；其他 locale 缺值時沿用該機制 fallback `en`，不得自行翻譯。

## API contract

### 1. Dynamic column response

`GET /v1/player/user/customize_column/list` 的 `nationality` row，其 `values` 改為：

```ts
interface NationalityOption {
  label: string
  zh_tw: string
  value: string
  id_check: boolean
  format_example: string
  langs: Record<string, string>
}
```

- `value` 是註冊與會員中心送出的 ISO code。
- label resolver：
  - locale `zh-tw`：`zh_tw`，缺值 fallback `label`。
  - locale `en`：`label`。
  - 其他 locale：`langs[locale]`，缺值 fallback `label`。
- API 另新增 `column_name = "id_number"` row，沿用 dynamic row 的 `required`、`edit`、`type`、`lang` 等欄位。
- `id_number` row 是否存在即為該入口的 display 總閘；前端不自行補造未下發的 row。
- `format_example` 來自目前選中 nationality option，只能作 placeholder / hint；前端不得把它轉成 regex。

### 2. 註冊 request

`POST /v1/player/user`：

- `nationality` 在 body 頂層，值為 ISO code。
- `id_number` 在 body 頂層。
- 可含後端允許的分隔符，前端原樣送出，不 trim / upper-case / 去分隔符做規則標準化。
- 隱藏的 `id_number` 不得帶 stale value。

### 3. 會員中心 update request

`PUT /v1/player/center/basic/info`：

- `nationality` 維持既有 dynamic member info 欄位位置，但值改送 ISO code。
- `id_number` 必須放在 `customize_column.id_number`，不得放 request 頂層。
- bulk update 與 single-column update 皆遵守同一 contract。
- 其他既有 dynamic fields 的 payload 位置與行為不在本需求中重構。

### 4. Profile response

- `GET /v1/player/center/basic/info` 與其他既有會員資料查詢會在 payload 頂層多回 `id_number`。
- 值為後端標準化後的全碼。
- 沿用既有 response / store merge，不建立新的 KYC schema。

## 功能規格

### A. 共用國籍選項處理

- 建立共用的 nationality / id-number helper，供註冊與會員中心共用。
- 不在各版型複製 locale resolver、條件判斷、遮罩或格式資料。
- 所有 nationality select 必須 `emit-value` / 等價方式把 option `value` 寫入 form，不得把顯示 label 當 payload。
- legacy 自由文字國籍若不在 options：會員中心原樣顯示；使用者未改國籍時不可因新功能被阻擋。主動改國籍後只能保留 option code。

### B. 註冊條件渲染

身分證欄位顯示需同時成立：

1. API 有下發 `id_number` row。
2. API 有下發 `nationality` row。
3. 使用者已選 nationality。
4. 對應 option 的 `id_check = true`。

規則：

- 未選國籍或 `id_check = false`：隱藏 `id_number`，required 不生效。
- `id_check = true`：顯示 `id_number`，required 完全依 `id_number` row 的 `required`。
- 國籍由有檢查改成無檢查、清空或改成另一國：立即清掉尚未送出的 `id_number`，避免 hidden stale value。
- 國籍由一個有檢查國家改成另一個有檢查國家：也清掉舊值，顯示新國籍的 `format_example`。
- `format_example` 只作即時 placeholder / hint；不執行前端格式 validation。
- `id_number` 以一般文字輸入處理，允許分隔符；不可強制 numeric inputmode。

### C. 會員中心條件渲染與編輯

- 顯示條件與註冊相同，但使用 `type=center` 下發的 `id_number` row。
- `edit=false` 時維持 read-only；`edit=true` 才可修改。
- 會員原有 nationality / id_number 未改時，保留全碼 raw model，原樣回送安全；前端不得自行重驗。
- 主動改 nationality 時立即清空 raw `id_number`：
  - 新國籍 `id_check=true`：重新顯示空白欄位，依 row.required 要求新證號。
  - 新國籍 `id_check=false` 或無匹配 option：保持欄位隱藏與空值；後端負責清除 DB 舊證號。
- 國籍變更清除證號的額外 UX 警告屬建議項，因未提供確切 copy / key，本次不新增提示。
- 未主動變更的舊會員、legacy nationality、後續才開啟 id_check 的會員不得被回溯要求補填。

### D. 遮罩

- API 回傳與 form model 必須保留完整 `id_number`，避免把遮罩字串送回後端。
- read-only 畫面只顯示尾 4 碼，其餘字元以 `*` 遮罩。
- 可編輯 input 顯示全碼，讓未變更值可安全原樣回送。
- 遮罩 helper 必須集中共用；所有會員中心 read-only text 與 disabled input 都必須使用顯示值，不得直接印 raw model。

### E. 錯誤碼

新增 enum：

- `407035`：身分證必填未輸入。
- `407036`：身分證格式錯誤。
- `407037`：身分證已被使用。

已確認 fallback 文案：

| Code | zh-tw | en |
| --- | --- | --- |
| 407035 | 請輸入身分證字號。 | Please enter your ID number. |
| 407036 | 請輸入正確的身分證字號格式。 | Please enter a valid ID number format. |
| 407037 | 此身分證字號已被使用。 | This ID number is already in use. |

- 先在 `ERROR_CODE_TYPE.Enums` 與 `LocalFallbackMessages` 接入上述內容。
- remote key 尚未提供，不新增猜測的 `I18nKeys` mapping。
- 收到 code 時沿用 `useApi` default error path；不得比對後端英文 message。

## Out of scope

- Dashboard 管理設定、國籍管理 endpoint 與代理端新增／編輯會員。
- 新會員端 NX repository。
- 後端格式規則、DB migration、唯一索引或 endpoint 實作。
- KYC `document_number`、OCR、證件圖片或真偽驗證。
- 16 國 regex、前端標準化、前端唯一性查詢。
- 新增獨立身分證規則 modal。
- 未提供 copy / key 的國籍變更警告。
- 不相關的版型樣式、動畫、layout 或 registration flow 重構。

## 實作影響面

### 共用檔案

- `src/api/request.type.ts`
- `src/api/response.type.ts`
- `src/common/utils/constants/columnName.ts`
- `src/common/utils/constants/errorCodeType.ts`
- `src/common/hooks/useAuth.ts`（只在需要保證共用 payload invariants 時修改）
- `src/common/composables/useUserInfo.ts`
- `src/common/components/DynamicColumn/Input.vue`
- 新增聚焦的 common nationality / id-number helper（位置依現有 utils / composables 慣例決定）

### 版型檔案

- 所有直接取得 `handleRegisterCustomInput({ type: "register" })` 並渲染欄位的註冊元件。
- 各 `components/ExtraInput/Select.vue` 的 nationality label resolver。
- 不能使用共用 placeholder 的 inline input，需接入 `format_example`。
- 所有直接渲染 `memberColumnList` / `memberNoFilterColumnList` 的 profile / dialog read-only 與 edit surface。

不得碰觸 `src/env/environment.json`。

## 邊界情境

1. `nationality` row 存在、`id_number` row 不存在：只顯示國籍。
2. `id_number` row 存在、`nationality` row 不存在：不顯示身分證，也不 required。
3. nationality 未選：不顯示身分證。
4. option `id_check=false`：不顯示身分證。
5. option `id_check=true`、row.required=false：顯示但選填。
6. option `id_check=true`、row.required=true：顯示且必填。
7. zh-tw / en / 其他 locale 缺 label：依 contract fallback，不顯示 i18n key 字串。
8. `format_example` 為空：不顯示錯誤的 `undefined` / 空 hint，沿用一般 placeholder。
9. nationality 由 A 改 B：即使 A、B 都開檢查，也要清空舊證號。
10. legacy nationality 不在 options：顯示原值、不顯示身分證、不阻擋其他欄位更新。
11. read-only `id_number`：只顯示尾 4 碼；raw form 不被改寫。
12. 短於或等於 4 碼的 legacy 異常值：遮罩 helper 不 throw；不得把值寫回 model。
13. API 407035 / 407036 / 407037：顯示 remote 翻譯（若存在）或已確認的 zh-tw / en fallback。

## 驗收條件

### Contract / 共用

- [ ] `NationalityOption` type 包含 `zh_tw`、`id_check`、`format_example`、`langs`，`value` 支援 ISO string。
- [ ] register request type 明確包含頂層 `nationality`、`id_number`。
- [ ] member-center update type 明確包含 `customize_column.id_number`。
- [ ] profile response type 明確包含頂層 `id_number`。
- [ ] `COLUMN_NAME.Enums.ID_NUMBER === "id_number"`；不使用 `uid` 或 KYC `document_number` 代替。
- [ ] 407035 / 407036 / 407037 已加入 enum 與已確認的 zh-tw / en fallback，未發明 remote key。

### 全版型註冊

- [ ] 25 個現有 dynamic-registration 版型都使用相同條件判斷。
- [ ] nationality 選項依 locale contract 顯示，form 值與 payload 是 ISO code。
- [ ] `id_number` 只有在 row 存在且選中 option.id_check=true 時顯示。
- [ ] 隱藏時不 required、不送 stale value。
- [ ] 改國籍會清空舊證號。
- [ ] `format_example` 在所有四類註冊 UI 顯示為即時提示。
- [ ] 前端未新增任何國籍 regex 或標準化規則。

### 全版型會員中心

- [ ] `type=center` 的 dynamic rows 套用同一顯示條件與 locale resolver。
- [ ] bulk / single update 的 `id_number` 均送在 `customize_column.id_number`，request 頂層沒有 `id_number`。
- [ ] 未變更 nationality / id_number 的舊會員不被前端重驗或要求補填。
- [ ] 主動改國籍會清空舊證號；新國籍需檢查時顯示空欄位並套 required。
- [ ] read-only text / disabled input 只顯示尾 4 碼；editable input 與 raw model 保留全碼。
- [ ] legacy nationality 不在 options 時可維持原值並更新其他欄位。

### Scope / 安全

- [ ] 未修改 `src/env/environment.json`。
- [ ] 未新增 local locale JSON、admin modal、KYC schema 或前端 regex。
- [ ] 未改動不相關版型樣式與登入／註冊流程。

## 驗證計畫

1. Pure helper 測試：locale resolver、四種顯示條件、改國籍清值、format example、遮罩。
2. Request payload 測試：register 頂層 `id_number`；member center 僅 `customize_column.id_number`。
3. 代表性 UI 驗證至少各一個：
   - `ModeLoginRegister` family。
   - `pages/Register/Index` family。
   - modal registration family。
   - `set_jokerhill` / `set_royalslot88` 特殊 family。
   - shared member profile、set33 profile、r022/r023/r032 dialog profile。
4. Static coverage check：所有 `handleRegisterCustomInput` consumers 均接入 common helper；所有 profile raw `id_number` 顯示點均使用 mask helper。
5. Focused Prettier / ESLint、`git diff --check`；本 repo 不執行 `tsc --noEmit`。
6. 若建立臨時測試檔，驗證後移除或保持不追蹤，不納入 commit。
