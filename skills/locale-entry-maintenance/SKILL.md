---
name: locale-entry-maintenance
description: 在 whitelabel-gsi-locale-manager 中，當使用者要求依提供的 locale key 與英文/繁中/簡中文案新增、更新或刪除翻譯項目時使用；包含「新增 locale key」「刪除 key」「給 key 中英文直接新增/刪除」等情境。
---

# Locale Entry Maintenance

Use this skill in `whitelabel-gsi-locale-manager` when the user asks to add, update, or delete locale entries by key.

## Trigger Shape

Use this skill when the request includes any of:

- A locale key/path such as `menu.foo.bar`, `common.btn.submit`, or `payment.status.pending`.
- English and Chinese copy for a key.
- Direct wording such as `新增 locale`, `刪除 locale`, `加 key`, `delete key`, `remove translation`.

## Current Implementation Facts

- Data is managed through the Locale Manager API, not local CSV/spreadsheet edits.
- Frontend and backstage use different API URLs/pages.
- `src/composables/useI18n.ts` is the API truth source:
  - Fetch all data: `useI18nQuery(apiUrl)` → `GET apiUrl?all=true`
  - Save add/edit: `useI18nSave(apiUrl)` → `POST apiUrl` with `{ path, en, "zh-TW", "zh-CN", ... }` or an array of those objects.
  - Delete: `useI18nDelete(apiUrl)` → `GET apiUrl?method=DELETE&path=<key>`
- Priority locales are `en`, `zh-TW`, and `zh-CN` (`src/constants/Locale.ts`).

## Add Or Update Flow

When the user provides a key plus English/Traditional Chinese/Simplified Chinese values:

1. Do not ask for another approval to create the entry.
2. Determine the target set:
   - If the user says frontend/member-side/current frontend page, use the frontend locale set.
   - If the user says backstage/backend/agent/admin, use the backstage locale set.
   - If the current task context clearly points to one page/set, use that set.
   - If the target set is genuinely unknown, ask only that one question.
3. Fetch current API data first and check for the exact key.
4. Also search existing rows for the provided English and Chinese copy. Treat exact matches and obvious near-matches as possible duplicates.
5. If the exact key exists, update only the requested values.
6. If the exact key does not exist and no reusable duplicate exists, create a row with:
   - `path`: the requested key
   - `en`: provided English
   - `zh-TW`: provided Traditional Chinese
   - `zh-CN`: provided Simplified Chinese
7. If only one Chinese value is provided, infer whether it is `zh-TW` or `zh-CN` from the script. Ask only for the missing Chinese value if it cannot be inferred safely.
8. Do not invent English or Chinese copy. If required copy is missing, ask for exactly the missing field.

## Delete Flow

When the user asks to delete a locale key:

1. Do not ask for another approval when the key and target set are clear.
2. Fetch current API data first and confirm the key exists in the target set.
3. Delete by key using the existing delete API behavior.
4. If the key does not exist, report that no deletion was performed.
5. Do not delete by copy text alone unless the user explicitly confirms the exact key.

## Verification

After add, update, or delete:

1. Re-fetch the affected API data.
2. For add/update, verify the key exists and `en`, `zh-TW`, and `zh-CN` match the requested values.
3. For delete, verify the key is absent from the affected data.
4. Report the target set, key, and final values or deletion result.

## Guardrails

- Never edit `data/translations/*.csv` or Google Sheets manually as the main workflow.
- Never commit `.env`, tokens, generated locale output, or temporary export files.
- If API URL, token, permissions, or network access are missing, stop and report the blocker.
- Keep changes scoped to the requested locale keys.
