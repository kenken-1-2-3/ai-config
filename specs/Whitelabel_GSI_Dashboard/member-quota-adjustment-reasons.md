# Spec: 會員額度調整 — 異動原因新增/移除 + 說明 tooltip

- 需求單：ID 4122 / ISB-95 「[需求 代理端] 會員額度調整類型新增調整」
- 端別：代理端 = `Whitelabel_GSI_Dashboard`（本 repo）
- 部門：GSI-FE（本 spec 範圍）+ GSI-BE（已完成，見下）
- 目標頁：`/MemberManagement/Quota`（選單：會員管理 → 會員額度調整）
- 主檔案：`src/pages/MemberManagement/MemberQuota/Index.vue`、`src/utils/constants/quotaModifyReason.ts`

## 背景 / 現況（實作前必讀）

1. 異動原因下拉的「資料來源是後端 API」`GET /member_adjustment/reasons`（前端封裝 `getMemberQuotaReason()`，`src/api/member.ts:449`）。
   前端 `quotaModifyReason.ts` 的 enum 只負責「把後端回的 `id` 翻成 i18n label」（`Index.vue` 的 `getReason()`，約 line 1233-1250；後端沒對到的才 fallback 顯示 `value.desc`）。
2. **後端已新增完成**，該 API 目前回傳 8 筆：

   | id | desc(後端簡中) | enum 對應 |
   |---|---|---|
   | 1 | 额度异常补存 | AbnormalCompensation |
   | 2 | 优惠活动 | Promotion |
   | 3 | 返水 | Rebate |
   | 4 | 额度异常扣除 | AbnormalDeduct |
   | 5 | 代理调整 | AgentQuotaAdjustment |
   | 6 | 储值额度 | StoredValueLimit |
   | **7** | **优惠金额** | **(前端尚缺) PromotionAmount** |
   | **8** | **额度调整** | **(前端尚缺) QuotaAdjustment** |

   id 7、8 後端會接報表欄位（優惠金額：存款正 / 扣款負；額度調整：不接任何報表）。**報表 mapping 全在後端，前端不碰。**
3. 前端 enum 目前只到 6，所以 id 7、8 現在會走 fallback 直接吐簡體 `desc`、不吃多語系 → 本次要補。
4. 現有下拉過濾邏輯：
   - `getReason()` 組清單時恆排除 `AgentQuotaAdjustment(5)`。
   - 人工存款 select：用完整 `dropdownData.modifyReason`（`Index.vue:448-458`）。
   - 人工扣款 select：`dropdownData.modifyReason.filter(item => item.value !== 6)`（`Index.vue:459-469`）。
   - 新增彈窗預設 `dialogData.add.reason_id = 1`（`onAdd()`，約 line 1019）。

## 變更需求

### 1) enum / i18n 補新原因（`quotaModifyReason.ts`）

新增兩個 enum 值與 I18nKeys：

```ts
export enum Enums {
  AbnormalCompensation = 1,
  Promotion,
  Rebate,
  AbnormalDeduct,
  AgentQuotaAdjustment,
  StoredValueLimit,
  PromotionAmount,   // = 7 優惠金額
  QuotaAdjustment    // = 8 額度調整
}

export const I18nKeys: Record<Enums, string> = {
  // ...既有 6 筆不動...
  [Enums.PromotionAmount]: "common.promotion_amount",
  [Enums.QuotaAdjustment]: "common.quota_adjustment"
}
```

> 自動遞增需保持 PromotionAmount=7、QuotaAdjustment=8，務必與後端 id 對齊。

### 2) 下拉「按存款/扣款」分流過濾（`Index.vue`）

最終各介面應顯示的原因：

| 介面 | 顯示 (id) | 排除 (id) |
|---|---|---|
| 人工存款 deposit | 1, 2, 3, 6, 7, 8 | 4(額度異常扣除)、5(代理調整) |
| 人工扣款 withdraw | 2, 3, 4, 7, 8 | 1(額度異常補存)、5(代理調整)、6(儲值額度) |

實作方式（沿用現有風格，盡量用 `QUOTA_MODIFY_REASON.Enums` 取代魔術數字）：

- 人工存款 select options：
  `dropdownData.modifyReason.filter(item => item.value !== QUOTA_MODIFY_REASON.Enums.AbnormalDeduct)`
- 人工扣款 select options：
  `dropdownData.modifyReason.filter(item => item.value !== QUOTA_MODIFY_REASON.Enums.StoredValueLimit && item.value !== QUOTA_MODIFY_REASON.Enums.AbnormalCompensation)`
  （即現有 `!== 6` 再加排除 `=== 1`）
- `AgentQuotaAdjustment(5)` 維持在 `getReason()` 既有排除，不要重複。

### 3) 修正預設 reason_id（`onAdd()`）

`onAdd(mode)` 目前固定 `reason_id = 1`。改完後 **1 在人工扣款已被排除**，會造成扣款彈窗一開原因為空/無效。

- 開「人工扣款」時，預設 `reason_id` 必須是該介面過濾後清單中存在的值。
- 規則：開彈窗時把 `reason_id` 設為「該 type 過濾後第一個可選項的 value」（deposit 仍會是 1，withdraw 會落在第一個有效值）。並在設定後呼叫一次 `changeReason()` 等價邏輯，確保 `dialogModifyData[0].deposit_project` 標籤與預設原因一致。

### 4) 異動原因說明（常駐提示，比照 CMS 說明樣式）

> 2026-06-12 調整：經確認改為「比照 CMS 自訂頁面說明」——`info` icon + 文字**常駐並排顯示**（非 hover tooltip、非驚嘆號）。

- 樣式對齊 `WebsiteSettings/Cms/CustomPage/AddEdit.vue` 的 `.page-components-header-tip`（`@apply flex items-center gap-1; font-size:12px; line-height:14px; color:#6b6b6b;`）。多行文案故 icon 用 `items-start` 對齊頂端。
- ICON：**`<q-icon name="info">`**（與 CMS 一致；**不要** `error_outline`/驚嘆號）。
- 顯示方式：**常駐並排**，不是 hover。文案直接渲染在畫面上。
- 位置：異動原因 label 列（`Index.vue:443-446`，紅點 `required-dot` 那塊）的**下方**，獨立一行整列寬度（比照 CMS 把 tip 放標題下方的做法），人工存款/人工扣款共用同一元件。
- 換行：容器加 `style="white-space: pre-line"`，讓文案的 `\n` 生效。
- 文案綁定（沿用既有 `modifyReasonTip` computed，依 `dialogData.add.type` 切換）：
  - `deposit` → `t('query_params.modify_reason_tip_deposit')`
  - else → `t('query_params.modify_reason_tip_withdraw')`

參考實作：

```html
<!-- 異動原因 label 列下方 -->
<div class="col-12">
  <div class="modify-reason-tip" style="white-space: pre-line">
    <q-icon name="info" size="14px" class="q-mt-xs" />
    <span>{{ modifyReasonTip }}</span>
  </div>
</div>
```
```scss
.modify-reason-tip {
  @apply flex items-start gap-1;
  font-size: 12px;
  line-height: 14px;
  color: #6b6b6b;
}
```

## i18n 新增 key（en / zh-TW / zh-CN）

> 翻譯檔不在本 repo（`common.*` / `query_params.*` 由後端/遠端載入）。**請將下列 key 交付/同步到翻譯來源**；本 repo 內僅引用 key。
> 「優惠」一律對應英文 **promotion**。

### 原因 label

| key | en | zh-TW | zh-CN |
|---|---|---|---|
| `common.promotion_amount` | Promotion Amount | 優惠金額 | 优惠金额 |
| `common.quota_adjustment` | Quota Adjustment | 額度調整 | 额度调整 |

### tooltip 說明（`\n` 為換行）

`query_params.modify_reason_tip_deposit`（人工存款）
- zh-TW：`請依據欲影響的報表數據選擇對應原因：\n• 選取『額度異常存補/優惠活動/返水/儲值額度』：數據將統計至 充值 欄位。\n• 選取『優惠金額』：數據將統計至 優惠金額 欄位。\n• 選取『額度調整』：數據將不會統計至任何欄位。`
- zh-CN：`请依据欲影响的报表数据选择对应原因：\n• 选取『额度异常存补/优惠活动/返水/储值额度』：数据将统计至 充值 栏位。\n• 选取『优惠金额』：数据将统计至 优惠金额 栏位。\n• 选取『额度调整』：数据将不会统计至任何栏位。`
- en：`Please select a reason based on the report data you want to affect:\n• Abnormal Compensation / Promotion / Rebate / Stored Value Limit: the amount is counted into the Deposit column.\n• Promotion Amount: the amount is counted into the Promotion Amount column.\n• Quota Adjustment: the amount is not counted into any column.`

`query_params.modify_reason_tip_withdraw`（人工提款）
- zh-TW：`請依據欲影響的報表數據選擇對應原因：\n• 選取『額度異常扣除/優惠活動/返水』：數據將統計至 充值 欄位。\n• 選取『優惠金額』：數據將統計至 優惠金額 欄位。\n• 選取『額度調整』：數據將不會統計至任何欄位。`
- zh-CN：`请依据欲影响的报表数据选择对应原因：\n• 选取『额度异常扣除/优惠活动/返水』：数据将统计至 充值 栏位。\n• 选取『优惠金额』：数据将统计至 优惠金额 栏位。\n• 选取『额度调整』：数据将不会统计至任何栏位。`
- en：`Please select a reason based on the report data you want to affect:\n• Abnormal Deduct / Promotion / Rebate: the amount is counted into the Deposit column.\n• Promotion Amount: the amount is counted into the Promotion Amount column.\n• Quota Adjustment: the amount is not counted into any column.`

> 英文「充值」欄位 = **Deposit**（已對齊報表既有欄位）。其餘原因名沿用 `quotaModifyReason.ts` 既有 enum 英文語意，若報表/下拉現有英文不同以現有為準。

## 不在本次範圍 / 不要動

- 報表欄位的計算與 mapping（後端負責，前端不碰）。
- 舊資料（額度異常補存/扣除既有紀錄）回溯：需求未定義，**不處理**。
- 不調整此頁其他表格、篩選、彈窗、版面、查詢條件。
- `src/assets/env/environment.json` 不碰。
- 不主動修 ESLint（除非阻擋 build）。

## 驗收標準（review 逐項對）

- [ ] `quotaModifyReason.ts` 新增 `PromotionAmount = 7`、`QuotaAdjustment = 8`，且 `I18nKeys` 各補一筆對應 key。
- [ ] 人工存款下拉顯示 {優惠活動, 返水, 儲值額度, 額度異常補存, 優惠金額, 額度調整}，**不含** 額度異常扣除、代理調整。
- [ ] 人工扣款下拉顯示 {優惠活動, 返水, 額度異常扣除, 優惠金額, 額度調整}，**不含** 額度異常補存、儲值額度、代理調整。
- [ ] id 7/8 在 zh-TW/zh-CN/en 三語顯示正確 label（非簡體 fallback）。
- [ ] 開「人工扣款」新增彈窗時，異動原因預設值為過濾後清單中的有效項（不是被排除的 id=1），且 `deposit_project` 標籤同步。
- [ ] 異動原因 label 下方出現 `info` icon + 常駐說明文字，樣式比照 CMS `.page-components-header-tip`（#6b6b6b、12px、icon 與文字並排）。**非 hover、非驚嘆號。**
- [ ] 說明文字多行 `\n` 正確換行（`white-space: pre-line`）。
- [ ] 說明內容隨 deposit/withdraw 切換正確文案，三語皆正確。
- [ ] 送出後 `reason_id` 正確帶到後端（既有 `handleAdd` 流程不破壞）。
- [ ] 既有「人工存款 / 人工扣款」其餘流程（金額、稽核倍數、批次匯入、列表顯示）不受影響。

## 驗證方式

- 起本機 → `/MemberManagement/Quota`（需權限 `A_F_MEMBER_QUOTA`，站別 agent/anibetAgent/amusevip）。
- 切 zh-TW / zh-CN / en 三語各開人工存款、人工扣款彈窗，核對下拉項目、預設值、info icon、常駐說明文案與換行。
- 測試檔不要進 commit。
