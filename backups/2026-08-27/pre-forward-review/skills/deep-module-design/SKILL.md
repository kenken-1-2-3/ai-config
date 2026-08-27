---
name: deep-module-design
description: Use when the user asks to design or improve a module interface, callers must understand too many implementation details, related behavior is scattered across many files, or architecture makes testing and repeated changes difficult. Do not use for ordinary multi-file implementation, local cleanup, a known small refactor, or when a narrower project-specific extraction or design skill owns the same outcome.
---

# Deep-module Design

Reduce the amount of complexity each caller must understand by placing substantial, coherent behavior behind a small, stable, testable interface. Fewer files or fewer lines are not goals by themselves.

## Scope and precedence

- Use this for architecture and interface judgment, not as a daily implementation ritual.
- A narrower project-specific extraction or design workflow takes precedence. Do not stack both as primary skills for the same immediate outcome.
- Analyze and propose by default. Refactor only when the user asks to change or build the code.
- Apply YAGNI: optimize for active callers and demonstrated change pressure, not speculative future reuse.

## Read the pressure, not just the file count

Inspect the relevant callers, callees, public contracts, tests, and current rules. Read change history or ADRs only when they can explain a boundary.

Look for evidence of a shallow module:

- callers repeat ordering, validation, error, configuration, or cleanup knowledge;
- one behavior change requires shotgun edits across unrelated callers;
- callers reach through several layers or manipulate internal state directly;
- tests must reproduce implementation details instead of asserting a stable contract; or
- the public surface is large relative to the useful behavior it hides.

Multiple files alone are not evidence. A cohesive pipeline may legitimately span files while presenting one deep interface.

## Design pass

1. Name the complexity that should move behind the boundary and the callers that should stop knowing it.
2. Define the smallest useful contract: inputs, outputs, errors, lifecycle, and invariants.
3. Identify what remains intentionally outside the module.
4. If the interface is genuinely unsettled, compare at least two viable boundaries. Otherwise recommend the direct minimal deepening without manufacturing alternatives.
5. Evaluate each viable option against caller burden, implementation locality, test seam, compatibility, migration cost, and likely repeated changes.
6. Prefer a staged migration when changing the contract atomically would create unnecessary risk.

## Handoff

Report the observed design pressure, recommended boundary, proposed interface, hidden responsibilities, affected callers, compatibility or migration plan, verification seam, and explicit non-goals. Distinguish repository evidence from architectural inference.

Do not silently turn this analysis into a broad refactor, rename sweep, new abstraction hierarchy, or framework migration.
