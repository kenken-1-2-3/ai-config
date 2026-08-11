---
name: figma-pixel-implementation
description: Use when the user explicitly requests pixel-perfect implementation, visual parity, screenshot-based layout recreation, visual comparison, or precise spacing, font, and size correction from Figma or an image. Do not use when a screenshot only demonstrates a functional defect such as a missing icon font, untranslated key, runtime error, or wrong data, or for general frontend implementation.
---

# Figma Pixel Implementation

依指定視覺來源精確還原 UI，同時限制重複讀圖、截圖與模型比對造成的 context 膨脹。

## Non-trigger boundary

- 截圖若只用來呈現 functional defect、missing icon font、untranslated key、runtime error 或 wrong data，將它當成診斷 evidence，不觸發此 skill。
- 使用者沒有要求 visual parity、pixel-perfect、看圖切版、視覺比對或精確量測時，走一般實作／除錯流程。

## 先固定來源與狀態

開始前建立一份簡短 manifest：

| State ID | Route / viewport / data / permission | Authoritative source | Local asset | Output screenshot |
| --- | --- | --- | --- | --- |
| `<STATE-ID>` | `<可重現條件>` | `<Figma node / image>` | `<已下載檔案>` | `<完成後填>` |

- 實作前凍結 manifest。只有來源或使用者需求真的變更才可新增版本；重新命名、拆分 state 或改 viewport 不會重設後述輪次計數。
- 同一張圖只下載一次，首次盤點時記錄 local path、尺寸與必要量測。只在允許的視覺比對輪次載入該 local asset，每輪最多一次並盡量批次帶入；不可重新搜尋、抓取或在 microfix 後重複附圖。
- Figma node、mock 與截圖若代表不同狀態，拆成不同 `State ID`，不要混成一個「大致相似」的畫面。
- 來源互斥或缺少關鍵 state 時先列出具體缺口；不可從 API、repo 現況或相鄰畫面自行推翻已指定的 UI。

## 量測規則

- Figma 是來源時，取得指定節點的完整子樹，檢查 auto layout、文字、圖層、instance、variant 與狀態。
- Raster screenshot 是來源時，只對固定 viewport 中可觀察的像素負責；隱藏狀態與 responsive 行為必須由其他來源或使用者決策補齊，不可臆測成已確認需求。
- 記錄 width、height、padding、margin、gap、font-size、line-height、border、radius、shadow、color、座標、圖片裁切與 breakpoint。
- 不把量到的值四捨五入成慣用 spacing、font scale 或近似 token。Tailwind 可使用 `w-[327px]`、`gap-[7px]`、`text-[15px]` 等任意值；實際數字以來源為準。
- 不因「看起來比較順」自行改尺寸、間距、字級、行高、圓角、陰影、顏色或 breakpoints。

## 實作與驗證迴圈

1. 一次盤點所有 `State ID` 的量測值、素材與既有元件，再開始實作；同時先列好 coherent slices。slice 是能獨立測試的結構／狀態／樣式 outcome，不是一個 CSS property 或一次修正；開始 visual loop 後不得靠重新切 slice 增加 quota。
2. 以已宣告的 slice 批次完成結構、狀態與樣式；microfix 只跑受影響的 DOM／computed-style／component focused check，不產 screenshot、不重新載入參考圖，也不跑完整 build。
3. 每個 slice 完成後跑一次最小相關測試與一次完整 build。若 build 失敗，修正後最多重跑一次；第二次仍失敗就停止並回報，不建立新 slice 重設次數。
4. 每個 frozen state 最多 **兩個 visual repair rounds，無論 diff 由 deterministic tool 或模型產生**。一輪從依 manifest 批次產 screenshot 開始；baseline screenshot 算第一輪，同一批次涵蓋的每個 state 都各增加一輪。
5. 每輪一次列完整 diff ledger：`State ID | element | expected | actual | delta | fix`，同輪修完全部已知差異。不做「看到一點 → 改一點 → 再截圖／再比對」的微迴圈。
6. 第二輪批次修正後，只能再產一次 final evidence screenshot／deterministic read-back，且不得據此開第三輪修正。仍有差異就保留 evidence，回報具體 delta、原因及需要的來源／決策；不得宣稱 pixel-perfect。

Deterministic 的 DOM 尺寸、computed style、overflow、viewport 與 build/test 結果優先直接檢查。只有整體構圖、裁切、字形或視覺層級等無法由 deterministic check 判斷時，才需要模型視覺比較；模型比對也包含在上述兩輪總上限內。

## 回報格式

- manifest 中使用的來源、state 與 viewport。
- focused test、完整 build 與 deterministic checks 的結果。
- 最終 screenshots 路徑。
- diff ledger 中仍未解的差異；若沒有，寫「在已列 state／viewport 下無已知差異」。
- 未提供或無法重現的 state，明確列為未驗證，不可把單一畫面結果外推成全部狀態完成。
