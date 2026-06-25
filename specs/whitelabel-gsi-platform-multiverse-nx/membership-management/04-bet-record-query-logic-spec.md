# Bet Record Query Tab Logic Spec

## Scope

This spec covers the `membershipManagement` page tab `betRecordQuery`, shown as `投注紀錄查詢`.
It ports old project main logic from:

- `src/stores/useMemberManagement.ts`
- `src/api/userInfo.ts`
- `template/set_r017/pages/Member/components/MembershipManagement/BetRecordQueryPanel.vue`

The tab searches downline wager records and opens third-party wager detail pages.

## Shared API Requirements

Existing shared API functions:

- `getMemberAgentWagerList`
- `getMemberAgentWagerDetail`

Add hooks:

- `useMemberAgentWagerList`
- `useMemberAgentWagerDetail`

Add query keys:

- `memberAgentWagerList`
- `memberAgentWagerDetail`

`getMemberAgentWagerDetail` can be a mutation-style action because it is triggered by clicking a row and opens an external URL.

## State Model

Create `apps/r017/src/composables/useMembershipManagement/useBetRecordQueryTab.ts`.

State:

- `page`
- `offset`
- `size = 10`
- `totalRecords`
- `memberAccount`
- `betNumber`
- `dateRange`
- `settlementDate`
- `betDate`
- `lastSearchMemberAccount`
- `lastSearchBetNumber`
- `lastSearchDateRange`
- `lastSearchSettlementDate`
- `lastSearchBetDate`
- `betRecordQueryRows`
- `betRecordQuerySummary`
- `isFetching`
- `isDetailOpening`

Currency:

- Use current cash wallet currency id.
- If missing, do not fetch.

## Filters

Required:

- date range

Optional:

- member account
- wager code / bet number
- bet date checkbox
- settlement date checkbox

Old main allows date-type checkboxes to be both false. In that case no `date_type` is sent and backend default behavior applies.

## Search Validation

Before search:

1. If date range is empty, show "please select date" validation toast and stop.
2. Normalize date range into start/end date.
3. Validate start date is not after end date.

On valid search:

1. Reset page and offset.
2. Save current filters into `lastSearch*`.
3. Fetch wager list.

## Request Mapping

Base payload:

- `currency_id = cash wallet currency id`
- `str_time = startDate`
- `end_time = endDate`
- `offset = offset`
- `size = size`

Optional payload:

- `member_account = lastSearchMemberAccount`, when non-empty
- `wager_code = lastSearchBetNumber`, when non-empty

Date type mapping:

- bet date and settlement date: `date_type = [2]`
- bet date only: `date_type = [0]`
- settlement date only: `date_type = [1]`
- neither selected: omit `date_type`

This mapping must match old main exactly.

## Response Mapping

Rows:

- bet number: `wager_code`
- gaming site: `gaming_site` or `gaming_site_title`
- user account: `member_account`
- betting time: `created_at`
- settlement time: `settled_at`
- status: `status_title`, fallback status code
- betting source: `channel_code`
- product: `product_title`
- game: `game_title`
- betting amount: `bet_amount`
- valid bet amount: `valid_bet_amount`
- payout: `payout`
- profit: `profit`
- activity bonus: include only if response provides it; otherwise display `-`

Summary page row:

- `summary.page.bet_amount`
- `summary.page.valid_bet_amount`
- `summary.page.payout`
- `summary.page.profit`

Summary total row:

- `summary.total.bet_amount`
- `summary.total.valid_bet_amount`
- `summary.total.payout`
- `summary.total.profit`

Use the repo's money formatter and `-` fallback.

Pagination:

- `totalRecords = response.total`
- `page = Math.floor(response.offset / response.size) + 1`
- `offset = (page - 1) * size`

## Open Wager Detail

On detail action:

1. Call `getMemberAgentWagerDetail` with:
   - `wager_code`
   - `product_code`
2. If response `content` exists, open it in a new tab/window.
3. If no content exists, show a warning or error toast.

Browser note:

- In SPA implementation, call `window.open(content, "_blank")` only from a user-triggered handler path to avoid popup blocking.

## Cross-Tab Entry From Bet Report

When entered by clicking an account in bet report:

- Set `memberAccount` from clicked account.
- Prefer current bet report date range.
- Trigger search with current date range.
- Leave `betNumber` empty.
- Leave date-type checkboxes unchanged unless product requires a default.

## Empty, Loading, And Error States

- Clear rows and summary at fetch start.
- Show loading while fetching.
- Show no-data state after empty response.
- Disable detail action while detail request is pending for the same row.
- API errors use shared error handling.

## Acceptance Criteria

- Date is required; account and bet number are optional.
- Date-type array mapping is exactly `[2]`, `[0]`, `[1]`, or omitted.
- Page and total summaries render separately.
- Wager detail opens third-party content in a new browser tab.
- Pagination uses last successful search params.
