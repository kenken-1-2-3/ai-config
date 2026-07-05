# Judgment Rubrics

Decision rules for calls that are easy to get wrong. Each has a trigger, a test, and one positive + one negative example. Examples use real situations from the ~/wow repos.

## 1. When to escalate the model (or yourself → ask for a stronger session)

**Test** — escalate when ANY of:
- Same subtask failed twice with different-looking errors (see dispatch ladder in ops/model-dispatch.md §6).
- You cannot state, in one sentence each, (a) what the code currently does and (b) what it should do. If you can't, the problem is understanding, not effort.
- The fix you're considering touches code whose purpose you can't explain.

**Do**: escalate WITH the failure trail (attempts, errors, ruled-out causes). **Not**: retry the same approach with small variations a third time.

- ✅ Escalate: a Multiverse bug reproduces in template `set_r022` but the suspect code is in `src/common/`, and two targeted fixes broke a different template. This is cross-tenant coupling — hand to `opus` with both diffs and which templates broke.
- ❌ Don't escalate: `pnpm build` fails with a clear "module not found" pointing at a typo'd import you just wrote. That's a mechanical fix; escalating wastes a round trip.

## 2. When it is actually done

**Test** — ALL must hold:
1. Every acceptance criterion checked individually, against the original wording (not your paraphrase).
2. Verification actually executed (command run, output seen; or fresh agent read the file back) — "should work" fails this test.
3. Anything skipped/deviated is stated in the final report, not silently dropped.

- ✅ Done: spec said "announcement targets support member tags AND levels"; you ran the dev server, exercised both filters, and the fresh-context reviewer confirmed both against the spec checklist; report notes tests were written but unstaged per rules.
- ❌ Not done: code compiles and the diff "looks complete", but the spec's checklist item "empty-tag list falls back to all members" was never exercised. Compiling is not an acceptance criterion.

## 3. When to stop and ask the user

**Test** — stop when ANY of (and otherwise do NOT stop — reversible in-scope decisions are yours):
- The action is on the hard-stop list (`~/.claude/CLAUDE.md`, Always-on rule 2: deploy, merge, push, commit, Jira writes, shared/cross-site code for single-site requests, deleting others' files).
- Two defensible interpretations of the request lead to **different files being changed**.
- The task needs wording/translation/business intent you'd have to invent (i18n copy, which SITS code maps to which client, whether a behavior change is wanted for all sites).
- Second opinions from independent agents disagree on a high-risk call.

**Batch the questions** — collect everything unclear, ask once, keep working on the parts that aren't blocked.

- ✅ Ask: request says "fix the login button for R017" but the button component lives in `libs/shared/ui-layer/` used by r001 too. Cross-site impact → stop, present the two isolation options, ask.
- ❌ Don't ask: "should I use a `for` loop or `.map()` here?" or "may I read the router file?" — reversible, in scope, no user information needed. Just decide.

## 4. Signals the direction is wrong (change path, don't retry)

**Test** — any TWO of these together mean stop digging:
- Each fix creates a new failure elsewhere (whack-a-mole).
- You're editing files further and further from where the symptom is.
- The workaround requires disabling/bypassing something (a lint rule, a type, a guard) you don't fully understand.
- You're about to modify generated files, lockfiles, or vendored code to make an error go away.
- The diff keeps growing but the acceptance criteria checked-off count doesn't.

**Do**: write down (a) original goal, (b) current hypothesis, (c) evidence for/against; then either pick a different hypothesis or escalate per §1. **Not**: one more variation of the same edit.

- ✅ Change path: to fix one template's layout you've now touched 4 files in `src/common/` and two other templates render wrong. Revert, re-read rules/multiverse.md, isolate in `template/<siteKey>/` instead.
- ❌ Not a wrong-direction signal: the first attempt failed with a clear error message you haven't acted on yet. One failure with unexploited information = keep going.

## 5. Quality floor — the minimum bar before any "completed" claim

Checklist (all repos; project rules may add more, never less):

- [ ] `git diff` reviewed hunk by hunk; every hunk maps to the requirement. Unrelated hunks reverted.
- [ ] No edits outside the agreed scope dirs (for Multiverse: no `src/common/` unless explicitly approved).
- [ ] Smallest relevant validation ran and passed; command + result quoted in the report. (Respect per-repo bans: no `tsc --noEmit` in Multiverse/nx/Dashboard — in Dashboard use its `ts-check` script instead; see each repo's rules for the approved commands.)
- [ ] New user-facing strings went through the i18n rules (remote keys; never invented translations — rubric §3 applies).
- [ ] Fresh-context read-back done for any file whose content IS the deliverable (specs, rules, docs).
- [ ] Report states what was NOT verified.

## 6. Honest limits (what this file cannot fix)

Rubrics recover execution quality, not taste. For genuinely ambiguous product/design/wording judgment ("does this interaction feel right", "which of these two valid architectures"), a weak model following this file will still be mediocre. In those cases the correct outputs are, in order: (1) present 2–3 options with trade-offs and ask the user; (2) escalate to the strongest available model for a recommendation; (3) say plainly "this is a taste call I can't make reliably". Producing a confident single answer is the failure mode.
