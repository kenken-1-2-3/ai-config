# R017 會員代理 — 明細 Tab 資料層 Spec

> **角色**:明細 Tab 的資料層 — API types + TanStack Query hooks(無 mutation,純查詢)。
>
> **同套件 spec**:
> - 本份 ─ 資料層 ⚠️ 先做
> - 列表 ─ [referral-details-list.md](referral-details-list.md)
> - 查看子頁 ─ [referral-details-subdetail.md](referral-details-subdetail.md)
>
> **先決條件**:[referral-old-api-reference.md](referral-old-api-reference.md) §1 API 端點表(`/v1/player/commission/statements*`)

---

## 1. 範圍

只做:
1. 新增 API wrapper(2 隻):結算列表 / 單期下級明細
2. TypeScript 型別
3. TanStack Query hooks(list + detail)

**不做**:UI、搜尋邏輯、頁/搜尋總計(本期不做,沿用 setting 決策 §11 全不做)。

> 📝 對齊 setting decisions:本期**不呼叫** `getReferralStatementDetailTotal`(本頁/搜尋總計移除)。spec [referral-old-api-reference.md](referral-old-api-reference.md) §8 決策表已寫死「全不做」。

---

## 2. 檔案位置

```
libs/shared/ui-layer/src/lib/api/
├─ apiFunctions/referral.ts                       // 已存在(setting data-layer 建立);append 2 隻新 wrapper
├─ apiTypes.ts                                     // append referral statement types
└─ hooks/
   ├─ useReferralStatementListQuery.ts            // ⭐ 新增 — 結算列表
   └─ useReferralStatementDetailQuery.ts          // ⭐ 新增 — 單期下級明細(查看子頁用)
```

> 沿用 setting data-layer 已建立的 `referral.ts` 檔案,append 新 wrapper;不要造新檔。

---

## 3. API 端點

| 用途 | Method | Path | Function |
|---|---|---|---|
| 結算列表(明細 tab 主表)| GET | `/v1/player/commission/statements` | `getReferralStatementList({ offset, size, member_account? })` |
| 單期下級明細(查看子頁)| GET | `/v1/player/commission/statements/:statement_id/details` | `getReferralStatementDetail(statementId, { offset, size, member_account? })` |

> ⚠️ `member_account` 是新增 query param,給搜尋用 — 與 setting 同樣**待後端確認支援**。

---

## 4. TypeScript 型別

```ts
// libs/shared/ui-layer/src/lib/api/apiTypes.ts(append)

// ── Request ──
export interface GetReferralStatementListRequest {
  offset?: number
  size?: number
  member_account?: string
}

export interface GetReferralStatementDetailRequest {
  offset?: number
  size?: number
  member_account?: string
}

// ── Response: list(每期一列) ──
type Revenue = { [currencyId: string]: string }

export interface ReferralStatementListItem {
  statement_id: number
  billing_date: string                  // 例 "2026-10-01"
  billing_start: string                 // 例 "2025-09-01 00:00:00"
  billing_end: string                   // 例 "2026-09-30 23:59:59"
  cashback_count: number                // ⭐ Figma 「下級數量」
  revenues: Revenue                     // ⭐ Figma 「返佣金額」(各幣別 → 金額字串)
}

export interface ReferralStatementListResponse {
  list: ReferralStatementListItem[]
  total: number
  offset: number
  size: number
}

// ── Response: detail(單期下級明細) ──
export interface ReferralStatementDetailItem {
  member_account: string
  cashback_count: number                // ⭐ 「下級數量」(該下級的下下級人數)
  revenues: Revenue                     // ⭐ 「返佣金額」
}

export interface ReferralStatementDetailResponse {
  list: ReferralStatementDetailItem[]
  total: number
  offset: number
  size: number
  // ⚠️ 後端可能也回 page_summary,本期不用,可在 type 標 optional
  page_summary?: {
    cashback_count: number
    revenue_total: Revenue
  }
}
```

> **注意 `cashback_count` 語意**:
> - 在 **list**(結算列表)代表「該期所有下級的總人次」
> - 在 **detail**(查看子頁)代表「該下級的下下級人數」
> 兩者**前端 UI 顯示都叫「下級數量」**,但語意層級不同。

---

## 5. API Wrappers

```ts
// libs/shared/ui-layer/src/lib/api/apiFunctions/referral.ts(append)

import type {
  GetReferralStatementListRequest,
  GetReferralStatementDetailRequest,
  ReferralStatementListResponse,
  ReferralStatementDetailResponse,
} from '../apiTypes'

export const getReferralStatementList = (params: GetReferralStatementListRequest) =>
  request<ReferralStatementListResponse>({
    url: '/v1/player/commission/statements',
    method: 'get',
    params,
  })

export const getReferralStatementDetail = (
  statementId: number,
  params: GetReferralStatementDetailRequest,
) =>
  request<ReferralStatementDetailResponse>({
    url: `/v1/player/commission/statements/${statementId}/details`,
    method: 'get',
    params,
  })
```

---

## 6. TanStack Query Hooks

### 6.1 結算列表 query

```ts
// libs/shared/ui-layer/src/lib/api/hooks/useReferralStatementListQuery.ts

import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { getReferralStatementList } from '../apiFunctions/referral'

export interface UseReferralStatementListQueryParams {
  offset: Ref<number>
  size: Ref<number>
  memberAccount: Ref<string>
}

export function useReferralStatementListQuery(params: UseReferralStatementListQueryParams) {
  return useQuery({
    queryKey: computed(() => [
      'referralStatementList',
      { offset: params.offset.value, size: params.size.value, memberAccount: params.memberAccount.value },
    ]),
    queryFn: () =>
      getReferralStatementList({
        offset: params.offset.value,
        size: params.size.value,
        member_account: params.memberAccount.value || undefined,
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
```

### 6.2 單期下級明細 query

```ts
// libs/shared/ui-layer/src/lib/api/hooks/useReferralStatementDetailQuery.ts

import { useQuery, keepPreviousData } from '@tanstack/vue-query'
import { computed, type Ref } from 'vue'
import { getReferralStatementDetail } from '../apiFunctions/referral'

export interface UseReferralStatementDetailQueryParams {
  statementId: Ref<number | null>
  offset: Ref<number>
  size: Ref<number>
  memberAccount: Ref<string>
}

export function useReferralStatementDetailQuery(params: UseReferralStatementDetailQueryParams) {
  return useQuery({
    queryKey: computed(() => [
      'referralStatementDetail',
      params.statementId.value,
      { offset: params.offset.value, size: params.size.value, memberAccount: params.memberAccount.value },
    ]),
    queryFn: () =>
      getReferralStatementDetail(params.statementId.value!, {
        offset: params.offset.value,
        size: params.size.value,
        member_account: params.memberAccount.value || undefined,
      }),
    enabled: computed(() => params.statementId.value !== null),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
```

---

## 7. 設計取捨

| 決策 | 理由 |
|---|---|
| 每張表獨立 ref | 跟 setting data-layer 一致;不再共用舊版 `referralPagination` |
| queryKey 帶 statementId + params | detail query 必須以 statementId 為 key 的一部分,不同 statement 之間不會 race |
| 不做 mutation | 明細是純讀,無更新行為 |
| 不呼叫 `getReferralStatementDetailTotal` | 本期不做頁/搜尋總計(對齊 setting decisions §11) |
| `staleTime: 30_000` | 跟 setting 一致 |
| Mobile size 預設 | 由 UI spec 控制(`list` 預設 10,`subdetail` 預設 20 ← 沿用舊 Mobile 寫死 20 的選擇) |

---

## 8. 驗收

- [ ] `getReferralStatementList` / `getReferralStatementDetail` 兩隻 wrapper 都接得到 response
- [ ] queryKey 設計能讓不同 statementId 的 detail 各自快取(切到別期不會用到舊期的快取)
- [ ] `statementId = null` 時 detail query 不打 API
- [ ] 連續快速翻頁時不會有 race
- [ ] 沒有寫死 hex / any

---

## 9. 注意事項給 codex

1. **不要動 mutation 相關** — 明細功能無更新,只查詢
2. **不要呼叫 `getReferralStatementDetailTotal`** — 對齊 setting decisions「頁/搜尋總計全不做」
3. **`cashback_count` 兩處語意不同** — list 是該期總人次,detail 是該下級的下下級人數,UI 都叫「下級數量」
4. **沿用 setting data-layer 的 `referral.ts` 跟 `apiTypes.ts`**,不要造新檔
