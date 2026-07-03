# Maintenance Protocol for ai-config

How future sessions (any model) update the rules/ops files without degrading them.

## 0. Mechanics (always)

1. Before editing any existing file under `rules/`, `ops/`, `skills/`, or `projects.json`: copy it to `backups/<YYYY-MM-DD>/` first (create the dir; keep the same filename; if the file already has a backup from today, that's enough).
2. After editing `rules/*` or `skills/*` or `projects.json`: run `./install.sh` so project repos actually receive the change, and tell the user it ran.
3. Rule/ops changes should be committed in this repo — remind the user; commit only with their explicit confirmation (per rules/wow_gsi.md).
4. Never edit the generated files (`CLAUDE.local.md`, `AGENTS.override.md`, project-local `skills/` copies) in the project repos — they get overwritten. Edit the source here.

## 1. What you may change without asking

- **Fixing verified factual drift**: a command, path, branch name, or tool parameter documented here that provably no longer works (you have the error output). Update the fact, note the date.
- **Appending lessons** in the format of §3.
- **`ops/projects-overview.md`**: refresh a repo's section after surveying it again.
- Typos, broken file references, dead links.

## 2. What requires asking the user first

- Deleting or weakening any rule (especially hard-stops, scope-control, git-flow, jira-readonly rules — these encode the user's risk tolerance, not technical facts).
- Changing `projects.json` (adds/removes what gets installed into repos).
- Rewriting the structure of any ops file, or changing thresholds in ops/model-dispatch.md (e.g. the "2 retries" cap, model defaults).
- Anything in `~/.claude/settings.json` or `~/.claude/CLAUDE.md` beyond fixing a path that provably fails (you have the failed-read error output in hand; anything more than swapping that path is a §2 change).
- Restoring from `backups/`.

Default when unsure: it's in §2.

## 3. Lesson write-back (after any mistake or user correction)

Same turn as the correction, decide the destination:

- **Project-specific behavior** ("in repo X, command Y breaks") → the repo's rule file in `rules/`, or its section in `ops/projects-overview.md` (gotchas).
- **Cross-project workflow** (dispatch, verification, when-to-ask) → the matching ops file, appended to the relevant section.
- **User preference / environment fact** → the memory mechanism (`~/.claude/projects/.../memory/`), per its own format.

Format for appended lessons (one entry, ≤4 lines):

```
- ({{YYYY-MM-DD}}) {{Trigger/situation}} → {{correct action}}. Why: {{one line}}. Evidence: {{error text / user quote / file:line}}.
```

No entry without the trigger and the evidence — "be more careful about X" is banned.

## 4. Compaction (prevent rule bloat)

- Trigger: any single rules/ops file exceeds **~150 lines**, or a section accumulates **>10 lesson entries**, or two entries contradict.
- Action: propose a compaction to the user (this is a §2 change): merge duplicates, promote repeated lessons into a proper rule, delete entries whose trigger can no longer occur. Show the before/after diff before applying.
- Never compact by dropping specificity (triggers, examples, evidence). Compact by merging duplicates.

## 5. Sanity checks after any edit here

- Fresh-context agent read-back for the edited file: does it still say what you intended, and is nothing else broken (references to files/sections still valid)?
- `bash -n install.sh` if you touched install.sh; `node -e 'JSON.parse(require("fs").readFileSync("projects.json","utf8"))'` if you touched projects.json.
