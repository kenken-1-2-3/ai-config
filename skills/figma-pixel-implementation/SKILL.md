---
name: figma-pixel-implementation
description: Use when a Figma node or image is the authoritative source for a user-visible UI implementation or visual fix, including pixel-perfect implementation, visual parity, screenshot-based layout recreation, visual comparison, or precise spacing, font, and size correction—even when the user does not say pixel-perfect. Do not use when a screenshot only demonstrates a functional defect such as a missing icon font, untranslated key, runtime error, or wrong data.
---

# Figma Pixel Implementation

依指定視覺來源精確還原 UI。讀到 Figma、寫出 class 或通過 build 都不代表畫面一致；只有實際 rendered page 的量測與比對能關閉視覺需求。

## Non-trigger boundary

- 截圖若只用來呈現 functional defect、missing icon font、untranslated key、runtime error 或 wrong data，將它當成診斷 evidence，不觸發此 skill。
- 沒有 Figma／圖片作為視覺權威來源，且使用者也沒有要求 visual parity、看圖切版、視覺比對或精確量測時，走一般實作／除錯流程。

## 先固定可重現狀態

任何視覺修改前，先建立並凍結 manifest：

| State ID | Route | Exact viewport | Data / auth / permission | Global shell state | Authoritative source | Local asset | Output screenshot |
| --- | --- | --- | --- | --- |
| `<STATE-ID>` | `<route>` | `<width × height>` | `<可重現條件>` | `<header／global sidebar／local aside 狀態>` | `<Figma node / image>` | `<已下載檔案>` | `<完成後填>` |

- 實作前凍結 manifest。只有來源或使用者需求真的變更才可新增版本；重新命名、拆分 state 或改 viewport 不會重設後述輪次計數。
- 同一張圖只下載一次，首次盤點時記錄 local path、尺寸與必要量測。只在允許的視覺比對輪次載入該 local asset，每輪最多一次並盡量批次帶入；不可重新搜尋、抓取或在 microfix 後重複附圖。
- Figma node、mock 與截圖若代表不同狀態，拆成不同 `State ID`，不要混成一個「大致相似」的畫面。
- 來源互斥或缺少關鍵 state 時先列出具體缺口；不可從 API、repo 現況或相鄰畫面自行推翻已指定的 UI。

## 完整量測範圍

- Figma 是來源時，取得指定節點的完整子樹，並量測目標節點、直到 viewport 的 ancestor／layout shell，以及會改變可用空間的 sibling。檢查 auto layout、constraints、文字、圖層、instance、variant 與狀態。
- Figma 連結若只指向子節點，不得用該子節點推定外層 container。向上找到能定義 viewport／page frame 的父節點；找不到就把外層尺寸列為缺口，不沿用 repo 預設值冒充設計值。
- 把 Figma 尺寸映射到 runtime 寬度鏈：`viewport → global navigation/sidebar → page shell → section padding → local aside → gap → target container`。記錄每層 expected 值與推導公式。
- Raster screenshot 是來源時，只對固定 viewport 中可觀察的像素負責；隱藏狀態與 responsive 行為必須由其他來源或使用者決策補齊，不可臆測成已確認需求。
- 記錄 width、height、padding、margin、gap、font-size、line-height、border、radius、shadow、color、座標、圖片裁切與 breakpoint。
- 不把量到的值四捨五入成慣用 spacing、font scale 或近似 token。Tailwind 可使用 `w-[327px]`、`gap-[7px]`、`text-[15px]` 等任意值；實際數字以來源為準。
- 不因「看起來比較順」自行改尺寸、間距、字級、行高、圓角、陰影、顏色或 breakpoints。

## 實作與驗證迴圈

1. 一次盤點所有 `State ID` 的完整量測鏈、素材與既有元件，再開始實作；同時先列好 coherent slices。slice 是能獨立測試的結構／狀態／樣式 outcome，不是一個 CSS property 或一次修正；開始 visual loop 後不得靠重新切 slice 增加 quota。
2. 以已宣告的 slice 批次完成結構、狀態與樣式；microfix 只跑受影響的 DOM／computed-style／component focused check，不產 screenshot、不重新載入參考圖，也不跑完整 build。
3. 每個 slice 完成後跑一次最小相關測試與一次完整 build。若 build 失敗，修正後最多重跑一次；第二次仍失敗就停止並回報，不建立新 slice 重設次數。
4. 在 manifest 的 exact viewport 與 shell state 開啟實際頁面。每個 frozen state 最多 **兩個 visual repair rounds，無論 diff 由 deterministic tool 或模型產生**。一輪從批次產生 rendered-page screenshot 與 DOM read-back 開始；baseline 算第一輪。
5. 每輪一次列完整 diff ledger：`State ID | element | expected | actual | delta | fix`，同輪修完全部已知差異。不做「看到一點 → 改一點 → 再截圖／再比對」的微迴圈。
6. 第二輪批次修正後，只能再產一次 final evidence screenshot／deterministic read-back，且不得據此開第三輪修正。仍有差異就保留 evidence，回報具體 delta、原因及需要的來源／決策；不得宣稱 pixel-perfect。

Deterministic 的 viewport、`getBoundingClientRect()`、computed style、overflow 與 breakpoint 優先直接檢查。只有整體構圖、裁切、字形或視覺層級等無法由 deterministic check 判斷時，才需要模型視覺比較；模型比對也包含在上述兩輪總上限內。

build、lint、unit test、class/source 字串斷言都不是視覺完成證據。它們只能證明編譯或實作護欄，不能取代 rendered-page screenshot、DOM 尺寸或 computed style。

## 完成閘門

只有同時符合以下條件，才能回報該視覺 state 完成或 pixel-perfect：

- 每個 frozen state 都有實際 rendered page 的 viewport、getBoundingClientRect 與 computed style read-back。
- diff ledger 包含所有關鍵 container、文字、間距與狀態的 expected、actual、delta；要求精確的數值 delta 必須為 `0`，否則明列未解差異。
- 每個 state 都有 baseline 與 final screenshot，且 final screenshot 路徑已寫回 manifest。
- build／focused tests 通過，並且沒有把它們當成視覺證據。
- 任何 frozen state 無法開啟、登入、載入資料、截圖或量測時，完成狀態只能是 `UNVERIFIED`；不得依 Figma context、CSS、source-string test 或數學推導宣稱已完成。

## 常見錯誤

| 說法 | 判定 |
| --- | --- |
| 「已呼叫 Figma，所以尺寸已確認」 | Figma context 只是 expected；仍需 runtime actual。 |
| 「子節點是 998px，所以外層照現況即可」 | 子節點不能授權 ancestor shell；必須量完整寬度鏈。 |
| 「build 和 class 測試通過」 | 不是視覺證據。 |
| 「localhost 無法登入，但 CSS 看起來正確」 | 該 state 是 `UNVERIFIED`。 |

## 回報格式

- manifest 中使用的來源、state 與 viewport。
- 每個 state 的 runtime width chain 與 deterministic read-back。
- focused test、完整 build、baseline／final screenshots 路徑。
- diff ledger 中仍未解的差異；若沒有，寫「在已列 state／viewport 下無已知差異」。
- 未提供或無法重現的 state，標記 `UNVERIFIED`，不可把單一畫面結果外推成全部狀態完成。
