# Spec: GSI-195 免費轉統一「派獎錢包」設定移除

- Jira：[GSI-195 — `[需求 代理端]免費轉的統一派獎錢包欄位移除`](https://gamingsoft.atlassian.net/browse/GSI-195)
- Jira 狀態（2026-07-13 查閱）：開發中；Priority：High。
- 相依需求：[Aviator - 免費旋轉串接 & 結合優惠活動](https://app.notion.com/p/wowgaming/Aviator-36ffc5d788a9801abddfe49bd6191828)。依 Jira 備註，本需求需與該需求整包一起上正式。
- 端別：代理端 = `Whitelabel_GSI_Dashboard`（本 spec 的實作範圍）；另有後端配套，但不在本 repo 實作。
- 目標頁：代理後台「免費旋轉管理」`/FreeRound/List/`。
- 主要檔案：`src/pages/FreeRound/List.vue`、`src/stores/siteStore.ts`、`src/api/request.type.ts`、`src/api/response.type.ts`。

## 背景 / 目標

過去系統無法判斷免費轉來源屬於現金錢包或贈金錢包，因此另提供全站統一的「派獎錢包」設定。現有流程已可透過子渠道判斷免費轉來源錢包，派獎應直接依派發當下的錢包類型建立獎勵，不再由全站統一設定覆蓋或二次判斷。

本次代理端目標：

1. 從免費旋轉管理的「設定」彈窗移除統一「派獎錢包」欄位。
2. 儲存設定時不再送出 `freeround_wallet_type`。
3. 保留並可正常編輯免費轉派獎的稽核倍率 `freeround_turnover_rate`。
4. 更新彈窗內的系統提醒文案，說清楚錢包與稽核建立時點。

## 現況基線（2026-07-13，`main` 已確認）

- `src/pages/FreeRound/List.vue`
  - 「設定」彈窗同時顯示 `freeround_wallet_type`（派獎錢包）與 `freeround_turnover_rate`（稽核倍數）。
  - `onSettingsSave()` 目前透過 `putSettings()` 將兩個欄位一起送至 `PUT /settings`。
  - 彈窗目前仍沿用舊 remote i18n：
    - `free_round.system_logic_tip`（標題）
    - `free_round.settings_tip_1`（第一段）
    - `free_round.settings_tip_2`（第二段）
- `src/stores/siteStore.ts` 目前保存並回填 `freeround_wallet_type` 與 `freeround_turnover_rate`。
- `src/api/request.type.ts` 的 `Request.PutSettings` 含可選的 `freeround_wallet_type` 與 `freeround_turnover_rate`。
- `src/api/response.type.ts` 的 `Response.GetSettings` 含 `freeround_wallet_type` 與 `freeround_turnover_rate`。
- 個別免費轉的 `wallet_type` 另有用途：列表顯示、加次／取消、優惠活動免費轉設定及後端來源錢包判斷。本需求不是移除這些欄位。

## 範圍

### 1. 移除設定彈窗的統一派獎錢包欄位

在 `src/pages/FreeRound/List.vue` 的「設定」彈窗：

- 完整移除「派獎錢包」label 與 `q-select`。
- `settingsForm` 僅保留 `freeround_turnover_rate`。
- `onSettings()` 僅從 `siteStore.freeround_turnover_rate` 回填稽核倍率。
- 移除只為此欄位服務的 `walletSwitch`、`settingsWalletOptions`、`normalizeSelectableFreeRoundWalletType` 與相關 imports。
- 稽核倍率不再受統一派獎錢包值影響，`q-number` 與加減按鈕應維持可操作；移除已無用途的 `isTurnoverDisabled` 與對應綁定。
- 保留既有彈窗寬度、按鈕、稽核倍率步進 `0.5`、最小值 `0`、精度與成功提示；不要順便重做版面。移除欄位後，稽核倍率維持現有欄寬與排列即可。

### 2. 儲存時停止傳送 `freeround_wallet_type`

`onSettingsSave()` 呼叫既有 `putSettings()` 時，payload 必須只含：

```ts
{
  freeround_turnover_rate: Number(settingsForm.freeround_turnover_rate)
}
```

不得：

- 傳送 `freeround_wallet_type`（包含 `null`、預設值或舊值）。
- 因欄位移除而改動 `putSettings()` 的 endpoint、method 或共用 request helper。

儲存成功後，只同步 `siteStore.freeround_turnover_rate`，並維持既有成功 notify 與關閉彈窗行為。

### 3. 清理 settings contract 與 store state

在本 repo 將已無使用者、已不再可設定的全站統一欄位清掉：

- `Request.PutSettings`：移除 `freeround_wallet_type`；保留 `freeround_turnover_rate?: number`。
- `Response.GetSettings`：移除 `freeround_wallet_type`；保留 `freeround_turnover_rate`。
- `siteStore`：移除 `freeround_wallet_type` state 與 `updateSiteSetting()` 的對應賦值；保留既有 `freeround_turnover_rate` 正規化防呆。

若後端在相容期的 `GET /settings` 暫時仍多回 `freeround_wallet_type`，前端忽略額外欄位即可，不需為此保留 store state。後端必須同步保證 `PUT /settings` 不要求此欄位。

### 4. 更新系統提醒文案

保留現有 warning 區塊結構、icon、標題 key `free_round.system_logic_tip`、字級、顏色、padding 與段落間距。將 `t("free_round.settings_tip_1")` / `t("free_round.settings_tip_2")` 替換成以下兩個新 remote i18n keys；不要新增或修改 local locale files：

| Key | zh-TW | en |
|---|---|---|
| `free_round.reward_wallet_type_tip` | `免費轉派獎將依派發時的錢包類型（現金錢包／贈金錢包）自動建立獎勵。` | `Free round rewards will be created automatically based on the wallet type (cash wallet / bonus wallet) selected at the time of issuance.` |
| `free_round.audit_multiplier_tip` | `本設定僅適用於免費轉派獎的稽核倍率。當玩家產生有效投注並完成資料回傳後，系統將依當時最新的倍率設定建立對應稽核。` | `This setting applies only to the turnover multiplier for free round rewards. Once the player has generated valid bets and the data has been returned, the system will create the corresponding turnover requirement using the latest multiplier setting at that time.` |

兩個 key 必須各自保留為獨立 `<p>`，沿用第一段 `q-mb-xs`、第二段 `q-mb-none`，確保中間保留既有空白。

## API / 資料契約

### `PUT /settings`（代理端設定）

本需求只調整既有 wrapper 的 caller payload，不新增 API wrapper。

| 欄位 | 型別 | 本次行為 |
|---|---|---|
| `freeround_turnover_rate` | `number` | 保留；使用者按確認時送出目前稽核倍率。 |
| `freeround_wallet_type` | — | 移除；前端不得再送出。後端不得再用此欄位決定派獎錢包。 |

後端配套（不在本 repo 實作）：免費轉派獎依派發當下已判定的錢包類型（現金錢包／贈金錢包）建立獎勵，不再讀取全站統一 `freeround_wallet_type` 設定。

## Out of scope

- 不移除或更改「個別免費轉／優惠活動」的來源 `wallet_type`：
  - `src/pages/FreeRound/List.vue` 的列表「錢包類型」欄。
  - `src/components/dialogs/AddFreeRoundTimes.vue` 的派發來源錢包選擇與 payload。
  - `deleteFreeRound()` 取消免費轉所需的 `wallet_type`。
  - `src/pages/Promotion/PromotionSetting/**` 與 `src/api/promotion.ts` 的免費轉錢包欄位。
  - `src/utils/freeRoundWalletType.ts` 的共用正規化／options helpers（仍有上述 callers）。
- 不調整免費旋轉列表的查詢、欄位、分頁、取消邏輯、加次流程或報表。
- 不調整 route、menu、route-level permission 或設定按鈕的既有可見性。
- 不改動 `src/api/common.ts` 的 `putSettings()` wrapper 與共用 `/settings` 行為。
- 不實作後端判斷邏輯、會員端畫面或 Aviator 串接本身。
- 不新增、搜尋或修改 local locale JSON；新增 key 的中英文內容交由 remote i18n 管理流程部署。
- 不順便清理 unrelated lint、樣式或其他 settings 欄位。
- 不碰 `src/assets/env/environment.json`。

## 受影響範圍

- 代理端頁面：`src/pages/FreeRound/List.vue`。
- Settings state / contract：
  - `src/stores/siteStore.ts`
  - `src/api/request.type.ts`
  - `src/api/response.type.ts`
- Remote i18n（repo 外部相依）：
  - `free_round.reward_wallet_type_tip`
  - `free_round.audit_multiplier_tip`
- 跨站影響：免費旋轉管理是共用代理端功能，所有能進入該頁的角色／站點都會看不到統一派獎錢包欄位。這是 Jira 所述的通用邏輯調整，不做單一 siteKey 分支。

## 參考實作 / 要遵循的現有 pattern

- 彈窗、稽核倍率與 settings 儲存流程：`src/pages/FreeRound/List.vue` 的 `onSettings()`、`settingsForm`、`onSettingsSave()`。
- Settings API wrapper：`src/api/common.ts` 的 `putSettings()`，沿用即可。
- Settings response 正規化：`src/stores/siteStore.ts` 的 `freeround_turnover_rate` 解析邏輯，必須保留。
- 個別免費轉錢包行為：`src/components/dialogs/AddFreeRoundTimes.vue`、`src/utils/freeRoundWalletType.ts`；僅供確認不要誤刪，不在本需求改動。

## 關鍵決策與理由（Key decisions）

1. **只移除全站統一的 `freeround_wallet_type`，保留所有個別免費轉的 `wallet_type`。** Jira 原因是系統已能由子渠道判斷該筆免費轉來源；不是取消現金／贈金錢包的區分。
2. **settings payload 只送稽核倍率，不送舊值。** 即使 hidden field 仍留在 state 並送出，也可能讓後端繼續依舊設定判斷，違反需求。
3. **前端 settings store / types 一併移除全站欄位。** 避免已不可設定的值繼續成為隱性資料來源；後端相容期多回欄位可直接忽略。
4. **提醒文案改用兩個語意化的新 remote keys，不沿用舊 `settings_tip_1` / `settings_tip_2`。** 先前實作保留舊 keys，導致 dev 畫面仍顯示舊翻譯；新 keys 能讓 remote i18n 明確承接本次新文案，並維持多語機制。
5. **不把稽核倍率綁到任何錢包狀態。** 移除統一錢包後，設定只負責稽核倍率，必須永遠可編輯。
6. **不調整 route permission。** 這是 feature 內欄位移除，不是頁面存取需求；頁面入口行為維持現況。

## 驗收條件

> Reviewer 對照本清單逐項判斷，未通過不得宣告完成。

- [ ] 進入 `/FreeRound/List/` 並開啟「設定」彈窗後，不再顯示「派獎錢包」label、select 或任何現金／贈金錢包選項。
- [ ] 設定彈窗仍顯示稽核倍數，原值可正確回填；使用者可輸入、按 `+` / `-` 調整，最小值、精度與 `0.5` 步進維持既有行為。
- [ ] 按確認時，瀏覽器送出的 `PUT /settings` payload 含數值型別 `freeround_turnover_rate`，且完全不含 `freeround_wallet_type` key。
- [ ] 儲存成功後顯示既有成功提示、關閉彈窗，重新開啟時顯示剛儲存的稽核倍率。
- [ ] `Request.PutSettings`、`Response.GetSettings` 與 `siteStore` 不再宣告／保存全站 `freeround_wallet_type`；`freeround_turnover_rate` 仍完整保留。
- [ ] warning 區塊保留既有標題、icon、字級、顏色、padding 與段落樣式；不再呼叫 `settings_tip_1` / `settings_tip_2`，改用 `reward_wallet_type_tip` / `audit_multiplier_tip`，兩段中間保留空白。
- [ ] Remote i18n 部署後，zh-TW 與 en 顯示上表指定內容，順序、字詞與標點一致。
- [ ] 免費旋轉列表的「錢包類型」欄仍正常顯示現金／贈金錢包。
- [ ] 新增／加次免費轉、取消免費轉、優惠活動免費轉的個別 `wallet_type` 選擇與 payload 未被移除或改壞。
- [ ] route、menu、permission、列表查詢／分頁及免費遊戲報表無行為變更。
- [ ] 後端整合環境確認：免費轉派獎結果依派發當下的來源錢包建立獎勵，不受已移除的全站設定影響；稽核依資料回傳完成時最新的 `freeround_turnover_rate` 建立。
- [ ] Release checklist 已將本需求、後端配套、remote i18n 新 keys 與 Jira 備註中的 Aviator 需求排在同一正式發布批次。

## 邊界情況 / 例外

- `freeround_turnover_rate` 從 `GET /settings` 回來可能是 number、數字字串、包雙引號字串、`null` 或空字串；沿用 `siteStore` 現有防呆，無效值回退為 `0`。
- 稽核倍率為 `0` 時必須能儲存，不可因 falsy 判斷漏送。
- 後端若在相容期仍回傳 `freeround_wallet_type`，前端不得重新顯示、保存或回送該欄位。
- 沒有贈金錢包的站點與有贈金錢包的站點，設定彈窗都只顯示稽核倍率；不得再依 `walletSwitch` 分支顯示統一派獎錢包。
- 若 remote i18n 新 keys 尚未部署，畫面可能直接顯示 key；此情況視為發布相依未完成，不可宣告整包驗收通過。

## 測試計畫

### Focused automated / static validation

- 此 repo 的 `npm test` 目前只是 `No test specified`，不要為本需求引入新的 test framework。
- 實作者需建立一個**不納入 commit**的 temporary focused regression check，至少驗證：
  - `src/pages/FreeRound/List.vue` 的 settings form / payload 不再含 `freeround_wallet_type`。
  - `src/api/request.type.ts`、`src/api/response.type.ts`、`src/stores/siteStore.ts` 不再含全站 `freeround_wallet_type`。
  - 個別免費轉的 `wallet_type` callers（add / cancel / promotion）仍存在。
- Touched files 執行：
  - `git --no-pager diff --check -- <touched files>`
  - focused Prettier check（對 touched files）。
  - focused ESLint（至少 `src/pages/FreeRound/List.vue`、`src/stores/siteStore.ts`）；只處理本次造成或阻擋驗證的問題。
- 不執行 `tsc --noEmit` / `vue-tsc --noEmit`（repo 規則明確禁止）。

### 手動整合驗證

1. 使用具備免費旋轉設定權限的帳號開啟 `/FreeRound/List/`。
2. 在有贈金錢包及無贈金錢包的站點各開一次設定彈窗，確認都只有稽核倍率。
3. 分別測試 `0`、`0.5` 與含兩位小數的合法倍率；查看 Network，確認 payload 只有 `freeround_turnover_rate`。
4. 儲存成功後重開彈窗，確認 store / 後端回填值正確。
5. 核對兩段提醒文案與段落空白；切換 zh-TW / en，分別確認上表指定翻譯。
6. Smoke test 列表錢包欄、新增／加次、取消免費轉及優惠活動免費轉，確認個別 `wallet_type` 流程仍正常。
7. 與後端在整合環境驗證現金錢包與贈金錢包各一筆免費轉：派獎進入正確來源錢包，且稽核採資料回傳完成時最新倍率。

測試用 temporary files 不得加入 commit；commit 前移除或 unstage。

## Git Flow

- 基底分支：`main`。實作者開始前需先切到 `main`，依 repo 規則完成 HTTPS 非互動 auth probe，pull 最新 `main`。
- 工作分支名稱：`feat/gsi-195-remove-free-round-prize-wallet-setting`。
- 實作者必須先從最新 `main` 建立／切換上述工作分支，再開始實作；不可直接在目前的 `feat/0713`、`main`、`develop`、`staging` 或其他共享分支修改。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（上線）；每階段測試通過後才能進下一階段。
- 正式發布須與 Jira 指定的 Aviator 需求、後端邏輯及 remote i18n 新 keys 同批；不要單獨提前上正式。
- Commit 前需取得使用者針對該次提交的明確確認，不得沿用先前確認自行 commit。
- 合併到任何分支前都需使用者確認；若發生衝突，停止並詢問，不自行解衝突或改策略。

## 交接備註給實作者

- 以本 spec 為唯一實作與 review 合約；先完成 Git Flow 分支準備再編輯。
- 開始前再次確認後端已接受不含 `freeround_wallet_type` 的 `PUT /settings`，並確認 remote i18n owner 已建立兩個新 keys。
- 若後端 contract 或 Jira 文案有變動，先更新本 spec 再繼續，不要在 code 中自行推測。
- 完成後 reviewer 需逐條核對「驗收條件」；不要以只看 diff 取代 Network 與整合驗證。
