# R017 (gsi2) PageSpeed 優化報告

**期間**:2026-07-06 ~ 07-10 | **成果**:桌面 **11 → 79**、行動 **23 → 51**

---

## 改了什麼、分數多多少

| 改動 | 內容 | 桌面 | 行動 |
|---|---|---:|---:|
| 資產瘦身 | marquee 1.4MB→4.6KB、背景圖 1MB→17KB(轉 WebP) | — | — |
| CLS 佔位 | 首頁各區塊(RankBoard、Provider、CMS)預留高度,CLS 0.835→0 | +34 | +21 |
| Banner LCP | banner 改 `<img fetchpriority>` + HTML 內 inline script 提早呼叫 banner API | +12 | +6 |
| 字型移除 | Noto Sans TC 5.3MB 從 font stack 移除,改用系統中文字型(Mac PingFang / Win YaHei) | +5 | +3 |
| JS 瘦身 | PrimeVue auto-import 收斂(async wrapper 119→3),桌面 TBT 460→190ms | +17 | ~0 |
| **合計** | 首頁傳輸量 12.6MB → 1.7MB(−87%) | **+68** | **+28** |

關鍵指標:桌面 LCP 7.8s → **2.1s**(達 Google 綠燈標準)、行動 LCP 40.7s → 11.5s、CLS 兩端歸零。

**試過但撤掉**:CSS 非阻斷載入(footer 閃現造成 CLS 回歸 −6 分,已回退)、字型子集化與 i18n 檔修剪(實測收益太小,不值得做)。

---

## 還剩下什麼可以改

| 優先 | 項目 | 預估分數 | 卡在哪 |
|:---:|---|---|---|
| 1 | 字型 preload 清理(移除死代碼、檢查 DINPro/Segoe 必要性) | 桌面 +1-2(**可破 80**) | 無,20 分鐘 |
| 2 | env.js 改 inline(行動阻斷 450ms) | +3-5 | 需 DevOps 同意「改 env.js 要重 build」 |
| 3 | Banner 素材規範(JPEG 434KB、GIF 1.8MB 壓縮) | 行動 +2-3 | 營運端/後台上傳規範 |
| 4 | 無障礙分數 84→90+(按鈕標籤、對比度) | 非效能分 | 順手可修 |

**天花板**:行動 LCP 11.5s 受限於 SPA 架構(無 SSR)+ 4G 模擬,再往上要動架構,現階段不建議。

---

詳細過程與數據:[spec §8 調查記錄](./pagespeed-performance-optimization.md)
