---
name: spec-driven-workflow
description: Use when the user explicitly asks to author, update, hand off, or audit a spec for fidelity and requirement drift. Do not use for direct implementation, branch management, commit, push, release, deploy, simple repository lookup, or general questions.
---

# Spec-Driven Workflow

把 spec 當成需求方、實作者與 reviewer 之間的可驗證合約。實作者只需要讀 spec，不依賴原對話或完整 task history。

## Phase exit

- 此 skill 只負責 spec contract 的撰寫、更新、交接與需求漂移稽核。
- 最新要求改成 direct implementation、branch management、commit、push、release 或 deploy 時，退出此 skill；依該回合的新 outcome 重新選擇流程。
- 實作者可以 read an approved spec without loading the spec-authoring workflow。只有需要修改、稽核或重新交接 spec 時才再次觸發。

## 核心不變量：需求必須對稱

- **來源 → spec 完整**：原需求的每個功能、欄位、入口、狀態與限制，都要有 `REQ-ID`。
- **spec → 來源可追溯**：spec 的每個產品概念與 user-visible 行為，都要指回直接明示該行為的 Responsibility = `Scope / behavior`、`UI / visual` 或 `User decision` 來源。API／schema／response 與 repo 欄位只能作為技術／現況證據，不能單獨授權 placeholder、hint、tooltip、validation／錯誤文案、masking、自動清值、default／preselection、sorting、disabled state、驗收條件或測試期待。
- **UI ↔ persistence 分開判斷**：需求要求的控制項必須保持 enabled、selectable、editable；API、schema、endpoint 或 persistence 缺口不得作為 hide、pre-disable 或 lock 的理由。使用者完成輸入並嘗試動作後，若後端拒絕或無法持久化，保留表單狀態並明確提醒哪些值未儲存及原因；不得顯示假成功或靜默丟值。權限、破壞性操作確認、in-flight 防重複、loading lock 與客觀無效輸入仍可阻擋互動或送出。
- **後端限制不自動授權前端 UX**：後端可以執行既有 constraint；新增前端 validation、copy、hide／disable state 或其他使用者可感知呈現，仍須通過產品權威來源 gate。
- **明確決策才可縮 scope**：只有使用者核准的排除項能標成 `OUT_OF_SCOPE_APPROVED`；「repo 現在沒有」「API 還沒提供」都不是刪需求的理由。API-blocked fallback 與核准排除都必須連到 `DEC-ID`。

## 來源各管什麼

| 來源 | 責任 | 不可反推的事 |
| --- | --- | --- |
| 使用者、Notion、issue | 產品範圍、行為、欄位語意、驗收 | 不由 API 是否存在決定 |
| Figma、mock、截圖、參考圖 | 資訊架構、UI、視覺與畫面狀態 | 不自行增加／刪除產品行為 |
| API、schema、PDF、live response | endpoint、payload、enum、持久化能力與局部 blocker | 不新增任何 user-visible 行為或驗收條件 |
| 目標 repo | 現況、既有 pattern、可重用元件與整合位置 | 不因現況存在某種 UX 就把它加入需求 |
| 使用者明確決策 | 覆蓋前述來源的已核准選擇 | 以 Responsibility = `User decision` 的 Source ID 記錄，並連到 Decision Log 與受影響的 `REQ-ID` |

不同責任的來源不互相否決。同一責任內若來源互斥，標記 `SOURCE_CONFLICT`，列出差異並問使用者；不可私自選一份。每份來源都要記錄 snapshot／版本／日期，避免後續拿不同版本重新推翻已確認結論。Source inventory 以可獨立漏掉的 section、frame、asset 或 state 為粒度，不以「整份 Notion」「整個 mock」各包成一列；產品權威來源的 Location 必須指到直接明示該行為的 section、frame 或 user message，只有整份文件 URL／標題不算直接 anchor。每個 Source ID 都必須被矩陣引用。

## Requirement status

| Status | 用途 | 可否 handoff |
| --- | --- | --- |
| `CONFIRMED` | 來源一致或使用者已確認 | 可以 |
| `UI_REQUIRED_API_BLOCKED` | UI／流程與需求控制項保持可操作；使用者嘗試動作後，只有對應 persistence 可回報失敗並保留輸入 | 可以，需用 `DEC-ID` 寫清楚 post-action reminder、未儲存範圍與 blocker |
| `PROVISIONAL` | 暫定推論，仍待確認 | 不可以 |
| `SOURCE_CONFLICT` | 同一責任的來源互斥 | 不可以 |
| `OUT_OF_SCOPE_APPROVED` | 使用者已明確核准排除 | 可以，矩陣與 Decision Log 必須以 `DEC-ID` 雙向對映 |

## 產 spec 的步驟

1. **固定來源版本**：建立 Source Responsibilities 表；每個可獨立遺漏的需求 section、畫面、frame、asset、state 或 API snapshot 各有 Source ID。本地圖片／PDF 放到可交接的位置並使用相對連結。
2. **先抽需求、後看技術名詞**：從需求與畫面逐項抽成原子 `REQ-ID`，保留使用者用語。API 的 `group`、`entity`、`format_example` 等名稱只能先放在 API / persistence 欄；若產品來源未要求呈現，UI surface 寫 `N/A — 產品來源未要求呈現`，不建立對應 UI AC。
3. **建立追蹤矩陣**：每列都填來源 anchor／asset、UI surface、API / persistence、status、Decision ID、Acceptance ID、Verification ID。UI surface 不是 `N/A + 理由` 時，該列至少引用一個 Responsibility = `Scope / behavior`、`UI / visual` 或 `User decision` 的來源；API／CODE source 可補充但不能單獨授權 UI。非 UI、非持久化或不需決策時也要明寫 `N/A + 理由`，不可只寫 `N/A`。
4. **做雙向 read-back**：
   - 逐段讀原需求／每張圖，確認都有 `REQ-ID`。
   - 逐列讀矩陣，確認 spec 的每個功能都有來源。
   - 特別檢查入口、list/create/edit/detail、主要區塊、空／錯誤／loading／permission 狀態，避免因 API 缺口整段消失或把需求控制項預先停用。
5. **一個 feature 只留一份 canonical spec**：canonical spec 持有完整 source inventory 與所有 `REQ-ID`；大型需求只用 Active REQ IDs 拆 execution slices／新 tasks，不另建會分散真相的 child specs。既有或外部限制下的 slice spec 要標 `SLICE` 並連回 canonical，且永遠不可宣稱 feature complete。
6. **定義客觀驗收與驗證**：每個 `REQ-ID` 至少連到一個 `AC-ID` 與 `VT-ID`。驗收寫可觀察結果；驗證寫指令、操作、截圖或 Network evidence 的取得方式。AC／VT 不得增加來源沒有授權的可觀察行為；新增行為必須拆成有產品權威來源的原子需求。
7. **記錄決策並請使用者確認**：所有縮 scope、命名、fallback 與來源衝突決策都寫入 Decision Log，並以 `DEC-ID` 對映回受影響的 `REQ-ID`。API-blocked fallback 與 `OUT_OF_SCOPE_APPROVED` 的 Approval / source 必須引用 Responsibility = `User decision` 的 Source ID，API／repo source 不能充當核准。使用者確認後立即更新矩陣，不讓決策只留在對話。

依 [`spec-template.md`](./spec-template.md) 建立 `~/wow/ai-config/specs/<project>/<feature>.md`。spec 或實作完成後不得自行 commit；每次 commit／merge 都要取得使用者針對該次操作的明確確認。

## Deterministic gate

先做結構檢查：

```bash
node ~/wow/ai-config/scripts/check-spec.js ~/wow/ai-config/specs/<project>/<feature>.md
```

使用者確認矩陣、Handoff Readiness 改為 `READY` 後，再跑：

```bash
node ~/wow/ai-config/scripts/check-spec.js --ready ~/wow/ai-config/specs/<project>/<feature>.md
```

`--ready` 必須通過才可交給實作者。只有目前 slice 的 `REQ-ID` 放進 Active REQ IDs；checker 會拒絕不存在或已核准排除的 active ID。

要宣稱整個 feature 完成前，必須在 `CANONICAL` spec 上確認所有非排除需求都已驗收，且不能仍有 API-blocked／未決狀態，再跑：

```bash
node ~/wow/ai-config/scripts/check-spec.js --complete ~/wow/ai-config/specs/<project>/<feature>.md
```

checker 負責 spec role、ID、必要章節、source coverage、User decision authority、決策雙向對映、active IDs、狀態、驗收／驗證引用、本地素材與 completion evidence；`SLICE` spec 不能通過 `--complete`。語意是否忠於來源仍由雙向 read-back 與使用者確認負責。

## 交接與 task 切分

交接只傳：

1. spec 絕對路徑；
2. 本次 active `REQ-ID`；
3. 目標 repo、基底／工作分支；
4. 已知 blocker 與預期回報格式。

不要貼整段原始對話，也不要為了方便直接 fork 全 history。需求整理、各 coherent implementation slice、review／merge 是不同 outcome；前一階段完成或 context 已累積大量圖片／工具輸出時，開新 task 並靠 spec 傳遞已凍結的決策。只有同一個小型、連續 outcome 才留在原 task。

## Review 與完成條件

- 先核對 active `REQ-ID`，再逐條核對其 `AC-ID` 與 `VT-ID`；不得用「大致完成」取代逐條結果。
- 逐條反問「刪掉此 user-visible 行為後是否仍完全符合產品來源」；若是，且沒有 `User decision` 補充授權，就把它視為 scope creep 並移除。
- 檢查是否遺漏來源要求、是否出現無來源的新功能、是否把局部 API blocker 擴大成 UI 刪除／預先停用，或在失敗時清掉輸入、顯示假成功。
- 檢查 Out of scope 與 Decision Log，避免實作者重新決定已凍結事項。
- 每個通過項要附實際 command、截圖、Network 或 read-back evidence；未驗證就明寫未驗證，不得宣稱完成。
- Slice 完成只能宣稱 active `REQ-ID` 完成。整個 feature 只有在 `CANONICAL` spec 中每個非 `OUT_OF_SCOPE_APPROVED` 的需求都有已勾選 AC／VT evidence、Remaining / blocked REQ IDs 精確等於 `NONE`，且 `--complete` 通過時才能宣稱完成。
- 發現需求變更時先更新 Source snapshot、矩陣、Decision Log、AC／VT，再繼續實作或 review。
