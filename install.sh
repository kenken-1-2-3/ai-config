#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECTS_FILE="$ROOT_DIR/projects.json"
RULES_DIR="$ROOT_DIR/rules"
SKILLS_DIR="$ROOT_DIR/skills"

expand_path() {
  local path="$1"
  if [[ "$path" == "~/"* ]]; then
    printf '%s/%s\n' "$HOME" "${path#\~/}"
  else
    printf '%s\n' "$path"
  fi
}

json_value() {
  local js="$1"
  node -e "$js" "$PROJECTS_FILE"
}

json_has_key() {
  local js="$1"
  node -e "$js" "$PROJECTS_FILE"
}

project_count="$(json_value 'const fs=require("fs"); const data=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(data.projects.length);')"

for ((i = 0; i < project_count; i++)); do
  name="$(json_value "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(data.projects[$i].name);")"
  raw_path="$(json_value "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(data.projects[$i].path);")"
  project_path="$(expand_path "$raw_path")"

  if [[ ! -d "$project_path" ]]; then
    echo "skip: $name ($project_path does not exist)"
    continue
  fi

  # Establish exclusions before any generated rule or credential is written,
  # so a later install failure cannot leave sensitive local files visible to Git.
  exclude_file=""
  if [[ -e "$project_path/.git" ]] &&
    exclude_file="$(git -C "$project_path" rev-parse --path-format=absolute --git-path info/exclude 2>/dev/null)"; then
    mkdir -p "$(dirname "$exclude_file")"
    touch "$exclude_file"
    if ! grep -qxF ".codex/" "$exclude_file"; then
      printf '\n.codex/\n' >> "$exclude_file"
    fi
    if ! grep -qxF "CLAUDE.local.md" "$exclude_file"; then
      printf 'CLAUDE.local.md\n' >> "$exclude_file"
    fi
    if ! grep -qxF "AGENTS.override.md" "$exclude_file"; then
      printf 'AGENTS.override.md\n' >> "$exclude_file"
    fi
  fi

  mkdir -p "$project_path/.codex"
  codex_output="$project_path/.codex/personal_rules.md"
  claude_output="$project_path/CLAUDE.local.md"
  agents_output="$project_path/AGENTS.override.md"

  local_test_login_source="$ROOT_DIR/.local/test-logins/$name.json"
  local_test_login_target="$project_path/.codex/local-test-login.json"
  local_test_login_enabled="$(json_value "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(data.projects[$i].localTestLogin === true ? 'yes' : 'no');")"
  has_local_test_login="no"
  if [[ "$local_test_login_enabled" != "yes" ]]; then
    rm -f "$local_test_login_target"
  else
    if [[ ! -f "$local_test_login_source" ]]; then
      rm -f "$local_test_login_target"
    elif ! node -e '
        const fs = require("fs");
        const source = process.argv[1];
        let login;
        try {
          login = JSON.parse(fs.readFileSync(source, "utf8"));
        } catch {
          console.error("invalid local test login JSON");
          process.exit(1);
        }
        const valid =
          login.scope === "agent-side-local-test-only" &&
          ["username", "password", "agentCode"].every(
            (key) => typeof login[key] === "string" && login[key].length > 0,
          );
        if (!valid) {
          console.error("invalid local test login fields");
          process.exit(1);
        }
      ' "$local_test_login_source"; then
      rm -f "$local_test_login_target"
      exit 1
    else
      chmod 600 "$local_test_login_source"
      local_test_login_temp="$local_test_login_target.tmp.$$"
      cp "$local_test_login_source" "$local_test_login_temp"
      chmod 600 "$local_test_login_temp"
      mv -f "$local_test_login_temp" "$local_test_login_target"
      has_local_test_login="yes"
    fi
  fi

  installed_skills=()
  skill_count="$(json_has_key "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log((data.projects[$i].skills || []).length);")"
  if [[ "$skill_count" != "0" ]]; then
    # Install into both native discovery paths:
    # - .agents/skills: Codex repo skill discovery
    # - .claude/skills: Claude Code compatibility
    mkdir -p "$project_path/.agents/skills"
    mkdir -p "$project_path/.claude/skills"
    for ((s = 0; s < skill_count; s++)); do
      skill_name="$(json_value "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); console.log(data.projects[$i].skills[$s]);")"
      skill_source="$SKILLS_DIR/$skill_name"
      codex_skill_target="$project_path/.agents/skills/$skill_name"
      claude_skill_target="$project_path/.claude/skills/$skill_name"
      if [[ ! -d "$skill_source" ]]; then
        echo "missing skill: $skill_name" >&2
        exit 1
      fi
      mkdir -p "$codex_skill_target" "$claude_skill_target"
      cp -R "$skill_source/." "$codex_skill_target/"
      cp -R "$skill_source/." "$claude_skill_target/"
      installed_skills+=(".agents/skills/$skill_name/" ".claude/skills/$skill_name/")
    done
  fi

  # Generate the Skills Index after copying configured skills so it contains
  # the current ai-config-shared and repo-native skill inventory.
  skill_index="$(node "$ROOT_DIR/scripts/gen-skill-index.js" "$project_path")"

  write_rule_sections() {
    local field="$1"
    local missing_label="$2"

    json_value "const fs=require('fs'); const data=JSON.parse(fs.readFileSync(process.argv[1],'utf8')); for (const rule of data.projects[$i].$field || []) console.log(rule);" |
      while IFS= read -r rule; do
        rule_path="$RULES_DIR/$rule"
        if [[ ! -f "$rule_path" ]]; then
          echo "missing $missing_label: $rule" >&2
          exit 1
        fi
        echo
        echo "<!-- BEGIN $rule -->"
        cat "$rule_path"
        echo
        echo "<!-- END $rule -->"
      done
  }

  write_skill_index() {
    if [[ -n "$skill_index" ]]; then
      printf '%s\n' "$skill_index"
    fi
  }

  write_rules_header() {
    local title="$1"

    echo "# $title"
    echo
    echo "Generated by: $ROOT_DIR/install.sh"
    echo "Project: $name"
    echo
  }

  # Keep high-priority instructions ahead of shared rules so they remain
  # visible within Codex's instruction byte cap. AGENTS.override.md includes
  # the repository's original AGENTS.md first to preserve native guidance.
  {
    echo "<!-- Generated by $ROOT_DIR/install.sh. Local only; do not commit. -->"
    echo "<!-- Codex reads AGENTS.override.md before AGENTS.md, so the repo's own AGENTS.md is inlined below to avoid shadowing it. -->"
    echo
    if [[ -f "$project_path/AGENTS.md" ]]; then
      echo "<!-- BEGIN original AGENTS.md -->"
      cat "$project_path/AGENTS.md"
      echo
      echo "<!-- END original AGENTS.md -->"
      echo
    fi
    write_rules_header "Personal Codex Rules (from ai-config)"
    write_skill_index
    write_rule_sections "projectRules" "project rule"
    write_rule_sections "codexRules" "Codex-only rule"
    write_rule_sections "rules" "rule"
  } > "$agents_output"

  {
    write_rules_header "Personal Codex Rules"
    write_skill_index
    write_rule_sections "projectRules" "project rule"
    write_rule_sections "codexRules" "Codex-only rule"
    write_rule_sections "rules" "rule"
  } > "$codex_output"

  {
    write_rules_header "Personal Claude Rules"
    write_skill_index
    write_rule_sections "projectRules" "project rule"
    write_rule_sections "rules" "rule"
  } > "$claude_output"

  # Claude Code local settings: merge top-level "claudeLocalSettings" from
  # projects.json into <project>/.claude/settings.local.json (personal,
  # per-machine, git-excluded below). Merge is per top-level key; object
  # values merge one level deep so unmanaged keys in an existing file survive.
  has_claude_settings="$(json_value 'const fs=require("fs"); const data=JSON.parse(fs.readFileSync(process.argv[1],"utf8")); console.log(data.claudeLocalSettings ? "yes" : "no");')"
  if [[ "$has_claude_settings" == "yes" ]]; then
    mkdir -p "$project_path/.claude"
    node -e '
      const fs = require("fs");
      const managed = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).claudeLocalSettings;
      const target = process.argv[2];
      let existing = {};
      if (fs.existsSync(target)) {
        try { existing = JSON.parse(fs.readFileSync(target, "utf8")); } catch (e) {
          console.error("skip settings merge (existing file is not valid JSON): " + target);
          process.exit(0);
        }
      }
      for (const [key, value] of Object.entries(managed)) {
        if (value && typeof value === "object" && !Array.isArray(value)) {
          existing[key] = Object.assign({}, existing[key] || {}, value);
        } else {
          existing[key] = value;
        }
      }
      fs.writeFileSync(target, JSON.stringify(existing, null, 2) + "\n");
    ' "$PROJECTS_FILE" "$project_path/.claude/settings.local.json"
  fi

  if [[ -n "$exclude_file" ]]; then
    touch "$exclude_file"
    if [[ "$has_claude_settings" == "yes" ]] && ! grep -qxF ".claude/settings.local.json" "$exclude_file"; then
      printf '.claude/settings.local.json\n' >> "$exclude_file"
    fi
    if [[ "$skill_count" != "0" ]]; then
      for skill_path in "${installed_skills[@]}"; do
        if ! grep -qxF "$skill_path" "$exclude_file"; then
          printf '%s\n' "$skill_path" >> "$exclude_file"
        fi
      done
    fi
  fi

  echo "installed: $name"
  echo "  Codex:  $codex_output"
  echo "  Codex (discovered): $agents_output"
  echo "  Claude: $claude_output"
  if [[ "$has_claude_settings" == "yes" ]]; then
    echo "  Claude settings: $project_path/.claude/settings.local.json"
  fi
  if [[ "$skill_count" != "0" ]]; then
    echo "  Skills: ${installed_skills[*]}"
  fi
  if [[ "$has_local_test_login" == "yes" ]]; then
    echo "  Local test login: .codex/local-test-login.json"
  fi
done
