# I18n Key-First Handoff Design

## Goal

Make new user-facing copy in the agent-side Dashboard and both member-side Multiverse repositories use an i18n key immediately. Missing remote locale data must not cause temporary hardcoded Chinese or a late translation-key question.

## Scope

This behavior applies to:

- `Whitelabel_GSI_Dashboard` as the agent-side / backstage locale set.
- `Whitelabel_GSI_Platform_Multiverse` as the member-side / frontend locale set.
- `whitelabel-gsi-platform-multiverse-nx` as the member-side / frontend locale set.

It covers labels, buttons, placeholders, tooltips, modal copy, validation messages, error messages, empty states, and other user-visible UI text. It does not cover developer logs, test descriptions, code comments, API enum values, or text that is not shown to users.

## Chosen Approach

Extend the existing shared multilingual section in `rules/wow_gsi.md`, which all three frontend repositories already load. Update the conflicting NX migration instruction in `rules/multiverse_nx.md`.

Do not add a new auto-loaded rule, change `projects.json`, modify `install.sh`, or change skill installation and loading.

## Required Workflow

1. Search the current repository and relevant shared or legacy i18n sources for a semantically compatible existing key.
2. Reuse an existing key only when its meaning and translations match the requested copy.
3. When no compatible key exists:
   - derive a proposed key from the nearest existing module namespace and naming convention;
   - put that key into the implementation immediately using the repository's existing `$t`, `t`, or equivalent i18n pattern;
   - do not hardcode Chinese, English, or another user-facing language;
   - do not add a literal fallback string;
   - do not block implementation merely because the remote locale entry is not available yet.
4. If the requirement provides only one language, generate proposed `en`, `zh-TW`, and `zh-CN` values. Mark them as proposed in the final report.
5. Ask before implementation only when the product meaning or intended wording itself is ambiguous. A missing key alone is not an ambiguity and must not trigger a question.

## Completion Report Contract

Every completed frontend task must include a `Locale keys to add` section.

For each newly proposed key, report:

| Target | Key | en | zh-TW | zh-CN | Usage |
| --- | --- | --- | --- | --- | --- |
| agent-side / backstage or member-side / frontend | exact key | proposed value | proposed value | proposed value | file, component, or UI location |

Reused existing keys are not listed as keys to add. If no new key is required, report exactly: `本次無需新增翻譯 key`.

The implementation task only prepares and reports proposed keys. It must not mutate Locale Manager data unless the user separately asks to add or update those entries.

## NX Migration Compatibility

NX migrations continue to reuse original Multiverse keys when they are compatible. If required copy has no matching original key, follow the shared key-first workflow: create a proposed key in code and report it. Do not stop solely to ask how to handle a missing key.

## Validation Scenarios

- New Dashboard button with Chinese-only source copy: implementation uses a proposed backstage key and reports all three proposed translations.
- New member-side empty state with no existing key: implementation uses a proposed frontend key without a literal fallback and reports it.
- Compatible key already exists: implementation reuses it and reports no new key for that copy.
- Product wording is genuinely unclear: agent asks before choosing the copy or key.
- NX migration lacks an original key: implementation follows the proposed-key workflow instead of stopping.
