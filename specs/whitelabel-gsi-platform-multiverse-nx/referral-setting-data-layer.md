# R017 會員代理 — 設定 Tab 資料層 Spec

> **角色**:本份 spec 描述「設定 Tab」的資料層 — API types、TanStack Query / Mutation hooks、共用 composable。**先做這份**,List 跟 EditDialog 兩份元件 spec 都依賴本份。
>
> **同套件 spec**(三份合起來才完整):
> - 本份 ─ 資料層 [referral-setting-data-layer.md](referral-setting-data-layer.md)
> - 列表 ─ [referral-setting-list.md](referral-setting-list.md)
> - 編輯彈窗 ─ [referral-setting-edit-dialog.md](referral-setting-edit-dialog.md)
>
> **先決條件**:[referral-old-api-reference.md](referral-old-api-reference.md) — 舊專案 API 流程盤點,本 spec 假設讀者已熟悉。

---

## 1. 範圍

只做這 4 件事:

1. API wrapper(用 axios + 既有 `useApi`)
2. TypeScript 型別
3. TanStack Query hooks(list + detail)
4. TanStack Mutation hook(更新)

**不做**:UI、搜尋邏輯、彈窗、popover、分頁元件。

---

## 2. 檔案位置

```
libs/shared/ui-layer/src/lib/api/
├─ apiFunctions/referral_getReferralSetting.ts        // 既有 — 補 member_account query type
├─ apiFunctions/referral_getReferralSettingDetail.ts  // 既有 — 修 response type 為 ReferralSettingDetail
├─ apiFunctions/referral_putReferralSetting.ts        // 既有 — 沿用更新 wrapper
├─ commonTypes/referralTypes.ts                       // 既有 — 補 GetReferralSettingBase.member_account 與 detail type
├─ constants/tanstackQueryKeys/referralKeys.ts        // 新增 — query key constants
└─ hooks/
   ├─ useReferralSettingQuery.ts                      // 新增 — list query
   ├─ useReferralSettingDetailQuery.ts                // 新增 — single member detail query(編輯彈窗用)
   └─ useUpdateReferralSettingMutation.ts             // 新增 — 更新 mutation
```

> 放在 `libs/shared/ui-layer` 而**不是** `apps/r017`,因為其他 tenant 未來可能也要用同一組 API。
>
> ⚠️ Repo 已有 `referral_getReferralSetting.ts` / `referral_getReferralSettingDetail.ts` / `referral_putReferralSetting.ts`,不要再新增聚合式 `apiFunctions/referral.ts` 或 `apiTypes.ts`。請沿用現有「一支 API 一檔」命名。

---

## 3. API 端點(沿用舊專案,不改)

| 用途 | Method | Path | Function |
|---|---|---|---|
| 直屬下級列表 | GET | `/v1/player/commission/settings` | `getReferralSetting({ offset, size, member_account? })` |
| 取自己的上限(編輯彈窗用) | GET | `/v1/player/commission/settings/:userId` | `getReferralSettingDetail(userId)` |
| 取下級當前設定 | GET | `/v1/player/commission/settings/:memberId` | `getReferralSettingDetail(memberId)` |
| 更新下級設定 | PUT | `/v1/player/commission/settings/:memberId` | `putReferralSetting({ member_id, currency_limit })` |

> ⚠️ `member_account` 是新增的 query 參數,給搜尋用。**後端需確認支援**;若不支援可改前端 client-side filter,但本 spec 預設後端支援。

---

## 4. TypeScript 型別

```ts
// libs/shared/ui-layer/src/lib/api/commonTypes/referralTypes.ts(append/update)

export interface GetReferralSettingBase {
  size?: number
  offset?: number
  member_account?: string
}

export interface UpdateReferralSettingRequest {
  member_id: number
  currency_limit: { [currencyId: string]: number }
}

interface ReferralSettings {
  currency_limit: { [currencyId: string]: number }
  is_limit_configured: boolean
}

export interface ReferralSettingItem {
  account: string
  direct_member_count: number
  settings: ReferralSettings
  member_id: number
}

export interface ReferralSettingListResponse {
  list: ReferralSettingItem[]
  total: number
  offset: number
  size: number
}

export type ReferralSettingDetail = ReferralSettings
```

---

## 5. API Wrappers

> 下方是語意示意；實作請改現有 wrapper 檔案，不新增 `apiFunctions/referral.ts`。

```ts
// libs/shared/ui-layer/src/lib/api/apiFunctions/referral_getReferralSetting.ts
import { requestFn } from "../axiosInterceptors"
import { ENDPOINT_PATHS } from "../endpointPaths"
import { GetReferralSettingBase, ReferralSetting } from "../commonTypes/referralTypes"

export type GetReferralSettingParamTypes = GetReferralSettingBase
export type GetReferralSettingRequestTypes = GetReferralSettingBase
export type GetReferralSettingResponseType = ReferralSetting

export const getReferralSetting = (params: GetReferralSettingParamTypes) =>
  requestFn<GetReferralSettingRequestTypes, GetReferralSettingResponseType>(
    ENDPOINT_PATHS.REFERRAL.SETTING,
    params,
    { name: "getReferralSetting", method: "get" }
  )

// libs/shared/ui-layer/src/lib/api/apiFunctions/referral_getReferralSettingDetail.ts
export type GetReferralSettingDetailResponseType = ReferralSettingDetail

// libs/shared/ui-layer/src/lib/api/apiFunctions/referral_putReferralSetting.ts
// 已存在,沿用 UpdateReferralSettingParamTypes / putReferralSetting
```

> 實際 wrapper 名稱(`request`)請對齊 shared layer 既有 axios 包裝;本 repo 實際使用 `requestFn` + `ENDPOINT_PATHS.REFERRAL.SETTING`。

---

## 6. TanStack Query Hooks

### 6.1 list query

```ts
// libs/shared/ui-layer/src/lib/api/hooks/useReferralSettingQuery.ts
import { keepPreviousData, type UseQueryOptions } from "@tanstack/vue-query"
import { computed, reactive, toValue, watch, type ComputedRef, type Ref } from "vue"
import type { ApiResponse } from "../types"
import { getReferralSetting, type GetReferralSettingResponseType } from "../apiFunctions/referral_getReferralSetting"
import type { GetReferralSettingBase } from "../commonTypes/referralTypes"
import { useApiQuery } from "../useApiQuery"
import { TANSTACK_QUERY_KEY_REFERRAL_SETTING } from "../../constants/tanstackQueryKeys"

export interface UseReferralSettingQueryParams {
  params: Ref<GetReferralSettingBase> | ComputedRef<GetReferralSettingBase>
  options?: Omit<UseQueryOptions<unknown, Error, GetReferralSettingResponseType, unknown[]>, "queryKey" | "queryFn">
}

export function useReferralSettingQuery({ params, options = {} }: UseReferralSettingQueryParams) {
  // useApiQuery 的 payload 需保持同一個 reactive reference,避免 queryFn closure 讀到舊參數。
  const liveParams = reactive<GetReferralSettingBase>({})
  watch(params, (next) => {
    for (const key of Object.keys(liveParams) as (keyof GetReferralSettingBase)[]) delete liveParams[key]
    Object.assign(liveParams, next)
  }, { immediate: true })

  const queryKey = computed(() => [
    TANSTACK_QUERY_KEY_REFERRAL_SETTING,
    toValue(params).offset ?? 0,
    toValue(params).size ?? 10,
    toValue(params).member_account ?? ""
  ])

  return useApiQuery<typeof getReferralSetting, GetReferralSettingResponseType>(
    queryKey as unknown as any[],
    getReferralSetting,
    liveParams,
    {
      placeholderData: keepPreviousData,
      select: (response: ApiResponse<GetReferralSettingResponseType>) => response.data ?? { list: [], total: 0, offset: 0, size: 0 },
      staleTime: 30_000,
      ...options
    }
  )
}
```

### 6.2 detail query(編輯彈窗用,同時抓上級上限 + 該下級當前值)

```ts
// libs/shared/ui-layer/src/lib/api/hooks/useReferralSettingDetailQuery.ts
import { useQuery } from "@tanstack/vue-query"
import { computed, type Ref } from "vue"
import type { ApiResponse } from "../types"
import { getReferralSettingDetail, type GetReferralSettingDetailResponseType } from "../apiFunctions/referral_getReferralSettingDetail"
import { TANSTACK_QUERY_KEY_REFERRAL_SETTING_DETAIL } from "../../constants/tanstackQueryKeys"

// useApiQuery 不支援 primitive dynamic payload;沿用 useDepositPaymentDetail / useCmsDetailQuery 的 direct useQuery pattern。
export function useReferralSettingDetailQuery(memberId: Ref<number | null>) {
  return useQuery<GetReferralSettingDetailResponseType, Error>({
    queryKey: computed(() => [TANSTACK_QUERY_KEY_REFERRAL_SETTING_DETAIL, memberId.value]),
    queryFn: async () => {
      const response = (await getReferralSettingDetail(memberId.value!)) as ApiResponse<GetReferralSettingDetailResponseType>
      if (response.status === false) throw new Error(response.msg || `API Error Code: ${response.code}`)
      return response.data ?? { currency_limit: {}, is_limit_configured: false }
    },
    enabled: computed(() => memberId.value !== null),
    staleTime: 0
  })
}
```

### 6.3 update mutation

```ts
// libs/shared/ui-layer/src/lib/api/hooks/useUpdateReferralSettingMutation.ts
import { useNuxtApp } from "#imports"
import { putReferralSetting, type UpdateReferralSettingParamTypes } from "../apiFunctions/referral_putReferralSetting"
import { useApiMutation } from "../useApiMutation"
import {
  TANSTACK_QUERY_KEY_REFERRAL_SETTING,
  TANSTACK_QUERY_KEY_REFERRAL_SETTING_DETAIL
} from "../../constants/tanstackQueryKeys"

export function useUpdateReferralSettingMutation() {
  const { $queryClient } = useNuxtApp()
  const mutation = useApiMutation(putReferralSetting, {
    onSuccess: async () => {
      await $queryClient.invalidateQueries({ queryKey: [TANSTACK_QUERY_KEY_REFERRAL_SETTING] })
      await $queryClient.invalidateQueries({ queryKey: [TANSTACK_QUERY_KEY_REFERRAL_SETTING_DETAIL] })
    }
  })

  return {
    updateReferralSetting: (params: UpdateReferralSettingParamTypes) => mutation.mutateAsync(params),
    mutate: mutation.mutate,
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    reset: mutation.reset
  }
}
```

---

## 7. 設計取捨

| 決策 | 理由 |
|---|---|
| 每張表獨立 ref(offset/size/memberAccount) | 不再共用舊版 `referralPagination`,避免跨 tab 殘留 |
| `queryKey` 帶 params | 自動 race(後一個 request 取代前一個),不必手寫 abort |
| `keepPreviousData` | 翻頁順,無閃爍 |
| `staleTime: 30_000`(list) | 30 秒內不重抓,降低 server 壓力 |
| `staleTime: 0`(detail) | 開彈窗每次抓最新,避免使用者看到過時的上限值 |
| invalidate by key prefix | 編輯成功後列表 + detail 都 invalidate,UX 一致 |
| API wrapper 不額外處理 error | list/mutation 沿用 shared layer 既有 error handling;detail 因 primitive id 改用 direct `useQuery`,需在 queryFn 內處理 `status === false` 並丟 Error |

---

## 8. 驗收

- [ ] `referral_getReferralSetting*.ts` / `referral_putReferralSetting.ts` wrapper 都能正確打到後端,response 解到正確 type
- [ ] `useReferralSettingQuery` 改變 params(offset / size / memberAccount)會自動重抓
- [ ] 連續快速翻頁時不會有 race(舊 response 不會覆蓋新 response)
- [ ] `useReferralSettingDetailQuery` 在 memberId 為 null 時不打 API
- [ ] `useUpdateReferralSettingMutation` 成功後列表 query 自動 invalidate(觀察 Network panel 應該看到列表重抓)
- [ ] 沒有 unused export、沒有 any、`@typescript-eslint/no-explicit-any` 過

---

## 9. 與現有 repo pattern 的修正

- `getReferralSettingDetail` 目前 response type 不應是 `ReferralSetting` 分頁型別,應改成 `ReferralSettingDetail`。
- `GetReferralSettingBase` 需補 `member_account?: string`,搜尋才有型別支援。
- List query 用 repo 既有 `useApiQuery`;detail query 因 primitive id payload 問題,沿用 `useDepositPaymentDetail` / `useCmsDetailQuery` 的 direct `useQuery` pattern;mutation 用 `useApiMutation`。`constants/tanstackQueryKeys/referralKeys.ts` 新增 key 後由 index 匯出。
- Hook 需從 `ApiResponse<T>` 取 `response.data`,不要假設 wrapper 直接回 payload。

## 10. 實作注意事項

1. **不要動舊專案** — 所有檔案都新增在 `libs/shared/ui-layer`,不要動 `apps/r017` 內檔案
2. **沿用既有 axios wrapper** — 不要新造一個 axios 實例,如果 shared layer 已有 `request` 或 `adminRequest`,直接 import
3. **保留 query key 命名一致** — `TANSTACK_QUERY_KEY_REFERRAL_SETTING` / `TANSTACK_QUERY_KEY_REFERRAL_SETTING_DETAIL`;之後 list / dialog spec 也會用同 key
4. **`is_limit_configured` 欄位** — 後端有回,本 spec 暫時不用,但 type 保留(未來可能用來判斷 row level disable)
