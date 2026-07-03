# <feature 名稱>

> 交接合約：Spec 作者產出，指定實作者依此實作，reviewer 對照「驗收條件」review。Claude 與 Codex 的角色可互換。
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
- 跨站影響：若需求是單一代理／站點／template/siteKey，確認是否會碰共用程式、共用設定或共用預設值；若會影響其他站點，先提出並等使用者確認。

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

- 要寫哪些測試來驗證（測試不可省略；但 commit 前移除或 unstage 測試檔）。
- 手動驗證步驟（若需要）。

## Git Flow

- 基底分支：`main`（實作者開始前先 pull 最新）。
- 工作分支名稱：`<type>/<summary>`（`type` 依工作性質選 `feat` / `fix` / `perf` / `refactor` / `chore`）。
- 實作者開始前必須先從基底分支開出上述工作分支；不可直接在 `main`、`develop`、`staging` 或其他共享分支上實作。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging 測試）→ `main`（上線），每階段測試過才進下一關。
- Commit 前需取得使用者針對該次提交的明確確認；不得沿用先前確認自行 commit。
- 合併到任何分支前需使用者確認。

## 交接備註給實作者

- 先依上方 Git Flow 從基底分支開出工作分支，再開始實作。
- 實作中若發現 spec 有缺漏或矛盾，先回報 / 更新 spec 再繼續。
