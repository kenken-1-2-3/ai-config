#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const rootDir = path.join(__dirname, "..");

test("install exposes native skills and generated code-change safety rules", (t) => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-config-install-"));
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

  fs.mkdirSync(path.join(fixtureRoot, "scripts"), { recursive: true });
  fs.copyFileSync(path.join(rootDir, "install.sh"), path.join(fixtureRoot, "install.sh"));
  fs.copyFileSync(
    path.join(rootDir, "scripts/gen-skill-index.js"),
    path.join(fixtureRoot, "scripts/gen-skill-index.js"),
  );

  const skillDir = path.join(fixtureRoot, "skills/figma-pixel-implementation");
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(
    path.join(skillDir, "SKILL.md"),
    "---\nname: figma-pixel-implementation\ndescription: Use when a Figma design is authoritative for UI work.\n---\n\n# Pixel\n",
  );
  fs.mkdirSync(path.join(fixtureRoot, "rules"), { recursive: true });
  fs.copyFileSync(
    path.join(rootDir, "rules/code_change_safety.md"),
    path.join(fixtureRoot, "rules/code_change_safety.md"),
  );

  const projectDir = path.join(fixtureRoot, "project");
  const init = spawnSync("git", ["init", "-q", projectDir], { encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr || init.stdout);
  fs.writeFileSync(
    path.join(fixtureRoot, "projects.json"),
    JSON.stringify({
      projects: [
        {
          name: "fixture-project",
          path: projectDir,
          rules: ["code_change_safety.md"],
          skills: ["figma-pixel-implementation"],
        },
      ],
    }),
  );

  const result = spawnSync("bash", [path.join(fixtureRoot, "install.sh")], {
    cwd: fixtureRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const nativeSkill = path.join(
    projectDir,
    ".agents/skills/figma-pixel-implementation/SKILL.md",
  );
  const claudeSkill = path.join(
    projectDir,
    ".claude/skills/figma-pixel-implementation/SKILL.md",
  );
  assert.equal(fs.readFileSync(nativeSkill, "utf8"), fs.readFileSync(claudeSkill, "utf8"));

  const rules = fs.readFileSync(path.join(projectDir, "AGENTS.override.md"), "utf8");
  assert.match(
    rules,
    /figma-pixel-implementation.*\[native\].*\.agents\/skills\/figma-pixel-implementation\/SKILL\.md/i,
  );
  assert.match(rules, /# Code Change Safety/);
  assert.match(rules, /partial file read or narrow search is not evidence/i);
  assert.match(rules, /commit, merge, push, deploy, and release are blocked/i);

  const personalRules = fs.readFileSync(
    path.join(projectDir, ".codex/personal_rules.md"),
    "utf8",
  );
  assert.match(personalRules, /# Code Change Safety/);

  const exclude = fs.readFileSync(path.join(projectDir, ".git/info/exclude"), "utf8");
  assert.match(exclude, /^\.agents\/skills\/figma-pixel-implementation\/$/m);
  assert.match(exclude, /^\.claude\/skills\/figma-pixel-implementation\/$/m);
});

test("git ignores the local test login source", () => {
  const loginResult = spawnSync(
    "git",
    ["check-ignore", "--no-index", ".local/test-logins/Whitelabel_GSI_Dashboard.json"],
    { cwd: rootDir, encoding: "utf8" },
  );
  const unrelatedResult = spawnSync(
    "git",
    ["check-ignore", "--no-index", ".local/unrelated.txt"],
    { cwd: rootDir, encoding: "utf8" },
  );

  assert.equal(loginResult.status, 0, loginResult.stderr || loginResult.stdout);
  assert.equal(unrelatedResult.status, 1, unrelatedResult.stderr || unrelatedResult.stdout);
});

test("install makes a local test login available only to Codex without exposing it", (t) => {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-config-local-login-"));
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

  fs.mkdirSync(path.join(fixtureRoot, "scripts"), { recursive: true });
  fs.copyFileSync(path.join(rootDir, "install.sh"), path.join(fixtureRoot, "install.sh"));
  fs.copyFileSync(
    path.join(rootDir, "scripts/gen-skill-index.js"),
    path.join(fixtureRoot, "scripts/gen-skill-index.js"),
  );

  fs.mkdirSync(path.join(fixtureRoot, "rules"), { recursive: true });
  fs.copyFileSync(
    path.join(rootDir, "rules/dashboard_local_testing.md"),
    path.join(fixtureRoot, "rules/dashboard_local_testing.md"),
  );
  fs.writeFileSync(path.join(fixtureRoot, "rules/fixture.md"), "Fixture rule.\n");

  const projectName = "Whitelabel_GSI_Dashboard";
  const configuredProject = JSON.parse(
    fs.readFileSync(path.join(rootDir, "projects.json"), "utf8"),
  ).projects.find((project) => project.name === projectName);
  assert.equal(configuredProject.localTestLogin, true);
  const projectDir = path.join(fixtureRoot, "project");
  const init = spawnSync("git", ["init", "-q", projectDir], { encoding: "utf8" });
  assert.equal(init.status, 0, init.stderr || init.stdout);

  const localLogin = {
    scope: "agent-side-local-test-only",
    username: "fixture-user",
    password: "fixture-secret-never-print",
    agentCode: "fixture-agent",
  };
  const localSource = path.join(fixtureRoot, ".local/test-logins", `${projectName}.json`);
  fs.mkdirSync(path.dirname(localSource), { recursive: true });
  fs.writeFileSync(localSource, `${JSON.stringify(localLogin, null, 2)}\n`);

  fs.writeFileSync(
    path.join(fixtureRoot, "projects.json"),
    JSON.stringify({
      projects: [
        {
          name: projectName,
          path: projectDir,
          rules: ["fixture.md"],
          codexRules: configuredProject.codexRules || [],
          localTestLogin: configuredProject.localTestLogin === true,
          skills: [],
        },
      ],
    }),
  );

  const result = spawnSync("bash", [path.join(fixtureRoot, "install.sh")], {
    cwd: fixtureRoot,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);

  const target = path.join(projectDir, ".codex/local-test-login.json");
  assert.equal(fs.existsSync(target), true, "installer must copy the local login source");
  assert.deepEqual(JSON.parse(fs.readFileSync(target, "utf8")), localLogin);
  assert.equal(fs.statSync(target).mode & 0o777, 0o600);
  assert.equal(fs.statSync(localSource).mode & 0o777, 0o600);

  const secret = localLogin.password;
  const output = `${result.stdout}\n${result.stderr}`;
  const agentsRules = fs.readFileSync(path.join(projectDir, "AGENTS.override.md"), "utf8");
  const personalRules = fs.readFileSync(
    path.join(projectDir, ".codex/personal_rules.md"),
    "utf8",
  );
  const claudeRules = fs.readFileSync(path.join(projectDir, "CLAUDE.local.md"), "utf8");

  assert.match(agentsRules, /# Dashboard Local Test Login/);
  assert.match(personalRules, /# Dashboard Local Test Login/);
  assert.match(agentsRules, /local application origin such as `localhost` or `127\.0\.0\.1`/);
  assert.match(agentsRules, /Do not use these credentials on a remote UI origin or for member-side testing/);
  assert.doesNotMatch(claudeRules, /# Dashboard Local Test Login/);
  for (const value of [localLogin.username, secret, localLogin.agentCode]) {
    for (const text of [output, agentsRules, personalRules, claudeRules]) {
      assert.equal(text.includes(value), false);
    }
  }
});

function createLocalLoginFixture(t, options = {}) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-config-login-gate-"));
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));

  fs.mkdirSync(path.join(fixtureRoot, "scripts"), { recursive: true });
  fs.copyFileSync(path.join(rootDir, "install.sh"), path.join(fixtureRoot, "install.sh"));
  fs.copyFileSync(
    path.join(rootDir, "scripts/gen-skill-index.js"),
    path.join(fixtureRoot, "scripts/gen-skill-index.js"),
  );
  fs.mkdirSync(path.join(fixtureRoot, "rules"), { recursive: true });
  fs.writeFileSync(path.join(fixtureRoot, "rules/fixture.md"), "Fixture rule.\n");
  fs.copyFileSync(
    path.join(rootDir, "rules/dashboard_local_testing.md"),
    path.join(fixtureRoot, "rules/dashboard_local_testing.md"),
  );

  const projectName = options.projectName || "Whitelabel_GSI_Dashboard";
  const projectDir = path.join(fixtureRoot, "project");
  if (options.linkedWorktree) {
    const repositoryDir = path.join(fixtureRoot, "repository");
    let gitResult = spawnSync("git", ["init", "-q", repositoryDir], { encoding: "utf8" });
    assert.equal(gitResult.status, 0, gitResult.stderr || gitResult.stdout);
    fs.writeFileSync(path.join(repositoryDir, "README.md"), "fixture\n");
    gitResult = spawnSync("git", ["-C", repositoryDir, "add", "README.md"], {
      encoding: "utf8",
    });
    assert.equal(gitResult.status, 0, gitResult.stderr || gitResult.stdout);
    gitResult = spawnSync(
      "git",
      [
        "-C",
        repositoryDir,
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "-qm",
        "fixture",
      ],
      { encoding: "utf8" },
    );
    assert.equal(gitResult.status, 0, gitResult.stderr || gitResult.stdout);
    gitResult = spawnSync(
      "git",
      ["-C", repositoryDir, "worktree", "add", "-q", "-b", "fixture-linked", projectDir],
      { encoding: "utf8" },
    );
    assert.equal(gitResult.status, 0, gitResult.stderr || gitResult.stdout);
  } else {
    const init = spawnSync("git", ["init", "-q", projectDir], { encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr || init.stdout);
  }

  const localLogin = {
    scope: "agent-side-local-test-only",
    username: "gate-user",
    password: "gate-secret-never-print",
    agentCode: "gate-agent",
  };
  const localSource = path.join(fixtureRoot, ".local/test-logins", `${projectName}.json`);
  fs.mkdirSync(path.dirname(localSource), { recursive: true });
  fs.writeFileSync(localSource, `${JSON.stringify(localLogin, null, 2)}\n`);

  fs.writeFileSync(
    path.join(fixtureRoot, "projects.json"),
    JSON.stringify({
      projects: [
        {
          name: projectName,
          path: projectDir,
          rules: ["fixture.md"],
          codexRules: ["dashboard_local_testing.md"],
          localTestLogin: options.localTestLogin !== false,
          skills: options.skills || [],
        },
      ],
    }),
  );

  return {
    fixtureRoot,
    projectDir,
    localSource,
    target: path.join(projectDir, ".codex/local-test-login.json"),
    runInstall() {
      return spawnSync("bash", [path.join(fixtureRoot, "install.sh")], {
        cwd: fixtureRoot,
        encoding: "utf8",
      });
    },
  };
}

test("a later install failure still leaves the local login target ignored", (t) => {
  const fixture = createLocalLoginFixture(t, { skills: ["missing-skill"] });
  const result = fixture.runInstall();

  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(fixture.target), true);
  const ignored = spawnSync(
    "git",
    ["check-ignore", "--no-index", ".codex/local-test-login.json"],
    { cwd: fixture.projectDir, encoding: "utf8" },
  );
  assert.equal(ignored.status, 0, ignored.stderr || ignored.stdout);
});

test("a linked worktree ignores the local login target before a later failure", (t) => {
  const fixture = createLocalLoginFixture(t, {
    linkedWorktree: true,
    skills: ["missing-skill"],
  });
  assert.equal(fs.statSync(path.join(fixture.projectDir, ".git")).isFile(), true);

  const result = fixture.runInstall();

  assert.notEqual(result.status, 0);
  assert.equal(fs.existsSync(fixture.target), true);
  const ignored = spawnSync(
    "git",
    ["check-ignore", "--no-index", ".codex/local-test-login.json"],
    { cwd: fixture.projectDir, encoding: "utf8" },
  );
  assert.equal(ignored.status, 0, ignored.stderr || ignored.stdout);
});

test("removing the opted-in source revokes the managed local login target", (t) => {
  const fixture = createLocalLoginFixture(t);
  const firstRun = fixture.runInstall();
  assert.equal(firstRun.status, 0, firstRun.stderr || firstRun.stdout);
  assert.equal(fs.existsSync(fixture.target), true);

  fs.rmSync(fixture.localSource);
  const secondRun = fixture.runInstall();
  assert.equal(secondRun.status, 0, secondRun.stderr || secondRun.stdout);
  assert.equal(fs.existsSync(fixture.target), false);
});

test("disabling an opted-in project revokes only the managed local login target", (t) => {
  const fixture = createLocalLoginFixture(t);
  const firstRun = fixture.runInstall();
  assert.equal(firstRun.status, 0, firstRun.stderr || firstRun.stdout);
  assert.equal(fs.existsSync(fixture.target), true);

  const projectsFile = path.join(fixture.fixtureRoot, "projects.json");
  const projects = JSON.parse(fs.readFileSync(projectsFile, "utf8"));
  projects.projects[0].localTestLogin = false;
  fs.writeFileSync(projectsFile, `${JSON.stringify(projects, null, 2)}\n`);

  const secondRun = fixture.runInstall();
  assert.equal(secondRun.status, 0, secondRun.stderr || secondRun.stdout);
  assert.equal(fs.existsSync(fixture.target), false);
  assert.equal(fs.existsSync(fixture.localSource), true);
});

test("an invalid opted-in source revokes the managed local login target", (t) => {
  const fixture = createLocalLoginFixture(t);
  const firstRun = fixture.runInstall();
  assert.equal(firstRun.status, 0, firstRun.stderr || firstRun.stdout);
  assert.equal(fs.existsSync(fixture.target), true);

  fs.writeFileSync(fixture.localSource, '{"scope":"agent-side-local-test-only"}\n');
  const secondRun = fixture.runInstall();
  assert.notEqual(secondRun.status, 0);
  assert.equal(fs.existsSync(fixture.target), false);
});

test("a matching source is ignored when the project does not opt in", (t) => {
  const fixture = createLocalLoginFixture(t, {
    projectName: "Whitelabel_GSI_Platform_Multiverse",
    localTestLogin: false,
  });
  const result = fixture.runInstall();

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(fs.existsSync(fixture.target), false);
});
