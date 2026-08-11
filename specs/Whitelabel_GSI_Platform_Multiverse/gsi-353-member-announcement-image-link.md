# GSI-353 會員公告圖片新增超連結跳轉

> 交接合約：Spec 作者產出，指定實作者依此實作，reviewer 對照「驗收條件」逐條 review。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-353-member-announcement-image-link.md`（版控於 ai-config）。
> 本 spec 是會員端實作合約；同票的代理端表單與送出規格另見 `Whitelabel_GSI_Dashboard/gsi-353-member-announcement-image-link.md`。

## 背景 / 目標

- 需求來源：[Jira GSI-353｜[需求 會員端/代理端]會員公告-圖片顯示公告添加超連結功能](https://gamingsoft.atlassian.net/browse/GSI-353)。
- Jira 指定環境／站點：正式環境、總代 `FA1M`、代理 `FA11`。
- 端別：本 spec 僅處理會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 目標：會員公告使用「圖片顯示」時，會員可點擊公告圖片，並依每語系 detail 的 `opening_method` 另開分頁或在本頁導轉；連結為空時圖片維持不可點擊。
- 使用者已於 2026-07-28 明確確認會員端採 **全版型共用**：
  - 所有目前使用 `/v1/player/announcement/list` 圖片公告 renderer 的 template/siteKey 都必須支援。
  - 不加入 `FA11`、agent code、siteKey 或 template-specific guard。
  - modern 與 legacy 兩套 shared 圖片公告 renderer 都要納入。

## 已確認 API contract

### 會員端讀取 API

```http
GET /v1/player/announcement/list
```

既有 query 不變：

```ts
{
  start_time_from?: string
  start_time_to?: string
  keyword?: string
  offset?: number
  size?: number
}
```

後端已在 `data.list[].detail[lang]` 回傳：

```ts
{
  title: string
  content: string
  image_path: string
  link: string
  opening_method: 0 | 1
}
```

欄位語意：

| 欄位 | 型別 | 語意 |
|---|---:|---|
| `link` | `string` | 圖片超連結；空字串代表圖片不可點擊 |
| `opening_method` | `int` | `0`＝另開分頁，`1`＝本頁導轉；預設 `0` |

已確認的實際 response 範例包含：

```json
{
  "detail": {
    "zh-tw": {
      "title": "ttsetset",
      "content": "<p>gwegewg</p>",
      "image_path": "agent/announcement/114/example.png",
      "link": "https://www.google.com/",
      "opening_method": 0
    }
  },
  "display_options": [2]
}
```

`display_options: [2]` 對應 `ANNOUNCEMENT_DISPLAY_TYPE.Enums.IMAGES`。

### 代理端 contract（只作跨 repo 對照）

代理端透過下列 API 讀寫同一組每語系欄位：

```http
GET  /v1/agent/announcement/member
POST /v1/agent/announcement/member
PUT  /v1/agent/announcement/member
```

- GET 權限：`A_A_MEMBER_ANNOUCEMENT_VIEW (3130201)` / `A_A_MEMBER_ANNOUCEMENT_VIEW_NEW (3480201)`。
- POST／PUT 權限：`A_A_MEMBER_ANNOUCEMENT_EDIT (3130202)` / `A_A_MEMBER_ANNOUCEMENT_EDIT_NEW (3480202)`。
- 權限資訊不是會員端 request 的 body、query 或 header；本 spec 不修改會員端權限。

## 現況與研究結論

### API 與資料流

- `src/api/announcement.ts` 的 `getAnnouncementList()` 已呼叫 `GET /v1/player/announcement/list`；wrapper 不會過濾 response detail 欄位，不需新增 endpoint 或 request 參數。
- `src/api/response.type.ts` 的 `AnnouncementItem` 目前只有 `title`、`content`、`image_path`，尚未宣告 `link`、`opening_method`。
- `src/common/composables/useAnnonucement.ts`：
  - 依當前語系把 `detail[lang]` 複製到 `langDetail`。
  - 語系 detail 不存在時只建立 title/content/image_path fallback。
  - 依 `display_options` 將資料分成全內容、圖片、跑馬燈公告。
- 因此後端新欄位目前雖存在於 runtime object，前端型別與圖片元件仍未消費它們。

### 兩套 shared 圖片 renderer

1. Modern：
   - `src/common/components/Announcement/components/module1/components/Images.vue`
   - 現況只渲染 `<img>`，沒有 click handler 或跳轉行為。
2. Legacy：
   - `src/common/components/dialog/Announcement/components/Images.vue`
   - 現況同樣只渲染 `<img>`，沒有 click handler 或跳轉行為。

兩套 renderer 都使用同一個 `useAnnouncement()`、`Response.Announcement` 與 `/v1/player/announcement/list` 資料流，因此全版型需求必須同時覆蓋兩者。

### 全版型受影響清單

Modern shared renderer 的直接或重用 consumer，共 12 個 siteKey：

- `okbet`
- `okbet_blackGold`
- `okbet_green`
- `set_r017`
- `set_r022`
- `set_r022_mga`（重用 `set_r022` HomePage）
- `set_r023`
- `set_r027`
- `set_r030`
- `set_r031`
- `set_r032`
- `set_r033`

Legacy shared renderer 的 consumer，共 3 個 siteKey：

- `set_amuse`
- `set_ed3`
- `set_r029`

FA11 是 runtime agent code，不是可由目前 repo 唯一推導的 siteKey；repo 內 `set_r022` 與 `set_r032` 都存在 FA11-specific UI。因使用者已確認全版型，本需求不依賴 FA11 → siteKey mapping。

## 範圍

### 1. 擴充會員公告 response type

在 `src/api/response.type.ts` 的 `AnnouncementItem` 增加：

```ts
link: string
opening_method: CMS_OPENING_METHOD.Enums
```

要求：

- 沿用檔案已 import 的 `CMS_OPENING_METHOD`。
- 不建立另一份 announcement-specific `0/1` magic-number enum。
- 不修改 `Announcement` 外層結構、pagination 或 API wrapper generic。

### 2. 補齊語系 fallback

在 `src/common/composables/useAnnonucement.ts`：

- 將 `CMS_OPENING_METHOD` 加入既有 constants import。
- 當目前語系沒有 detail、需要建立 fallback 時，補上：

```ts
{
  title: "",
  content: "",
  image_path: "",
  link: "",
  opening_method: CMS_OPENING_METHOD.Enums.NEW_TAB
}
```

要求：

- `opening_method = 0` 是合法值，不可使用會把 `0` 當成 falsy 並覆蓋的正規化方式。
- API 回傳既有 detail 時，`link` 與 `opening_method` 必須隨 `langDetail` 原樣保留。
- 舊資料若 runtime 缺少新欄位：
  - `link` 視為空字串。
  - `opening_method` 視為 `NEW_TAB (0)`。
  - 不得產生 runtime error。

### 3. 建立單一共用的公告圖片導轉邏輯

新增一個 single-purpose shared helper/composable，建議位置：

```text
src/common/composables/useAnnouncementImageRedirect.ts
```

兩套 Images renderer 必須共用此邏輯，不各自維護不同的 URL 判斷與 `opening_method` mapping。

介面語意至少要能接受：

```ts
{
  link?: string | null
  opening_method?: CMS_OPENING_METHOD.Enums | null
}
```

不得直接從 announcement component 呼叫 `useBanner()`：

- `handleBannerRedirect()` 目前綁定 `Response.Banner` 與 banner composable 狀態。
- 本需求只參考其導轉語意，不建立 announcement → banner domain coupling。
- 不為本需求重構 banner composable 或改動既有 banner runtime behavior。

### 4. 導轉規則

導轉規則需與現有 `useBanner().handleBannerRedirect()` 一致：

#### 無連結

- `link === ""`、`null`、`undefined` 或 trim 後為空白：
  - 不呼叫 `window.open`。
  - 不修改 `window.location`。
  - 不呼叫 Vue Router。
  - 圖片不顯示 pointer cursor。
  - 點擊不關閉公告、不推進下一則公告。

#### `opening_method === 0`：另開分頁

- `http://` 或 `https://` 完整 URL：
  - `window.open(link, "_blank")`。
- 相對路徑／站內連結：
  - 正規化為以 `/` 開頭。
  - 使用目前 `window.location.origin` 組成完整 URL。
  - `window.open(fullUrl, "_blank")`。
- 原頁公告流程保持原狀；另開分頁本身不視為關閉公告。

#### `opening_method === 1`：本頁導轉

- `http://` 或 `https://` 完整 URL：
  - 使用 `window.location.href = link`。
- 相對路徑／站內連結：
  - 沿用 banner 現況，以 Vue Router 導轉。
  - 含 `/` 或以 `/` 開頭時優先作為 path。
  - 不含 `/` 時可先作為 route name；resolve/push 失敗則 fallback 到正規化 path。

#### 非預期值

- `opening_method` 缺少／為 null：向下相容視為 `NEW_TAB (0)`。
- `opening_method` 不是 `0` 或 `1`：不導轉並保留公告，避免未知值觸發錯誤目的地。

#### URL 處理邊界

- 僅 `http://`、`https://` 視為完整外部 URL，與 banner 現況一致。
- 不自動替 bare domain 補 `https://`。
- 不新增 URL regex 驗證、domain allowlist、protocol rewrite 或 URL sanitizer。
- trim 只用於判斷空白／取得實際導轉字串，不回寫或改動 API/store 資料。

### 5. Modern 圖片公告元件

修改：

```text
src/common/components/Announcement/components/module1/components/Images.vue
```

要求：

- 圖片點擊時，把目前 `announcement.langDetail` 交給共用導轉邏輯。
- 只有有效非空 link 時圖片才具可點擊狀態與 pointer cursor。
- close icon、overlay self-click、今天不再顯示 checkbox、announcement flow index/total 與 transition 行為全部保持不變。
- 不修改圖片尺寸、圓角、object-fit、overlay、z-index 或 RWD。

### 6. Legacy 圖片公告元件

修改：

```text
src/common/components/dialog/Announcement/components/Images.vue
```

套用與 modern renderer 完全相同的：

- 空 link no-op。
- `opening_method` mapping。
- external/internal URL 處理。
- linked-only pointer cursor。
- 點擊不 emit close。

Legacy renderer 原有 checkbox 顏色、間距與其他視覺差異必須保留，不可為了 parity 把兩套樣式互相覆寫。

### 7. 僅圖片顯示模式消費連結

- `display_options` 包含 `ANNOUNCEMENT_DISPLAY_TYPE.Enums.IMAGES (2)`、實際進入 Images renderer 時才使用 `link`。
- 全內容公告即使 API detail 帶有 `link`，也不把整個內容區或內容內圖片變成此 CTA。
- 跑馬燈公告即使 API detail 帶有 `link`，仍維持現有「開啟單筆全內容公告」行為。
- 若同一公告同時包含多個 display option，只有圖片 popup 階段套用圖片跳轉。

## Out of scope

- 不修改代理端 `Whitelabel_GSI_Dashboard`；代理端另有同票 spec。
- 不修改後端 API、資料庫、action permission 或欄位命名。
- 不新增 endpoint，不修改 `/v1/player/announcement/list` query、pagination、排序或 fetch 時機。
- 不修改公告全內容、跑馬燈、公告中心篩選／搜尋／分頁。
- 不把全內容 HTML 中的 `<img>` 或整個 content 容器套用圖片 CTA。
- 不修改公告關閉順序、今天不再顯示、storage、event bus 或 scroll lock。
- 不在點擊連結後額外 emit close 或主動推進下一則公告。
- 不加 FA11、agent code、siteKey、feature flag 或 template-specific guard。
- 不逐一複製 handler 到 15 個 template；行為必須由兩套 shared renderer 共用生效。
- 不改造或重構 `useBanner()`、CMS redirect、template-local `useSiteRedirect()`。
- 不新增 URL 輸入驗證、自動補 protocol、domain allowlist 或錯誤 toast。
- 不新增 UI copy 或 i18n key；不搜尋、建立或修改 local locale JSON。
- 不修改圖片視覺、dialog layout、動畫、transition 或其他 UI。
- 不把 `template/set_royalslot88/components/modal/Announcement.vue` 的靜態 placeholder 重寫成 API 圖片公告；該元件未使用 `/v1/player/announcement/list`，不屬於本次既有圖片公告 renderer。
- 不 inspect、修改、格式化、測試或提交 `src/env/environment.json`。
- 不處理 unrelated ESLint 問題或重構。
- 不在本需求內 commit、push、merge、開 MR/PR 或部署；皆需使用者另行明確指示。

## 受影響範圍

- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- Runtime scope：所有使用現有 member announcement image renderer 的站點。
- 跨站決策：使用者已確認全版型共用；modern 12 個 siteKey + legacy 3 個 siteKey 均納入。

預期修改：

```text
src/api/response.type.ts
src/common/composables/useAnnonucement.ts
src/common/composables/useAnnouncementImageRedirect.ts
src/common/components/Announcement/components/module1/components/Images.vue
src/common/components/dialog/Announcement/components/Images.vue
```

預期只讀確認、不需修改：

```text
src/api/announcement.ts
src/common/composables/useBanner.ts
src/common/utils/constants/cmsOpeningMethod.ts
src/common/utils/constants/announcementDisplayType.ts
src/common/components/Announcement/components/module1/Index.vue
src/common/components/dialog/Announcement/Index.vue
```

若實作者認為必須修改 template-local file、API wrapper、banner 或其他 shared module，先回報並更新本 spec；不得自行擴張。

## 參考實作 / 要遵循的現有 pattern

1. `src/common/composables/useBanner.ts` 的 `handleBannerRedirect()`
   - 參考完整 URL、相對路徑、new tab 與 current-page routing 行為。
   - 只參考行為，不直接耦合 `useBanner()`。
2. `src/common/utils/constants/cmsOpeningMethod.ts`
   - `NEW_TAB = 0`、`REDIRECT = 1` 是本需求的 source of truth。
3. `src/common/composables/useAnnonucement.ts`
   - 保留既有語系 detail 選取、圖片 URL resolve 與 display option filtering。
4. Modern / legacy `Images.vue`
   - 保留兩套現有 template 與樣式，只加入共用 click behavior 與 linked-only cursor。

## 關鍵決策與理由 (Key decisions)

1. **全版型共用，不限 FA11。**
   - 使用者已明確確認；FA11 也無法從 repo 穩定映射為單一 siteKey。
   - 不使用 agent/site guard，避免同一後台資料在不同版型出現不一致行為。
2. **modern 與 legacy renderer 都納入。**
   - 兩者使用相同 API/composable，但各自有 Images 元件；只改其中一套會漏掉 3 個 legacy siteKey。
3. **連結放在每語系 `AnnouncementItem`。**
   - 後端 contract 位於 `detail[lang]`；不同語系可有不同圖片與連結。
4. **沿用 `CMS_OPENING_METHOD`。**
   - 既有 enum 的 `0/1` 語意與 API 完全一致，不建立重複 magic number。
5. **建立 announcement-specific shared redirect logic，不呼叫 `useBanner()`。**
   - 兩套 Images renderer 必須一致，但 announcement 不應依賴 Banner domain type/store。
6. **只在圖片顯示 popup 消費 link。**
   - Jira 明確指定「圖片顯示公告」；API 對其他 display option 也回欄位，不代表全內容或跑馬燈行為要改。
7. **new-tab click 不關閉公告。**
   - Jira 只定義導轉；另開分頁時原頁維持原公告狀態是最小變更，且不破壞既有 flow。
8. **向下相容缺欄位資料。**
   - 舊 cache／舊 API response 可能沒有新欄位；空 link + new-tab default 必須安全 no-op。
9. **不自動補 protocol。**
   - Jira 指示參考 banner；現有 banner 僅把 http/https 當完整 URL，其餘作為站內連結。

## 驗收條件

> Reviewer 必須逐條判定通過／不通過，不得只驗證 Google 連結成功就宣稱完成。

- [ ] `Response.AnnouncementItem` 包含 `link: string` 與 `opening_method: CMS_OPENING_METHOD.Enums`。
- [ ] `GET /v1/player/announcement/list` wrapper、query 與 pagination 沒有不必要的 diff。
- [ ] 當前語系 detail 的 `link`、`opening_method` 正確保留在 `langDetail`。
- [ ] 舊資料／缺少語系 detail 時使用 `link: ""`、`opening_method: 0`，且無 runtime error。
- [ ] Modern Images renderer 在 link 為 `https://www.google.com/`、`opening_method = 0` 時另開該 URL。
- [ ] Legacy Images renderer 在相同資料下行為一致。
- [ ] 完整 external URL、`opening_method = 1` 時在本頁導轉。
- [ ] 相對 path、`opening_method = 0` 時以目前 origin 組成 URL 並另開分頁。
- [ ] 相對 path／route、`opening_method = 1` 時透過 Vue Router 在本頁導轉。
- [ ] `link === ""`、nullish 或純空白時，modern 與 legacy renderer 都不進行任何導轉。
- [ ] 只有有效 link 時圖片顯示 pointer cursor；空 link 維持非 clickable 視覺。
- [ ] 未知 `opening_method` 不導轉；缺少/nullish 值向下相容使用 `0`。
- [ ] 點擊 linked image 不 emit announcement close、不主動前進下一則。
- [ ] close icon、overlay self-click、今天不再顯示與多張圖片公告的下一則流程維持現況。
- [ ] 全內容公告與跑馬燈公告的 click/display behavior 沒有改變。
- [ ] Modern 12 個與 legacy 3 個 siteKey 均透過 shared renderer 取得功能，沒有 template-specific 複製或 guard。
- [ ] 沒有修改圖片尺寸、圓角、overlay、z-index、RWD、transition 或不同 renderer 的既有樣式差異。
- [ ] 沒有新增 local locale file、UI copy、agent/site hardcode、URL validation 或 unrelated refactor。
- [ ] Production diff 僅包含 spec 預期檔案；臨時 test/harness 在 commit 前已刪除或 unstage。
- [ ] Targeted Prettier/ESLint 與 `git --no-pager diff --check` 完成；未執行 `tsc --noEmit`。

## 邊界情況 / 例外

- `link` 為空、nullish 或空白：安全 no-op。
- `opening_method === 0`：必須保留合法 falsy value `0`，不可被 `||` fallback 改寫。
- 目前語系不存在、其他語系有 link：不得 fallback 到其他語系 link；沿用現況空 detail 行為。
- `image_path` 存在但 link 空：只顯示圖片，不可點擊。
- link 存在但 `image_path` 空：維持既有圖片 rendering 行為，不額外建立文字 link 或 CTA。
- 同一公告同時為全內容與圖片顯示：全內容階段不套 CTA；圖片 popup 階段才套 CTA。
- new tab 被 browser popup policy 阻擋：不加 workaround、不改成 current-page redirect。
- external current-page redirect 離開 SPA 是預期；internal link 應保留 SPA router 行為。
- 若 API 實際回傳非 string link 或非 number opening_method，記錄 response evidence 並更新 spec，不自行擴大 coercion。
- 若盤點發現另一個實際使用 `/v1/player/announcement/list` 的圖片 renderer，因本需求已確認全版型，必須先把它補進本 spec 與驗收範圍再繼續。

## 測試計畫

> Repo `package.json` 沒有 test script，也沒有宣告 Vitest/Jest。依專案規則仍需寫測試驗證，但不得為本需求引入正式 test framework；臨時 test/harness 驗證後刪除或 unstage，不可進 commit。

### 1. 臨時 executable test / harness

以 repo 現有 Node.js 22、TypeScript/ts-node 或可執行 browser harness 驗證共用 redirect logic，至少覆蓋：

1. `link = ""` / null / undefined / whitespace：所有 navigation spy 都未被呼叫。
2. external `https://example.com` + `0`：`window.open(url, "_blank")` 一次。
3. external `https://example.com` + `1`：current-page location 使用該 URL。
4. internal `/promotion` + `0`：new-tab URL 為 `${origin}/promotion`。
5. internal `/promotion` + `1`：router push 使用 `/promotion`。
6. route name + `1`：優先嘗試 route name，失敗時 fallback normalized path。
7. missing opening_method：按 `0` 處理。
8. invalid opening_method：完全不導轉。
9. 合法 `opening_method = 0` 不被 falsy fallback 改成 `1`。

若 helper/composable 的結構無法在不擴大 production scope下建立可執行測試，先回報並更新本 spec；不可只宣稱人工看 code 已驗證。

### 2. Component / flow 驗證

至少用一個 modern siteKey 與一個 legacy siteKey 驗證：

- modern 建議：`set_r022`（Jira requester context）或當前可用 QA template。
- legacy 建議：`set_r029`、`set_ed3` 或 `set_amuse` 中可取得測試資料者。

每套 renderer 依序驗證：

1. 圖片公告 + empty link：圖片不可點，close/下一則流程正常。
2. 圖片公告 + external link + new tab：另開正確 URL，原頁 popup 未被程式主動關閉。
3. 圖片公告 + external link + current page：本頁離開至正確 URL。
4. 圖片公告 + internal path + new tab/current page：兩種方式各一次。
5. 至少兩張連續圖片公告：close 第一張仍顯示第二張；click handler 不破壞 index。
6. 全內容、跑馬燈各抽驗一筆，行為無 regression。
7. Desktop 與 360px mobile viewport 各驗證一次，圖片尺寸與 close icon 沒有視覺位移。

依 repo 規則，所有 URL 與本機頁面必須使用 Chrome extension 驗證，不使用 in-app browser。

### 3. 全版型 static audit

- 重新執行 scoped search，確認所有實際使用 `/v1/player/announcement/list` Images renderer 都在 modern 或 legacy shared path。
- 確認 15 個已列 siteKey 沒有覆寫圖片 click handler、pointer-events 或遮罩層而阻止點擊。
- 不需要在 15 個 template 各加 production code；若某 siteKey 因 template override 無法使用 shared behavior，先補 spec 再處理。

### 4. Targeted validation

對實際 touched files 執行：

```bash
pnpm exec prettier --check \
  src/api/response.type.ts \
  src/common/composables/useAnnonucement.ts \
  src/common/composables/useAnnouncementImageRedirect.ts \
  src/common/components/Announcement/components/module1/components/Images.vue \
  src/common/components/dialog/Announcement/components/Images.vue

pnpm exec eslint \
  src/api/response.type.ts \
  src/common/composables/useAnnonucement.ts \
  src/common/composables/useAnnouncementImageRedirect.ts \
  src/common/components/Announcement/components/module1/components/Images.vue \
  src/common/components/dialog/Announcement/components/Images.vue

git --no-pager diff --check
```

- 若實際 helper 檔名經 spec 更新後改變，validation path 必須同步。
- ESLint 只處理本次新增且會阻擋驗證的 error；不清理 unrelated warning。
- 不執行 `tsc --noEmit`。
- 不為了 build 切換、inspect、format 或提交 `src/env/environment.json`。
- 若執行 template build，記錄實際 siteKey、command 與結果；不得把單一 active template build 宣稱為全 15 版型均已 build。

## Git Flow

- 基底分支：`main`。
- 工作分支：`feat/gsi-353-member-announcement-image-link`。
- 跨站開始條件：已完成；使用者於 2026-07-28 確認全版型共用。
- 實作者開始前：
  1. 確認目前專案 worktree 的使用者變更，不得覆蓋、清除或帶入本 feature。
  2. 依 repo 規則以 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` 做 HTTPS non-interactive auth probe；失敗時停止回報，不改用 SSH。
  3. 切到 `main` 並更新最新 remote main。
  4. 從最新 `main` 建立並切換到 `feat/gsi-353-member-announcement-image-link`。
  5. 未切到上述分支前不得實作；不可直接在 `main`、`develop`、`staging` 或目前無關 feature branch 修改。
- 推進路徑：工作分支 → `develop`（dev 全版型抽驗）→ `staging`（staging 全版型抽驗）→ `main`（正式）。
- 每一階段測試通過後才能進下一階段，不可跳階。
- 每次 commit 前需取得使用者針對該次 commit 的明確確認；本次「寫 spec」不構成實作 repo 或 ai-config commit 授權。
- 合併到任何分支前需取得使用者確認；遇到 conflict 時停止／abort 並回報，不自行解 conflict 或改策略。
- 不預設 rebase，不主動把 develop/staging/main 合回工作分支。
- 不主動建立 MR/PR；只有使用者明確要求時才建立。
- 合併不等於發版；只有使用者明確要求全版型「發版/release」時，才可執行 `yarn deploy:all`。

## 交接備註給實作者

- 先依 Git Flow 從最新 `main` 建立 `feat/gsi-353-member-announcement-image-link`，再開始實作。
- 建議順序：
  1. 寫臨時 redirect harness。
  2. 補 `AnnouncementItem` contract 與語系 fallback。
  3. 建立共用 announcement image redirect logic。
  4. modern Images renderer 接入。
  5. legacy Images renderer 接入。
  6. 跑 targeted validation。
  7. 用 Chrome 驗證 modern + legacy。
  8. 做全版型 static audit。
  9. 刪除或 unstage 臨時 test/harness。
- Spec 研究快照：2026-07-28；最新 remote main `801b8cb38a0cbd4d9cfba9c0b0082cd6df60ab04`。
- 撰寫 spec 時專案 checkout 位於無關分支 `feat/gsi-352-r003-referral-qrcode`；實作者不可直接在該分支修改 GSI-353。
- ai-config 與專案 worktree 目前都有其他使用者變更；實作者必須保留並隔離，不得整理或提交 unrelated files。
- 若 API contract、template consumer 清單或導轉需求改變，先更新本 spec，再繼續實作。
- 實作完成後，reviewer 必須逐條 review「驗收條件」與 Out of scope。
