# 子 Spec 2：各層多加成條件與返佣比例

- Parent：[Notion 4817 總覽](./notion-4817-referral-rebate-multi-bonus-conditions.md)
- 前置：子 spec 1 的 group create route 與 platform create API 已在 parent branch；edit hydration 另等 G1／G3
- 既有 ticket work branch：`feat/referral-rebate-group-crud-agent-setting-detail`；本修正不得另開 child branch

## 目標

在群組新增／編輯表單中，將舊的跨層 rate 設定改為「先選層級，再設定該層初始條件與最多四組加成條件」。`condition_sets` 是門檻與返佣比例唯一資料來源。

## 局部開發閘門

下列未決事項只阻擋本子 spec 的對應功能，不得回頭宣稱整張 4817 或上級返佣設定列表不能做：

1. `rates[].game_type` 是 2026-08-03 後端 PDF 已確認的遊戲類型識別欄位，但需求畫面要求同類型下逐一顯示與編輯供應商。供應商列表可直接沿用 `/product/dropdown` 實作；個別供應商比例要 round-trip 仍缺 `product_code`。所有 editor 保持可操作；同遊戲類型、同幣別的供應商比例一致時可壓成現有單一 `game_type` rate，不一致時等使用者完成輸入並觸發儲存後，保留表單並提醒哪些供應商比例未儲存，不得送出猜測／有損 payload、預先 disable editor、靜默丟值或顯示成功。
2. 2026-08-04 產品已確認加成條件刪除規則：`set_order = 2..5` 都可刪除；刪除後右側條件依原順序往前補，畫面名稱與送出資料的 `set_order` 都重新編成連續序號。`set_order = 1` 初始條件不可刪除；拖曳／自訂排序仍不在本次範圍。
3. 2026-08-03 後端 PDF 已確認：先用 `agent_eligibility` 篩出活躍下級；同一推薦線同一層的活躍會員數值加總後與門檻比較，不是逐會員各自比；不同線、不同層不合併。
4. 2026-08-10 使用者確認後續加成條件名稱必須可編輯；final `condition_sets` 尚無 name 欄位只構成 persistence 缺口。`set_order = 1` 名稱固定，`2..5` 名稱 editor 保持可用；儲存支援欄位後明確提醒名稱尚未持久化並保留目前輸入，不得把名稱鎖成「加成條件 2~5」、塞未知欄位、假裝 round-trip 或靜默清除。
5. `condition_sets.deposit_total`／`valid_bet_total`／`total_ngr` 依 final contract 是條件組的 scalar 總額；Notion 未要求這三欄逐幣別保存，不得再以幣別語意阻擋 condition editor。逐幣別門檻只屬於上方 `agent_eligibility`。
6. `agent_eligibility.deposit.mode` 已確認為 `accumulated`／`single`；存款與投注各自使用 `currency_threshold: Record<string, string>`，兩者都有設定時採 AND。
7. 後端目前會把 `game_type: 0`、`rate: 0` 判為 required 缺值並回 400（G4、G5）；這兩個 persistence 情境尚未可驗收，但 NGR、0% 與其 editor 都必須可選／可輸入。送出失敗後保留表單並提醒未儲存，不得用前端 validation 假裝它們是產品無效值。
8. Detail 尚未回 `condition_sets`（G1），所以無法可靠回填既有條件；依 2026-08-05 測試環境決策，edit 仍使用新版表單，PUT 送出表單目前完整 `condition_sets`（舊 detail 缺欄位時即使用表單預設值），不得因未回傳而省略。

## 表單行為

- 層級 selector 由群組的返佣層數產生；切換層級只顯示該層的 condition sets。
- 每一層固定有 `set_order = 1` 初始條件。
- 可新增最多四組加成條件，對應 `set_order = 2..5`。
- 新增、切換、刪除與保存加成條件 2–5 是必做；刪除任一加成條件後，後續條件須依原順序往前補，並將畫面名稱與 payload `set_order` 重新編成連續序號。
- 初始條件名稱固定為「初始條件」且不可編輯；後續新增條件預設為「加成條件 N」並可編輯名稱。刪除／往前補號時自訂名稱跟著原條件移動，不以新序號覆寫；沒有持久化欄位時不可把未知欄位塞入 payload，但也不可移除／停用 editor，須在儲存動作後明示名稱未持久化並保留輸入。
- 同一層達標多組時採最高返佣比例；未設定的加成組不參與比較。
- 切換 layer 或 tab 不得丟失未儲存輸入。
- 編輯時依 `layer + set_order` 穩定回填，不依 array index 假設後端排序。

## 每組條件

- 活躍人數門檻：非負整數，`0` 表示不限制；小數與負數無效。
- 會員總存款：非負整數，payload contract 使用整數字串，`"0"` 表示不限制。
- 會員總有效投注：同上；`1.5` 必須判定為無效，不得只靠 HTML number input。
- 會員總 NGR：同上。
- 返佣比例：至少一筆 rate；calculate type 1／2 的 UI 依 `game_type × product_code × currency_id` 編輯，供應商來源使用既有 `/product/dropdown` 並以 `game_type_id + product_code` 去重。後端補 `product_code` 前，僅同類型供應商比例一致時可依 `game_type × currency_id` 送出，不一致必須阻擋。
- 活躍會員的「累計／單次」與各幣別門檻使用 `agent_eligibility`；它與每層 `condition_sets` 的總額門檻是兩個不同階段，不得混成同一欄位。

## Final condition_sets contract

以 2026-08-03 後端 PDF 為準；目前 request shape 已確認，但 detail response 尚未接出 `condition_sets`：

```json
{
  "condition_sets": [
    {
      "layer": 1,
      "set_order": 1,
      "active_member_count": 0,
      "deposit_total": "0",
      "valid_bet_total": "0",
      "total_ngr": "0",
      "rates": [
        {
          "game_type": 0,
          "currency_id": 1,
          "rate": "0.2"
        }
      ]
    }
  ]
}
```

### 驗證規則

- `layer`：integer，必填，`>= 1`。
- `set_order`：integer，必填，`1..5`；`1` 初始，`2..5` 加成。
- `active_member_count`：integer，`>= 0`。
- `deposit_total`／`valid_bet_total`／`total_ngr`：非負整數字串；正規化後符合 `^(0|[1-9]\d*)$`，`"0"` 不限制；`1.5`、負數、指數與其他小數格式無效。
- `rates`：至少一筆。
- `game_type`、`currency_id`、`rate` 必填；`rate` 使用 final contract 的 string 型別。
- NGR 單一費率帶 `game_type: 0` sentinel；calculate type 1／2 依 `game_type` 各一筆。NGR option 與 editor 必須保持可選／可操作；後端 G4 拒絕 create/update 時保留目前選擇與輸入，提醒 NGR 設定未儲存。
- `rates[].layer` 已移除。
- 不得送 `label_ids`、`rebate_rate_config`、`rate_rate_config`、`single_rate_config` 或任何重複 rate source。

## 完整 UI 與視覺驗收

本區塊須依 `rebate-rule-integrated-mock.html`、`03-referral-rebate-form-overview.png`、`04-layer-condition-editor.png` 還原，不得以 pending note 取代：

- 上方顯示初始條件、加成條件 2–5 tabs 與新增 `+`；初始條件不可刪除，加成條件的 `×` 可刪除該條件，後續 tab 與 `set_order` 自動往前補號。
- layer 底部的新增／移除操作只顯示 `+`、`−` 圖示，不顯示「新增層級／移除最後一層」文字；按鈕尺寸為 44 × 34 px。
- 顯示返佣計算說明與「查看範例」，開啟參考圖定義的計算規則內容。
- 每個 layer 顯示活躍人數、會員總投注量、會員總存款金額、會員總淨盈利四個門檻；活躍人數的「人」須緊接在輸入框右側且保持同列，後方、會員總投注量前顯示 info icon。
- 該 info icon hover 文案固定為：「活躍人數、總投注、總存款、總淨盈利：皆僅能輸入非負整數，輸入 0 代表不限制。\n\n發放規則：需同時達到上述設定之所有條件，方可獲得該層級的返水。」
- 顯示比例模式與遊戲類型 tabs；選定類型後，表格列出 `/product/dropdown` 回傳的所有供應商（不可用遊戲類型名稱假裝單一供應商列），每列提供各幣別比例輸入與統一設定控制。
- calculate type 1／2 的各 `game_type` editor 必須可操作並序列化；不得因 NGR 的 `game_type: 0` 後端缺口而隱藏、disable、lock 任一選項或 editor。
- NGR 與 `rate = 0` 都可選／可輸入並依正式 contract 嘗試送出；若 G4／G5 回 400，保留全部表單狀態並明確提醒本次未儲存，不得把後端 bug 轉成前端產品 validation。
- 「總 GGR」視覺控制與 editor 保持可操作；在後端確認單一比例 request mapping 前，不送猜測 payload，等使用者觸發儲存後保留輸入並提醒該欄未持久化；「產品 GGR」不受此限制。

## 舊資料與表單轉換

- 移除會員標籤 UI、validation、option loading、GET hydration 與 POST／PUT payload 的 `label_ids`。
- create 以每層 `set_order = 1` 的零門檻初始組開始。
- detail GET 若有 `condition_sets`，以 `layer + set_order` normalize 後回填。
- 若舊 detail 完全沒有 `condition_sets`，不得在前端猜測把 `rebate_rate_config` 轉換成新結構；表單仍可輸入。使用者觸發儲存時不得送出會覆寫未知舊資料的猜測 payload，須保留輸入並回報 migration／API 版本問題與未儲存範圍。
- response 同時包含新舊欄位時只讀 `condition_sets`，儲存時不回送舊欄位。

## 權限

- 查看與回填：`A_A_REFERRAL_REBATE_SETUP_VIEW`（`3360101`）。
- 修改與儲存：`A_A_REFERRAL_REBATE_SETUP_EDIT`（`3360102`）。
- 無 edit 權限時表單須唯讀且不得送 mutation。

## Remote i18n

- 完整保留可沿用的既有 `$t(...)`／`t(...)` key。
- 新增「初始條件」「加成條件」「活躍人數」「總存款」「總有效投注」「總 NGR」、名稱編輯、整數驗證與未儲存提醒前，依序搜尋 consumer repo、shared／legacy 與 backstage/agent remote dataset。
- 有相容 key 就重用；沒有就依相鄰 namespace／key naming 透過 Locale Manager API 新增並 read-back。不得發明不符合現有規則的 key、建立本地 locale JSON 或以 hardcode 當正式替代；交付時提供每個 key 的 `REUSED`／`CREATED`／`BLOCKED`、三語值與證據。

## 視覺參考

- `02-layer-condition-summary-modal.png`
- `03-referral-rebate-form-overview.png`
- `04-layer-condition-editor.png`
- `05-condition-editor-deposit-tooltip.png`
- `06-condition-editor-rule-tooltip.png`
- `07-calculation-example-modal.png`
- `08-calculation-tree-agent-a.png`
- `09-calculation-tree-agent-b1.png`

## Out of scope

- 不建立上級返佣設定列表／CRUD shell；由子 spec 1 提供。
- 不實作 agent bindings／CSV／新權限；由子 spec 3 處理。
- 不改後端結算演算法或 events／entries／dispatch 畫面。

## 受影響範圍

- `src/pages/ReferralCommissionManagement/CommissionSetting/Create.vue`
- `src/pages/ReferralCommissionManagement/CommissionSetting/Edit.vue`（G1／G3 修正後；可重用 feature-local components/composable，但不要復活舊 payload 或做無關重構）
- `src/api/commissionManagement.ts`
- `src/api/request.type.ts`
- `src/api/response.type.ts`
- 必要的 feature-local constants／helpers

## 驗收條件

- [ ] 每個 layer 都能獨立顯示與編輯初始條件及最多四組加成條件。
- [x] 刪除任一加成條件後，右側條件依原順序往前補，tab 名稱與 payload `set_order` 都保持從 1 開始連續；初始條件不可刪除。
- [ ] 切換 layer／tab 不丟資料；detail 以 `layer + set_order` 正確回填。
- [ ] 每組可設定四種門檻與至少一筆 rate，欄位驗證符合 final contract。
- [ ] 四個門檻都只接受非負整數與 `0`；活躍人數、`deposit_total`、`valid_bet_total`、`total_ngr` 輸入 `1.5` 都顯示無效且不能送出。
- [ ] 初始條件名稱不可編輯；加成條件 2–5 的名稱 editor 可用，刪除／補號不覆寫自訂名稱；後端 name 欄位缺少時，儲存後仍保留名稱並明示未持久化。
- [ ] POST／PUT 的 `condition_sets` 完全符合 final JSON types。
- [ ] payload 不含 `rates[].layer`、`label_ids` 或任何舊 rate config。
- [ ] 會員標籤 UI 與相關資料流完全移除。
- [ ] 上級返佣設定列表的摘要 button 與 modal 正確呈現各層／各條件門檻及比例。
- [ ] 同層達標多組採最高比例的文案、摘要與驗收案例一致。
- [ ] 聚合與 `agent_eligibility` 依後端 PDF 實作；只有拖曳／自訂排序、條件名稱 persistence、總 GGR mapping 仍有後端／產品缺口，不得把這些局部缺口擴大成 editor 的隱藏、停用或鎖定。
- [ ] 建立頁的 condition tabs、四種門檻、calculate type 1／2 rate editor 與查看範例完整符合 mock；不再顯示用來取代功能的 pending note。
- [x] 活躍人數的「人」位於輸入框右側同列；其後、會員總投注量前有 info icon，hover 顯示需求圖定義的完整規則。
- [x] layer 底部新增／移除按鈕只顯示 `+`、`−`，不顯示文字，尺寸為 44 × 34 px。
- [x] 每個遊戲類型 tab 下列出該類型所有供應商，供應商以 `game_type_id + product_code` 去重，切換遊戲類型 tab 正常顯示對應列表。
- [ ] 各供應商、各幣別比例切換 condition／layer 後不遺失。
- [ ] 後端 `rates[]` 支援 `product_code` round-trip；在此之前，同類型供應商比例不同時，使用者觸發儲存後保留輸入並明示哪些比例未儲存，不送出有損 payload，且不得靜默覆蓋、遺失或顯示成功。
- [ ] NGR 模式可選、NGR editor 可操作；G4／G5 或其他 persistence 失敗後保留模式、門檻、比例與名稱，顯示未儲存提醒且不顯示成功。
- [ ] view-only 使用者不可修改或送出資料。

## 驗證

- 針對 normalize／serialize／validation 寫 temporary focused tests；使用後不得納入 commit。
- 至少涵蓋多 layer、多 `set_order`、合法 `0`／整數、四欄 `1.5`／負數／小數無效、NGR sentinel、G4／G5 失敗後狀態保留、舊 response 動作後提醒與 payload 舊欄位排除。
- focused Prettier／ESLint、`git diff --check`；本 repo 不執行 `tsc --noEmit`。
- 手動以 create/edit/detail Network request 核對 exact JSON type 與 group_id。

## Git Flow

- 本子 spec 與其後續修正都繼續使用同一張 4817 單的既有 branch：`feat/referral-rebate-group-crud-agent-setting-detail`。
- 不得因切換子 spec、skill、review 或 QA 而新建／切換 branch 或 worktree；主產品目錄目前屬另一張單，不得碰其 branch 與 local changes。
- commit、push、merge 與環境推進都需使用者針對該次動作明確確認。
