# Delegation Prompt Templates

Fill the `{{slots}}`, delete unused optional lines, dispatch via the Agent tool. Model choice and escalation: ops/model-dispatch.md §3/§6. Every template already embeds the three required parts (goal+why, acceptance criteria, report format) — do not strip them.

Shared rules for all templates:
- Give absolute paths. The agent does not inherit your conversation.
- Put "do NOT" constraints explicitly (agents can't infer scope from vibes).
- If the deliverable is long, have the agent write a file and reply with the path.

---

## T1 — Search / locate (agent type: `Explore`, model: sonnet; haiku only for "list files matching X")

```
Goal: find {{what}} in {{repo path(s)}}. This will be used to {{why — e.g. decide where a fix belongs}}.
Search breadth: {{medium | very thorough}}.
Look for: {{synonyms, naming conventions, related terms — give 3+ variants}}.
Read-only. Do not modify anything.

Acceptance criteria:
- Every claim carries a file:line reference you actually opened.
- If nothing is found, say "not found" and list where you looked — do not guess.

Report format (nothing else):
1. Direct answer in ≤3 sentences.
2. Locations: `path:line` — one-line role of each.
3. Unverified/ambiguous leftovers.
```

## T2 — Implementation (agent type: `general-purpose` or `claude`, model: sonnet)

```
Goal: implement {{feature/fix}} in {{repo path}}. Motivation: {{why / ticket / spec path}}.
Spec / source of truth: {{path to spec, or inline requirement}}.
Scope: edit only under {{allowed dirs/files}}. Do NOT touch {{forbidden: e.g. src/common/, shared config, locale files, environment.json}}.
Project rules: read {{repo}}/CLAUDE.local.md first and obey it (verification commands, i18n policy, banned commands).
{{Optional: worked example of the pattern to follow — file:line of a similar existing implementation.}}

Acceptance criteria:
- {{checkable behavior 1}}
- {{checkable behavior 2}}
- Verification: run {{exact command}} → passes. Do not claim done without running it.
- `git status` shows changes only inside the allowed scope. No commits.

Report format:
1. What changed: file list with one line each.
2. Verification: exact command + trimmed output proving it ran.
3. Deviations from spec / anything NOT verified (required section, even if "none").
```

## T3 — Refactor / batch pattern application (model: haiku or sonnet — pattern must be fully specified)

```
Goal: apply this pattern across {{scope}}. Motivation: {{why}}.
Pattern:
  BEFORE: {{exact code/structure}}
  AFTER:  {{exact code/structure}}
Worked example already done: {{file:line}} — replicate exactly this transformation.
Behavior must not change. If a site/file doesn't match the pattern cleanly, SKIP it and list it — do not improvise a variant.
Scope: {{file list or glob}}. Do NOT touch anything else.

Acceptance criteria:
- Every listed file either transformed or in the skipped list with a reason.
- Verification: {{exact command}} passes after the batch.

Report format: transformed count + file list; skipped list with reasons; verification output.
```

## T4 — Research (agent type: `general-purpose`, model: sonnet; opus if the question is judgment-heavy)

```
Question: {{precise question}}. Decision it feeds: {{what will be decided with the answer}}.
Sources: {{web / specific docs / repo paths}}. Prefer primary sources; note publish dates.
Deadline behavior: if the answer can't be established, report that with what you found — do not fill gaps with plausible-sounding text.

Acceptance criteria:
- Every factual claim has a source (URL or file:line).
- Explicitly separates: established facts / inference / unknown.

Report format: answer in ≤5 sentences → facts with sources → inference (labeled) → unknowns. If >30 lines, write to {{file path}} and reply with path + 5-line summary.
```

## T5 — Review / verification (fresh context — never the agent that produced the work; model: sonnet, opus for risky changes)

```
You are reviewing work you did not produce. Be adversarial: your job is to find problems, not to approve.
Deliverable under review: {{diff / file paths / branch}}.
Contract it must satisfy: {{paste the acceptance criteria / spec path VERBATIM — not a summary}}.

Check, in order:
1. Each contract item: PASS/FAIL with file:line evidence. Exercise behavior where possible (run {{command}}), don't just read.
2. Scope: any changes outside {{allowed scope}}? Any unrelated hunks?
3. Regressions: what existing behavior could this break? Name the mechanism, not vibes.
4. For docs/specs/rules: would a weak model misread any sentence? Quote the ambiguous ones.

Report format:
- Verdict: APPROVE / FIX FIRST (with blocking items) — no middle ground.
- Item-by-item PASS/FAIL table.
- Non-blocking observations (max 5, ranked).
- What you verified vs did NOT verify (required — a review without this section is invalid).
Do not fix anything yourself unless the dispatch explicitly says so.
```
