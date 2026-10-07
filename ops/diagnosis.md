# Harness 診斷（2026-07-03 初版；2026-07-05 v2 附錄在文末，先讀 v2）

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

---

# v2 附錄（2026-07-05，第二個 Fable 5 session 覆核）

先講結論：v1 的三大修法均已落地且有效。以下是覆核結果與「現在」的前三名。

## v1 遺留事項覆核（證據都是本 session 實查）

- ✅ **superpowers 停用已在全部三個 wow code repo 落地**：
  `Whitelabel_GSI_Platform_Multiverse`、`Whitelabel_GSI_Dashboard`、
  `whitelabel-gsi-platform-multiverse-nx` 的 `.claude/settings.local.json`
  都存在且含 `"superpowers@claude-plugins-official": false`。
  查證教訓：repo 實際路徑以 `projects.json` 為準（Dashboard 是底線
  `Whitelabel_GSI_Dashboard`，不是連字號）——用猜的路徑查會誤判成「未落地」。
- ⚠️ 仍未直接驗證：停用後 wow session 的 SessionStart hook 注入是否徹底消失。
  驗法：在 Multiverse 開一個 session 跑 `/context` 看有無 superpowers 全文。
- ❌ v1 修法 3（MCP/plugin 按專案收斂）仍未做，見下方第二名。

## 現在的前三名（2026-07-05）

### 第一名：`~/own/*` 區完全在制度外

`~/own/makemoney`（本 session 所在，活躍開發中）只有 README，沒有任何
CLAUDE.md/AGENTS.md；記憶目錄是空的；superpowers 在此區全量注入（本 session
親測：SessionStart hook 全文 + 30 條 skill 描述都在）。AegisX 有 6 筆記憶
但同樣沒有專案規則。效果：own 區的每個弱模型 session 都在零專案知識 +
最大干擾下工作。

**修法**：(1) 本 session 已寫 `~/own/makemoney/CLAUDE.md`（如果你讀到這行
但那個檔不存在，代表 session 中斷在它完成前——照本檔 v2 的做法補上）。
(2) own 區各專案比照 wow：`.claude/settings.local.json` 停用 superpowers
——這是 settings 變更，動之前問使用者（maintenance §2）。
(3) AegisX/bitfinexLending 的 CLAUDE.md 留給在那些 repo 工作的未來 session，
方法照抄：派 Explore agent 掃 repo → 只寫驗證過的指令與危險區。

### 第二名：全域 MCP 注入仍在，但代價結構已改變

harness 已引入 deferred tools 機制（工具只列名、schema 經 ToolSearch 按需
載入），figma/notion/computer-use/chrome 的 schema 成本大幅下降。但 MCP server
的 instructions 區塊與 30+ 條 skill 描述仍每個 session 注入（本 session 實測
仍有數千 token）。v1 修法 3 的建議維持：用 `claude mcp list` 盤點，非本專案
需要的移到專案層。優先級已從第一降到第二——deferred 機制吃掉了大半代價。

### 第三名：記憶機制是「按專案隔離」的，教訓會寫錯地方

記憶目錄按專案路徑分開（`~/.claude/projects/<flattened-path>/memory/`），
A 專案存的記憶在 B 專案的 session 完全讀不到。弱模型最容易犯的錯：把
跨專案通用的教訓（派工方式、驗證紀律）寫進當下專案的記憶，之後永遠不會
被其他專案回想起來。**分流判準**（也已寫進 maintenance §3）：
只跟這個 repo 有關 → 專案記憶；跨專案 workflow → `ops/`；Codex 也要遵守
→ `rules/` + install.sh。寫之前先問「別的專案的 session 需要知道這件事嗎」。

## harness 事實更新（2026-07-05 實測，供 ops 檔引用）

- Agent tool 的 `model` 參數本 session 為 `haiku|sonnet|opus|fable`；
  `fable` 僅特殊 session 出現，制度不可依賴（v1 判斷維持）。
- Agent tool 仍**沒有 effort 參數**（v1 判斷維持）。
- 新機制 deferred tools：部分工具（多為 MCP）只列名不載 schema，直接呼叫會
  InputValidationError——先 `ToolSearch` 用 `select:工具名` 載入再呼叫，
  一次 select 多個（逗號分隔），不要一個一個載。
- 背景 agent（`run_in_background: true`）完成時 harness 會自動通知主對話，
  不要去讀它的 output 檔輪詢（那是完整 JSONL transcript，會塞爆 context）。

- (2026-10-07) Auditing past skill/model routing → compare scoped session skill reads, spawn arguments and worker turn contexts with the dispatch registry; distinguish configured defaults from observed execution. Why: static contract validation does not verify runtime routing. Evidence: `scripts/check-skill-routing.js` validates source contracts; GSI-506 workers recorded Sol/medium, while `~/.codex/config.toml` recorded Astra/high. The audit-time checker suite separately failed 1/85 because its project-skill duplication fixture assumed a skill was last in `projects.json`, before APK registration changed that list.
