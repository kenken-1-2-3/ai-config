# Claude ↔ Codex 協作守則

寫於 2026-07-03。前提事實（先懂這個，其他才說得通）：

- 兩個 agent **不會直接對話**。協作靠三種媒介：spec 檔（`specs/<project>/<feature>.md`）、程式碼 diff、以及使用者轉述。所有交接內容必須落在檔案裡，不能假設對方「知道剛剛討論了什麼」。
- 規則同步機制：`install.sh` 把 `rules/*.md` 同時生成 `CLAUDE.local.md`（Claude 讀）和 `AGENTS.override.md`（Codex 讀）——**專案規則兩邊對稱**。
- 但 **Codex 讀不到**：`~/.claude/CLAUDE.md`、`ops/` 全部、Claude 的記憶機制。所以交給 Codex 的 spec 必須自包含（spec-driven-workflow skill 已要求「實作者不需回頭問需求」——對 Codex 這不是建議，是硬條件）。

## 1. 預設分工（可被使用者指定覆蓋；沒指定時照這個）

| 任務型態 | 預設給 | 理由 |
|---|---|---|
| 需求理解、寫 spec、多 repo 調查 | Claude | 有 subagent 可平行掃 repo、有 projects-overview 與記憶 |
| 照 spec 實作（合約清楚、範圍封閉） | Codex | 讓 Claude 保持 fresh context 做後續 review；兩邊都能做，選不佔用 reviewer 的那個 |
| Review 實作結果 | **沒寫該實作的那一方** | 見 §3，這條不可覆蓋 |
| 高風險判斷的第二意見 | 另一個模型家族 | 跨模型意見獨立性優於同模型 fresh context |
| 小修小補（單檔、範圍明確） | 誰在場誰做 | 走 spec 流程的成本高於任務本身時，不要走 spec 流程 |

## 2. 交接一律走 spec-driven-workflow

流程、範本、Git Flow 要求都在 `skills/spec-driven-workflow/SKILL.md`，這裡不重複。本檔只加三條給 Claude 的操作規則：

- 寫給 Codex 的 spec，把 Claude 才看得到的背景（記憶裡的環境事實、ops 檔的判準、對話中的隱含決定）**顯式寫進 spec 的「關鍵決策與理由」**。判斷方法：假設讀者是一個只拿到這份檔案的新 agent。
- 收到 Codex 寫的 spec 要實作時：先跑 spec 完整性檢查——驗收條件可客觀判斷？工作分支寫明了？Out of scope 有寫？缺任何一項，先請使用者要求補齊再開工，不要腦補。
- spec 是合約：發現需求要變，先改 spec（並讓使用者知道），再繼續。兩個 agent 之間唯一的共識來源就是這份檔案。

## 3. 互審規則（驗證不自驗的跨模型版）

- **實作者永遠不當自己的 reviewer。** Claude 實作 → Codex review（或 Claude 派 fresh-context agent，但跨模型優先）；Codex 實作 → Claude review。
- Claude review Codex 的 diff 時，用 `ops/delegation-templates.md` 的 T5 模板派 fresh agent，合約欄逐字貼 spec 的驗收條件。
- Review 結果回給使用者轉交，格式照 T5（APPROVE / FIX FIRST、逐條 PASS/FAIL、未驗證聲明）。寫成 Codex 能直接執行的修正指令，不要寫成給使用者看的散文。
- 兩邊對高風險判斷意見相左 → 這是 stop-and-ask 訊號（judgment-rubrics §3），交使用者裁決，不要互相說服到收斂為止。

## 4. 並行安全（同一個 checkout，最容易出事的地方）

兩個 agent 共用同一份 working tree。規則：

- **同一 repo 同一時間只有一個 agent 動檔案。** 開工前先 `git status --porcelain`＋`git branch --show-current`：有非預期的未提交修改或不在預期分支 → 停，回報使用者，不要「順手處理」——那可能是另一個 agent 的進行中工作。
- 交接點必須是「乾淨狀態」：實作者把工作分支推到可 review 的狀態（可以未 commit，但要明說哪些檔案是本次工作），reviewer 才進場。
- 絕不清理、stash、revert 不是自己產生的修改；發現疑似殘留一律問使用者。
- 需要真正平行（兩個需求同時做）→ 用不同分支＋請使用者確認由誰佔用 working tree，或用 git worktree 隔離。

## 5. 教訓寫回的分流（決定寫到哪裡的判準）

- 這條規則 **Codex 也必須遵守** →寫進 `rules/*.md`，跑 `./install.sh`（兩邊同步生效）。例：某 repo 的指令禁令、scope 邊界、git flow 細節。
- 只關 Claude session 運作（派工、模型選擇、記憶）→ 寫進 `ops/`。
- 分不清楚 → 預設 `rules/`（寬鬆側漏給 Codex 無害；反過來 Codex 學不到有害）。格式與門檻照 `ops/maintenance.md` §3–§4。
