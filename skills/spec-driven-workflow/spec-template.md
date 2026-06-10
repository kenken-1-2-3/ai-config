# <feature 名稱>

> 交接合約：Claude 產出，Codex 依此實作，Claude 對照「驗收條件」review。
> 位置慣例：`docs/specs/<feature>.md`

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

## 交接備註給 Codex

- 從 `main` pull 後開 `feat/<feature>` 分支。
- 實作中若發現 spec 有缺漏或矛盾，先回報 / 更新 spec 再繼續。
