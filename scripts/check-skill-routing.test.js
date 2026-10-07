#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { CONTRACTS, runChecks } = require("./check-skill-routing.js");

const rootDir = path.join(__dirname, "..");

test("skill routing contracts are explicit and phase-scoped", () => {
  const issues = runChecks(rootDir);

  assert.deepEqual(
    issues,
    [],
    issues.map((issue) => `${issue.id}: ${issue.message}`).join("\n"),
  );
});

function createFixture(t) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "skill-routing-"));
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

  const fixtureFiles = new Set([
    ...CONTRACTS.map((contract) => contract.file),
    ...weakeningScenarios.map((scenario) => scenario.file),
  ]);
  for (const file of fixtureFiles) {
    const source = path.join(rootDir, file);
    const destination = path.join(fixtureRoot, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }

  return fixtureRoot;
}

// Semantic fixture mutation is independent of skill ordering and manifest formatting.
const scenarioMutators = {
  "managed workflow is duplicated in a project after global promotion": (manifest) => {
    const project = manifest.projects.find(
      (candidate) => candidate.name === "Whitelabel_GSI_Platform_Multiverse",
    );
    assert.ok(project, "named project missing from fixture");
    project.skills = [...project.skills, "requirements-grill"];
  },
};

const weakeningScenarios = [
  {
    name: "API fields alone trigger a human decision workflow",
    file: "rules/skill_trigger_guard.md",
    from: "Missing or unverified API fields alone are technical contract gaps, not unresolved human decisions that trigger `requirements-grill`;",
    to: "Missing or unverified API fields alone trigger `requirements-grill`;",
    id: "routing-operation-contract-gap",
    message: "keep API contract gaps distinct from Requirements Grill human decisions",
  },
  {
    name: "contract gap drops integration verification blocker",
    file: "rules/skill_trigger_guard.md",
    from: "keep the affected integration and API／Network／persistence verification `BLOCKED` until authoritative evidence resolves the gap.",
    to: "allow affected integration verification to pass before authoritative evidence resolves the gap.",
    id: "routing-operation-contract-gap",
    message: "retain the integration blocker for unverified API contracts",
  },
  {
    name: "shared parity vocabulary overrides the actual deliverable",
    file: "rules/skill_trigger_guard.md",
    from: "Match a skill's actual deliverable and operation, not shared vocabulary: existing-template UI parity does not automatically cover native APK, plugin, or startup parity.",
    to: "Existing-template UI parity automatically covers every native APK, plugin, or startup parity request.",
    id: "routing-operation-contract-gap",
    message: "match workflow deliverables and operations before selecting parity skills",
  },
  {
    name: "phase binding compares defaults instead of actual runtime",
    file: "rules/agent_dispatch.md",
    from: "compare its role-required model and effort with exposed actual runtime settings when available;",
    to: "compare its role-required model and effort only with configured defaults;",
    id: "dispatch-runtime-phase-contract",
    message: "compare phase-required model and effort with actual exposed runtime settings",
  },
  {
    name: "configured defaults treated as active runtime proof",
    file: "rules/agent_dispatch.md",
    from: "configured defaults are not proof of the active binding.",
    to: "configured defaults prove the active binding.",
    id: "dispatch-runtime-phase-contract",
    message: "do not treat configured defaults as active runtime evidence",
  },
  {
    name: "runtime mismatches silently ignored",
    file: "rules/agent_dispatch.md",
    from: "Use supported runtime controls to resolve a mismatch, and disclose unavailable or unverified bindings through the fallback policy below.",
    to: "Ignore mismatches and treat unavailable or unverified bindings as satisfied.",
    id: "dispatch-runtime-phase-contract",
    message: "resolve runtime mismatches or explicitly disclose missing binding evidence",
  },
  {
    name: "unknown diagnosis routed directly to execution fixes",
    file: "rules/agent_dispatch.md",
    from: "Route unknown-root-cause diagnosis to Specialist Judgment before bounded Execution fixes.",
    to: "Route unknown-root-cause diagnosis directly to Execution fixes.",
    id: "dispatch-runtime-phase-contract",
    message: "route unknown diagnosis through Specialist Judgment before Execution fixes",
  },
  {
    name: "serial gate excludes the required specialist diagnosis phase",
    file: "rules/agent_dispatch.md",
    from: "This exception covers one bounded implementation or known-root-cause fix, or a required Specialist Judgment diagnosis phase when the main agent cannot switch to its binding.",
    to: "This exception covers one bounded implementation or known-root-cause fix only.",
    id: "dispatch-runtime-phase-contract",
    message: "permit the required specialist diagnosis phase through the serial gate",
  },
  {
    name: "serial specialist diagnosis forbidden without a main model switch",
    file: "rules/agent_dispatch.md",
    from: "If the main agent cannot switch to that binding, a bounded native Specialist Judgment diagnosis handoff is allowed even when serial;",
    to: "If the main agent cannot switch to that binding, specialist diagnosis delegation is forbidden;",
    id: "dispatch-runtime-phase-contract",
    message: "allow bounded native specialist diagnosis when the main binding cannot switch",
  },
  {
    name: "specialist diagnosis receives unbounded history instead of a source packet",
    file: "rules/agent_dispatch.md",
    from: "provide a source packet with the symptom, evidence and source anchors, allowed and forbidden paths, objective diagnosis acceptance criteria, and baseline state.",
    to: "provide the entire conversation without scope or acceptance criteria.",
    id: "dispatch-runtime-phase-contract",
    message: "require a bounded source packet for specialist diagnosis",
  },
  {
    name: "serial exception broadened to short lookups",
    file: "rules/agent_dispatch.md",
    from: "This exception does not authorize short lookups or read-backs.",
    to: "This exception authorizes short lookups and read-backs.",
    id: "dispatch-runtime-phase-contract",
    message: "keep short lookups and read-backs outside the specialist serial exception",
  },
  {
    name: "missing binding silently substituted",
    file: "rules/agent_dispatch.md",
    from: "Do not silently substitute a different model when a binding is unavailable.",
    to: "Silently substitute any available model when a binding is unavailable.",
    id: "dispatch-runtime-phase-contract",
    message: "retain explicit missing-binding fallback",
  },
  {
    name: "Testing delegation becomes mandatory",
    file: "rules/agent_dispatch.md",
    from: "Delegating test execution is optional;",
    to: "Delegating test execution is mandatory;",
    id: "dispatch-runtime-phase-contract",
    message: "keep Testing delegation optional",
  },
  {
    name: "Dashboard local login scope expanded beyond local agent-side testing",
    file: "rules/dashboard_local_testing.md",
    from:
      "This rule applies only when Codex opens or verifies the agent-side Dashboard through a local application origin such as `localhost` or `127.0.0.1`.",
    to:
      "This rule also applies when Codex opens remote Dashboard or member-side environments.",
    id: "dashboard-local-test-canonical",
    message: "keep the reviewed Dashboard local-test policy byte-for-byte canonical",
  },
  {
    name: "Dashboard Codex-only local login rule removed",
    file: "projects.json",
    from: '      "codexRules": [\n        "dashboard_local_testing.md"\n      ],\n',
    to: "",
    id: "dashboard-local-test-project-install",
    message: "install dashboard_local_testing.md as a Codex-only rule for Whitelabel_GSI_Dashboard",
  },
  {
    name: "Dashboard local login opt-in disabled",
    file: "projects.json",
    from: '      "localTestLogin": true,',
    to: '      "localTestLogin": false,',
    id: "dashboard-local-test-project-install",
    message: "enable localTestLogin only for Whitelabel_GSI_Dashboard",
  },
  {
    name: "member-side project opts into Dashboard local login",
    file: "projects.json",
    from: '        "multiverse.md"\n      ],\n      "rules": [',
    to: '        "multiverse.md"\n      ],\n      "localTestLogin": true,\n      "rules": [',
    id: "dashboard-local-test-project-install",
    message: "keep localTestLogin disabled for Whitelabel_GSI_Platform_Multiverse",
  },
  {
    name: "member-side project loads the Dashboard local login rule",
    file: "projects.json",
    from: '        "multiverse.md"\n      ],\n      "rules": [',
    to:
      '        "multiverse.md"\n      ],\n      "codexRules": [\n        "dashboard_local_testing.md"\n      ],\n      "rules": [',
    id: "dashboard-local-test-project-install",
    message: "keep dashboard_local_testing.md exclusive to Whitelabel_GSI_Dashboard",
  },
  {
    name: "unused capability loading",
    file: "rules/skill_trigger_guard.md",
    from: "Add capability skills only when their corresponding tool or artifact will actually be used.",
    to: "Add capability skills whenever they might help.",
    id: "routing-primary-limit",
    message: "load capability skills only for tools or artifacts actually used",
  },
  {
    name: "managed routing becomes inert with Superpowers disabled",
    file: "rules/skill_trigger_guard.md",
    from: "only that legacy override block is inert",
    to: "this entire file is inert",
    id: "managed-workflow-precedence",
    message: "keep managed routing active when Superpowers is disabled",
  },
  {
    name: "direct-task fallback suppresses exact managed workflows",
    file: "rules/skill_trigger_guard.md",
    from: "This does not suppress an exact-match managed or project-specific workflow",
    to: "This suppresses every managed and project-specific workflow",
    id: "managed-workflow-precedence",
    message: "do not let the direct-task fallback suppress exact managed workflows",
  },
  {
    name: "narrower workflow discards diagnosis-only authority",
    file: "rules/skill_trigger_guard.md",
    from: "only when it covers the same immediate outcome and preserves the user's requested authority",
    to: "even when it requires broader edits than the user requested",
    id: "managed-workflow-precedence",
    message: "preserve requested authority when preferring a narrower workflow",
  },
  {
    name: "Requirements Grill asks for discoverable facts",
    file: "skills/requirements-grill/SKILL.md",
    from: "Do not ask the user for a fact that those sources can resolve safely.",
    to: "Ask the user even when authoritative sources can resolve the fact.",
    id: "requirements-grill-trigger",
    message: "resolve discoverable facts before asking questions",
  },
  {
    name: "Requirements Grill accepts only one gate condition",
    file: "skills/requirements-grill/SKILL.md",
    from: "Automatically continue with this workflow only when all of the following are true:",
    to: "Automatically continue with this workflow when any of the following is true:",
    id: "requirements-grill-trigger",
    message: "require every automatic Requirements Grill gate condition",
  },
  {
    name: "Requirements Grill loses approved-spec non-trigger",
    file: "skills/requirements-grill/SKILL.md",
    from: "approved, internally consistent, and sufficiently complete spec or acceptance criteria resolve the requested outcome",
    to: "an approved spec exists but could still be questioned",
    id: "requirements-grill-trigger",
    message: "keep explicit Requirements Grill non-triggers",
  },
  {
    name: "Requirements Grill treats approval as proof of completeness",
    file: "skills/requirements-grill/SKILL.md",
    from: "Approval alone does not make silence authoritative.",
    to: "Approval makes every omission authoritative.",
    id: "requirements-grill-trigger",
    message: "do not mistake approval for completeness",
  },
  {
    name: "Requirements Grill asks for redundant continuation confirmation",
    file: "skills/requirements-grill/SKILL.md",
    from: "The original build, change, or spec request remains authorization after the final blocking decision is answered.",
    to: "The original request expires after the final blocking decision is answered.",
    id: "requirements-grill-trigger",
    message: "continue the original request after Requirements Grill resolves",
  },
  {
    name: "Requirements Grill automatic selection disabled",
    file: "skills/requirements-grill/agents/openai.yaml",
    from: "allow_implicit_invocation: true",
    to: "allow_implicit_invocation: false",
    id: "requirements-grill-implicit-invocation",
    message: "allow automatic Requirements Grill selection",
  },
  {
    name: "diagnosing-bugs expands from hard cases to any bug",
    file: "skills/diagnosing-bugs/SKILL.md",
    from: "reports an intermittent bug or performance regression",
    to: "reports any bug",
    id: "diagnosing-bugs-trigger",
    message: "keep diagnosing-bugs triggers precise",
  },
  {
    name: "diagnosing-bugs repeats a failed theory indefinitely",
    file: "skills/diagnosing-bugs/SKILL.md",
    from: "After two failed correction rounds, stop patching the same theory",
    to: "After two failed correction rounds, keep patching the same theory",
    id: "diagnosing-bugs-trigger",
    message: "stop repeating a failed diagnostic theory",
  },
  {
    name: "diagnosis-only work silently writes instrumentation",
    file: "skills/diagnosing-bugs/SKILL.md",
    from: "During diagnosis-only work, use existing telemetry or read-only observations; if new instrumentation is necessary, request authorization before writing it.",
    to: "During diagnosis-only work, immediately write new instrumentation without authorization.",
    id: "diagnosing-bugs-trigger",
    message: "keep diagnosis-only instrumentation read-only",
  },
  {
    name: "obvious bug exclusions lose to the word diagnose",
    file: "skills/diagnosing-bugs/SKILL.md",
    from: "The `Do not use` conditions in the description override positive trigger words such as \"diagnose\".",
    to: "The word \"diagnose\" overrides all `Do not use` conditions.",
    id: "diagnosing-bugs-trigger",
    message: "make diagnosing-bugs non-triggers win unless explicitly forced",
  },
  {
    name: "deep-module design runs for ordinary multi-file work",
    file: "skills/deep-module-design/SKILL.md",
    from: "Do not use for ordinary multi-file implementation",
    to: "Use for ordinary multi-file implementation",
    id: "deep-module-design-trigger",
    message: "keep ordinary edits outside deep-module design",
  },
  {
    name: "deep-module analysis silently authorizes refactoring",
    file: "skills/deep-module-design/SKILL.md",
    from: "Analyze and propose by default. Refactor only when the user asks",
    to: "Analyze and refactor by default. Refactor without asking",
    id: "deep-module-design-trigger",
    message: "do not turn architecture analysis into an unrequested refactor",
  },
  {
    name: "narrow extraction workflow discards analysis-only authority",
    file: "skills/deep-module-design/SKILL.md",
    from: "A workflow that mandates edits does not own an analysis-only request.",
    to: "A workflow that mandates edits owns every analysis-only request.",
    id: "deep-module-design-trigger",
    message: "preserve analysis-only authority when routing deep-module work",
  },
  {
    name: "managed Requirements Grill missing from old Multiverse",
    file: "projects.json",
    from: '        "multiverse-shared-hook-extraction",\n        "requirements-grill",',
    to: '        "multiverse-shared-hook-extraction",',
    id: "managed-workflow-project-skill-install",
    message: "install requirements-grill for Whitelabel_GSI_Platform_Multiverse",
  },
  {
    name: "incomplete phase reset",
    file: "rules/skill_trigger_guard.md",
    from: "Branch switching, commit, push, deploy, status questions, and simple repository lookups are fresh turn shapes.",
    to: "Branch switching, commit, push, and deploy are fresh turn shapes.",
    id: "routing-phase-reset",
    message: "define repository and release follow-ups as fresh turn shapes",
  },
  {
    name: "new branch on every skill phase",
    file: "rules/skill_trigger_guard.md",
    from: "Re-evaluating skill routing does not imply a branch change.",
    to: "Re-evaluating skill routing implies a new branch.",
    id: "ticket-branch-continuity",
    message: "separate skill re-routing from branch changes",
  },
  {
    name: "implicit Claude Code delegation",
    file: "rules/agent_dispatch.md",
    from: "Only an explicit user request that names Claude Code for the current task may override this rule.",
    to: "A review or implementation task implicitly permits Claude Code delegation.",
    id: "native-subagent-dispatch",
    message: "require an explicit per-task override to use Claude Code",
  },
  {
    name: "backend gap pre-disables required controls",
    file: "rules/wow_gsi.md",
    from: "Required product controls must remain enabled, selectable, and editable.",
    to: "Required product controls may be pre-disabled when persistence is incomplete.",
    id: "backend-gap-interaction",
    message: "keep required product controls interactive",
  },
  {
    name: "material API gap notification deferred to final handoff",
    file: "rules/wow_gsi.md",
    from: "tell the user in the same user-facing turn",
    to: "tell the user only in the final handoff",
    id: "backend-gap-interaction",
    message: "report material API gaps immediately with impact and next action",
  },
  {
    name: "unverified API fields made optional to hide the gap",
    file: "rules/wow_gsi.md",
    from: "Do not guess a production response shape, silently make assumed fields optional",
    to: "Guess a production response shape and silently make assumed fields optional",
    id: "backend-gap-interaction",
    message: "forbid defaults that disguise an unverified production contract",
  },
  {
    name: "feature branch preserves API gap without operation-specific acceptance",
    file: "rules/wow_gsi.md",
    from: "A feature-branch commit or push may preserve explicitly incomplete work only after the user has been told and explicitly accepts that exact API／verification gap for that operation.",
    to: "A feature-branch commit or push may preserve an API gap without telling the user or obtaining acceptance.",
    id: "backend-gap-interaction",
    message: "require operation-specific user acceptance before preserving an API gap in git",
  },
  {
    name: "fixture success reported as integration success",
    file: "rules/wow_gsi.md",
    from: "Fixture success is UI evidence only, never integration success",
    to: "Fixture success may be reported as integration success",
    id: "backend-gap-interaction",
    message: "keep fixture authorization bounded and separate from integration evidence",
  },
  {
    name: "additive exception defers material API gaps",
    file: "rules/wow_gsi.md",
    from: "A material contract gap is a technical fact, not a product question; ask the user only when a fallback or scope decision is actually required.",
    to: "A material contract gap is a technical fact, not a product question; ask the user only when a fallback or scope decision is actually required.\n- Exception: material API gaps may be reported only in the final handoff.",
    id: "backend-gap-interaction",
    message: "forbid additive exceptions that defer material API gap notification",
  },
  {
    name: "additive exception promotes fixture evidence",
    file: "rules/wow_gsi.md",
    from: "Fixture success is UI evidence only, never integration success",
    to: "Fixture success is UI evidence only, never integration success; fixture success may count as integration success",
    id: "backend-gap-interaction",
    message: "forbid additive exceptions that promote fixture evidence",
  },
  {
    name: "WOW GSI API gate removed from a project",
    file: "projects.json",
    from: '      "rules": [\n        "wow_gsi.md",',
    to: '      "rules": [',
    id: "wow-gsi-api-gate-project-install",
    message: "install wow_gsi.md for Whitelabel_GSI_Platform_Multiverse",
  },
  {
    name: "missing API contract marked handoff-ready",
    file: "skills/spec-driven-workflow/SKILL.md",
    from: "| `API_CONTRACT_MISSING` | 必要 API 契約或 live read-back 尚缺；這是已告知的技術事實，不需要 `DEC-ID` | 不可以；先取得並驗證契約 |",
    to: "| `API_CONTRACT_MISSING` | 必要 API 契約或 live read-back 尚缺 | 可以直接 handoff |",
    id: "spec-backend-gap-interaction",
    message: "keep missing API contracts distinct from product decisions and handoff-ready fallbacks",
  },
  {
    name: "blocked UI handoff loses its execution boundary",
    file: "skills/spec-driven-workflow/SKILL.md",
    from: "active row 有 `UI_REQUIRED_API_BLOCKED` 時，必須用 `BOUNDED_UI_ONLY` 限定交接",
    to: "active row 有 `UI_REQUIRED_API_BLOCKED` 時，可用 `FULL_CONTRACT` 交接",
    id: "spec-backend-gap-interaction",
    message: "bind blocked UI handoff to a machine-readable execution boundary",
  },
  {
    name: "verified API absence escape removed",
    file: "skills/spec-driven-workflow/SKILL.md",
    from: "以 `[VERIFIED_ABSENCE]` 開頭、引用 Responsibility = `API / persistence` 的 Source ID，並在 cell 寫出具名欄位／endpoint 與具體 schema／response evidence",
    to: "直接標成 API blocker",
    id: "spec-backend-gap-interaction",
    message: "distinguish verified API omissions from unresolved contract gaps",
  },
  {
    name: "verified required API absence treated as resolved",
    file: "skills/spec-driven-workflow/SKILL.md",
    from: "required 欄位確定缺少仍是 `API_CONTRACT_MISSING`",
    to: "required 欄位確定缺少可直接標 `CONFIRMED`",
    id: "spec-backend-gap-interaction",
    message: "distinguish verified API omissions from unresolved contract gaps",
  },
  {
    name: "spec template omits API notification evidence",
    file: "skills/spec-driven-workflow/spec-template.md",
    from: " | Safe scope / next action | User-facing notification / evidence |",
    to: " | Safe scope / next action |",
    id: "spec-template-backend-gap-interaction",
    message: "template must capture API gap notification evidence",
  },
  {
    name: "partial file read treated as proof that a symbol is unused",
    file: "rules/code_change_safety.md",
    from: "A partial file read or narrow search is not evidence that a symbol is unused.",
    to: "A partial file read or narrow search is sufficient evidence that a symbol is unused.",
    id: "code-change-deletion-safety",
    message: "require complete-file and call-site evidence before deleting a symbol",
  },
  {
    name: "import-only deletion exception bypasses complete reference scan",
    file: "rules/code_change_safety.md",
    from: "A partial file read or narrow search is not evidence that a symbol is unused.",
    to:
      "A partial file read or narrow search is not evidence that a symbol is unused. Import-only changes may skip this check.",
    id: "code-change-deletion-safety",
    message: "forbid exceptions that bypass complete symbol deletion evidence",
  },
  {
    name: "import-only deletion exemption bypasses complete reference scan",
    file: "rules/code_change_safety.md",
    from: "This gate has no import-only, cleanup, or small-change exception.",
    to:
      "This gate has no import-only, cleanup, or small-change exception. Import-only changes are exempt from the complete-reference gate.",
    id: "code-change-deletion-safety",
    message: "forbid exceptions that bypass complete symbol deletion evidence",
  },
  {
    name: "import-only deletion says complete reference gate is not required",
    file: "rules/code_change_safety.md",
    from: "This gate has no import-only, cleanup, or small-change exception.",
    to:
      "This gate has no import-only, cleanup, or small-change exception. Import-only changes do not require the complete-reference gate.",
    id: "code-change-safety-canonical",
    message: "keep the reviewed code-change safety policy byte-for-byte canonical",
  },
  {
    name: "unexplained deleted lines allowed into a commit",
    file: "rules/code_change_safety.md",
    from: "an unexplained or unrelated deletion blocks the commit.",
    to: "unexplained or unrelated deletions may be committed.",
    id: "code-change-deletion-safety",
    message: "audit every deleted line before commit",
  },
  {
    name: "build accepted as a Vue or TypeScript type-check substitute",
    file: "rules/code_change_safety.md",
    from: "Build, lint, format, and source-string assertions do not substitute for type-check.",
    to: "Build, lint, format, and source-string assertions may substitute for type-check.",
    id: "code-change-verification-safety",
    message: "require type-check evidence for Vue and TypeScript changes",
  },
  {
    name: "direct tsc allowed despite a project-defined type-check command",
    file: "rules/code_change_safety.md",
    from: "repository provides a permitted project-defined type-check command, run it",
    to: "run `tsc --noEmit` directly",
    id: "code-change-verification-safety",
    message: "use the repository-defined type-check command",
  },
  {
    name: "small Vue change exception bypasses type-check",
    file: "rules/code_change_safety.md",
    from: "A small or import-only change is not by itself a reason to skip the applicable type-check or runtime smoke.",
    to:
      "A small or import-only change is not by itself a reason to skip the applicable type-check or runtime smoke. Small Vue changes may skip type-check.",
    id: "code-change-verification-safety",
    message: "forbid small-change exceptions that bypass type-check",
  },
  {
    name: "small Vue change says type-check need not run",
    file: "rules/code_change_safety.md",
    from: "Build, lint, format, and source-string assertions do not substitute for type-check.",
    to:
      "Build, lint, format, and source-string assertions do not substitute for type-check. Type-check need not be run for small Vue changes.",
    id: "code-change-verification-safety",
    message: "forbid small-change exceptions that bypass type-check",
  },
  {
    name: "small Vue change calls type-check unnecessary",
    file: "rules/code_change_safety.md",
    from: "Build, lint, format, and source-string assertions do not substitute for type-check.",
    to:
      "Build, lint, format, and source-string assertions do not substitute for type-check. Type-check is unnecessary for small Vue changes.",
    id: "code-change-safety-canonical",
    message: "keep the reviewed code-change safety policy byte-for-byte canonical",
  },
  {
    name: "failing broad verification replaced with a narrower check",
    file: "rules/code_change_safety.md",
    from: "do not replace a failing broad verifier with a narrower check that cannot detect the edited risk.",
    to: "replace a failing broad verifier with a narrower passing check.",
    id: "code-change-verification-safety",
    message: "forbid shrinking verification to escape a failure",
  },
  {
    name: "unverified interaction change committed and pushed",
    file: "rules/code_change_safety.md",
    from:
      "commit, merge, push, deploy, and release are blocked until the user explicitly accepts that exact verification gap.",
    to: "commit, merge, push, deploy, and release may continue without runtime verification.",
    id: "code-change-runtime-safety",
    message: "block publishing unverified interaction changes without explicit acceptance",
  },
  {
    name: "missing or failed runtime smoke still allowed to deploy",
    file: "rules/code_change_safety.md",
    from: "If an applicable required verifier above is missing, blocked, or fails, mark the affected change `UNVERIFIED`",
    to: "If the smoke test is missing or fails, continue deployment.",
    id: "code-change-runtime-safety",
    message: "block publication when runtime smoke is missing, blocked, or failing",
  },
  {
    name: "failed runtime smoke explicitly allows deploy and release",
    file: "rules/code_change_safety.md",
    from:
      "commit, merge, push, deploy, and release are blocked until the user explicitly accepts that exact verification gap.",
    to:
      "commit, merge, push, deploy, and release are blocked until the user explicitly accepts that exact verification gap. Deploy and release may proceed when runtime smoke fails.",
    id: "code-change-runtime-safety",
    message: "block publishing unverified interaction changes without explicit acceptance",
  },
  {
    name: "deployment permitted despite failed runtime smoke",
    file: "rules/code_change_safety.md",
    from:
      "commit, merge, push, deploy, and release are blocked until the user explicitly accepts that exact verification gap.",
    to:
      "commit, merge, push, deploy, and release are blocked until the user explicitly accepts that exact verification gap. Deployment is permitted despite a failed runtime smoke.",
    id: "code-change-safety-canonical",
    message: "keep the reviewed code-change safety policy byte-for-byte canonical",
  },
  {
    name: "import-only exception bypasses runtime smoke",
    file: "rules/code_change_safety.md",
    from: "A small or import-only change is not by itself a reason to skip the applicable type-check or runtime smoke.",
    to:
      "A small or import-only change is not by itself a reason to skip the applicable type-check or runtime smoke. Import-only changes may skip runtime smoke.",
    id: "code-change-runtime-safety",
    message: "forbid import-only exceptions that bypass runtime smoke",
  },
  {
    name: "runtime smoke made optional for import-only changes",
    file: "rules/code_change_safety.md",
    from: "A small or import-only change is not by itself a reason to skip the applicable type-check or runtime smoke.",
    to:
      "A small or import-only change is not by itself a reason to skip the applicable type-check or runtime smoke. Runtime smoke is optional for import-only changes.",
    id: "code-change-runtime-safety",
    message: "forbid import-only exceptions that bypass runtime smoke",
  },
  {
    name: "runtime smoke said not needed for import-only changes",
    file: "rules/code_change_safety.md",
    from: "A small or import-only change is not by itself a reason to skip the applicable type-check or runtime smoke.",
    to:
      "A small or import-only change is not by itself a reason to skip the applicable type-check or runtime smoke. Runtime smoke is not needed for import-only changes.",
    id: "code-change-safety-canonical",
    message: "keep the reviewed code-change safety policy byte-for-byte canonical",
  },
  {
    name: "TYPECHECK_UNAVAILABLE accepted despite failed fallback",
    file: "rules/code_change_safety.md",
    from:
      "`TYPECHECK_UNAVAILABLE` alone is not a failed verifier only when the prescribed risk-equivalent static check and every applicable runtime smoke have completed and passed.",
    to:
      "`TYPECHECK_UNAVAILABLE` alone is not a failed verifier only when the prescribed risk-equivalent static check and every applicable runtime smoke have completed and passed. `TYPECHECK_UNAVAILABLE` is sufficient evidence even when the fallback static check fails.",
    id: "code-change-safety-canonical",
    message: "keep the reviewed code-change safety policy byte-for-byte canonical",
  },
  {
    name: "fallback static check made optional",
    file: "rules/code_change_safety.md",
    from:
      "This fallback must not be reported as a passing type-check.",
    to:
      "This fallback must not be reported as a passing type-check. The fallback static check is optional after recording `TYPECHECK_UNAVAILABLE`.",
    id: "code-change-safety-canonical",
    message: "keep the reviewed code-change safety policy byte-for-byte canonical",
  },
  {
    name: "global code-change safety omitted from locale manager",
    file: "projects.json",
    from:
      '"agent_dispatch.md",\n        "code_change_safety.md"\n      ],\n      "skills": [\n        "spec-driven-workflow",\n        "locale-entry-maintenance"',
    to:
      '"agent_dispatch.md"\n      ],\n      "skills": [\n        "spec-driven-workflow",\n        "locale-entry-maintenance"',
    id: "code-change-safety-project-install",
    message: "install code_change_safety.md for whitelabel-gsi-locale-manager",
  },
  {
    name: "spec allows backend-driven pre-disable behavior",
    file: "skills/spec-driven-workflow/SKILL.md",
    from: "API、schema、endpoint 或 persistence 缺口不得作為 hide、pre-disable 或 lock 的理由。",
    to: "API、schema、endpoint 或 persistence 缺口可作為 hide、pre-disable 或 lock 的理由。",
    id: "spec-backend-gap-interaction",
    message: "forbid backend-driven pre-disable behavior in specs",
  },
  {
    name: "spec template hides controls for API gaps",
    file: "skills/spec-driven-workflow/spec-template.md",
    from: "不得因 API、schema、endpoint 或 persistence 缺口預先 disable、hide 或 lock 需求控制項",
    to: "可因 API、schema、endpoint 或 persistence 缺口預先 disable、hide 或 lock 需求控制項",
    id: "spec-template-backend-gap-interaction",
    message: "template must forbid backend-driven pre-disable behavior",
  },
  {
    name: "spec fakes success after persistence failure",
    file: "skills/spec-driven-workflow/SKILL.md",
    from: "不得顯示假成功或靜默丟值。",
    to: "可以顯示成功並清除未儲存值。",
    id: "spec-backend-gap-interaction",
    message: "forbid fake success and silent value loss in specs",
  },
  {
    name: "spec template drops legitimate blocker exceptions",
    file: "skills/spec-driven-workflow/spec-template.md",
    from: "- 合法阻擋：`<權限、破壞性操作確認、in-flight 防重複、loading lock、客觀無效輸入；不得用 API 缺口冒充合法阻擋>`",
    to: "- 合法阻擋：`<任何 backend 缺口>`",
    id: "spec-template-backend-gap-interaction",
    message: "template must retain legitimate interaction blockers",
  },
  {
    name: "missing remote key left uncreated",
    file: "rules/wow_gsi.md",
    from: "If no compatible key exists, create it through the Locale Manager API",
    to: "If no compatible key exists, stop and ask without creating it",
    id: "remote-i18n-requirement-flow",
    message: "create a missing key through Locale Manager using existing naming rules",
  },
  {
    name: "requirement-discovered Locale gap ignored",
    file: "skills/locale-entry-maintenance/SKILL.md",
    from: "or when implementing a remote-i18n requirement reveals a missing key that must be searched, reused, or created",
    to: "or when the user separately requests Locale maintenance",
    id: "locale-trigger",
    message: "trigger when implementation discovers a missing remote-i18n key",
  },
  {
    name: "Locale skill missing from old Multiverse",
    file: "projects.json",
    from: "\"figma-pixel-implementation\",\n        \"locale-entry-maintenance\",\n        \"multiverse-cms-navigation\"",
    to: "\"figma-pixel-implementation\",\n        \"multiverse-cms-navigation\"",
    id: "remote-i18n-project-skill-install",
    message: "install locale-entry-maintenance for Whitelabel_GSI_Platform_Multiverse",
  },
  {
    name: "Locale skill installed in unrelated frontend config",
    file: "projects.json",
    from:
      "\"frontend_config.md\"\n      ],\n      \"rules\": [\n        \"wow_gsi.md\",\n        \"git_https_token_auth.md\",\n        \"jira_readonly.md\",\n        \"skill_trigger_guard.md\",\n        \"agent_dispatch.md\",\n        \"code_change_safety.md\"\n      ],\n      \"skills\": [\n        \"spec-driven-workflow\",\n        \"figma-pixel-implementation\",\n        \"requirements-grill\",\n        \"diagnosing-bugs\",\n        \"deep-module-design\"\n      ]",
    to:
      "\"frontend_config.md\"\n      ],\n      \"rules\": [\n        \"wow_gsi.md\",\n        \"git_https_token_auth.md\",\n        \"jira_readonly.md\",\n        \"skill_trigger_guard.md\",\n        \"agent_dispatch.md\",\n        \"code_change_safety.md\"\n      ],\n      \"skills\": [\n        \"spec-driven-workflow\",\n        \"figma-pixel-implementation\",\n        \"locale-entry-maintenance\",\n        \"requirements-grill\",\n        \"diagnosing-bugs\",\n        \"deep-module-design\"\n      ]",
    id: "remote-i18n-project-skill-install",
    message: "do not install locale-entry-maintenance for whitelabel-frontend-config",
  },
  {
    name: "missing Locale delete trigger",
    file: "skills/locale-entry-maintenance/SKILL.md",
    from: "or delete an exact locale key",
    to: "or remove an exact locale key",
    id: "locale-trigger",
    message: "include the delete trigger",
  },
  {
    name: "unbounded Locale batches",
    file: "skills/locale-entry-maintenance/SKILL.md",
    from: "batches of at most 10 entries",
    to: "unbounded batches",
    id: "locale-partial-resume",
    message: "cap Locale write batches at 10 entries",
  },
  {
    name: "continued writes after quota exhaustion",
    file: "skills/locale-entry-maintenance/SKILL.md",
    from: "On the first Translate quota error, stop issuing new writes.",
    to: "On the first Translate quota error, continue issuing new writes.",
    id: "locale-quota-stop",
    message: "stop at the first quota error and perform exactly one bounded read-back",
  },
  {
    name: "same-turn Locale quota retry",
    file: "skills/locale-entry-maintenance/SKILL.md",
    from: "On a later resume turn",
    to: "On the same turn",
    id: "locale-partial-resume",
    message: "resume from a fresh snapshot and write only the remaining delta",
  },
  {
    name: "single-surface Multiverse discovery",
    file: "skills/multiverse-cross-template-bugfix/SKILL.md",
    from: "同時搜尋 `src/common/` 與 `template/`",
    to: "只搜尋 `template/`",
    id: "cross-template-shared-code-trigger",
    message: "search shared and template code together",
  },
  {
    name: "provider all-callers clause moved outside its family",
    file: "skills/multiverse-cross-template-bugfix/SKILL.md",
    from: "shared hook／adapter／mapping 的 all callers。",
    to: "shared mapping entry。",
    append: "\n\n## Moved clause\n\nshared hook／adapter／mapping 的 all callers。\n",
    id: "cross-template-provider-family",
    message: "inventory all callers inside the provider implementation family",
  },
  {
    name: "provider family without Renderer evidence",
    file: "skills/multiverse-cross-template-bugfix/SKILL.md",
    from: "分別取得 request 與 renderer evidence",
    to: "只取得 request evidence",
    id: "cross-template-provider-family",
    message: "require separate request and renderer evidence",
  },
  {
    name: "spec workflow retained after phase exit",
    file: "skills/spec-driven-workflow/SKILL.md",
    from: "退出此 skill",
    to: "保留此 skill",
    id: "spec-phase-exit",
    message: "exit and reselect workflow when the requested outcome changes",
  },
  {
    name: "functional screenshot promoted to pixel trigger",
    file: "skills/figma-pixel-implementation/SKILL.md",
    from: "Do not use when a screenshot only demonstrates a functional defect",
    to: "Use when a screenshot demonstrates a functional defect",
    id: "pixel-functional-screenshot-non-trigger",
    message: "make functional screenshots an explicit discovery non-trigger",
  },
  {
    name: "Figma-linked UI repair omitted from pixel triggering",
    file: "skills/figma-pixel-implementation/SKILL.md",
    from: "a Figma node or image is the authoritative source for a user-visible UI implementation or visual fix",
    to: "the user explicitly says pixel-perfect",
    id: "pixel-visual-authority-trigger",
    message: "trigger whenever Figma or an image is authoritative for a user-visible implementation or visual fix",
  },
  {
    name: "pixel inventory ignores ancestor shell constraints",
    file: "skills/figma-pixel-implementation/SKILL.md",
    from: "量測目標節點、直到 viewport 的 ancestor／layout shell，以及會改變可用空間的 sibling",
    to: "只量測目標節點",
    id: "pixel-measurement-scope",
    message: "measure the target, ancestor layout shell, and space-affecting siblings",
  },
  {
    name: "pixel verification accepts build and source-string tests",
    file: "skills/figma-pixel-implementation/SKILL.md",
    from: "build、lint、unit test、class/source 字串斷言都不是視覺完成證據",
    to: "build、lint、unit test、class/source 字串斷言可作為視覺完成證據",
    id: "pixel-completion-gate",
    message: "reject build and source-string assertions as visual completion evidence",
  },
  {
    name: "pixel completion omits rendered DOM dimensions",
    file: "skills/figma-pixel-implementation/SKILL.md",
    from: "每個 frozen state 都有實際 rendered page 的 viewport、getBoundingClientRect 與 computed style read-back",
    to: "每個 frozen state 都有 build 結果",
    id: "pixel-completion-gate",
    message: "require rendered viewport, DOM dimensions, and computed styles for every frozen state",
  },
  {
    name: "unreproducible pixel state reported complete",
    file: "skills/figma-pixel-implementation/SKILL.md",
    from: "任何 frozen state 無法開啟、登入、載入資料、截圖或量測時，完成狀態只能是 `UNVERIFIED`",
    to: "無法重現時可依 Figma 推定完成",
    id: "pixel-completion-gate",
    message: "mark unreproducible visual states UNVERIFIED instead of complete",
  },
];

for (const layout of ["reordered skills", "additional trailing skill"]) {
  test(`duplicate managed workflow fixture handles ${layout}`, () => {
    const target = {
      name: "Whitelabel_GSI_Platform_Multiverse",
      skills: ["multiverse-shared-hook-extraction", "existing-project-skill"],
    };
    const other = { name: "Other_Project", skills: ["other-skill"] };
    if (layout === "reordered skills") target.skills.reverse();
    else target.skills.push("additional-project-skill");
    const originalSkills = [...target.skills];
    const manifest = JSON.parse(JSON.stringify({ projects: [other, target] }));
    scenarioMutators["managed workflow is duplicated in a project after global promotion"](manifest);

    assert.deepEqual(manifest.projects[0], other, "unrelated project changed");
    assert.deepEqual(manifest.projects[1].skills, [...originalSkills, "requirements-grill"]);
    assert.equal(manifest.projects[1].name, target.name);
  });
}

for (const scenario of weakeningScenarios) {
  test(`checker rejects ${scenario.name}`, (t) => {
    const fixtureRoot = createFixture(t);
    const file = path.join(fixtureRoot, scenario.file);
    const original = fs.readFileSync(file, "utf8");
    let weakened;
    const mutate = scenarioMutators[scenario.name];
    if (mutate) {
      const manifest = JSON.parse(original);
      mutate(manifest);
      weakened = JSON.stringify(manifest, null, 2);
    } else {
      assert.ok(original.includes(scenario.from), `fixture text missing: ${scenario.from}`);
      weakened = original.replace(scenario.from, scenario.to);
    }
    fs.writeFileSync(file, weakened + (scenario.append || ""));

    const issue = runChecks(fixtureRoot).find(
      (candidate) => candidate.id === scenario.id && candidate.message === scenario.message,
    );
    assert.ok(issue, `${scenario.id} did not reject ${scenario.name}`);
  });
}
