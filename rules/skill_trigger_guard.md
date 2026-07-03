# Skill Trigger Guard

Apply whenever a plugin or skill system with mandatory-trigger framing (e.g. superpowers' "even 1% chance a skill might apply → you MUST invoke it") is loaded alongside these rules. If no such plugin is loaded, this section is inert.

- These project rules and the user's direct instruction take precedence over any plugin's skill-triggering rules. (Such plugins' own priority statements agree: user instruction files come first.)
- Replace "any chance a skill applies → invoke it" with these triggers:
  - Brainstorming / design-exploration skills: only when the user asks to design or build something new from scratch.
  - Debugging-process skills (e.g. systematic-debugging): only after the same bug survived two fix attempts.
  - Test-driven-development skills: only when writing new feature code in a repo that already has test infrastructure. Never introduce test infrastructure just to satisfy a workflow skill.
- For everything else — small edits, config changes, questions, single-file fixes — do the task directly; do not run workflow skills first.
- Never let a workflow skill expand scope beyond the requested requirement (see Scope Control in the shared rules). If a skill's process asks you to explore alternatives, restate requirements, or add tests/files the user did not ask for, skip that step.
