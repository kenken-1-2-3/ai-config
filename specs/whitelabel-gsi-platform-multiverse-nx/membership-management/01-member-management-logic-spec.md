# Membership Management Tab Logic Spec

## Scope

This spec covers the `membershipManagement` page tab `manage`, shown as `會員管理`.
It ports the old project main logic from `/Users/kenyu/wow/Whitelabel_GSI_Platform_Multiverse`:

- `src/stores/useMemberManagement.ts`
- `src/api/userInfo.ts`
- `template/set_r017/pages/Member/components/MembershipManagement/ManagePanel.vue`
- `template/set_r017/pages/Member/components/MembershipManagement/AddSubordinateMember.vue`
- `template/set_r017/pages/Member/components/MembershipManagement/MemberAddMinusDialog.vue`

Target app is `apps/r017` in this Nx/Nuxt repo. The page should live under member center, use `MemberContainer`, and follow the existing `useHistory` / `usePendingOrder` style instead of copying the old single large Pinia store.

## Figma And Screenshot References

Breakpoints:

- `1440px` and above: PC.
- `768px` and below: mobile.
- Between `769px` and `1439px`: follow the existing r017 responsive rules unless Figma later provides a tablet-specific frame.

Figma references:

- PC: [R017 優化中 - 會員管理 PC](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=5757-73548&t=R6pNo4YeOp8YTV1Z-0)
- Mobile: [R017 優化中 - 會員管理 Mobile](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=13332-213570&t=R6pNo4YeOp8YTV1Z-0)

Screenshot references supplied for this spec:

- PC no-data and data frame: `screenshots/pc-nodata-data.png`
- PC data and action menu: `screenshots/pc-data-action-menu.png`
- Mobile no-data, credit, cash, and lower-level states: `screenshots/mobile-states.png`
- Header member dropdown entry: `screenshots/header-member-dropdown.png`

If a Figma state is not visible in these screenshots, ask for an additional screenshot before locking the visual spec for that state.

## Route And Entry

- Add page route: `apps/r017/src/pages/member/membershipManagement.vue`.
- Update `ROUTE_PATH.MEMBER.MEMBER_MANAGEMENT` from its current bank-card placeholder to `/member/membershipManagement`.
- Add the route to `AUTH_ROUTE_GROUPS.AUTH_REQUIRED_ROUTES`.
- Update `apps/r017/src/composables/useMemberAction.ts` so the `member-management` action navigates to `ROUTE_PATH.MEMBER.MEMBER_MANAGEMENT`.
- Add `MEMBER_ASIDE_KEYS.MEMBER_MANAGEMENT` to member aside navigation context if the aside should show and preserve mobile back behavior.
- Header member dropdown must include `會員管理` as a clickable entry, matching the supplied header dropdown screenshot. It should use the same destination as the member action and aside entry.

## Page Structure And Layout

PC layout:

- Page title area uses `代理中心`.
- Main content panel max visual width follows the Figma content frame: `1200px`.
- PC no-data frame is `1200px` wide and about `696px` high.
- PC data frame is `1200px` wide and about `740px` high.
- The five top tabs are shown in one horizontal row:
  - `會員管理`
  - `會員帳變明細`
  - `投注報表`
  - `投注紀錄查詢`
  - `代理報表`
- The active tab uses the r017 orange active tab style.
- The page remains inside the existing site shell with side game navigation, top member controls, and footer.

Mobile layout:

- Mobile page title uses `會員管理`, not `代理中心`.
- Mobile uses the same top tab row, horizontally scrollable when needed.
- The content is a single-column flow.
- Search fields stack vertically.
- Search button is full width below filters.
- `新增下級` is a sticky or bottom-positioned full-width CTA when the list is scrollable, matching the screenshots.
- Existing mobile bottom navigation remains visible when the page height extends below the content.
- In lower-level mode, show a back row with left arrow and `回上一層` above the summary cards.

## Display Modes

The member management tab has two product modes.

Credit mode:

- Show two summary cards:
  - `下級會員` with current member agent account.
  - `代理剩餘額度` with the agent's remaining quota amount.
- Table/list includes both point balance and remaining quota.
- Add/minus dialog allows choosing:
  - point
  - agent quota, disabled when the row is not a member agent.
- Mobile credit cards show member account and quota information before the search filters.

Cash mode:

- Still show the member account summary card.
- Do not show agent quota as a table column or mobile primary amount.
- Do not show quota operation options.
- In the mobile cash screenshot, the expanded card actions are hidden in cash mode. Implement this by either:
  - hiding row operation actions for cash mode, or
  - showing only actions that are valid for cash mode if product confirms any action remains.
- The screenshot note says cash version does not show plus, minus, or more icon; follow that until product supplies another cash-mode action screenshot.

Shared mode behavior:

- Search, lower-level browsing, add/edit subordinate member, pagination, and empty states remain available in both modes unless a backend permission blocks them.
- Product mode should come from existing environment / setting logic (`isCredit` in old main). Do not hard-code by tenant.

## Shared API Requirements

Existing shared API functions are already present and should be wrapped with hooks following `useApiQuery` / `useApiMutation` patterns:

- `getMemberAgentQuotaList`
- `getLowerLevelMemberAgentQuotaList`
- `getMemberAgentQuotaAmount`
- `updateMemberAgentQuotaBalance`
- `getMemberAgentCustomizeColumn`
- `getMemberAgentReferralList`
- `getMemberAgentTagList`
- `getMemberAgentInfo`
- `createMemberAgent`
- `updateMemberAgent`

Add missing TanStack query keys under `libs/shared/ui-layer/src/lib/constants/tanstackQueryKeys/userInfoKeys.ts` or a focused `memberAgentKeys.ts` export:

- `memberAgentQuotaList`
- `memberAgentLowerLevelQuotaList`
- `memberAgentQuotaAmount`
- `memberAgentCustomizeColumn`
- `memberAgentReferralList`
- `memberAgentTagList`
- `memberAgentInfo`

## State Model

Create app-local composable `apps/r017/src/composables/useMembershipManagement/useMemberManagementTab.ts`.

State:

- `page`, `offset`, `size`, `totalRecords`
- `memberAccount`
- `recommenderAccount`
- `searchSubordinateMemberAccount`
- `lastSearchMemberAccount`
- `lastSearchRecommenderAccount`
- `lastSearchSubordinateMemberAccount`
- `showSubordinateMemberAccount: { account: string; memberId: number } | null`
- `manageRows`
- `remainQuotaAmount`
- `showQuotaDialog`
- `dialogType`
- `targetAccount`
- `dialogAmount`
- `dialogMemberBalance`
- `dialogMemberRemainQuotaAmount`
- `dialogMemberIsAgent`
- `dialogIncreaseItem`
- `showAddSubordinateStatus`
- `memberAgentCustomizeColumn`
- `memberAgentCustomizeColumnData`
- `originalMemberAgentCustomizeColumnData`
- `memberAgentReferralList`
- `memberAgentTagList`
- `memberAgentCustomizeColumnId`

Default page size follows old logic: `10`.

## Component Breakdown

Implementation should add focused app-local components under `apps/r017/src/components/membershipManagement/`. Names may be adjusted to match final local style, but the responsibilities below should stay split so the page does not become a large multi-mode file.

### Page Shell

File:

- `apps/r017/src/pages/member/membershipManagement.vue`

Responsibilities:

- Own page route and member-center layout integration.
- Call `useMemberAsideNavigation(MEMBER_ASIDE_KEYS.MEMBER_MANAGEMENT)`.
- Render `MemberContainer`.
- Provide page title:
  - PC: `代理中心`
  - mobile: `會員管理`
- Render the five membership-management top tabs, with `會員管理` active.
- Render only the member-management tab content for this phase.
- Wire aside slot to `MemberAsideInfo active-key="member-management"`.

Component dependencies:

- `MemberContainer`
- `MemberAsideInfo`
- `BaseTab`
- `MembershipManagementPanel`

### Membership Management Panel

Suggested file:

- `apps/r017/src/components/membershipManagement/MembershipManagementPanel.vue`

Responsibilities:

- Compose the full `會員管理` tab body.
- Receive or inject the `useMemberManagementTab` return object.
- Decide between list mode and add/edit subordinate member mode.
- Keep the Figma `1200px` content width on PC.
- Keep mobile single-column flow.

Props:

- `isCredit: boolean`

Events:

- none preferred; call composable handlers directly through provided context.

Renders:

- `MembershipManagementSummaryCards`
- `MembershipManagementFilters`
- `MembershipManagementTablePanel` on PC/tablet where table layout is active
- `MembershipManagementMobileList` on mobile
- `MemberAddMinusDialog`
- `AddSubordinateMemberPanel` when `showAddSubordinateStatus` is true

### Summary Cards

Suggested file:

- `apps/r017/src/components/membershipManagement/MembershipManagementSummaryCards.vue`

Responsibilities:

- Render the top cards from Figma.
- Always show `下級會員`.
- Show `代理剩餘額度` only in credit mode.
- In lower-level mode, still show the currently viewed account context.

Props:

- `memberAgentAccount: string`
- `remainQuotaAmount: string | number`
- `isCredit: boolean`
- `viewingAccount?: string`

Display:

- PC: two cards in one row when credit mode, one wide card when cash mode.
- Mobile: cards are side-by-side when space allows; otherwise follow Figma mobile card widths.

### Filter Bar

Suggested file:

- `apps/r017/src/components/membershipManagement/MembershipManagementFilters.vue`

Responsibilities:

- Render account and recommender filters.
- In lower-level mode, render downline-member-account filter only.
- Render search button.
- Render `新增下級` CTA on PC.
- On mobile, expose `新增下級` through panel actions / bottom CTA placement instead of squeezing it into the filter row.

Props:

- `isLowerLevelMode: boolean`
- `memberAccount: string`
- `recommenderAccount: string`
- `searchSubordinateMemberAccount: string`
- `isSearching: boolean`

Events:

- `update:memberAccount`
- `update:recommenderAccount`
- `update:searchSubordinateMemberAccount`
- `search`
- `add-subordinate`

Use existing base inputs/buttons and match the sibling filter style from `HistoryTableFilters.vue` / `PendingTableFilters.vue`.

### Lower-Level Header

Suggested file:

- `apps/r017/src/components/membershipManagement/MembershipManagementLowerLevelHeader.vue`

Responsibilities:

- Render mobile `回上一層` row with left arrow.
- Optionally render PC lower-level context if design later requires it.
- Call back handler to return to direct downline list.

Props:

- `account: string`

Events:

- `back`

### PC Table Panel

Suggested file:

- `apps/r017/src/components/membershipManagement/MembershipManagementTablePanel.vue`

Responsibilities:

- Render desktop table rows, no-data state, loading state, and pagination.
- Use existing table/pagination components where possible.
- Keep action dropdown inside the actions column.
- Keep dropdown overlay from resizing row height.

Props:

- `rows`
- `isCredit: boolean`
- `isLoading: boolean`
- `totalRecords: number`
- `page: number`
- `size: number`

Events:

- `page-change`
- `add`
- `minus`
- `edit`
- `view-lower-level`

Column source:

- Columns come from composable computed values so credit/cash mode does not duplicate table code.

Sibling references:

- `HistoryTablePanel.vue`
- `PendingTablePanel.vue`
- `PendingActionCell.vue`

### Row Action Menu

Suggested file:

- `apps/r017/src/components/membershipManagement/MembershipManagementActionMenu.vue`

Responsibilities:

- PC: render `操作` dropdown menu.
- Mobile credit expanded card: expose the same actions as buttons, or share action definitions with mobile list.
- Hide unsupported actions in cash mode.

Props:

- `row`
- `isCredit: boolean`
- `layout: "dropdown" | "buttons"`

Events:

- `add`
- `minus`
- `edit`
- `view-lower-level`

Action labels:

- `加款`
- `扣款`
- `編輯`
- `查看下級`

### Mobile List

Suggested file:

- `apps/r017/src/components/membershipManagement/MembershipManagementMobileList.vue`

Responsibilities:

- Render mobile cards for member rows.
- Support collapsed and expanded card states in credit mode.
- Cash mode follows Figma note: no plus/minus/more icon unless later screenshot changes this.
- Render no-data state and loading state.
- Render pagination if the mobile design requires it; otherwise load page changes through existing pagination placement.

Props:

- `rows`
- `isCredit: boolean`
- `isLoading: boolean`
- `expandedRowId?: number`

Events:

- `toggle-row`
- `add`
- `minus`
- `edit`
- `view-lower-level`

Sibling references:

- `HistoryMobileCardToggleRow.vue`
- `PendingMobileRowList.vue`
- `PendingMobileToggleRow.vue`

### Add / Edit Subordinate Member Panel

Suggested file:

- `apps/r017/src/components/membershipManagement/AddSubordinateMemberPanel.vue`

Responsibilities:

- Render add/edit subordinate member form.
- Use customize columns returned from API.
- Render status toggles:
  - enabled / disabled
  - member-agent identity
  - blocked / unblocked
- Render dynamic fields according to customize column type.
- Render tag selection.
- Render previous / next / complete flow if Figma keeps the old multi-step behavior.
- Validate required fields before submit.

Props:

- `mode: "create" | "edit"`
- `columns`
- `form`
- `referralOptions`
- `tagOptions`
- `isSubmitting: boolean`

Events:

- `update:form`
- `update:tagOptions`
- `back`
- `submit`

Sibling references:

- `BankCardForm.vue`
- `DynamicFields.vue`
- existing form validator utilities under `apps/r017/src/utils`

### Add / Minus Dialog

Suggested file:

- `apps/r017/src/components/membershipManagement/MemberAddMinusDialog.vue`

Responsibilities:

- Render add/minus dialog for points and, in credit mode, agent quota.
- Sanitize amount input.
- Submit only valid positive amounts.
- Disable agent quota option when target row is not a member agent.

Props:

- `visible: boolean`
- `type: 1 | 2`
- `amount: string`
- `dialogIncreaseItem: number`
- `memberBalance: string`
- `memberRemainQuotaAmount: string`
- `remainQuotaAmount: string | number`
- `isCredit: boolean`
- `isMemberAgent: boolean`
- `isSubmitting: boolean`

Events:

- `update:visible`
- `update:amount`
- `update:dialogIncreaseItem`
- `submit`

Sibling references:

- `BaseDialog`
- `DeleteBankCardConfirmDialog.vue`
- existing deposit/withdraw dialog styling for r017 modal spacing.

### Empty / Loading / Pagination Blocks

Prefer existing shared/base components:

- No data: `BaseNoData` or app-local `NoData`
- Loading: existing table/list loading pattern
- Pagination: `BasePagination`

These should be composed in table/list panels rather than in the page shell.

## Table Columns

Desktop table columns:

- account: `member_account`
- level: `hierarchy_level`
- register time: `register_date`
- last login time: `last_login_date`
- point balance: `balance`
- remaining quota: `remain_quota_amount`, only when credit mode is enabled
- actions

Mobile card list:

- Collapsed row displays compact account and primary amount information.
- Credit mode collapsed row shows account, balance/quota summary, and a chevron/more affordance when row expansion is available.
- Expanded row shows:
  - level
  - register time
  - last login time
  - point balance
  - remaining quota in credit mode
  - action buttons in a two-column grid: `加款`, `扣款`, `編輯`, `查看下級`
- No-data mobile state centers the no-data illustration and text in the available content area, with `新增下級` at the bottom CTA position.
- Mobile card display must not change search, pagination, or action payload logic.

## Action UI Rules

PC row action:

- Use a compact `操作` button with dropdown menu.
- Menu items in credit/data screenshot:
  - `加款`
  - `扣款`
  - `編輯`
  - `查看下級`
- Dropdown opens below the row action button and overlays the table without changing row height.

Mobile row action:

- Credit mode expanded card shows four outline buttons in two columns.
- `加款` maps to row operation type `1`.
- `扣款` maps to row operation type `2`.
- `編輯` maps to row operation type `4`.
- `查看下級` maps to row operation type `3`.
- Cash mode follows the supplied screenshot note: hide plus, minus, and more icon unless a later cash-mode screenshot says otherwise.

Add subordinate CTA:

- Label is `新增下級`.
- PC: right side of the filter row.
- Mobile: full-width orange gradient button near the bottom of the member management content.
- Opens add subordinate member flow.

## Search And Hierarchy Logic

Initial load:

1. Resolve cash wallet currency id from `useCurrencyInfo` / wallet store.
2. Fetch direct downline list with:
   - `currency_id`
   - `downline_member_account = ""`
   - `recommender_account = ""`
   - `size`
   - `offset`
3. Fetch own quota amount when credit mode and currency id exist.

Search direct downline:

1. Reset `page = 1`, `offset = 0`.
2. Save `memberAccount` to `lastSearchMemberAccount`.
3. Save `recommenderAccount` to `lastSearchRecommenderAccount`.
4. Call `getMemberAgentQuotaList`.

Search lower-level downline:

1. Active only when `showSubordinateMemberAccount` is set.
2. Reset page.
3. Save `searchSubordinateMemberAccount` to `lastSearchSubordinateMemberAccount`.
4. Call `getLowerLevelMemberAgentQuotaList` with:
   - `account = showSubordinateMemberAccount.memberId`
   - `currency_id`
   - `downline_member_account = lastSearchSubordinateMemberAccount`

View lower-level downline action:

1. Reset page data.
2. Set `showSubordinateMemberAccount = { account, memberId }`.
3. Call lower-level list API.

Back to direct list:

1. Clear `showSubordinateMemberAccount`.
2. Reset search fields and pagination.
3. Re-fetch direct downline list and quota amount.

Pagination:

- `offset = (newPage - 1) * size`
- For direct list, re-fetch `getMemberAgentQuotaList`.
- For lower-level list, re-fetch `getLowerLevelMemberAgentQuotaList`.

## Quota Add / Minus Logic

Actions from a member row:

- type `1`: add
- type `2`: minus
- type `3`: view lower-level downline
- type `4`: edit subordinate member

Opening add/minus dialog:

1. Set target account, balance, remaining quota, member-agent flag, and dialog type.
2. Reset amount.
3. Set default `dialogIncreaseItem = 0`.
4. Fetch own quota amount via `getMemberAgentQuotaAmount`.

Amount input:

- Strip non-numeric characters.
- Allow only one decimal point.
- Do not allow a leading decimal point.

Submit validation:

- Amount is required.
- Amount must be greater than `0`.
- If deducting, UI should prevent or warn when amount exceeds the selected balance/quota when this can be checked locally.

Submit payload:

- `member_account = targetAccount`
- `currency_id = cash wallet currency id`
- `amount = dialogAmount`
- `type = dialogIncreaseItem === 0 ? dialogType : dialogType + 2`

Meaning:

- point add: `1`
- point minus: `2`
- quota add: `3`
- quota minus: `4`

On success:

- Close dialog.
- Reset `dialogIncreaseItem` to `0`.
- Re-fetch current visible member list.
- Re-fetch own quota amount.
- Show success toast.

## Add / Edit Subordinate Member Logic

Open add subordinate member:

- Set `showAddSubordinateStatus = true`.
- `memberAgentCustomizeColumnId = 0`.
- Fetch customize columns with `{ type: "register" }`.
- Fetch recommender list.
- Fetch tag list.

Open edit subordinate member:

- Set `showAddSubordinateStatus = true`.
- Set `memberAgentCustomizeColumnId = memberId`.
- Fetch customize columns with `{ type: "manage" }`.
- Fetch member info.
- Fetch tag list.

Customize column normalization:

- For select columns:
  - `member_level`: use current locale label.
  - `country`: keep original value label.
  - Other select labels use `member_customize_column.<label>`.
- Column label:
  - Prefer `column.lang[currentLocale]`.
  - Fallback to `member.register.<column_name>`.
- Initial form:
  - Every customize column key defaults to `null`.
  - `ref_account` defaults to current member agent account when adding.
  - `is_enabled = false`
  - `is_member_agent = false`
  - `is_blocked = false`

Required validation:

- All columns with `required = true` must be filled before create/update.
- If any required value is missing, show the existing "must not be empty" toast and do not submit.

Create payload:

- Spread `memberAgentCustomizeColumnData`.
- Convert `ref_account` display account to matching recommender member id if needed.
- Add `label` as selected tag ids.

Update payload:

- Include `member_id = originalMemberAgentCustomizeColumnData.id`.
- Spread normalized form data.
- Add `label` as selected tag ids.

After create/update success:

- Return to list mode.
- Reset add/edit form state.
- Re-fetch member list and quota amount.

## Empty, Loading, And Error States

- Show table loading while list or mutation requests are pending.
- Preserve existing list rows until a new search starts, then clear rows to avoid stale results.
- Empty state uses existing `BaseNoData` / `NoData` pattern.
- API errors use the shared API error handler plus local toast only for validation messages.

## Acceptance Criteria

- Member management is reachable from member action and member aside.
- Direct and lower-level member list searches match old main behavior.
- Add/minus point and quota payload type mapping matches old main behavior.
- Add/edit subordinate member uses customize columns, recommender dropdown, and tag selection.
- Pagination preserves last successful search parameters.
- Mobile member-center back behavior remains consistent with existing member pages.
