# <feature 名稱>

> 交接合約：Claude 產出，Codex 依此實作，Claude 對照「驗收條件」review。
> 位置慣例：`~/wow/ai-config/specs/<project>/<feature>.md`（版控於 ai-config）

## 背景 / 目標

- 為什麼要做這件事，要解決什麼問題。
- 來源需求連結（Notion / issue 等）。

## 範圍

- 這次要做的具體項目，逐條列。

## Out of scope

- 明確不做的項目（避免超出需求；配合 Scope Control 規則）。

## 受影響範圍

- 端別：會員端 (`Whitelabel_GSI_Platform_Multiverse`) / 代理端 (`Whitelabel_GSI_Dashboard`) / 其他。
- 預期會改到的檔案、模組、template/siteKey（若已知）。

## 參考實作 / 要遵循的現有 pattern

- 指出要模仿的現有程式（檔案路徑 / 元件 / hook），讓實作的風格與架構一致。
- 例：照 `template/<siteKey>/components/Foo.vue` 的寫法；沿用 `useXxx` hook 的模式。

## 關鍵決策與理由 (Key decisions)

- 把討論中已經做的選擇明寫出來，避免實作者重新決定而走偏。
- 每條寫「決定了什麼 + 為什麼（為何選這個而非其他方案）」。
- 例：採用 A 方案而非 B，因為 B 會影響到其他 template 的共用邏輯。

## 驗收條件

> 逐條、可勾選、可客觀判斷。Review 依此判斷過／不過。

- [ ] 條件 1
- [ ] 條件 2
- [ ] 條件 3

## 邊界情況 / 例外

- 需要特別處理的狀況、極端值、錯誤情境。

## 測試計畫

- 要寫哪些測試來驗證（注意：commit 前移除測試檔）。
- 手動驗證步驟（若需要）。

## Git Flow

- 分支名稱：`<type>/<summary>`（`type` 依工作性質選 `feat` / `fix` / `perf` / `refactor` / `chore`）。
- 從 `main` pull 後開出。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（上線），每階段測試過才進下一關。
- 合併到任何分支前需使用者確認。

## 交接備註給 Codex

- 依上方 Git Flow 開分支實作。
- 實作中若發現 spec 有缺漏或矛盾，先回報 / 更新 spec 再繼續。
