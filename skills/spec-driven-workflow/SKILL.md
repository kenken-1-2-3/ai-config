---
name: spec-driven-workflow
description: 當使用者明確要求把一份需求轉成規格書／spec 交給另一個 agent 實作時使用（例如「幫我把這需求寫成 spec」「產規格給 codex」「產規格給 claude」）。不是每次讀需求都套用；只有使用者明確要走 spec 交接工作流時才觸發。
---

# Spec-Driven Workflow

把一份需求轉成一份精確的 spec，作為 spec 作者、實作者與 reviewer 之間的交接合約。Claude 與 Codex 的角色可以互換：可能是 Claude 寫 spec、Codex 實作，也可能是 Codex 寫 spec、Claude 實作，或由其中一方 review。

## 角色分工

```
需求 (Notion / 口述)
   │  Spec 作者：讀懂 + 寫 spec（Claude 或 Codex）
   ▼
~/wow/ai-config/specs/<project>/<feature>.md   ← 交接合約（唯一真實來源，版控於 ai-config）
   │  實作者：照 spec 在依 git flow 命名的工作分支實作（Claude 或 Codex）
   ▼
程式碼 diff
   │  Reviewer：對照驗收條件 review → 回修 → 通過（Claude 或 Codex）
   ▼
通過後依 git flow 推進（合併前需使用者確認）
```

- Spec 作者與實作者可以是不同 agent；不要假設一定是 Claude 寫 spec、Codex 實作。
- 實作者不靠對話記憶，只靠 spec 檔；所以 spec 要寫到「實作者不需回頭問需求」。
- spec 檔放在 ai-config repo（`~/wow/ai-config/specs/<project>/<feature>.md`）並 commit，跟著 ai-config 版控與跨機同步；不要放進專案 repo。
- spec 或實作完成後，不得自行 commit；每一次 commit 都必須先取得使用者針對該次提交的明確確認。
- Review 時對照 spec 的驗收條件，逐條判斷過／不過，不憑感覺。

## 產 spec 的步驟

1. 讀懂需求。釐清要做什麼、為什麼、影響哪一端（會員端 = Multiverse，代理端 = Dashboard）。需求有歧義時先問使用者，不要自行假設。
2. 把 spec 寫到 `~/wow/ai-config/specs/<project>/<feature>.md`：`<project>` 是目標 repo 名稱，`<feature>` 用簡短 kebab-case 描述。
3. 依本 skill 的範本（見 `spec-template.md`）填齊所有欄位，特別是：
   - **Out of scope**：明確寫出不做什麼，配合 Scope Control 規則。
   - **驗收條件**：逐條、可勾選、可客觀判斷。這是 review 的依據。
   - **受影響範圍**：註明會員端／代理端與對應 repo、檔案或模組。
   - **跨站影響**：若需求是單一代理／站點／template/siteKey，寫明是否會碰共用程式、共用設定或共用預設值；只要會影響其他站點，先提出並等使用者確認。
   - **參考實作**：點出要模仿的現有程式，讓實作者風格架構一致。
   - **關鍵決策與理由**：把討論中做的隱含決定明寫出來（含為什麼），避免實作者重新決定而走偏。這是縮小「實作者缺需求討論 context」落差的關鍵。
   - **Git Flow**：寫明這個 feature 的基底分支、實作者開始前必須開出的工作分支名稱（依 git flow 命名），以及推進路徑（develop → staging → main）。
4. spec 寫完後，交給使用者確認再交給指定的實作者。

## 交接給實作者

指實作者讀 spec 檔執行，例如：
> 「依照 `~/wow/ai-config/specs/<project>/<feature>.md` 實作。先 pull `main`，再依 git flow 的分支命名規則（`feat/`、`fix/`、`perf/`、`refactor/`、`chore/`，依工作類型選用）開工作分支。」

spec 必須已寫明實作者要從哪個基底分支開出哪個工作分支；實作者不可直接在 `main`、`develop`、`staging` 或其他共享分支上實作。

實作者會載入該專案的共用規則（git flow、scope control、必須寫測試驗證，但 commit 不含測試檔等），行為與規則一致。

## Review

在實作者完成的分支上，對照 spec 做 review：
> 「對照 `~/wow/ai-config/specs/<project>/<feature>.md` 的驗收條件 review 目前的 diff。」

- 逐條檢查驗收條件是否滿足。
- 檢查是否有超出 Out of scope 的改動。
- 檢查是否符合共用規則（scope、git flow、測試不可省略但測試檔不進 commit 等）。
- 有問題回報給實作者修，再 review，直到驗收條件全過。
- Commit 前必須取得使用者針對該次提交的明確確認；先前的確認不可沿用。
- 合併到任何分支前都要先跟使用者確認。

## 注意

- 一份 spec 對應一個可獨立實作與驗收的單位。需求太大時先拆成多個 spec。
- spec 是合約：實作或 review 過程中若發現需求需要調整，先更新 spec，再繼續。
