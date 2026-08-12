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

  for (const file of new Set(CONTRACTS.map((contract) => contract.file))) {
    const source = path.join(rootDir, file);
    const destination = path.join(fixtureRoot, file);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
  }

  return fixtureRoot;
}

const weakeningScenarios = [
  {
    name: "unused capability loading",
    file: "rules/skill_trigger_guard.md",
    from: "Add capability skills only when their corresponding tool or artifact will actually be used.",
    to: "Add capability skills whenever they might help.",
    id: "routing-primary-limit",
    message: "load capability skills only for tools or artifacts actually used",
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
    from: "\"frontend_config.md\"\n      ],\n      \"skills\": [\n        \"spec-driven-workflow\",\n        \"figma-pixel-implementation\"\n      ]",
    to: "\"frontend_config.md\"\n      ],\n      \"skills\": [\n        \"spec-driven-workflow\",\n        \"figma-pixel-implementation\",\n        \"locale-entry-maintenance\"\n      ]",
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

for (const scenario of weakeningScenarios) {
  test(`checker rejects ${scenario.name}`, (t) => {
    const fixtureRoot = createFixture(t);
    const file = path.join(fixtureRoot, scenario.file);
    const original = fs.readFileSync(file, "utf8");
    assert.ok(original.includes(scenario.from), `fixture text missing: ${scenario.from}`);
    const weakened = original.replace(scenario.from, scenario.to);
    fs.writeFileSync(file, weakened + (scenario.append || ""));

    const issue = runChecks(fixtureRoot).find(
      (candidate) => candidate.id === scenario.id && candidate.message === scenario.message,
    );
    assert.ok(issue, `${scenario.id} did not reject ${scenario.name}`);
  });
}
