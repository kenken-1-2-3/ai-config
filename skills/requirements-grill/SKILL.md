---
name: requirements-grill
description: Use when a requested product or code change still has material unresolved human decisions after scoped source and repository discovery—for example, two defensible interpretations would change observable behavior, files, data, permissions, scope, or acceptance. Do not use when an approved, internally consistent, and sufficiently complete spec or acceptance criteria resolve the requested outcome, ambiguity is discoverable from authoritative sources, or the request is a small mechanical edit, known-root-cause fix, repository or release operation, status check, or lookup.
---

# Requirements Grill

Turn consequential ambiguity into explicit decisions before writing a spec or implementation. This is a decision gate, not a mandatory interview.

## Overrides

- The user can force this workflow by naming `$requirements-grill` or directly asking to grill or challenge the requirements.
- The user can skip it by saying to proceed without a grill. Record only the assumptions that materially affect the requested outcome, then continue.
- Direct user instructions and authoritative approved sources outrank inferred concerns.

## Automatic gate

Before asking a question, inspect the scoped authoritative inputs already available: the ticket, Figma, approved spec, repository behavior, related tests, and project rules. Do not ask the user for a fact that those sources can resolve safely.

Approval alone does not make silence authoritative. Treat an omitted material decision as unresolved unless the source deliberately defines an inherited behavior or default that covers it.

Automatically continue with this workflow only when all of the following are true:

1. A human product, policy, scope, or tradeoff decision remains unresolved after discovery.
2. At least two defensible answers would materially change observable behavior, touched files, persisted data, permissions, scope, or acceptance criteria.
3. Choosing the wrong default would create meaningful rework, product risk, data risk, or an incompatible contract.

If any condition fails, exit immediately. Briefly state the resolved fact or material assumption when useful, then route to the workflow that owns the requested outcome. Ordinary implementation detail is not a reason to grill.

## Question loop

Ask compact, dependency-aware rounds:

1. Start with the decision that blocks the most downstream choices.
2. Ask one to three questions at a time. Do not ask a dependent question before its prerequisite is decided.
3. For each question, give a recommended answer and one short consequence or tradeoff. Avoid a menu of cosmetic choices.
4. Convert the answer into a testable decision, then check whether any remaining ambiguity still passes the automatic gate.
5. Stop as soon as implementation or spec work can proceed without a consequential guess.

Cover only dimensions that actually matter: states, roles and permissions, success and failure behavior, persistence, compatibility, scope boundaries, and acceptance. Never invent new requirements or widen the task to make the interview feel complete.

## Handoff

Return a concise decision record in the conversation:

- locked decisions;
- unresolved blockers, if any;
- explicit out-of-scope items;
- source anchors used to resolve facts; and
- the recommended next workflow.

While a blocking decision remains, do not implement, edit a spec, create an ADR, or change product documentation during the grill.

The original build, change, or spec request remains authorization after the final blocking decision is answered. Once the automatic gate no longer matches, exit the grill and continue with the workflow that owns that original request without asking for redundant confirmation, provided no new permission or consequential decision is required.
