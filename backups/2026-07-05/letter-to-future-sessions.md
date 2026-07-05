# 給未來 session 的信

寫於 2026-07-03，Fable 5 制度建立 session。讀者：未來在這個環境工作的任何模型，以及使用者本人。

## 你沒問、但我認為最重要的三件事

### 1. `bypassPermissions` ＋ 全域全開的 plugin 是這個環境最大的單點風險

`~/.claude/settings.json` 目前是 `defaultMode: bypassPermissions`：任何模型、任何指令、
零確認。配上全域啟用的 superpowers/chrome/figma/notion/computer-use，等於把一個弱模型
放進全權環境，還同時用大量無關指令干擾它。制度檔（hard-stop 清單）是文字煞車，
但文字煞車擋不住已經失焦的模型。我沒有動 settings.json——這是使用者的風險偏好決定。
建議使用者考慮：(a) 至少把 deploy/push 類命令移出 bypass（改用 permissions.deny 或
ask 規則）；(b) plugin 改按專案啟用（見 ops/diagnosis.md 第一名）。在使用者決定前，
未來 session 請把全域 CLAUDE.md 的 hard-stop 清單當成不可協商。

### 2. 兩套會員端並行的遷移期，是所有規則最容易失效的時期

舊 Multiverse（Quasar，28 個 template）是 primary，nx 版（2 個 app）是未來。
遷移期的典型事故：把舊 repo 的假設帶進 nx（template 結構、yarn deploy），或在 nx
發明新 i18n key 而不是沿用舊 key——這兩條 rules 裡都有，但弱模型在長 session 尾端
會忘。做 nx 遷移工作時：開工先重讀 `rules/multiverse_nx.md`，收工用 T5 模板驗收
「i18n key 是否全部來自舊 repo」這一條。另外 whitelabel-frontend-config 的
staging 有 114 個站、production 只有 60——環境間有大量漂移，別假設 staging 有的
production 也有。

### 3. 複利機制已經存在，但目前只用了一半

- specs/ 的 spec-driven workflow 是現成的派工合約系統：spec 的驗收 checklist
  就是 T2（實作）和 T5（審查）模板的 `{{contract}}` 欄位。把兩者接起來用，
  是這套制度回報最大的地方。
- Dashboard repo 有四個本地 skills（dashboard-api-integration、dashboard-new-page、
  dashboard-permission-wiring、dashboard-table-filter-page）不在 ai-config 的
  skills/ 裡——規則來源分裂。值得問使用者要不要收進 ai-config 統一管理。
- 記憶機制到本 session 為止只有 2 筆。maintenance.md §3 規定了寫回格式；
  每次被糾正就寫，半年後的環境會完全不同。

## 這套制度最可能的退化方式，與預防

1. **儀式化**——模板照抄、驗收欄留空、「fresh review」其實是同一個 context 換個口氣。
   預防：T5 要求逐字貼合約而非摘要；maintenance §3 禁止沒有 evidence 的教訓條目。
   如果你發現自己在填格式而不是在檢查，停下來，那就是退化的當下。
2. **規則膨脹**——每次踩坑加三行，兩年後沒有模型會全部讀完。
   預防：maintenance §4 的 150 行／10 條門檻。膨脹的訊號是「同一個錯誤又發生了，
   而對應規則其實存在」——那代表規則已經超過可被遵守的長度。
3. **事實漂移**——ops 檔寫的模型名、工具參數、路徑過時，弱模型照舊檔執行然後困惑。
   預防：dispatch 檔開頭已寫「工具報錯時相信錯誤訊息並更新本檔」；每個檔都標了
   撰寫日期。看到 2026-07-03 而現在已隔年，先驗證再遵守。
4. **繞過路由**——弱模型讀了「派 subagent」但嫌麻煩自己下場，context 塞爆後失焦。
   預防：全域 CLAUDE.md 把 always-on 壓到 5 條就是為了這個；如果連 5 條都被略過，
   問題不在檔案在模型，該換強一點的模型跑該 session。

## 本 session 的假設與未盡事項

- 使用者允許開場提問，我選擇不問，做了這些假設：(a)「重寫 CLAUDE.md」解讀為
  建立原本不存在的 `~/.claude/CLAUDE.md`（全域路由）與 `ai-config/CLAUDE.md`；
  (b) 規則檔沿用既有英文慣例，診斷與本信用中文；(c) superpowers 後續由使用者
  拍板採「分區並行」：wow repo 內停用（install.sh 發 settings.local.json）、
  其他區域保留但觸發條件被全域 CLAUDE.md rule 4 收窄，精華在 ops/references/
  ——細節見 diagnosis 第一名修法。有一個未完全驗證點：plugin 停用後
  SessionStart hook 是否徹底消失，官方文件只有暗示；第一個 wow session
  用 /context 確認，若注入仍在，回報使用者並更新本段。
- 未動 `projects.json` 與既有 rules/*.md 內容（有未提交的他人修改在工作區，
  我不確定其狀態）；wow_gsi.md 的抽薄（diagnosis 次要觀察）留給未來 session，
  動之前走 maintenance §2 問使用者。
- ai-config 工作區在本 session 開始前就有未提交修改（projects.json、多個 rules、
  多份 specs）——那些不是我改的，提交時請使用者自行分辨。

## 誠實條款：這套制度的極限

拆解、模板、fresh-context 驗證、升降級——這些補得了執行品質。補不了的是：
模糊需求的品味判斷、「這個設計對不對」的審美、與使用者沒說出口的意圖。
遇到這類問題，正確輸出是三選一：給 2–3 個選項附代價請使用者選；升級到最強
可用模型要一個建議；或明說「這是我做不可靠的判斷」。詳見 judgment-rubrics §6。
單一自信答案，是弱模型在這類問題上唯一保證錯的選項。

---

# v2 附錄（2026-07-05，第二個 Fable 5 session）

本 session 拿到的任務幾乎就是 7/03 那個 session 的任務。我做的第一個判斷、
也是這封附錄最重要的一課：**先查制度是否已存在，存在就審計升級，不要重建。**
兩套「各自完整」的制度檔比沒有制度更糟——弱模型無法裁決哪套是對的。
未來任何 session（尤其是強模型 session）收到「幫我立制度」類任務時，
第一步永遠是 `ls ~/wow/ai-config/ops/`。

## 本 session 實際做了什麼

診斷 v2（diagnosis.md 文末附錄）、全域 CLAUDE.md 加 own 區路由與記憶分流、
`~/own/makemoney/CLAUDE.md`（新檔，事實由 fresh-context agent 逐檔驗證）、
model-dispatch 補 2026-07-05 harness 事實（deferred tools、背景 agent 通知）、
maintenance §3 補記憶按專案隔離的分流判準、projects-overview 補一條路徑教訓。
judgment-rubrics 與 delegation-templates 審計後判定不需改動。

## 給未來 session 的三件事（v2 版）

1. **v1 信的三件事全部仍然成立**，尤其 bypassPermissions——settings.json
   2026-07-05 覆核仍是 `defaultMode: bypassPermissions` 全開。hard-stop
   清單依舊是唯一煞車，繼續當成不可協商。
2. **own 區只補了 makemoney。** AegisX、bitfinexLending 還沒有 CLAUDE.md
   （AegisX 有 6 筆記憶可當素材）；own 區 superpowers 仍全量注入，停用要
   動 settings，先問使用者。在那兩個 repo 開工的第一個 session 請照
   diagnosis.md v2 附錄「第一名：`~/own/*` 區完全在制度外」的修法補檔。
3. **AegisX 的記憶顯示它碰真金白銀**（live-env-is-real-mainnet、
   live-execution-path 等條目）。在 AegisX 工作時，hard-stop 敏感度要當成
   deploy 級：任何觸發實單、改 live 設定的動作，沒有明示指令不做。

## 制度退化的新增觀察

v1 列的四種退化（儀式化、膨脹、事實漂移、繞過路由）維持有效。新增第五種：
**重複建制**——強模型 session 重建一套平行制度，或同一判準散落多檔開始
互相偏移。預防：本檔開頭那一課；以及 maintenance §4 的矛盾偵測（兩條規則
打架時觸發壓縮）。判準的唯一權威位置：派工=model-dispatch、判斷=judgment-
rubrics、模板=delegation-templates、維護=maintenance——別處只准引用不准複寫。

## 未盡事項（交接）

- own 區 superpowers 停用與 MCP 按專案收斂：等使用者拍板（§2 變更）。
- wow session 的 SessionStart hook 是否已消失：下個 wow session 用 /context 驗證。
- AegisX、bitfinexLending 的 CLAUDE.md：留給在該 repo 工作的 session。
- ai-config 本次修改尚未提交：提交需使用者確認（hard-stop）。
