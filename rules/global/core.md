- When the user requests a session retrospective or rework/token-efficiency audit, use `ops/maintenance.md` §3's retrospective triage; do not run a retrospective after every routine task.
- When asked to draft or update a PR/MR description, read `ops/pr-writing.md`; writing guidance does not authorize publication or Git operations.

## Login Testing

- (2026-11-04, reaffirming 2026-10-07) Authorized testing on local, dev/develop or stg/staging includes any required test login; the task need not explicitly request login testing. Use the available authorized test account, click login, and accept login-related confirmation/consent prompts without asking again, including first login and re-login after session expiry. Do not request fresh permission merely because the test moves between dev and stg or continues in a later chat. Why: the user grants standing consent for these test login steps. Evidence: user「dev stg就不用一直問我確認登入了 授權你自己登入測試」; earlier「登入測試 本機 dev stg都自己點擊同意登入 不需要再詢問我」.
- This consent covers the test login flow only; it does not extend local-only credentials to remote environments or authorize unrelated account changes, permission grants or production actions. If required credentials or a user-only verification step are unavailable, report the specific blocker instead of asking for login permission again.
