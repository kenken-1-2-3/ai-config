#!/usr/bin/env node

const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");

const CONTRACTS = [
  {
    id: "routing-primary-limit",
    file: "rules/skill_trigger_guard.md",
    patterns: [
      {
        regex: /primary workflow skill/i,
        message: "define the primary workflow skill role",
      },
      {
        regex: /Add capability skills only when their corresponding tool or artifact will actually be used/i,
        message: "load capability skills only for tools or artifacts actually used",
      },
      {
        regex: /zero or one primary workflow skill per turn/i,
        message: "limit each turn to zero or one primary workflow skill",
      },
    ],
  },
  {
    id: "routing-phase-reset",
    file: "rules/skill_trigger_guard.md",
    patterns: [
      {
        regex: /re-evaluate from the newest user request/i,
        message: "re-evaluate routing from the newest user request",
      },
      {
        regex: /do not inherit a primary skill/i,
        message: "forbid inheriting a primary skill from an earlier phase",
      },
      {
        regex: /Branch switching, commit, push, deploy, status questions, and simple repository lookups are fresh turn shapes/is,
        message: "define repository and release follow-ups as fresh turn shapes",
      },
      {
        regex: /do not retain spec, pixel, TDD, review, or delegation workflows/i,
        message: "drop prior workflow skills after a phase change",
      },
    ],
  },
  {
    id: "managed-workflow-precedence",
    file: "rules/skill_trigger_guard.md",
    patterns: [
      {
        regex: /only that legacy override block is inert.*per-turn routing contract, managed workflow precedence, and ticket and branch continuity always apply/is,
        message: "keep managed routing active when Superpowers is disabled",
      },
      {
        regex: /broad plugin process skill.*does not suppress an exact-match managed or project-specific workflow.*locale maintenance.*Figma implementation/is,
        message: "do not let the direct-task fallback suppress exact managed workflows",
      },
      {
        regex: /requirements-grill.*material-decision gate.*scoped source and repository discovery/is,
        message: "gate requirements grilling on material decisions after discovery",
      },
      {
        regex: /narrower project-specific workflow wins over generic `diagnosing-bugs` or `deep-module-design` only when.*preserves the user's requested authority.*mandates edits does not own a diagnosis-only or analysis-only request.*Do not stack both primary skills/is,
        message: "preserve requested authority when preferring a narrower workflow",
      },
      {
        regex: /deep-module-design.*architecture and interface judgment.*ordinary multi-file edit is not a trigger/is,
        message: "keep deep-module design analytical and non-routine",
      },
      {
        regex: /explicitly force or skip `requirements-grill`.*overrides its automatic gate/is,
        message: "preserve explicit Requirements Grill overrides",
      },
      {
        regex: /explicit `Do not use` conditions beat generic positive wording.*Only explicitly naming that skill can force it past those exclusions/is,
        message: "make managed skill non-triggers win unless explicitly forced",
      },
    ],
  },
  {
    id: "requirements-grill-trigger",
    file: "skills/requirements-grill/SKILL.md",
    expectedName: "requirements-grill",
    patterns: [
      {
        target: "description",
        regex: /^Use when\b/i,
        message: "start the Requirements Grill description with Use when",
      },
      {
        target: "description",
        regex: /material unresolved human decisions after scoped source and repository discovery/i,
        message: "trigger only after discovery leaves a material human decision",
      },
      {
        target: "description",
        regex: /two defensible interpretations.*observable behavior.*files.*data.*permissions.*scope.*acceptance/is,
        message: "define what makes Requirements Grill ambiguity material",
      },
      {
        target: "description",
        regex: /Do not use when an approved, internally consistent, and sufficiently complete spec.*ambiguity is discoverable.*small mechanical edit.*known-root-cause fix.*repository or release operation.*status check.*lookup/is,
        message: "keep explicit Requirements Grill non-triggers",
      },
      {
        regex: /Do not ask the user for a fact that those sources can resolve safely/i,
        message: "resolve discoverable facts before asking questions",
      },
      {
        regex: /Automatically continue with this workflow only when all of the following are true/i,
        message: "require every automatic Requirements Grill gate condition",
      },
      {
        regex: /If any condition fails, exit immediately/i,
        message: "exit Requirements Grill when its gate fails",
      },
      {
        regex: /Approval alone does not make silence authoritative.*omitted material decision as unresolved/is,
        message: "do not mistake approval for completeness",
      },
      {
        regex: /force this workflow.*\$requirements-grill.*skip it.*proceed without a grill/is,
        message: "support explicit force and skip overrides",
      },
      {
        regex: /While a blocking decision remains, do not implement, edit a spec, create an ADR, or change product documentation during the grill/is,
        message: "keep Requirements Grill read-only while decisions remain",
      },
      {
        regex: /original build, change, or spec request remains authorization after the final blocking decision.*continue with the workflow that owns that original request without asking for redundant confirmation/is,
        message: "continue the original request after Requirements Grill resolves",
      },
    ],
  },
  {
    id: "requirements-grill-implicit-invocation",
    file: "skills/requirements-grill/agents/openai.yaml",
    patterns: [
      {
        regex: /allow_implicit_invocation:\s*true/i,
        message: "allow automatic Requirements Grill selection",
      },
    ],
  },
  {
    id: "diagnosing-bugs-trigger",
    file: "skills/diagnosing-bugs/SKILL.md",
    expectedName: "diagnosing-bugs",
    patterns: [
      {
        target: "description",
        regex: /^Use when\b/i,
        message: "start the diagnosing-bugs description with Use when",
      },
      {
        target: "description",
        regex: /explicitly asks for diagnosis or root cause.*intermittent bug or performance regression.*initial scoped evidence does not localize the cause.*same symptom survived two materially different fix attempts/is,
        message: "keep diagnosing-bugs triggers precise",
      },
      {
        target: "description",
        regex: /Do not use for a known-root-cause mechanical fix.*direct compiler or linter error.*requirements or design questions.*narrower project-specific skill/is,
        message: "keep diagnosing-bugs non-triggers and precedence",
      },
      {
        regex: /generic fallback.*narrower project-specific workflow takes precedence only when.*preserves the user's requested authority.*mandates edits does not own a diagnosis-only request.*must not be stacked as primary skills/is,
        message: "defer diagnosis only when a narrower workflow preserves requested authority",
      },
      {
        regex: /If the user asks only to diagnose, stop at supported root cause and recommended remediation\. Do not implement the fix/i,
        message: "respect diagnosis-only requests",
      },
      {
        regex: /`Do not use` conditions.*override positive trigger words.*Only the user explicitly naming `\$diagnosing-bugs` forces this workflow past those exclusions/is,
        message: "make diagnosing-bugs non-triggers win unless explicitly forced",
      },
      {
        regex: /tightest existing feedback loop that can turn red/i,
        message: "establish a red-capable reproduction before fixing",
      },
      {
        regex: /issue cannot be reproduced.*request only the exact missing artifact, access, input, or timing evidence.*Do not declare a root cause from an untested hunch/is,
        message: "avoid unsupported root-cause claims when reproduction is blocked",
      },
      {
        regex: /two to four ranked, falsifiable hypotheses/i,
        message: "use bounded falsifiable hypotheses",
      },
      {
        regex: /After two failed correction rounds, stop patching the same theory/i,
        message: "stop repeating a failed diagnostic theory",
      },
      {
        regex: /When code changes are authorized, temporary instrumentation may be added.*During diagnosis-only work, use existing telemetry or read-only observations.*request authorization before writing it/is,
        message: "keep diagnosis-only instrumentation read-only",
      },
      {
        regex: /Re-run the original reproduction.*Remove temporary instrumentation and throwaway artifacts/is,
        message: "verify the original symptom and clean up diagnostics",
      },
    ],
  },
  {
    id: "diagnosing-bugs-implicit-invocation",
    file: "skills/diagnosing-bugs/agents/openai.yaml",
    patterns: [
      {
        regex: /allow_implicit_invocation:\s*true/i,
        message: "allow automatic diagnosing-bugs selection",
      },
    ],
  },
  {
    id: "deep-module-design-trigger",
    file: "skills/deep-module-design/SKILL.md",
    expectedName: "deep-module-design",
    patterns: [
      {
        target: "description",
        regex: /^Use when\b/i,
        message: "start the deep-module description with Use when",
      },
      {
        target: "description",
        regex: /design or improve a module interface.*callers must understand too many implementation details.*behavior is scattered across many files.*architecture makes testing and repeated changes difficult/is,
        message: "tie deep-module design to demonstrated interface pressure",
      },
      {
        target: "description",
        regex: /Do not use for ordinary multi-file implementation.*local cleanup.*known small refactor.*narrower project-specific extraction or design skill/is,
        message: "keep ordinary edits outside deep-module design",
      },
      {
        regex: /Fewer files or fewer lines are not goals by themselves/i,
        message: "avoid treating file count as module depth",
      },
      {
        regex: /Analyze and propose by default\. Refactor only when the user asks/i,
        message: "do not turn architecture analysis into an unrequested refactor",
      },
      {
        regex: /narrower project-specific extraction or design workflow takes precedence only when.*preserves the user's requested authority.*mandates edits does not own an analysis-only request/is,
        message: "preserve analysis-only authority when routing deep-module work",
      },
      {
        regex: /active callers and demonstrated change pressure.*not speculative future reuse/is,
        message: "apply YAGNI to module design",
      },
      {
        regex: /If the interface is genuinely unsettled, compare at least two viable boundaries\. Otherwise recommend the direct minimal deepening without manufacturing alternatives/i,
        message: "compare alternatives only when the boundary is unsettled",
      },
      {
        regex: /Do not silently turn this analysis into a broad refactor, rename sweep, new abstraction hierarchy, or framework migration/i,
        message: "prevent deep-module scope expansion",
      },
    ],
  },
  {
    id: "deep-module-design-implicit-invocation",
    file: "skills/deep-module-design/agents/openai.yaml",
    patterns: [
      {
        regex: /allow_implicit_invocation:\s*true/i,
        message: "allow automatic deep-module design selection",
      },
    ],
  },
  {
    id: "ticket-branch-continuity",
    file: "rules/skill_trigger_guard.md",
    patterns: [
      {
        regex: /same project\/repository during one session belongs to one ticket/i,
        message: "treat one project in a session as one ticket by default",
      },
      {
        regex: /one task work branch per project.*all subsequent implementation.*same work branch/is,
        message: "keep follow-up changes on the established work branch",
      },
      {
        regex: /Do not create or switch to a new branch or worktree solely because.*spec.*implementation.*review.*QA.*fixes.*release prep/is,
        message: "do not rebranch merely because the ticket phase changes",
      },
      {
        regex: /Re-evaluating skill routing does not imply a branch change/i,
        message: "separate skill re-routing from branch changes",
      },
      {
        regex: /different ticket.*different project\/repository.*explicitly requests a different branch or worktree/is,
        message: "limit new branches to explicit or genuinely different work",
      },
      {
        regex: /temporarily switch.*develop.*staging.*main.*return to the established work branch.*follow-up code changes/is,
        message: "return from promotion branches before follow-up implementation",
      },
    ],
  },
  {
    id: "native-subagent-dispatch",
    file: "rules/agent_dispatch.md",
    patterns: [
      {
        regex: /When the active session is Codex.*do not invoke external Claude Code/is,
        message: "disable external Claude Code delegation from Codex",
      },
      {
        regex: /`cc:review`.*`cc:rescue`.*`cc:adversarial-review`.*Claude CLI.*tracked Claude Code job/is,
        message: "cover every Claude Code invocation path",
      },
      {
        regex: /use the session's native subagent or multi-agent tools/i,
        message: "route justified delegation to native subagents",
      },
      {
        regex: /Only an explicit user request that names Claude Code for the current task may override/i,
        message: "require an explicit per-task override to use Claude Code",
      },
      {
        regex: /Do not infer permission from needing implementation, diagnosis, research, review, or a second opinion/i,
        message: "do not infer Claude Code permission from task shape",
      },
    ],
  },
  {
    id: "locale-trigger",
    file: "skills/locale-entry-maintenance/SKILL.md",
    expectedName: "locale-entry-maintenance",
    patterns: [
      {
        target: "description",
        regex: /^Use when\b/i,
        message: "start the description with Use when",
      },
      {
        target: "description",
        regex: /\badd\b/i,
        message: "include the add trigger",
      },
      {
        target: "description",
        regex: /\bupdate\b/i,
        message: "include the update trigger",
      },
      {
        target: "description",
        regex: /\bdelete\b/i,
        message: "include the delete trigger",
      },
      {
        target: "description",
        regex: /locale key/i,
        message: "include locale key discovery terms",
      },
      {
        target: "description",
        regex: /English.*Traditional Chinese.*Simplified Chinese/is,
        message: "include the priority-locale copy trigger",
      },
      {
        target: "description",
        regex: /Do not use for whole-dataset Auto Translate monitoring/i,
        message: "exclude whole-dataset Auto Translate monitoring",
      },
      {
        target: "description",
        regex: /implementing a remote-i18n requirement.*missing key.*search.*reuse.*create/is,
        message: "trigger when implementation discovers a missing remote-i18n key",
      },
    ],
  },
  {
    id: "remote-i18n-requirement-flow",
    file: "rules/wow_gsi.md",
    patterns: [
      {
        regex: /For every requirement that adds or changes user-facing copy.*remote i18n key/is,
        message: "map every user-facing requirement to a remote i18n key",
      },
      {
        regex: /search the current repository.*shared or legacy.*target remote locale dataset/is,
        message: "search local, legacy, shared, and remote sources before creating a key",
      },
      {
        regex: /If a compatible existing key exists.*reuse/is,
        message: "reuse a compatible existing key",
      },
      {
        regex: /If no compatible key exists.*create.*Locale Manager API.*existing namespace and key-naming conventions/is,
        message: "create a missing key through Locale Manager using existing naming rules",
      },
      {
        regex: /Do not invent missing translations.*ask only for the exact missing copy/is,
        message: "keep missing translation copy explicit",
      },
      {
        regex: /report.*`REUSED`.*`CREATED`.*`BLOCKED`.*target dataset.*`en`.*`zh-TW`.*`zh-CN`.*read-back/is,
        message: "report reused, created, or blocked keys with copy and evidence",
      },
    ],
  },
  {
    id: "backend-gap-interaction",
    file: "rules/wow_gsi.md",
    patterns: [
      {
        regex: /Required product controls must remain enabled, selectable, and editable/i,
        message: "keep required product controls interactive",
      },
      {
        regex: /API, schema, endpoint, or persistence gap is not a reason to hide, pre-disable, or lock/i,
        message: "do not pre-disable controls because persistence is incomplete",
      },
      {
        regex: /attempts the action.*backend rejects or cannot persist it.*preserve the form state.*explicit reminder.*not saved/is,
        message: "preserve input and notify after a failed persistence attempt",
      },
      {
        regex: /Do not show a success state or silently discard values/i,
        message: "do not fake persistence success or discard input",
      },
      {
        regex: /Permission enforcement, destructive-action confirmation, in-flight duplicate prevention, loading locks, and objectively invalid input remain valid blockers/is,
        message: "retain legitimate interaction blockers",
      },
      {
        regex: /Treat an API contract gap as material.*required endpoint.*request／response field.*mode discriminator.*persistence mapping.*authoritative schema.*real response/is,
        message: "classify material API contract gaps from authoritative evidence",
      },
      {
        regex: /same user-facing turn.*exact missing or unknown contract.*evidence checked.*affected requirements and screens.*safe remaining scope.*owner／next action/is,
        message: "report material API gaps immediately with impact and next action",
      },
      {
        regex: /Do not guess a production response shape.*assumed fields optional.*`0`.*empty strings.*empty lists.*API／Network／persistence verification `BLOCKED`/is,
        message: "forbid defaults that disguise an unverified production contract",
      },
      {
        regex: /do not merge or promote the affected feature to `main`, deploy it, or release it/is,
        message: "block production promotion while a material API contract is missing",
      },
      {
        regex: /feature-branch commit or push may preserve explicitly incomplete work only after the user has been told and explicitly accepts that exact API／verification gap for that operation/is,
        message: "require operation-specific user acceptance before preserving an API gap in git",
      },
      {
        regex: /fake／mock／fixture／stub data.*bounded UI-only slice.*test／dev-only.*never integration success/is,
        message: "keep fixture authorization bounded and separate from integration evidence",
      },
      {
        regex: /^(?![\s\S]*(?:API contract gaps?|material API gaps?)[^\n]{0,120}(?:only|may|can)[^\n]{0,80}(?:final handoff|later))[\s\S]*$/i,
        message: "forbid additive exceptions that defer material API gap notification",
      },
      {
        regex: /^(?![\s\S]*fixture success[^\n]{0,80}(?:may|can)[^\n]{0,40}(?:count as|be reported as) integration success)[\s\S]*$/i,
        message: "forbid additive exceptions that promote fixture evidence",
      },
    ],
  },
  {
    id: "code-change-safety-canonical",
    file: "rules/code_change_safety.md",
    expectedSha256: "2c77a2f172fe71fecf46b6decdada919ab7e98828582a93b5adb36b0f87b7912",
    sha256Message: "keep the reviewed code-change safety policy byte-for-byte canonical",
    patterns: [],
  },
  {
    id: "dashboard-local-test-canonical",
    file: "rules/dashboard_local_testing.md",
    expectedSha256: "55333bb856f8e151013069d8e77205f905c1b502cc517650a076cd722a2240f4",
    sha256Message: "keep the reviewed Dashboard local-test policy byte-for-byte canonical",
    patterns: [],
  },
  {
    id: "code-change-deletion-safety",
    file: "rules/code_change_safety.md",
    patterns: [
      {
        regex: /# Code Change Safety(?:(?!\n# ).)*Before deleting or renaming any import, symbol, function, event handler, route, field, config key, or component.*complete changed file.*relevant repository call sites/is,
        message: "require complete-file and call-site evidence before deleting a symbol",
      },
      {
        regex: /A partial file read or narrow search is not evidence that a symbol is unused/i,
        message: "require complete-file and call-site evidence before deleting a symbol",
      },
      {
        regex: /This gate has no import-only, cleanup, or small-change exception/i,
        message: "forbid exceptions that bypass complete symbol deletion evidence",
      },
      {
        regex: /Delete only when that binding has zero remaining references.*every remaining reference is intentionally updated by the requirement.*Same-spelled symbols bound independently in other scopes do not block the deletion/is,
        message: "require zero references or intentional call-site updates before deletion",
      },
      {
        regex: /Before commit.*inspect every deleted line in the staged diff.*unexplained or unrelated deletion blocks the commit/is,
        message: "audit every deleted line before commit",
      },
      {
        regex: /^(?![\s\S]*(?:import-only|cleanup|small-change).{0,80}(?:may|can) skip)[\s\S]*$/i,
        message: "forbid exceptions that bypass complete symbol deletion evidence",
      },
      {
        regex: /^(?![\s\S]*(?:import-only|cleanup|small(?:-| )change)(?: changes?)?.{0,40}(?:are|is|may be|can be)\s+(?:exempt|optional|not required|allowed to bypass))[\s\S]*$/i,
        message: "forbid exceptions that bypass complete symbol deletion evidence",
      },
    ],
  },
  {
    id: "code-change-verification-safety",
    file: "rules/code_change_safety.md",
    patterns: [
      {
        regex: /For Vue or TypeScript changes.*repository provides a permitted project-defined type-check command.*run it.*`ts-check` script using `vue-tsc`.*do not substitute a direct compiler command that the repository rules prohibit/is,
        message: "require type-check evidence for Vue and TypeScript changes",
      },
      {
        regex: /repository provides a permitted project-defined type-check command, run it/i,
        message: "use the repository-defined type-check command",
      },
      {
        regex: /If no permitted project-defined type-check command exists.*`TYPECHECK_UNAVAILABLE`.*do not invent or install one.*risk-equivalent focused static check.*applicable runtime smoke.*must not be reported as a passing type-check/is,
        message: "define a non-blocking but explicit fallback when no legal type-check command exists",
      },
      {
        regex: /baseline already fails.*before and after diagnostics.*reject any new error/is,
        message: "compare type-check diagnostics against a failing baseline",
      },
      {
        regex: /Build, lint, format, and source-string assertions do not substitute for type-check/i,
        message: "require type-check evidence for Vue and TypeScript changes",
      },
      {
        regex: /Do not dismiss a failing verifier as pre-existing without before\/after evidence, and do not replace a failing broad verifier with a narrower check that cannot detect the edited risk/i,
        message: "forbid shrinking verification to escape a failure",
      },
      {
        regex: /A small or import-only change is not by itself a reason to skip the applicable type-check or runtime smoke/i,
        message: "forbid small-change exceptions that bypass type-check",
      },
      {
        regex: /^(?![\s\S]*(?:small|import-only).{0,80}(?:may|can) skip (?:the )?type-check)[\s\S]*$/i,
        message: "forbid small-change exceptions that bypass type-check",
      },
      {
        regex: /^(?![\s\S]*(?:type-check.{0,100}(?:need not|does not need|is optional|is not required|may be omitted|can be omitted).{0,100}(?:small|import-only)|(?:small|import-only).{0,100}type-check.{0,100}(?:need not|does not need|is optional|is not required|may be omitted|can be omitted)))[\s\S]*$/i,
        message: "forbid small-change exceptions that bypass type-check",
      },
    ],
  },
  {
    id: "code-change-runtime-safety",
    file: "rules/code_change_safety.md",
    patterns: [
      {
        regex: /changing user interaction or a dependency used during component setup.*imports, stores, composables, and event registration.*component or browser runtime smoke test/is,
        message: "runtime-smoke user interactions and component setup dependencies",
      },
      {
        regex: /If an applicable required verifier above is missing, blocked, or fails, mark the affected change `UNVERIFIED`/i,
        message: "block publication when runtime smoke is missing, blocked, or failing",
      },
      {
        regex: /applicable required verifier above is missing, blocked, or fails.*`UNVERIFIED`.*commit, merge, push, deploy, and release are blocked until the user explicitly accepts that exact verification gap/is,
        message: "block publishing unverified interaction changes without explicit acceptance",
      },
      {
        regex: /`TYPECHECK_UNAVAILABLE` alone is not a failed verifier only when the prescribed risk-equivalent static check and every applicable runtime smoke have completed and passed/i,
        message: "allow the no-command fallback only after equivalent evidence passes",
      },
      {
        regex: /A small or import-only change is not by itself a reason to skip the applicable type-check or runtime smoke/i,
        message: "forbid import-only exceptions that bypass runtime smoke",
      },
      {
        regex: /^(?![\s\S]*(?:small|import-only).{0,80}(?:may|can) skip (?:the )?runtime smoke)[\s\S]*$/i,
        message: "forbid import-only exceptions that bypass runtime smoke",
      },
      {
        regex: /^(?![\s\S]*(?:runtime smoke.{0,100}(?:is optional|is not required|need not|does not need|may be omitted|can be omitted).{0,100}(?:small|import-only)|(?:small|import-only).{0,100}runtime smoke.{0,100}(?:is optional|is not required|need not|does not need|may be omitted|can be omitted)))[\s\S]*$/i,
        message: "forbid import-only exceptions that bypass runtime smoke",
      },
      {
        regex: /^(?![\s\S]*(?:deploy|release|publish).{0,80}(?:may|can|is allowed to)\s+(?:still\s+)?proceed.{0,120}(?:runtime )?smoke.{0,50}(?:fails?|failed|missing|blocked|without))[\s\S]*$/i,
        message: "block publishing unverified interaction changes without explicit acceptance",
      },
    ],
  },
  {
    id: "spec-backend-gap-interaction",
    file: "skills/spec-driven-workflow/SKILL.md",
    patterns: [
      {
        regex: /需求要求的控制項必須保持 enabled、selectable、editable/i,
        message: "keep required controls interactive in specs",
      },
      {
        regex: /API、schema、endpoint 或 persistence 缺口不得作為 hide、pre-disable 或 lock 的理由/i,
        message: "forbid backend-driven pre-disable behavior in specs",
      },
      {
        regex: /使用者完成輸入並嘗試動作後.*後端拒絕或無法持久化.*保留表單狀態.*明確提醒哪些值未儲存/is,
        message: "specify post-action reminder and input preservation",
      },
      {
        regex: /不得顯示假成功或靜默丟值/i,
        message: "forbid fake success and silent value loss in specs",
      },
      {
        regex: /權限、破壞性操作確認、in-flight 防重複、loading lock 與客觀無效輸入/is,
        message: "retain legitimate blockers in specs",
      },
      {
        regex: /實質 API 契約缺口必須即時告知.*同一個 user-facing turn.*缺少／未知的契約.*已查證據.*受影響 `REQ-ID`／畫面.*可安全繼續範圍.*owner／next action/is,
        message: "notify material API contract gaps during the discovery turn",
      },
      {
        regex: /`API_CONTRACT_MISSING`.*已告知的技術事實.*不需要 `DEC-ID`.*不可以/is,
        message: "keep missing API contracts distinct from product decisions and handoff-ready fallbacks",
      },
      {
        regex: /\[UNRESOLVED_API\].*`API_CONTRACT_MISSING`.*不可一面寫「待 API read-back／尚未提供」一面標 `CONFIRMED`/is,
        message: "keep requirement status consistent with unresolved API evidence",
      },
      {
        regex: /包括 `UI_REQUIRED_API_BLOCKED`.*API Contract Notification Log.*同輪 user-facing notification evidence.*fixture.*API／Network／persistence VT 維持 `BLOCKED`.*不可把 UI fixture pass 說成 integration success/is,
        message: "record notification evidence and keep fixture verification bounded",
      },
      {
        regex: /通知 evidence 必須以.*Reported in current task\/turn.*已於本輪告知.*pending.*任意非空文字都不算/is,
        message: "require positive same-turn notification evidence",
      },
      {
        regex: /\[VERIFIED_ABSENCE\].*schema／response evidence.*本 REQ 不需要／不受影響.*required 欄位確定缺少仍是 `API_CONTRACT_MISSING`.*unavailable.*不得使用此標記/is,
        message: "distinguish verified API omissions from unresolved contract gaps",
      },
      {
        regex: /active row 有 `UI_REQUIRED_API_BLOCKED`.*`BOUNDED_UI_ONLY`.*正常完整契約用 `FULL_CONTRACT`/is,
        message: "bind blocked UI handoff to a machine-readable execution boundary",
      },
      {
        regex: /^(?![\s\S]*保留 UI，局部 disable、阻擋儲存或明示待串接)[\s\S]*$/i,
        message: "reject the stale pre-disable fallback clause",
      },
    ],
  },
  {
    id: "spec-template-backend-gap-interaction",
    file: "skills/spec-driven-workflow/spec-template.md",
    patterns: [
      {
        regex: /## Edge Cases(?:(?!\n## ).)*error \/ API unavailable[^\n]*控制項保持可操作[^\n]*保留輸入[^\n]*明確提醒[^\n]*未儲存/is,
        message: "template backend gaps as post-action feedback",
      },
      {
        regex: /不得因 API、schema、endpoint 或 persistence 缺口預先 disable、hide 或 lock/is,
        message: "template must forbid backend-driven pre-disable behavior",
      },
      {
        regex: /## Edge Cases(?:(?!\n## ).)*error \/ API unavailable[^\n]*不得假成功或靜默丟值/is,
        message: "template must forbid fake success and silent value loss",
      },
      {
        regex: /## Edge Cases(?:(?!\n## ).)*合法阻擋[^\n]*權限[^\n]*破壞性操作確認[^\n]*in-flight 防重複[^\n]*loading lock[^\n]*客觀無效輸入/is,
        message: "template must retain legitimate interaction blockers",
      },
      {
        regex: /Status 只能使用.*`API_CONTRACT_MISSING`.*`UI_REQUIRED_API_BLOCKED`/is,
        message: "template must expose the missing-contract status",
      },
      {
        regex: /\[UNRESOLVED_API\].*status 填 `API_CONTRACT_MISSING`.*不可寫「待 API read-back／尚未提供」卻標 `CONFIRMED`/is,
        message: "template must prevent false CONFIRMED API rows",
      },
      {
        regex: /\[VERIFIED_ABSENCE\].*schema／response evidence.*本 REQ 不需要／不受影響.*required 欄位確定缺少仍須標 `API_CONTRACT_MISSING` 並通知.*unavailable.*不算 verified absence/is,
        message: "template must document verified API omissions without false blockers",
      },
      {
        regex: /## API Contract Notification Log.*Notification ID.*Missing API contract \/ evidence.*Safe scope \/ next action.*User-facing notification \/ evidence/is,
        message: "template must capture API gap notification evidence",
      },
      {
        regex: /User-facing notification evidence 必須是.*Reported in current task\/turn.*已於本輪告知.*pending.*任意非空文字都不算/is,
        message: "template must require positive same-turn notification evidence",
      },
      {
        regex: /Execution boundary: `FULL_CONTRACT`.*解完 active `API_CONTRACT_MISSING`／`PROVISIONAL`／`SOURCE_CONFLICT`.*bounded UI fallback.*`UI_REQUIRED_API_BLOCKED`.*`BOUNDED_UI_ONLY`.*API／Network／persistence VT.*notification.*`BLOCKED`／open/is,
        message: "template must block broad handoff of unresolved API integration",
      },
      {
        regex: /^(?![\s\S]*error \/ API unavailable：`<保留哪些 UI、局部阻擋什麼>`)[\s\S]*$/i,
        message: "reject the stale template blocker placeholder",
      },
    ],
  },
  {
    id: "multiverse-remote-i18n-missing-key",
    file: "rules/multiverse.md",
    patterns: [
      {
        regex: /requirement needs copy but has no remote key.*search, reuse, create, and report/is,
        message: "route old-Multiverse missing keys through the common remote-i18n flow",
      },
    ],
  },
  {
    id: "nx-remote-i18n-missing-key",
    file: "rules/multiverse_nx.md",
    patterns: [
      {
        regex: /original page has no matching key.*search, reuse, create, and report/is,
        message: "route NX migration gaps through the common remote-i18n flow",
      },
    ],
  },
  {
    id: "dashboard-local-test-project-install",
    file: "projects.json",
    expectedProjectCodexRules: [
      { project: "Whitelabel_GSI_Dashboard", rule: "dashboard_local_testing.md" },
    ],
    exclusiveProjectCodexRules: [
      { rule: "dashboard_local_testing.md", owners: ["Whitelabel_GSI_Dashboard"] },
    ],
    expectedProjectFlags: [
      { project: "Whitelabel_GSI_Dashboard", flag: "localTestLogin" },
    ],
    forbiddenProjectFlags: [
      { project: "Whitelabel_GSI_Platform_Multiverse", flag: "localTestLogin" },
      { project: "whitelabel-frontend-config", flag: "localTestLogin" },
      { project: "static-resources", flag: "localTestLogin" },
      { project: "whitelabel-gsi-platform-multiverse-nx", flag: "localTestLogin" },
      { project: "whitelabel-gsi-locale-manager", flag: "localTestLogin" },
    ],
    patterns: [],
  },
  {
    id: "code-change-safety-project-install",
    file: "projects.json",
    expectedProjectRules: [
      { project: "Whitelabel_GSI_Platform_Multiverse", rule: "code_change_safety.md" },
      { project: "Whitelabel_GSI_Dashboard", rule: "code_change_safety.md" },
      { project: "whitelabel-frontend-config", rule: "code_change_safety.md" },
      { project: "static-resources", rule: "code_change_safety.md" },
      { project: "whitelabel-gsi-platform-multiverse-nx", rule: "code_change_safety.md" },
      { project: "whitelabel-gsi-locale-manager", rule: "code_change_safety.md" },
    ],
    patterns: [],
  },
  {
    id: "wow-gsi-api-gate-project-install",
    file: "projects.json",
    expectedProjectRules: [
      { project: "Whitelabel_GSI_Platform_Multiverse", rule: "wow_gsi.md" },
      { project: "Whitelabel_GSI_Dashboard", rule: "wow_gsi.md" },
      { project: "whitelabel-frontend-config", rule: "wow_gsi.md" },
      { project: "static-resources", rule: "wow_gsi.md" },
      { project: "whitelabel-gsi-platform-multiverse-nx", rule: "wow_gsi.md" },
    ],
    patterns: [],
  },
  {
    id: "remote-i18n-project-skill-install",
    file: "projects.json",
    expectedProjectSkills: [
      { project: "Whitelabel_GSI_Platform_Multiverse", skill: "locale-entry-maintenance" },
      { project: "Whitelabel_GSI_Dashboard", skill: "locale-entry-maintenance" },
      { project: "whitelabel-gsi-platform-multiverse-nx", skill: "locale-entry-maintenance" },
    ],
    forbiddenProjectSkills: [
      { project: "whitelabel-frontend-config", skill: "locale-entry-maintenance" },
      { project: "static-resources", skill: "locale-entry-maintenance" },
    ],
    patterns: [],
  },
  {
    id: "managed-workflow-project-skill-install",
    file: "projects.json",
    expectedProjectSkills: [
      { project: "Whitelabel_GSI_Platform_Multiverse", skill: "requirements-grill" },
      { project: "Whitelabel_GSI_Platform_Multiverse", skill: "diagnosing-bugs" },
      { project: "Whitelabel_GSI_Platform_Multiverse", skill: "deep-module-design" },
      { project: "Whitelabel_GSI_Dashboard", skill: "requirements-grill" },
      { project: "Whitelabel_GSI_Dashboard", skill: "diagnosing-bugs" },
      { project: "Whitelabel_GSI_Dashboard", skill: "deep-module-design" },
      { project: "whitelabel-frontend-config", skill: "requirements-grill" },
      { project: "whitelabel-frontend-config", skill: "diagnosing-bugs" },
      { project: "whitelabel-frontend-config", skill: "deep-module-design" },
      { project: "static-resources", skill: "requirements-grill" },
      { project: "static-resources", skill: "diagnosing-bugs" },
      { project: "static-resources", skill: "deep-module-design" },
      { project: "whitelabel-gsi-platform-multiverse-nx", skill: "requirements-grill" },
      { project: "whitelabel-gsi-platform-multiverse-nx", skill: "diagnosing-bugs" },
      { project: "whitelabel-gsi-platform-multiverse-nx", skill: "deep-module-design" },
      { project: "whitelabel-gsi-locale-manager", skill: "requirements-grill" },
      { project: "whitelabel-gsi-locale-manager", skill: "diagnosing-bugs" },
      { project: "whitelabel-gsi-locale-manager", skill: "deep-module-design" },
    ],
    patterns: [],
  },
  {
    id: "locale-no-spreadsheet",
    file: "skills/locale-entry-maintenance/SKILL.md",
    patterns: [
      {
        regex: /Google Sheets.*does not trigger.*spreadsheet skill/is,
        message: "exclude the standalone spreadsheet skill for a Sheets-backed API",
      },
    ],
  },
  {
    id: "locale-quota-stop",
    file: "skills/locale-entry-maintenance/SKILL.md",
    patterns: [
      {
        regex: /單日叫用下列服務的次數過多：translate/i,
        message: "recognize the Google Apps Script Translate quota error",
      },
      {
        regex: /On the first Translate quota error, stop issuing new writes\. Perform one read-back, then report persisted and remaining entries as a resumable remaining-key list\. Do not shrink batches or try single-key writes that turn\./is,
        message: "stop at the first quota error and perform exactly one bounded read-back",
      },
      {
        regex: /ambiguous non-quota response.*one read-back.*classify no write, partial write, or complete write.*at most one retry per operation.*remaining delta/is,
        message: "classify ambiguous writes and cap recovery at one remaining-delta retry",
      },
    ],
  },
  {
    id: "locale-partial-resume",
    file: "skills/locale-entry-maintenance/SKILL.md",
    patterns: [
      {
        regex: /Fetch the target dataset once as a full snapshot before writing/i,
        message: "take one full initial snapshot before writing",
      },
      {
        regex: /exact-key and normalized-copy indexes.*Compute the complete delta before writing/is,
        message: "index the snapshot and compute the full delta before writing",
      },
      {
        regex: /batches of at most 10 entries/i,
        message: "cap Locale write batches at 10 entries",
      },
      {
        regex: /After every successful batch, perform one read-back and verify only the affected keys/is,
        message: "read back and verify affected keys after successful batches",
      },
      {
        regex: /later resume turn.*fresh target-dataset snapshot.*recompute the delta.*remaining-key list.*send only keys that are still missing or mismatched/is,
        message: "resume from a fresh snapshot and write only the remaining delta",
      },
      {
        regex: /For add\/update, require every requested `en`, `zh-TW`, and `zh-CN` value to match read-back[\s\S]*Report `COMPLETE` only when all requested keys pass/is,
        message: "tie COMPLETE to read-back of every requested priority-locale value",
      },
    ],
  },
  {
    id: "cross-template-shared-code-trigger",
    file: "skills/multiverse-cross-template-bugfix/SKILL.md",
    expectedName: "multiverse-cross-template-bugfix",
    patterns: [
      {
        target: "description",
        regex: /^Use when\b/i,
        message: "start the description with Use when",
      },
      {
        target: "description",
        regex: /shared `?src\/common`?.*multiple templates/is,
        message: "trigger on shared src/common code used by multiple templates",
      },
      {
        target: "description",
        regex: /template-local.*do not use/is,
        message: "retain the confirmed template-local non-trigger",
      },
      {
        regex: /同時搜尋 `src\/common\/` 與 `template\/`/i,
        message: "search shared and template code together",
      },
    ],
  },
  {
    id: "cross-template-provider-family",
    file: "skills/multiverse-cross-template-bugfix/SKILL.md",
    patterns: [
      {
        regex: /## Provider language implementation family(?:(?!\n## ).)*launch\/request (?:language )?mapping/is,
        message: "check launch/request language mapping",
      },
      {
        regex: /## Provider language implementation family(?:(?!\n## ).)*renderer initialization mapping/is,
        message: "check renderer initialization mapping",
      },
      {
        regex: /## Provider language implementation family(?:(?!\n## ).)*fallback behavior/is,
        message: "check provider fallback behavior",
      },
      {
        regex: /## Provider language implementation family(?:(?!\n## ).)*shared hook／adapter／mapping 的 all callers/is,
        message: "inventory all callers inside the provider implementation family",
      },
      {
        regex: /## Provider language implementation family(?:(?!\n## ).)*分別取得 request 與 renderer evidence/is,
        message: "require separate request and renderer evidence",
      },
      {
        regex: /## Provider language implementation family(?:(?!\n## ).)*fallback 不會把已支援語系降回預設語系/is,
        message: "prove fallback does not downgrade a supported locale",
      },
    ],
  },
  {
    id: "spec-phase-exit",
    file: "skills/spec-driven-workflow/SKILL.md",
    expectedName: "spec-driven-workflow",
    patterns: [
      {
        target: "description",
        regex: /^Use when\b/i,
        message: "start the description with Use when",
      },
      {
        target: "description",
        regex: /^Use when the user explicitly asks to author, update, hand off, or audit a spec for fidelity and requirement drift\./i,
        message: "scope positive triggers to spec authoring and fidelity or drift audits",
      },
      {
        target: "description",
        regex: /direct implementation.*branch.*commit.*push.*release.*deploy/is,
        message: "put implementation and release non-triggers in discovery metadata",
      },
      {
        regex: /read an approved spec without loading the spec-authoring workflow/i,
        message: "allow implementation to consume a spec after the authoring skill exits",
      },
      {
        regex: /最新要求改成.*退出此 skill.*重新選擇流程/is,
        message: "exit and reselect workflow when the requested outcome changes",
      },
    ],
  },
  {
    id: "pixel-functional-screenshot-non-trigger",
    file: "skills/figma-pixel-implementation/SKILL.md",
    expectedName: "figma-pixel-implementation",
    patterns: [
      {
        target: "description",
        regex: /^Use when\b/i,
        message: "start the description with Use when",
      },
      {
        target: "description",
        regex: /pixel-perfect.*visual parity.*screenshot-based layout recreation.*visual comparison.*precise spacing, font, and size correction/is,
        message: "include all explicit visual-recreation triggers",
      },
      {
        target: "description",
        regex: /Do not use when a screenshot only demonstrates a functional defect.*missing icon font.*untranslated key.*runtime error.*wrong data/is,
        message: "make functional screenshots an explicit discovery non-trigger",
      },
      {
        regex: /截圖若只用來呈現 functional defect.*不觸發此 skill/is,
        message: "keep the functional-screenshot non-trigger in the workflow body",
      },
    ],
  },
  {
    id: "pixel-visual-authority-trigger",
    file: "skills/figma-pixel-implementation/SKILL.md",
    expectedName: "figma-pixel-implementation",
    patterns: [
      {
        target: "description",
        regex: /a Figma node or image is the authoritative source for a user-visible UI implementation or visual fix/i,
        message: "trigger whenever Figma or an image is authoritative for a user-visible implementation or visual fix",
      },
      {
        target: "description",
        regex: /even when the user does not say pixel-perfect/i,
        message: "do not require the user to repeat the pixel-perfect keyword",
      },
    ],
  },
  {
    id: "pixel-measurement-scope",
    file: "skills/figma-pixel-implementation/SKILL.md",
    patterns: [
      {
        regex: /量測目標節點、直到 viewport 的 ancestor／layout shell，以及會改變可用空間的 sibling/i,
        message: "measure the target, ancestor layout shell, and space-affecting siblings",
      },
      {
        regex: /viewport → global navigation\/sidebar → page shell → section padding → local aside → gap → target container/i,
        message: "record the complete runtime width chain",
      },
      {
        regex: /Figma 連結若只指向子節點.*不得用該子節點推定外層 container/is,
        message: "prevent child-node measurements from authorizing outer containers",
      },
    ],
  },
  {
    id: "pixel-completion-gate",
    file: "skills/figma-pixel-implementation/SKILL.md",
    patterns: [
      {
        regex: /build、lint、unit test、class\/source 字串斷言都不是視覺完成證據/i,
        message: "reject build and source-string assertions as visual completion evidence",
      },
      {
        regex: /每個 frozen state 都有實際 rendered page 的 viewport、getBoundingClientRect 與 computed style read-back/i,
        message: "require rendered viewport, DOM dimensions, and computed styles for every frozen state",
      },
      {
        regex: /每個 state 都有 baseline 與 final screenshot.*final screenshot 路徑已寫回 manifest/is,
        message: "require baseline and final screenshots in the manifest",
      },
      {
        regex: /任何 frozen state 無法開啟、登入、載入資料、截圖或量測時，完成狀態只能是 `UNVERIFIED`/i,
        message: "mark unreproducible visual states UNVERIFIED instead of complete",
      },
    ],
  },
];

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};

  const frontmatter = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    let value = field[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    frontmatter[field[1]] = value;
  }
  return frontmatter;
}

function runChecks(rootDir) {
  return CONTRACTS.flatMap((contract) => {
    const absolutePath = path.join(rootDir, contract.file);
    const text = fs.readFileSync(absolutePath, "utf8");
    const frontmatter = parseFrontmatter(text);

    const issues = [];
    if (contract.expectedSha256) {
      const actualSha256 = crypto.createHash("sha256").update(text, "utf8").digest("hex");
      if (actualSha256 !== contract.expectedSha256) {
        issues.push({
          id: contract.id,
          file: contract.file,
          message: contract.sha256Message || "keep the reviewed policy byte-for-byte canonical",
        });
      }
    }

    if (contract.expectedName && frontmatter.name !== contract.expectedName) {
      issues.push({
        id: contract.id,
        file: contract.file,
        message: `keep frontmatter name as ${contract.expectedName}`,
      });
    }

    if (contract.expectedProjectSkills) {
      let projects = [];
      try {
        projects = JSON.parse(text).projects || [];
      } catch {
        issues.push({
          id: contract.id,
          file: contract.file,
          message: "keep projects.json valid JSON",
        });
      }

      for (const expected of contract.expectedProjectSkills) {
        const project = projects.find((candidate) => candidate.name === expected.project);
        if (!project || !(project.skills || []).includes(expected.skill)) {
          issues.push({
            id: contract.id,
            file: contract.file,
            message: `install ${expected.skill} for ${expected.project}`,
          });
        }
      }
    }

    if (contract.expectedProjectRules) {
      let projects = [];
      try {
        projects = JSON.parse(text).projects || [];
      } catch {
        issues.push({
          id: contract.id,
          file: contract.file,
          message: "keep projects.json valid JSON",
        });
      }

      for (const expected of contract.expectedProjectRules) {
        const project = projects.find((candidate) => candidate.name === expected.project);
        if (!project || !(project.rules || []).includes(expected.rule)) {
          issues.push({
            id: contract.id,
            file: contract.file,
            message: `install ${expected.rule} for ${expected.project}`,
          });
        }
      }
    }

    if (
      contract.expectedProjectCodexRules ||
      contract.exclusiveProjectCodexRules ||
      contract.expectedProjectFlags ||
      contract.forbiddenProjectFlags
    ) {
      let projects = [];
      try {
        projects = JSON.parse(text).projects || [];
      } catch {
        issues.push({
          id: contract.id,
          file: contract.file,
          message: "keep projects.json valid JSON",
        });
      }

      for (const expected of contract.expectedProjectCodexRules || []) {
        const project = projects.find((candidate) => candidate.name === expected.project);
        if (!project || !(project.codexRules || []).includes(expected.rule)) {
          issues.push({
            id: contract.id,
            file: contract.file,
            message: `install ${expected.rule} as a Codex-only rule for ${expected.project}`,
          });
        }
      }

      for (const expected of contract.exclusiveProjectCodexRules || []) {
        const actualOwners = projects
          .filter((project) => (project.codexRules || []).includes(expected.rule))
          .map((project) => project.name)
          .sort();
        const expectedOwners = expected.owners.slice().sort();
        if (JSON.stringify(actualOwners) !== JSON.stringify(expectedOwners)) {
          issues.push({
            id: contract.id,
            file: contract.file,
            message: `keep ${expected.rule} exclusive to ${expectedOwners.join(", ")}`,
          });
        }
      }

      for (const expected of contract.expectedProjectFlags || []) {
        const project = projects.find((candidate) => candidate.name === expected.project);
        if (!project || project[expected.flag] !== true) {
          issues.push({
            id: contract.id,
            file: contract.file,
            message: `enable ${expected.flag} only for ${expected.project}`,
          });
        }
      }

      for (const forbidden of contract.forbiddenProjectFlags || []) {
        const project = projects.find((candidate) => candidate.name === forbidden.project);
        if (project && project[forbidden.flag] === true) {
          issues.push({
            id: contract.id,
            file: contract.file,
            message: `keep ${forbidden.flag} disabled for ${forbidden.project}`,
          });
        }
      }
    }

    if (contract.forbiddenProjectSkills) {
      let projects = [];
      try {
        projects = JSON.parse(text).projects || [];
      } catch {
        // Invalid JSON is already reported by the expected-project check above.
      }

      for (const forbidden of contract.forbiddenProjectSkills) {
        const project = projects.find((candidate) => candidate.name === forbidden.project);
        if (project && (project.skills || []).includes(forbidden.skill)) {
          issues.push({
            id: contract.id,
            file: contract.file,
            message: `do not install ${forbidden.skill} for ${forbidden.project}`,
          });
        }
      }
    }

    return issues.concat(contract.patterns
      .filter((pattern) => {
        const target = pattern.target
          ? String(frontmatter[pattern.target] || "")
          : text;
        return !pattern.regex.test(target);
      })
      .map((pattern) => ({
        id: contract.id,
        file: contract.file,
        message: pattern.message,
      })));
  });
}

function main() {
  const rootDir = path.join(__dirname, "..");
  const issues = runChecks(rootDir);
  if (issues.length === 0) {
    process.stdout.write("Skill routing contracts valid.\n");
    return;
  }

  for (const issue of issues) {
    process.stderr.write(`${issue.id} (${issue.file}): ${issue.message}\n`);
  }
  process.exitCode = 1;
}

if (require.main === module) main();

module.exports = { CONTRACTS, runChecks };
