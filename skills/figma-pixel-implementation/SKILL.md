---
name: figma-pixel-implementation
description: 當任務需要依 Figma、設計稿、截圖或圖片還原前端 UI 時使用；包含 Figma link、看圖切版、pixel-perfect、視覺比對、Tailwind 任意值、Playwright 截圖驗證、修正 spacing/font-size/尺寸差異等情境。
---

# Figma Pixel Implementation

這個 skill 是硬性還原規則。只要任務需要看 Figma、設計稿、截圖或圖片來實作 UI，就必須使用；不要把設計值「整理」成慣用 spacing、font scale 或 design token 近似值。

## 不可違反

- 不允許自行調整任何 spacing。
- 不允許自行調整任何 font-size。
- 必須完全遵守 Figma 或圖片量測出的數值。
- 不允許只看 Figma 連結指定的外層節點；必須展開並檢查該節點底下每一層子節點。
- Tailwind 要保留任意值；例如量到 `13px` 就寫 `px-[13px]`，量到 `15px` 就寫 `text-[15px]`。這些數字只是例子，實際值以 Figma/圖片為準。
- 不要把任意值四捨五入成 `px-3`、`text-sm`、`gap-4` 等近似 class。
- 不要因為「看起來比較順」自行調整尺寸、行高、間距、圓角、陰影、顏色或 breakpoints。

## 實作流程

1. 先取得 Figma context、Figma screenshot 或使用者提供的圖片。
2. 對 Figma 連結指定的節點取得完整節點樹；逐層檢查所有子節點、群組、auto layout、文字、圖層、元件 instance 與狀態，不可只看外層 frame 或截圖表面。
3. 逐項記錄需要照抄的數值：width、height、padding、margin、gap、font-size、line-height、border-radius、border、shadow、color、座標與響應式尺寸。
4. 實作時直接使用量到的數值。Tailwind 專案優先用任意值 class，例如 `w-[327px]`、`gap-[7px]`、`rounded-[10px]`、`leading-[18px]`。
5. 完成後使用 Playwright 截圖。
6. 將 Playwright 截圖與 Figma/原圖比對。
7. 列出所有差異，包含 spacing、font-size、位置、尺寸、顏色、圓角、字重、行高、圖片裁切與狀態。
8. 依差異修正，重複截圖與比對，直到無明顯差異。

## 回報格式

完成時必須回報：

- Figma/原圖來源。
- Playwright 截圖位置。
- 比對後仍存在的差異；若沒有明顯差異，明確說明「無明顯差異」。
- 若有無法完全一致的地方，說明原因與限制，不可靜默略過。
