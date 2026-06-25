# Agent Report Tab Logic Spec

## Scope

This spec covers the `membershipManagement` page tab `agentReport`, shown as `代理報表`.
It ports old project main logic from:

- `src/stores/useMemberManagement.ts`
- `src/api/userInfo.ts`
- `template/set_r017/pages/Member/components/MembershipManagement/AgentReport.vue` where available in old templates

This tab shows personal agent overview and team agent report list.

## Shared API Requirements

Existing shared API functions:

- `getMemberAgentReport`
- `getMemberTeamAgentReport`

Endpoint alignment:

- Old main uses:
  - personal: `/platform/v1/player/member/overview`
  - team: `/platform/v1/player/member/overview/list`
- Current Nx endpoint paths already match these old main platform overview endpoints.

Add hooks:

- `useMemberAgentReport`
- `useMemberTeamAgentReport`

Add query keys:

- `memberAgentReport`
- `memberTeamAgentReport`

Hooks should convert `start_time` and `end_time` with the same site UTC offset pattern used by `useMemberSummary`.

## State Model

Create `apps/r017/src/composables/useMembershipManagement/useAgentReportTab.ts`.

State:

- `page`
- `offset`
- `size = 10`
- `totalRecords`
- `agentReportCurrencyId`
- `dateType`
- `dateRange`
- `lastSearchCurrencyId`
- `lastSearchDateRange`
- `agentReportOwnData`
- `agentReportRows`
- `isFetchingPersonal`
- `isFetchingTeam`
- `isLoading`

Default values:

- `agentReportCurrencyId = current cash wallet currency id`
- `dateType = LastSevenDays`
- `dateRange = last seven days including today`

## Filters

Required:

- currency
- date range

Date quick tabs:

- today
- yesterday
- last seven days

Date quick-tab behavior:

- When active tab is `agentReport` and `dateType` changes:
  - today: date range is today
  - yesterday: date range is yesterday
  - last seven days: from six days before today through today

Currency options:

- Build from user's wallet map / wallet list.
- Use cash wallet per currency.
- Label should match existing wallet label behavior.

## Search Validation

Before search:

1. If date range is empty, show "please select date" validation toast and stop.
2. Normalize single-day or range date selection.
3. Validate start date is not after end date.
4. Validate range is not more than 31 days. If exceeded, show the old main 31-day validation message and stop.

On valid search:

1. Set `isLoading = true`.
2. Reset page and offset.
3. Save `agentReportCurrencyId` and `dateRange` into `lastSearch*`.
4. Fetch personal overview and team list in parallel.
5. Set `isLoading = false` after both finish.

## Personal Overview Request

Payload:

- `currency_id = lastSearchCurrencyId`
- `start_time = startDate`
- `end_time = endDate`

Response mapping:

Top/personal area:

- account: `team.member_account`, following old main display
- currency: selected currency label
- order quantity: `personal.bet_count`
- deposit: `personal.deposit`
- withdrawal: `personal.withdraw`
- betting amount: `personal.bet_amount`
- valid bet amount: `personal.valid_bet`
- payout: `personal.prize`
- profit: `personal.profit`
- profit ratio: `personal.rate%`
- activity bonus: `personal.bonus`

Bottom/team summary area:

- team member: `team.member_count`
- team bet number: `team.bet_count`
- team deposit amount: `team.deposit`
- team withdrawal amount: `team.withdraw`
- team bet amount: `team.bet_amount`
- team valid bet amount: `team.valid_bet`
- team payout amount: `team.prize`
- team profit: `team.profit`
- team profit ratio: `team.rate%`
- team activity bonus: `team.bonus`

Use money formatter for numeric amount values and `-` fallback.

## Team List Request

Payload:

- `currency_id = lastSearchCurrencyId`
- `start_time = startDate`
- `end_time = endDate`
- `offset`
- `size`

Rows:

- user account: `member_account`
- team member: `member_count`
- currency: display selected currency label or map `currency_id`
- team bet number: `bet_count`
- team deposit amount: `deposit`
- team withdrawal amount: `withdraw`
- team bet amount: `bet_amount`
- team valid bet amount: `valid_bet`
- team payout amount: `prize`
- team profit: `profit`
- team profit ratio: `rate%`
- team activity bonus: `bonus`

Pagination:

- Old main expects `data.pagination.total`, `data.pagination.offset`, and `data.pagination.size`.
- Current shared type uses `BaseList`; implementation must normalize either shape into `{ list, pagination }`.
- `totalRecords = pagination.total`
- `page = Math.floor(pagination.offset / pagination.size) + 1`
- `offset = (page - 1) * size`

## Pagination Logic

On page change:

1. Set `offset = (newPage - 1) * size`.
2. Fetch team list only.
3. Do not re-fetch personal overview unless filters changed.
4. Use last successful search currency and date range.

This ports old main `handleChangePage` behavior for `agentReport`.

## Empty, Loading, And Error States

- Personal overview cards display `-` until data exists.
- Team list clears at fetch start.
- Show loading while either overview or team list is fetching on search.
- On team-only pagination, loading can be limited to table area.
- API errors use shared API handling and must always reset loading flags.

## Acceptance Criteria

- Default filter is last seven days and current cash currency.
- Search blocks empty date, invalid range, and over-31-day range.
- Personal overview and team list are fetched in parallel on search.
- Pagination re-fetches team list only.
- Endpoint choice is verified against old main platform overview endpoints before implementation.
