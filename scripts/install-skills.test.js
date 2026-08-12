#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const rootDir = path.join(__dirname, "..");

test("install exposes shared skills through Codex native discovery and keeps Claude compatibility", (t) => {
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
  fs.writeFileSync(path.join(fixtureRoot, "rules/fixture.md"), "Fixture rule.\n");

  const projectDir = path.join(fixtureRoot, "project");
  fs.mkdirSync(path.join(projectDir, ".git/info"), { recursive: true });
  fs.writeFileSync(path.join(projectDir, ".git/info/exclude"), "");
  fs.writeFileSync(
    path.join(fixtureRoot, "projects.json"),
    JSON.stringify({
      projects: [
        {
          name: "fixture-project",
          path: projectDir,
          rules: ["fixture.md"],
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

  const exclude = fs.readFileSync(path.join(projectDir, ".git/info/exclude"), "utf8");
  assert.match(exclude, /^\.agents\/skills\/figma-pixel-implementation\/$/m);
  assert.match(exclude, /^\.claude\/skills\/figma-pixel-implementation\/$/m);
});
