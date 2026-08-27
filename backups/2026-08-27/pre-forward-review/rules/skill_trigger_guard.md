# Skill Trigger Guard

Apply whenever a plugin or skill system with mandatory-trigger framing (e.g. superpowers' "even 1% chance a skill might apply → you MUST invoke it") is loaded alongside these rules. If no such plugin is loaded, this section is inert.

- These project rules and the user's direct instruction take precedence over any plugin's skill-triggering rules. (Such plugins' own priority statements agree: user instruction files come first.)
- Replace "any chance a skill applies → invoke it" with these triggers:
  - Brainstorming / design-exploration skills: only when the user asks to design or build something new from scratch.
  - Plugin debugging-process skills with broad "any bug" triggers (e.g. systematic-debugging): only after the same bug survived two fix attempts. The managed `diagnosing-bugs` skill instead follows its own narrow trigger contract.
  - Test-driven-development skills: only when writing new feature code in a repo that already has test infrastructure. Never introduce test infrastructure just to satisfy a workflow skill.
- For everything else — small edits, config changes, questions, single-file fixes — do the task directly; do not run workflow skills first.
- Never let a workflow skill expand scope beyond the requested requirement (see Scope Control in the shared rules). If a skill's process asks you to explore alternatives, restate requirements, or add tests/files the user did not ask for, skip that step.

## Per-turn routing contract

- A **primary workflow skill** owns the judgment and sequence for the immediate user outcome. A **capability skill** only enables a surface or artifact actually used in the turn, such as Chrome, an in-app browser, or a PDF.
- Select **zero or one primary workflow skill per turn**. Add capability skills only when their corresponding tool or artifact will actually be used.
- Re-evaluate from the newest user request. Do not inherit a primary skill merely because it applied to an earlier turn or phase.
- Branch switching, commit, push, deploy, status questions, and simple repository lookups are fresh turn shapes. They do not retain spec, pixel, TDD, review, or delegation workflows unless the newest request independently triggers one.
- When two workflow skills appear applicable, choose the one that owns the immediate outcome. Load a second only when it governs a separate necessary operation that will occur in the same turn.

## General workflow precedence

- `requirements-grill` owns pre-spec or pre-implementation clarification only when its material-decision gate matches after scoped source and repository discovery. If authoritative sources resolve the ambiguity or an approved and internally consistent spec exists, do not load it.
- A narrower project-specific workflow wins over generic `diagnosing-bugs` or `deep-module-design` for the same immediate outcome. Do not stack both primary skills.
- `deep-module-design` produces architecture and interface judgment unless the user asks for implementation. An ordinary multi-file edit is not a trigger.
- The user may explicitly force or skip `requirements-grill`; either instruction overrides its automatic gate for that request.

## Ticket and branch continuity

- The default assumption is that work in the same project/repository during one session belongs to one ticket. Treat follow-up edits as part of that ticket unless the user explicitly identifies a new ticket or unrelated requirement.
- Use one task work branch per project. Once that branch is selected or created, make all subsequent implementation, bug fixes, review follow-ups, and verification-driven changes for the ticket on the same work branch.
- Do not create or switch to a new branch or worktree solely because the ticket moves between spec, implementation, review, QA, fixes, or release prep. Re-evaluating skill routing does not imply a branch change.
- Open or switch to another work branch only when the user starts a different ticket in the same project, work moves to a different project/repository, or the user explicitly requests a different branch or worktree. If this distinction is unclear and a branch change would be required, stop and ask.
- If an approved merge or promotion temporarily switches to `develop`, `staging`, or `main`, return to the established work branch before making follow-up code changes. Do not implement ticket fixes directly on a target branch unless the user explicitly requests it.
