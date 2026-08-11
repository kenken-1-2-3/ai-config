---
name: locale-entry-maintenance
description: Use when the user asks to add or update specific Locale Manager locale keys, or delete an exact locale key, or when implementing a remote-i18n requirement reveals a missing key that must be searched, reused, or created in the frontend/member or backstage/agent dataset. Covers English, Traditional Chinese, and Simplified Chinese copy. Do not use for whole-dataset Auto Translate monitoring.
---

# Locale Entry Maintenance

Maintain specific keys through the Locale Manager API. Keep writes bounded and report only read-back evidence as complete.

## Scope and routing

- Trigger on a locale key/path, supplied copy, or direct add/update/delete wording.
- Trigger when consumer-project implementation discovers a missing remote-i18n key, even if the user did not separately ask to maintain Locale Manager data.
- Resolve frontend/member versus backstage/agent from the request or current page; ask only when genuinely unknown.
- Whole-dataset Auto Translate monitoring is outside this CRUD skill unless the user also requests specific key changes.
- A Google Sheets-backed API does not trigger the standalone spreadsheet skill. Never edit the backing sheet or generated CSV as the main workflow.

## API facts

Treat `src/composables/useI18n.ts` as the API truth source:

- Fetch: `GET apiUrl?all=true`
- Add/update: `POST apiUrl` with `{ path, en, "zh-TW", "zh-CN", ... }` or an array
- Delete: `GET apiUrl?method=DELETE&path=<key>`

Priority locales are `en`, `zh-TW`, and `zh-CN`.

When running from a consumer project, locate `whitelabel-gsi-locale-manager` through `~/wow/ai-config/projects.json` and use its API integration. Do not expect API code or locale JSON inside the consumer repository.

## Requirement-driven missing-key flow

1. Inventory the requirement's user-facing copy and target frontend/member or backstage/agent dataset.
2. Search current consumer-repo key usage and neighboring namespaces, then search shared or legacy locale sources and the target remote dataset by exact key and normalized copy.
3. Reuse a compatible key when meaning and translations match. Do not create a feature-specific duplicate or reuse a misleading partial match.
4. If none exists, derive the key from existing neighboring namespace conventions and create it through the bounded add flow below. Use only requirement-supplied or user-confirmed `en`, `zh-TW`, and `zh-CN` copy; ask only for a missing value.
5. Return a per-requirement mapping with target dataset, `REUSED`/`CREATED`/`BLOCKED`, key, all priority-locale values, and read-back evidence. Never report `CREATED` from a proposed payload alone.

## Add or update

1. Do not request another approval when target and copy are clear.
2. Fetch the target dataset once as a full snapshot before writing. Build local exact-key and normalized-copy indexes; do not re-fetch per key.
3. Detect exact keys and reusable exact/near copy matches. Compute the complete delta before writing.
4. Update only requested values on existing keys. Create absent keys only when no compatible duplicate exists.
5. Do not invent missing copy. Infer a single supplied Chinese script only when safe; otherwise ask for the missing value.
6. Send only the delta in batches of at most 10 entries.
7. After every successful batch, perform one read-back and verify only the affected keys, even if the API returns the full dataset. For ambiguous or quota failures, use the bounded read-back rules below.

## Failure and resume contract

- For an ambiguous non-quota response, perform one read-back and classify no write, partial write, or complete write. Allow at most one retry per operation, and retry only the remaining delta.
- Treat `單日叫用下列服務的次數過多：translate` or an equivalent Google Apps Script Translate daily-quota response as quota exhaustion.
- On the first Translate quota error, stop issuing new writes. Perform one read-back, then report persisted and remaining entries as a resumable remaining-key list. Do not shrink batches or try single-key writes that turn.
- On a later resume turn, fetch a fresh target-dataset snapshot, recompute the delta from the remaining-key list, and send only keys that are still missing or mismatched under the same batch and quota limits.

## Delete

Fetch once, confirm the exact key, delete by key, then verify absence. If absent initially, report that no deletion occurred. Never delete by copy text alone.

## Completion report

- Report target set, verified persisted keys, exact remaining keys, and final values or deletion result.
- For add/update, require every requested `en`, `zh-TW`, and `zh-CN` value to match read-back.
- Report `COMPLETE` only when all requested keys pass. Otherwise report `PARTIAL` or `BLOCKED` with the resumable remaining-key list.
- Never expose API URLs, credentials, or tokens; never commit `.env`, generated locale output, or temporary exports.
