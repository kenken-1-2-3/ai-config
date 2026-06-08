---
name: multiverse-cross-template-bugfix
description: 在 Whitelabel_GSI_Platform_Multiverse 中，當同一個 bug 可能出現在多個 templates、或需要確認「哪些 templates 受影響」時使用。若確定只有單一 template 受影響，請勿使用。
---

# Multiverse Cross-Template Bugfix

當任務是修一個可能跨多個 templates 存在的 bug 時使用。錯誤地只修一個 template、或重複 patch 已正確的 template，都是此任務最常見的失敗。

## 必要規格

規劃前先確認：

- Bug 的 root cause：是 shared code（`src/common`）還是 template-local 實作錯誤？
- 已知受影響的 template 是哪些？（使用者提到的）
- 有無 sibling templates 可能共用相同 code path？（需要用 `rg` 確認）
- Fix 應落在 shared code 還是 template-local？

## 先做的 scoped 搜尋

**永遠先搜尋，再決定修哪裡。**

```bash
# 找出哪些 templates 使用了有問題的 composable / function
rg "useH5MenuListCms|h5MenuList" template/ --include="*.vue" --include="*.ts" -l

# 找出哪些 templates 有相同的錯誤 pattern
rg "錯誤的 import 或用法" template/ -l
```

## 流程

1. **確認 root cause**：先讀 shared source（`src/common/composables/`、`src/common/hooks/`）以及已知受影響的 template 檔案。
2. **全局搜尋影響範圍**：用 `rg` 在 `template/` 下搜尋相同的錯誤 pattern，列出所有受影響的 templates。
3. **排除已正確的 templates**：對照搜尋結果，確認哪些 templates 已使用正確 code path，不要 patch 它們。
4. **決定 fix 位置**：
   - Root cause 在 shared code → 修 `src/common`，確認不破壞已正確的 templates。
   - Root cause 是 template-local 的錯誤實作 → 逐一修每個受影響的 template。
5. **逐一修復**，完成後用同一個 `rg` 指令確認錯誤 pattern 已消失。
6. **回報**：受影響 templates 清單、fix 位置（shared vs template-local）、哪些 templates 已正確不需修改。

## Template 家族慣例

某些 templates 共用幾乎相同的 code，找到一個成員的 bug，要同時檢查整個家族：

| 家族 | 成員 |
|------|------|
| okbet | okbet, okbet_blackGold, okbet_green, okbet_red, okbet_redBlack |
| set33 | set33_GREEN, set33_RED |
| set_r022 | set_r022, set_r022_mga |
| set_r024/25 | set_r024, set_r025 |

## 常見陷阱

- 只修使用者提到的那個 template，忘記搜尋同家族成員是否也有相同問題。
- 把「已使用正確 composable 的 template」也一起 patch，造成 redundant import 或行為改變。
- Root cause 在 shared code，卻逐一改每個 template 的呼叫方式，沒有從根本修。
- 搜尋關鍵字太模糊（如 `cms`），找到大量不相關的結果；應搜尋具體的 function 名或 import 路徑。
- 修完後沒有重新 `rg` 確認錯誤 pattern 清除，殘留一個遺漏的 template。
