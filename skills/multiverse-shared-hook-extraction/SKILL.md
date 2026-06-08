---
name: multiverse-shared-hook-extraction
description: 在 Whitelabel_GSI_Platform_Multiverse 中，當使用者要求把 template-local hook/composable 提升為 shared、從多個 template 提取共用邏輯、或把全域單例狀態從 template 移入 src/common 時使用。若只是在既有 shared hook 新增功能，請勿使用。
---

# Multiverse Shared Hook Extraction

當任務目標是把 template-local 邏輯提升為 `src/common/hooks` 或 `src/common/composables` 時使用。

## 必要規格

規劃前先確認任何缺少的資訊：

- 哪些 templates 目前有相同或類似邏輯？（至少用 `rg` 掃過所有 template）
- 提取後，是否所有 templates 都走相同的 shared path，還是只有部分？
- 是否有 template-specific 差異需要保留為 thin adapter？
- 是否有全域單例狀態（例如 `ref()` 定義在 composable 之外）？若有，所有 callers 必須共享同一份。
- 提取的 composable 是純 UI/邏輯，還是會注入 DOM 副作用（script inject、event listener、MutationObserver）？

## 先讀的 truth sources

- `src/common/hooks/` 與 `src/common/composables/`：確認命名慣例（`use` 前綴）與既有 hook 的 export 模式。
- 準備提取的 template-local hook 本身：找出哪些是共用邏輯、哪些是 template-specific。
- 所有 consuming components：了解 callers 的使用界面，決定 exported API shape。

## 核心 invariants

- **全域單例狀態**：若邏輯依賴一份跨元件共享的狀態（如 embed loaded flag），必須把 `ref()` 定義在 `composable function` 之**外**，否則每個 caller 拿到各自隔離的 ref，狀態脫節。
- **Thin adapter 原則**：template-specific 差異（不同的 config key、不同的 DOM 行為）留在 `template/<siteKey>/hooks` 中，只呼叫 shared hook 的 core function；不要把 template 差異塞入 shared hook 的 if/else 中。
- **不要意外影響其他 templates**：shared hook 改變行為時，要確認所有已在使用該 hook 的 templates 行為不受影響，或明確告知使用者影響範圍。
- **Export 介面穩定**：已有 templates 使用的 exported function/ref 名稱不能改，只能新增；需要重命名時，先加新名稱，再移除舊名稱（分兩個 PR 或同時保留 alias）。

## 流程

1. 用 `rg` 搜尋相似邏輯在哪些 templates 出現，列出清單。
2. 找出共用部分（核心邏輯）與差異部分（template-specific 行為）。
3. 在 `src/common/hooks/<useName>.ts` 實作 shared hook，只包含共用邏輯。
4. 若有全域單例狀態，把 `ref()` 宣告移出 `composable function` 到 module scope。
5. Template-specific 邏輯留在 `template/<siteKey>/hooks`，透過呼叫 shared hook 組合。
6. 更新所有已有相同邏輯的 templates，改用 shared hook；不要遺漏任何一個。
7. 確認每個 consuming component 的 import path 指向新的 shared hook。

## 常見陷阱

- 把 `ref()` 放在 composable function 內部，導致每次呼叫各自獨立，全域事件（如 script onload）只更新其中一個實例。
- 只提取「我現在在用的 template」，忘記用 `rg` 確認其他 templates 是否也有相同邏輯，導致兩套平行實作並存。
- 在 shared hook 加 template-specific 的 `if (siteKey === 'set_r022')` 分支，破壞單一職責並使 shared hook 難以維護。
- 移除或重命名現有 exported function 但忘記更新所有 consumers，導致其他 templates 編譯報錯。
- 副作用（DOM inject、addEventListener）在每個 composable 呼叫時重複執行，應移至 module scope 的 once-init pattern 或使用 singleton guard。
