---
name: diagnosing-bugs
description: Use when the user explicitly asks for diagnosis or root cause, reports an intermittent bug or performance regression, initial scoped evidence does not localize the cause, or the same symptom survived two materially different fix attempts. Do not use for a known-root-cause mechanical fix, a direct compiler or linter error with an obvious correction, requirements or design questions, or when a narrower project-specific skill owns the same bug surface.
---

# Diagnosing Bugs

Build evidence that can disprove a cause before changing production code. This is the generic fallback; a narrower project-specific workflow takes precedence, and the two must not be stacked as primary skills for the same outcome.

## Respect the requested authority

- If the user asks only to diagnose, stop at supported root cause and recommended remediation. Do not implement the fix.
- If the user asks to fix, diagnosis authorizes only the smallest change supported by evidence.
- Never expose credentials, tokens, private payloads, or personal data in logs or reports. Redact before capturing evidence.

## Evidence loop

1. Define the exact symptom, expected result, affected environment, and last known good baseline. Separate observations from assumptions.
2. Establish the tightest existing feedback loop that can turn red: a focused test, runtime reproduction, browser or network trace, log query, or deterministic command. Do not introduce test infrastructure solely to satisfy this workflow.
3. If the issue cannot be reproduced, list the bounded attempts and request only the exact missing artifact, access, input, or timing evidence. Do not declare a root cause from an untested hunch.
4. Minimize the reproduction by removing one variable at a time while preserving the symptom.
5. Form two to four ranked, falsifiable hypotheses when the problem warrants alternatives. For each, name the observation that would support it and the observation that would refute it.
6. Add the smallest one-variable observation needed to distinguish the leading hypotheses. Mark temporary instrumentation with a searchable tag such as `[DEBUG-7F3A]`.
7. Change the hypothesis when evidence refutes it. After two failed correction rounds, stop patching the same theory and report the evidence gap or a genuinely different hypothesis.

## Fix and regression

When implementation is authorized:

1. Fix the earliest proven fault, not a downstream symptom.
2. Add or update a regression check at an existing seam when it can actually detect the fault. Do not create a fake seam or broad test framework for ceremony.
3. Re-run the original reproduction and the closest affected verification.
4. Remove temporary instrumentation and throwaway artifacts before completion.

## Report

State the reproduced symptom, evidence collected, confirmed root cause or remaining ranked hypotheses, changed files if any, regression evidence, and residual uncertainty. Label an unverified conclusion as such.
