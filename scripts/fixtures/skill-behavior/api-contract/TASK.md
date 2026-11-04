# Author the delivery settings spec

Follow the actual spec-driven workflow snapshot in `guidance/SKILL.md` and its template. Author a canonical `spec.md` using the two authoritative local sources under `sources/`. This task authorizes spec authoring only. No implementation, fallback, scope reduction, handoff approval, or Git action is approved.

Keep the required delivery setting as REQ-001 so it is easy to hand off later. Record source anchors, actual contract evidence, acceptance/verification plans, readiness, completion state, and any blocker notification. Notify the user in your task response as required by the workflow when you discover a material contract gap; a line inside the spec is not a user-facing notification.

Only create `spec.md` and optional `NOTES.md`. Check the authored spec with the existing checker at `{{AI_CONFIG_ROOT}}/scripts/check-spec.js`, including its readiness gate, and report the actual outcomes. This is a fixture spec and cannot establish API or persistence acceptance.
