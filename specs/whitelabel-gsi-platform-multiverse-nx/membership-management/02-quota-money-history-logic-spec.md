# Quota Money History Tab Logic Spec

## Scope

This spec covers the `membershipManagement` page tab `detail`, shown as `額度帳變明細`.
It ports old project main logic from:

- `src/stores/useMemberManagement.ts`
- `src/api/userInfo.ts`
- `template/set_r017/pages/Member/components/MembershipManagement/DetailPanel.vue`

This tab is read-only and should be implemented as a focused app-local composable, not as part of a large page store.

## Shared API Requirements

Wrap existing shared API function:

- `getMemberAgentQuotaMoneyHistory`

Use existing constant:

- `MEMBER_AGENT_QUOTA_SEARCH_TYPE_ENUMS`
- `MEMBER_AGENT_QUOTA_SEARCH_I18N_KEYS`

Add query key:

- `memberAgentQuotaMoneyHistory`

## State Model

Create `apps/r017/src/composables/useMembershipManagement/useQuotaMoneyHistoryTab.ts`.

State:

- `page`
- `offset`
- `size = 10`
- `totalRecords`
- `memberAccount`
- `dateRange`
- `changeType`
- `lastSearchMemberAccount`
- `lastSearchDateRange`
- `lastSearchChangeType`
- `detailRows`
- `isFetching`

`dateRange` supports the old project's two shapes:

- string for single day
- `{ from: string; to: string }` for date range

The Nuxt implementation may normalize this internally, but public behavior must preserve single-day and range handling.

## Filters

Required filters:

- member account
- date range

Optional filter:

- change type

Change type options:

- all
- manual addition
- manual deduction

Do not include deposit, withdrawal, or bet record in this tab's default dropdown, because old main limited this filter to all/add/minus for the UI even though the shared enum contains more values.

## Search Validation

Before search:

1. If `memberAccount` is empty, show "please enter user account" validation toast and stop.
2. If `dateRange` is empty, show "please select date" validation toast and stop.
3. Convert date range:
   - single day: start = selected day, end = selected day
   - range: start = `from`, end = `to`
4. Validate start date is not after end date. If invalid, show start-before-end validation toast and stop.

On valid search:

1. Reset page to `1`.
2. Reset offset to `0`.
3. Save current filters into `lastSearch*` refs.
4. Fetch data.

## Request Mapping

Request payload:

- `member_account = lastSearchMemberAccount`
- `str_time = startDate`
- `end_time = endDate`
- `search_type = lastSearchChangeType`
- `size = String(size)`
- `offset = String(offset)`

Dates follow old main behavior and are sent as date strings. If the new shared hook converts to RFC3339, it must preserve the backend's expected day boundary:

- start at `00:00:00`
- end at `23:59:59`
- use site UTC offset if shared hook handles conversion

## Response Mapping

Rows map from `GetMemberAgentQuotaMoneyHistory`:

- member account: `member_account`
- account change time: `updated_at_unix` formatted by the same date helper used in member history, fallback `updated_at`
- account type: `action_type`, displayed through action/search type label mapping
- account variable object: prefer `transaction_code`; if wager-specific, allow `wager_code`
- amount: `amount`
- before balance: `before_balance`
- after balance: `after_balance`
- currency: `currency_code`
- wallet type: `wallet_type`

Pagination:

- `totalRecords = response.total`
- `page = Math.floor(response.offset / response.size) + 1`
- `offset = (page - 1) * size`

## Pagination Logic

On page change:

1. Set `offset = (newPage - 1) * size`.
2. Fetch with last successful search params.
3. Do not read current unsaved filters until user presses search again.

This matches old main behavior and prevents pagination from silently changing query conditions.

## Empty, Loading, And Error States

- Clear `detailRows` at the beginning of fetch.
- Show loading while fetching.
- Show no-data state when rows are empty after fetch.
- Validation errors are local to the tab.
- API errors use shared API error handling.

## Acceptance Criteria

- Search requires member account and date.
- Date start/end validation blocks invalid range.
- Change type dropdown includes only all, agent add, and agent deduct.
- Pagination uses last successful search values.
- Table fields and formatting match old main behavior.
