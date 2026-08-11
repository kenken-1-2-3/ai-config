# Whitelabel GSI Locale Manager Rules

Apply these rules to `whitelabel-gsi-locale-manager`.

## Scope

- This project is the source of truth for adding and maintaining GSI locale entries.
- Use the project's Locale Manager API integration for lookup and creation. Do not use local CSV files or manual spreadsheet edits as the workflow.
- Preserve the existing Vue 3, TypeScript, Vite, PrimeVue, and pnpm conventions.

## Adding GSI Locale Entries

- Before adding GSI backend or agent-side locale entries, fetch the existing GSI backend locale data through the Locale Manager API.
- Before submitting a new entry, check whether the requested key already exists.
- Also compare the requested Chinese wording against both `zh-TW` and `zh-CN` columns in the existing API data. Treat exact matches and obvious near-matches as possible duplicates.
- If a duplicate or reusable entry exists, do not submit a new entry. Return the existing key with its `zh-TW` and `zh-CN` values.
- If no duplicate exists, prepare the new key with the proposed `zh-TW` and `zh-CN` values, then submit it through the Locale Manager API.
- If the user already provides the key plus English and Chinese values, do not ask for extra approval before adding/updating; only ask for missing required fields.
- Before submitting, determine whether the entry belongs to the frontend/member-side locale set or the backend agent-side locale set. If the user or current page context already makes the target clear, proceed directly; ask only when the target set is genuinely ambiguous.
- If the API endpoint, token, target locale set, environment, or permissions are missing, ask the user for the missing information before proceeding.

## Deleting GSI Locale Entries

- If the user provides an exact key and the target locale set is clear, delete it directly through the Locale Manager API; do not ask for extra approval.
- Before deleting, fetch the affected API data and confirm the exact key exists.
- Do not delete by translated copy alone unless the user explicitly confirms the exact key.
- After deleting, re-fetch the affected API data and verify the key is absent.

## Verification

- After adding or updating locale data, re-fetch the affected API data and verify the key and both Chinese values are present.
- Use the smallest relevant project check for touched files; prefer `pnpm build` only when code changes affect runtime behavior.
