# Harness 診斷（2026-07-03，由 Fable 5 session 撰寫）

供後續所有 ops/ 檔案引用的問題清單。讀者：使用者本人與未來 session。
證據基礎：本 session 實際觀察到的 system prompt 組成、`~/.claude/settings.json`、
`ai-config` 的 install.sh 架構與 rules/ 內容。標「估計」者為無法精確測量的推估。

## 第一名：每個 session 被動載入大量無關內容（最漏 token）

**現況**
- `~/.claude/settings.json` 全域啟用 superpowers、chrome-devtools-mcp、frontend-design
  三個 plugin；另有 figma、notion、computer-use、claude-in-chrome 等 MCP 全域連線。
- 實測本 session 的 system prompt 含：superpowers 全文注入（SessionStart hook）、
  40+ 個 figma/chrome/computer-use 工具的說明、30+ 條 skill 描述。估計每個 session
  固定燒掉 15k–25k tokens 在多數任務用不到的內容上。
- superpowers 的「有 1% 可能就必須先 invoke skill」規則對弱模型是失焦放大器：
  簡單改字串的任務也會先跑 brainstorming/TDD skill，多繞兩三輪才動手。

**修法**（superpowers 部分已於 2026-07-03 依「分區並行」方案執行）
1. ✅ superpowers 已在 `~/wow/*` 各 repo 停用：`projects.json` 的
   `claudeLocalSettings` 由 `install.sh` 發成各專案 `.claude/settings.local.json`
   （個人、單機、git-excluded）；wow 以外全域維持啟用，但全域 CLAUDE.md
   Always-on rule 4 把「1% 就觸發」改寫成具體觸發條件。
2. ✅ 精華（systematic-debugging、writing-plans）已搬到 `ops/references/`
   作拉取式參考，路由在全域 CLAUDE.md。
2b. ✅ Codex 側：其 plugin 系統也全域啟用 superpowers，但不可全域關
   （`~/own/makemoney` 依賴其 spec 工作流），且未找到已驗證的專案層開關。
   改用 `rules/skill_trigger_guard.md` 經 AGENTS.override.md 馴化
   （六個 wow 專案都掛）；注入的 token 稅在 Codex 側仍存在。
3. 未做（留給使用者）：figma/chrome 等其他 plugin 與 MCP 的按專案收斂。
   用 `claude mcp list` 盤點，非本專案需要的移到專案層設定。
   （每個連線的 MCP server 即使不用也占 system prompt。）

## 第二名：跨專案的工作方式完全沒有落檔（最容易失焦）

**現況**（診斷當下的狀態；本 session 稍後已建立這兩個檔案——本檔描述的是制度建立「之前」的環境）
- `~/.claude/CLAUDE.md` 不存在；ai-config 本身也沒有 CLAUDE.md。
- rules/ 只涵蓋「專案內怎麼做事」（scope、git flow、驗證），完全沒有
  「session 該怎麼運作」：何時派 subagent、選什麼模型、怎麼驗收、
  何時停下來問人。弱模型每個 session 都在即興決定這些，品質不穩定。
- 記憶機制幾乎閒置（只有 2 筆），跨 session 的教訓沒有累積管道。

**修法**（本 session 均已完成）
1. 建立 `~/.claude/CLAUDE.md` 作全域薄路由，指向
   `ai-config/ops/` 的調度守則、rubric、模板。
2. 建立 `ai-config/CLAUDE.md` 供在 ai-config 內工作的 session 使用。
3. 教訓寫回管道走 `ops/maintenance.md`。

## 第三名：主對話自己下場做大量讀取，且無升降級與驗收紀律（最容易出錯）

**現況**
- 沒有任何規則阻止主對話自己 grep/讀完整個 repo。弱模型預設不派工，
  context 前半塞滿檔案原文，後半推理品質下降、忘記早先的約束
  （例如 multiverse 的「不動 shared code」規則在長 session 尾端最常被違反）。
- 完成宣稱靠自驗：同一個 context 寫的碼、同一個 context 說「完成」。
- `defaultMode: bypassPermissions` 全開，弱模型執行高風險命令
  （push、deploy、批次刪改）沒有任何煞車，只剩 rules 文字約束。

**修法**（本 session 均已完成）
1. 模型調度守則（`ops/model-dispatch.md`）：大量讀取一律派
   subagent，主對話只進結論；顯式指定 model；升降級路徑。
2. 驗收不自驗（同檔 §7）：完成宣稱前派 fresh-context agent 驗收。
3. 高風險動作統一清單寫進全域 CLAUDE.md（Always-on rule 2）：deploy/發版、
   merge、push、Jira write、跨站 shared code——這些已散在各 rules，
   收攏成一張「動作前必停」清單，弱模型才查得到。

## 次要觀察（不在前三，但值得記錄）

- `wow_gsi.md`（8.7KB）載入 5 個專案，其中 Spec-Driven Workflow、
  DESIGN.md、部署細節屬情境性內容；CLAUDE.md 支援 `@path` import，
  可抽成引用檔按需載入。優先級低於上面三項，因為內容本身品質好。
- specs/ 下有多份未提交的 spec，ai-config 有未提交修改——維護協議
  應規定「規則改動要提交」，否則機器之間會漂移。
