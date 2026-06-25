# Bet Report Tab Logic Spec

## Scope

This spec covers the `membershipManagement` page tab `betReport`, shown as `投注報表`.
It ports old project main logic from:

- `src/stores/useMemberManagement.ts`
- `src/api/userInfo.ts`
- `template/set_r017/pages/Member/components/MembershipManagement/BetReportPanel.vue`

The tab summarizes downline member wagering by account and can deep-link into the bet record query tab by clicking an account.

## Shared API Requirements

The old project calls `getMemberAgentBetReport`. This Nx repo already has the corresponding shared API function; add the missing hook around it:

- endpoint: `/v1/player/center/credit_member_agent/report/member_bet_report`
- request:
  - `currency_id`
  - `str_time`
  - `end_time`
  - `member_account?`
  - `offset`
  - `size`
- response:
  - `list`
  - `summary.page`
  - `summary.total`
  - `offset`
  - `size`
  - `total`

Expose it as `useMemberAgentBetReport` following the existing `useApiQuery` pattern.

Add query key:

- `memberAgentBetReport`

## State Model

Create `apps/r017/src/composables/useMembershipManagement/useBetReportTab.ts`.

State:

- `page`
- `offset`
- `size = 10`
- `totalRecords`
- `memberAccount`
- `dateRange`
- `lastSearchMemberAccount`
- `lastSearchDateRange`
- `betReportRows`
- `betReportSummary`
- `isFetching`

Currency:

- Always use the current cash wallet currency id from `useCurrencyInfo` / wallet store.
- If no cash wallet currency id exists, do not call API and show empty state.

## Filters

Required:

- date range

Optional:

- member account

The old main behavior does not require member account for this tab.

## Search Validation

Before search:

1. If date range is empty, show "please select date" validation toast and stop.
2. Normalize single-day or range date selection.
3. Validate start date is not after end date.

On valid search:

1. Reset page and offset.
2. Save `memberAccount` and `dateRange` into `lastSearch*`.
3. Fetch report.

## Request Mapping

Request payload:

- `currency_id = cash wallet currency id`
- `str_time = startDate`
- `end_time = endDate`
- `offset = offset`
- `size = size`
- Include `member_account = lastSearchMemberAccount` only when non-empty.

Dates follow old main day boundaries. If hook conversion is added, it must map start to `00:00:00` and end to `23:59:59` with site UTC offset.

## Response Mapping

Rows:

- member account: `member_account`
- order quantity: `bet_count`
- winning number: `win_count`
- betting amount: `bet_amount`
- valid bet amount: `valid_bet_amount`
- payout: `payout`
- profit: `profit`
- profit ratio: `profit_rate`, display with `%` when present
- activity bonus: `bonus`

Summary page row:

- `summary.page.bet_count`
- `summary.page.win_count`
- `summary.page.bet_amount`
- `summary.page.valid_bet_amount`
- `summary.page.payout`
- `summary.page.profit`
- `summary.page.profit_rate`
- `summary.page.bonus`

Summary total row:

- same fields from `summary.total`

Use the repo's money formatter for amount-like fields and `-` for missing values.

Pagination:

- `totalRecords = response.total`
- `page = Math.floor(response.offset / response.size) + 1`
- `offset = (page - 1) * size`

## Account Drill-Down

When user clicks a member account in bet report:

1. Switch parent active tab to `betRecordQuery`.
2. Set bet record query `memberAccount` to clicked account.
3. Preserve or transfer the current `dateRange`.
4. Trigger bet record query search.

This ports old main `searchAccountBetReport`.

## Pagination Logic

On page change:

1. Set `offset = (newPage - 1) * size`.
2. Fetch with last successful search params.
3. Do not apply current unsaved filter inputs.

## Empty, Loading, And Error States

- Clear `betReportRows` and `betReportSummary` at fetch start.
- Show loading while fetching.
- Show no-data state when list is empty.
- Keep summary hidden or filled with `-` when no response exists.
- API errors use shared handling.

## Acceptance Criteria

- Date is required; account is optional.
- Search and pagination preserve old main request payload shape.
- Page and total summaries render separately.
- Clicking account opens the bet record query tab with that account.
