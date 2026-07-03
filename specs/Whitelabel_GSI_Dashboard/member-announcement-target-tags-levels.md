# Spec: 公告中心會員公告新增派發標籤與會員層級

- 需求單：Notion ID 5191 / `[需求 代理端/會員端]公告中心新增『派發標籤』、『會員層級』設定`
- Notion：`https://app.notion.com/p/wowgaming/388fc5d788a980c0aafbf84b2104bf7b`
- 參考畫面：`/Users/kenyu/Downloads/公告中心 新增標籤與層級.html`
- Jira：`F1G-26`（Notion 連結文字：`gamingsoft.atlassian.net/bro...F1G-26`）
- 端別：代理端 = `Whitelabel_GSI_Dashboard`（本 repo）；會員端顯示/派發結果由後端與會員端共同承接，本 spec 僅規劃代理端設定介面與 payload。
- 目標頁：代理後台 > 內容管理 > 公告管理 > 會員公告 > 新增/編輯公告畫面。
- 主要檔案：`src/pages/MessageCenter/MemberAnnouncement/Add.vue`、`src/pages/MessageCenter/MemberAnnouncement/Edit.vue`、`src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue`、`src/stores/memberAnnouncement.ts`、`src/api/announcement.ts`、`src/api/request.type.ts`、`src/api/response.type.ts`。

## 現況基線 (Current code baseline, 2026-06-30 驗證)

- `src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue`
  - 公告對象目前以 `q-radio` 綁 `form.member_mode`，值為字串 `"true"` / `"false"`（全部會員 / 指定會員）。
  - 同檔內有一個未使用的 `selectMode` ref；遷移到 `target_mode` 時可一併移除。
  - 會員搜尋多選 `form.show_member_ids` 沿用本檔內部的 `accountOption` 與 `getMember()`，僅在 `target_mode === "member"` 時顯示。
- `src/api/request.type.ts:1139` 既有 `AddMemberAnnouncement` 缺 `target_mode` / `target_level_ids` / `target_label_ids` / `block_label_ids` / `block_level_ids`，需新增。
- `src/api/response.type.ts:1805` 既有 `GetMemberAnnouncementDetail` 同樣缺對應欄位，需新增。
- `src/stores/memberAnnouncement.ts` 的 `memberAnnouncementItem` 預設值需補新欄位（`target_mode: "all"`、其餘 id arrays 預設 `[]`）。
- 下拉資料來源已就緒：`src/query/dropdown.ts` 的 `useMemberLevelDropdownOptions()` / `useMemberTagDropdownQuery()`，不需新增 API。

## 後端欄位名策略 (BE contract, 2026-07-01 確認)

BE 已提供正式欄位名（透過工單 F1G-26 / 後端說明），對映關係如下：

| 前端 form state | BE payload / response 欄位 |
|---|---|
| `target_mode`（string enum：all/member/level/label） | `target_type`（int：1=all, 2=member, 3=level, 4=label） |
| `show_member_ids` / `target_member_ids` | `target_member_ids`（僅 `target_type=2` 必填，其他 mode 可送 `[]`） |
| `target_level_ids` | `dispatch_levels` |
| `target_label_ids` | `dispatch_label_ids` |
| `block_label_ids` | `block_label_ids` |
| `block_level_ids` | `block_levels`（`target_type=3` 時須為 `[]`） |

- Add / Update / Detail 三支 API 一致使用上表欄位名。
- 欄位轉換集中在 `src/api/announcement.ts` 的 `buildMemberAnnouncementPayload()` 與 `Edit.vue` 的 detail 回填處。
- 前端 state 仍維持 string mode 便於程式閱讀，只在 wrapper 與 BE 對映。

## 背景 / 目標

目前會員公告只能設定「全部會員」或「指定會員」。客戶希望站長可以更精準地控制公告派發範圍，新增依會員標籤、會員層級派發公告，並加入阻擋派發標籤與阻擋派發層級，讓符合阻擋條件的會員即使被公告對象包含，也不會收到該公告，會員端公告列表也不顯示該公告。

本次代理端目標是：在會員公告新增/編輯表單新增公告對象條件與阻擋條件，正確帶入新增/編輯 API，且編輯既有公告時能回填資料。

## 範圍

### 1. 公告對象新增派發條件

在 `src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue` 的「公告對象」區塊，將現有 radio 從兩種擴充為四種：

| 顯示文案 | 用途 | 設定欄位 |
|---|---|---|
| 全部會員 | 發送給全體會員 | 不顯示正向條件 selector |
| 指定會員 | 發送給指定會員 | 顯示既有會員帳號搜尋多選 |
| 會員層級 | 發送給指定會員層級 | 顯示會員層級多選 |
| 會員標籤 | 發送給指定會員標籤 | 顯示會員標籤多選 |

行為：

- 選「全部會員」時，送出全體會員目標。
- 選「指定會員」時，沿用既有 `getMemberList()` 搜尋與 `target_member_ids` 行為。
- 選「會員層級」時，使用會員層級下拉資料，勾選多個 level id。
- 選「會員標籤」時，使用啟用中的會員標籤資料，依既有會員標籤類型分組顯示，可勾選多個 label id。

### 2. 新增阻擋派發條件

在同一個表單中新增「阻擋派發標籤」與「阻擋派發層級」設定。畫面參考 HTML 中「設定要禁止派發的標籤及層級」區塊。

| 公告對象 | 阻擋派發標籤 | 阻擋派發層級 | 說明 |
|---|---|---|---|
| 全部會員 | 可設定 | 可設定 | 發送給全體會員，可再排除特定標籤或層級 |
| 指定會員 | 可設定 | 可設定 | 發送給指定會員，可再排除特定標籤或層級 |
| 會員層級 | 可設定 | 不需設定 | 已依層級派發，不重複提供層級阻擋 |
| 會員標籤 | 可設定 | 可設定 | 已依標籤派發，仍可再用標籤與層級排除 |

阻擋規則：

- 會員只要具有公告設定的阻擋派發標籤，就不能收到該公告。
- 會員所屬層級只要在公告設定的阻擋派發層級內，就不能收到該公告。
- 阻擋條件優先於公告對象。即使站長指定某會員接收，只要該會員符合阻擋標籤或阻擋層級，仍不能收到公告。
- 選「會員層級」作為公告對象時，隱藏並清空「阻擋派發層級」。

### 3. 會員標籤互斥規則

當公告對象為「會員標籤」時，需要避免同一個會員標籤同時出現在正向派發與阻擋派發：

- 新增公告時：「阻擋派發標籤」清單動態排除已在「會員標籤」中勾選的項目。
- 編輯公告時：「會員標籤」清單與「阻擋派發標籤」清單雙向動態排除彼此已勾選的項目。
- 若使用者切換公告對象導致某些已選值不再可用，表單狀態需同步移除那些已選 id，避免送出不可見但仍存在的值。
- 其他公告對象（全部會員、指定會員、會員層級）不需要與正向會員標籤做互斥，因為沒有正向會員標籤 selector。

### 4. 新增 / 編輯資料流

新增與編輯送出前要將表單 state 轉成後端 payload：

- 全部會員：目標為全會員，正向會員 id / level id / label id 都送空或後端約定的全會員值。
- 指定會員：送出選中的會員 id。
- 會員層級：送出選中的 level id。
- 會員標籤：送出選中的 label id。
- 阻擋派發標籤：送出選中的 block label id。
- 阻擋派發層級：送出選中的 block level id；公告對象為會員層級時一律送空陣列。

編輯載入時需從 `getMemberAnnouncementDetail()` 回填：

- 公告對象模式。
- 指定會員清單。
- 派發會員層級清單。
- 派發會員標籤清單。
- 阻擋派發標籤清單。
- 阻擋派發層級清單。

### 5. 版面調整（2026-07-01 Notion comment 追加）

依 Notion comment（Kate 7/1 紀錄）與企劃 HTML mock，新增與編輯**皆**改為步驟分頁（wizard），沿用共用 `@/components/stepper/Index.vue` + `useStepper()` + `Done.vue`：

- Step 1「內容設定」：公告類型、公告時間、顯示方式、公告對象（含正向 selector）、多語內容；底部「取消／確認」。確認時執行既有驗證（日期、顯示方式、標題、圖片）後前進。
- Step 2「發送對象」：tip 文案「設定要禁止派發的標籤及層級」（沿用 `step_tip.set_block_tag_member_level`）；內容為阻擋派發標籤＋阻擋派發層級（`BlockDispatchSettings.vue`）；底部「上一步／下一步」，下一步送出 API。
- Step 3「完成」：送出成功保留既有 toast 並前進至完成頁（共用 `DoneComp`，成功 icon＋完成按鈕），完成按鈕回列表。
- 新增 local component：`component/BlockDispatchSettings.vue`（阻擋派發標籤＋層級，綁 store form；level mode 隱藏阻擋層級）。
- 編輯完成頁 tip 沿用既有 `step_label.finish`（完成），不新增編輯專屬文案。
- Step 1 的「確認」需擋下空的公告時間（含 date picker 清空後產生的 "undefined undefined" 字串）、未選顯示方式、缺標題/圖片。
- 新增 i18n key（需後台補翻譯）：`step_label.content_setting`（內容設定）、`step_label.send_target`（發送對象）、`edit_form.block_dispatch_level_title`（阻擋派發層級）。

## Out of scope

- 不調整會員端公告列表與派發判斷邏輯；會員端不顯示符合阻擋條件公告的行為由後端/會員端依 API 資料承接。
- 不調整會員公告列表頁欄位、篩選條件、排序、刪除、啟停用。
- 不變更最新公告、代理公告、舊 `src/pages/Announcement/*` 路由。
- 不更動 route-level permission；會員公告頁入口權限維持現況。
- 不新增或維護 local locale JSON。若缺少 i18n key，先依 repo 規則 hardcode 或回來確認，不自行建立 locale file。
- 不碰 `src/assets/env/environment.json`。
- 不主動修 unrelated ESLint 或現有 dirty worktree 變更。

## 受影響範圍

- 端別：代理端 (`Whitelabel_GSI_Dashboard`)。
- 頁面：
  - `src/pages/MessageCenter/MemberAnnouncement/Add.vue`
  - `src/pages/MessageCenter/MemberAnnouncement/Edit.vue`
  - `src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue`
- State / contract：
  - `src/stores/memberAnnouncement.ts`
  - `src/api/request.type.ts`
  - `src/api/response.type.ts`
  - `src/api/announcement.ts`
- 新增 local components，放在 `src/pages/MessageCenter/MemberAnnouncement/component/`，不要先做成 shared export：
  - `MemberAnnouncementTagSelector.vue`：會員標籤分組多選，支援 disabled/excluded ids。
  - `MemberAnnouncementLevelSelector.vue`：會員層級多選。
- 下拉資料來源：
  - 會員標籤使用 `src/query/dropdown.ts` 的 `useMemberTagDropdownQuery()`。
  - 會員層級使用 `src/query/dropdown.ts` 的 `useMemberLevelDropdownOptions()`。
  - 不在同一表單混用 `useQueryStore().getMemberTag()` / `useQueryStore().getMemberLevel()`，避免重複打兩套 API。

## 參考實作 / 要遵循的現有 pattern

- 會員公告現有表單與送出流程：
  - `src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue`
  - `src/pages/MessageCenter/MemberAnnouncement/Add.vue`
  - `src/pages/MessageCenter/MemberAnnouncement/Edit.vue`
  - `src/stores/memberAnnouncement.ts`
- 會員標籤分組 checkbox：
  - `src/components/forms/memberTagOption.vue`
  - `src/pages/Promotion/PromotionSetting/component/BlockTags.vue`
  - `src/components/forms/selectAllOptionGroup.vue`
- 會員層級 checkbox：
  - `src/pages/Promotion/PromotionSetting/component/MemberLevelTags.vue`
  - `src/query/dropdown.ts` 的 `useMemberLevelDropdownOptions()`
- 會員標籤 dropdown API：
  - `src/api/member.ts` 的 `getMemberTagOptionList()` / `getMemberTags()`
- 會員層級 dropdown API：
  - `src/api/memberLevel.ts` 的 `getMemberLevelList()`

## API / 資料契約

> 以下為後端提供的正式 contract。前端 type、store 與 API wrapper 需使用這些欄位送出/回填；若 UI 內部使用語意化 enum，也必須在送出前轉成 `target_type` 的 1-4。

### Target type

```ts
export enum MemberAnnouncementTargetType {
  /** 全部 */
  All = 1,
  /** 指定會員 */
  Member = 2,
  /** 會員層級 */
  Level = 3,
  /** 會員標籤 */
  Label = 4
}
```

### 前端 form state

在 `Request.AddMemberAnnouncement` 與 `memberAnnouncementStore.memberAnnouncementItem` 補齊欄位：

```ts
type AddMemberAnnouncement = {
  id?: number
  type: ANNOUNCEMENT_MEMBER_TYPE.Enums
  start_time: number | string
  end_time: number | string
  enable: number
  details: AddMemberAnnouncementDetailItem[]
  display_options: ANNOUNCEMENT_DISPLAY_TYPE.Enums[]
  target_type: MemberAnnouncementTargetType
  target_member_ids: number[]
  dispatch_levels: number[]
  dispatch_label_ids: number[]
  block_label_ids: number[]
  block_levels: number[]

  /** Legacy UI-only fields; keep only if needed during migration. */
  show_member_ids?: number[]
  member_mode?: string
}
```

預設值：

```ts
target_type: MemberAnnouncementTargetType.All
target_member_ids: []
dispatch_levels: []
dispatch_label_ids: []
block_label_ids: []
block_levels: []
```

### POST `/v1/agent/announcement/member`

代理後台新增會員公告。

Request 新增 / 調整欄位：

| 欄位 | 型別 | 必填 | 規則 |
|---|---|---|---|
| `target_type` | `int` | 是 | 公告對象：1=全部、2=指定會員、3=會員層級、4=會員標籤 |
| `target_member_ids` | `int[]` | 僅 `target_type=2` 必填 | 既有欄位，移除原本全情境 required 行為 |
| `dispatch_levels` | `int[]` | 僅 `target_type=3` 必填 | 派發層級，OR 邏輯 |
| `dispatch_label_ids` | `int[]` | 僅 `target_type=4` 必填 | 派發標籤，OR 邏輯 |
| `block_label_ids` | `int[]` | 否 | 阻擋標籤，任一命中即不顯示 |
| `block_levels` | `int[]` | 否 | 阻擋層級；`target_type=3` 時必須送空陣列 |

Payload mapping：

```ts
{
  type: params.type,
  start_time: params.start_time,
  end_time: params.end_time,
  enable: 1,
  details: params.details,
  display_options: params.display_options,
  target_type: params.target_type,
  target_member_ids:
    params.target_type === MemberAnnouncementTargetType.Member ? params.target_member_ids : [],
  dispatch_levels:
    params.target_type === MemberAnnouncementTargetType.Level ? params.dispatch_levels : [],
  dispatch_label_ids:
    params.target_type === MemberAnnouncementTargetType.Label ? params.dispatch_label_ids : [],
  block_label_ids: params.block_label_ids,
  block_levels:
    params.target_type === MemberAnnouncementTargetType.Level ? [] : params.block_levels
}
```

### PUT `/v1/agent/announcement/member`

代理後台修改會員公告。Request 同新增會員公告，並採覆寫式儲存：

- `target_type`、`dispatch_levels`、`dispatch_label_ids`、`block_label_ids`、`block_levels` 都必須依目前表單狀態送出。
- 未送或送空的 dispatch/block 陣列會覆蓋原設定。
- `target_member_ids` 行為同新增會員公告：僅 `target_type=2` 時必填，其餘 target type 送空陣列。

Payload 需包含 `id`：

```ts
{
  id: params.id,
  type: params.type,
  start_time: params.start_time,
  end_time: params.end_time,
  enable: 1,
  details: params.details,
  display_options: params.display_options,
  target_type: params.target_type,
  target_member_ids:
    params.target_type === MemberAnnouncementTargetType.Member ? params.target_member_ids : [],
  dispatch_levels:
    params.target_type === MemberAnnouncementTargetType.Level ? params.dispatch_levels : [],
  dispatch_label_ids:
    params.target_type === MemberAnnouncementTargetType.Label ? params.dispatch_label_ids : [],
  block_label_ids: params.block_label_ids,
  block_levels:
    params.target_type === MemberAnnouncementTargetType.Level ? [] : params.block_levels
}
```

### GET `/v1/agent/announcement/member`

代理後台會員公告詳情 response 新增欄位：

```ts
type GetMemberAnnouncementDetail = {
  id: number
  agent_id: number
  type: ANNOUNCEMENT_MEMBER_TYPE.Enums
  start_time: number | string
  end_time: number | string
  enable: number
  details: MemberAnnouncementDetailItem[]
  display_options: ANNOUNCEMENT_DISPLAY_TYPE.Enums[]
  target_type: MemberAnnouncementTargetType
  target_members: TargetMemberItem[]
  dispatch_label_ids: number[]
  dispatch_levels: number[]
  block_label_ids: number[]
  block_levels: number[]
}
```

編輯頁用 response 的 id arrays 回填 checkbox 狀態；顯示名稱從會員層級/會員標籤 dropdown options 取得。

## 關鍵決策與理由 (Key decisions)

- 採用後端 `target_type` 表達四種公告對象，而不是延伸既有 `member_mode: "true" | "false"`。原因：兩態字串已不足以描述全部會員、指定會員、會員層級、會員標籤，且後端已提供正式 int enum。
- selector 做成 `MemberAnnouncement` 目錄下的 local components，不修改 shared `SelectAllOptionGroup` API。原因：互斥規則只屬於會員公告，避免影響促銷、佣金等既有使用者。
- 會員標籤資料只顯示 enabled tag，沿用現有 `memberTagOption.vue` 與 `useMemberTagDropdownQuery()` 的行為。原因：已停用標籤不應出現在新公告設定中。
- 阻擋條件優先於正向派發條件。原因：Notion 明確補充指定會員若符合阻擋標籤或阻擋層級，仍不能收到公告。
- 公告對象為會員層級時隱藏並清空阻擋派發層級。原因：需求表格標示「不需設定」，避免同時設定正向與阻擋層級造成語意衝突。
- API wrapper 直接送出 `target_type`、`dispatch_levels`、`dispatch_label_ids`、`block_label_ids`、`block_levels`。原因：後端已提供正式欄位，spec 不再保留前端自訂欄位名。

## 驗收條件

- [ ] 會員公告新增頁的「公告對象」可選全部會員、指定會員、會員層級、會員標籤四種模式。
- [ ] 會員公告編輯頁可正確回填既有公告的公告對象模式與對應選取值。
- [ ] 選「指定會員」時，既有會員搜尋多選功能仍可使用，送出 `target_type=2` 且 `target_member_ids` 必填，不帶 dispatch 層級/標籤 id。
- [ ] 選「會員層級」時，顯示會員層級多選；送出 `target_type=3` 且 `dispatch_levels` 帶選中的 level ids。
- [ ] 選「會員標籤」時，顯示啟用中會員標籤的分組多選；送出 `target_type=4` 且 `dispatch_label_ids` 帶選中的 label ids。
- [ ] 全部會員、指定會員、會員標籤模式皆顯示「阻擋派發標籤」與「阻擋派發層級」。
- [ ] 會員層級模式顯示「阻擋派發標籤」，不顯示「阻擋派發層級」，且送出時 `block_levels` 為空陣列。
- [ ] 新增公告且公告對象為會員標籤時，阻擋派發標籤 options 會排除已選 `dispatch_label_ids`。
- [ ] 編輯公告且公告對象為會員標籤時，`dispatch_label_ids` options 與 `block_label_ids` options 雙向排除彼此已選 id。
- [ ] 切換公告對象後，不可見或不適用的已選值會被清空，payload 不會殘留舊模式資料。
- [ ] 阻擋派發標籤與阻擋派發層級可多選，送出新增/編輯 API 時帶入 `block_label_ids` / `block_levels`。
- [ ] 編輯詳情 API 回來的 `target_type`、`dispatch_label_ids`、`dispatch_levels`、`block_label_ids`、`block_levels` 都能正確回填 form。
- [ ] 既有公告類型、公告時間、顯示方式、多語標題/內容/圖片、套用到其他語系、圖片上傳、取消/確認流程不受影響。
- [ ] 新增與編輯成功後仍沿用既有成功通知與返回流程。
- [ ] 不修改會員公告列表頁、最新公告、代理公告或路由權限。

## 邊界情況 / 例外

- 若會員標籤或會員層級 API 回空陣列，對應 selector 不顯示或顯示空狀態，但表單不能 crash。
- 若編輯舊公告時沒有 `target_type`，需依既有 `target_members` 判斷：有 target members 視為指定會員（`target_type=2`），沒有 target members 視為全部會員（`target_type=1`）。
- 若編輯舊公告時後端未回阻擋欄位，預設為空陣列。
- 若某個已選標籤/層級在 dropdown 已不存在或已停用，編輯頁可以保留 id 以避免無意清除舊資料；但新增公告 options 只顯示目前可用項。若產品要求不可保留停用項，需先更新 spec。
- 若使用者選了會員標籤 A 作為 target，再選 A 作為 block，後選的一方生效時需從另一方移除 A，確保最後 payload 中不會同時出現。
- 日期、顯示方式、語系內容與圖片驗證沿用現有規則。

## 測試計畫

### Focused validation

- TypeScript / Vue edits 後檢查 touched files imports/exports。
- 執行：

```bash
git --no-pager diff --check -- src/pages/MessageCenter/MemberAnnouncement/Add.vue src/pages/MessageCenter/MemberAnnouncement/Edit.vue src/pages/MessageCenter/MemberAnnouncement/component/announcement.vue src/stores/memberAnnouncement.ts src/api/announcement.ts src/api/request.type.ts src/api/response.type.ts
```

- 若新增 local component，也將新檔加入 `diff --check`。
- 不執行 `tsc --noEmit`。

### 測試（測試檔不進 commit）

- 將 payload mapping 抽成 helper，寫單元測試覆蓋：
  - `target_type=1` 清空 `target_member_ids`、`dispatch_levels`、`dispatch_label_ids`。
  - `target_type=2` 只保留 `target_member_ids`，且 member ids 為必填。
  - `target_type=3` 保留 `dispatch_levels` 且清空 `block_levels`。
  - `target_type=4` 保留 `dispatch_label_ids` 並套用 tag 互斥。

### 手動驗證

- 開本機後台，進入：內容管理 > 公告管理 > 會員公告 > 新增。
- 分別切換四種公告對象，確認對應 selector 顯示/隱藏正確。
- 會員標籤模式下，確認 `dispatch_label_ids` 與 `block_label_ids` 動態互斥。
- 新增一筆使用會員層級派發且含阻擋標籤的公告，確認 payload。
- 新增一筆使用會員標籤派發且含阻擋層級的公告，確認 payload。
- 編輯上述兩筆公告，確認回填與送出不遺失欄位。
- 切換回全部會員/指定會員後送出，確認舊模式的 level/label 正向欄位不殘留。

## Git Flow

- 基底分支：`main`（實作者開始前先 pull 最新）。
- 工作分支名稱：`feat/member-announcement-target-tags-levels`。
- 實作者開始前必須先從基底分支開出上述工作分支；不可直接在 `main`、`develop`、`staging` 或其他共享分支上實作。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（上線），每階段測試過才進下一關。
- Commit 前需取得使用者針對該次提交的明確確認；不得沿用先前確認自行 commit。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

- 先依上方 Git Flow 從 `main` 開出 `feat/member-announcement-target-tags-levels`，再開始實作。
- 實作前先確認 `F1G-26` 或後端文件的實際新增/編輯/detail 欄位名；若與本 spec 的建議欄位不同，先更新本 spec 的 API / 資料契約，再繼續。
- 目前 repo 有既有 dirty worktree，實作時不要 revert 或整理無關變更。
- 本需求若後端尚未完成，前端可先完成 UI state 與 wrapper mapping，但不可假裝已完成端到端驗收；需在交付說明標註後端阻塞項。
