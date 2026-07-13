# R017 (gsi2) PageSpeed 效能優化 Spec

> **角色**：依據 PageSpeed Insights 對 `https://gsi2.gsiwl.com`(= NX 會員端 `apps/r017`)的分析結果,分階段修復效能瓶頸,把 Performance 分數從桌面 11 / 行動 23 拉高。
>
> **分析來源**：<https://pagespeed.web.dev/analysis/https-gsi2-gsiwl-com/jd26cds8co?form_factor=desktop>(2026-07-06 讀取)
>
> **目標 repo**:`~/wow/whitelabel-gsi-platform-multiverse-nx`

---

## 1. Git Flow

- Base branch:`main`(開分支前先 pull 最新)
- Work branch:`perf/pagespeed-optimization`
- **實作必須在建立並切換到 work branch 之後才開始**,不得在 `main` 上直接改。
- 完成後依標準流程 `develop` → `staging` → `main` 逐站驗證,每次 merge 前先取得 Ken 確認。

---

## 2. 現況基準(Baseline,2026-07-06)

改完後必須重跑 PSI(或本機 Lighthouse)與此表對照,才知道實際改進多少。

### 2.1 分類分數

| 類別 | 行動版 | 桌面版 |
|---|---:|---:|
| **Performance** | **23** | **11** |
| Accessibility | 84 | 84 |
| Best Practices | 96 | 96 |
| SEO | 92 | 92 |

### 2.2 Performance 指標明細

| 指標(權重) | 行動版 | 桌面版 | 及格線(桌面) |
|---|---:|---:|---|
| First Contentful Paint(10%) | 4.2 s | 1.1 s | ≤ 0.9 s |
| Largest Contentful Paint(25%) | **40.7 s** | **7.8 s** | ≤ 1.2 s |
| Total Blocking Time(30%) | 460 ms | **1,230 ms** | ≤ 150 ms |
| Cumulative Layout Shift(25%) | 0.623 | **0.835** | ≤ 0.1 |
| Speed Index(10%) | 18.5 s | 4.8 s | ≤ 1.3 s |

### 2.3 關鍵診斷數據(桌面版)

- **LCP 細目**:TTFB 50 ms/**資源載入延遲 3,640 ms**/資源載入 30 ms/元素算繪延遲 430 ms
  → LCP 元素是首頁 banner 圖(`…/banners/98_en.jpeg`,來自 `wowdata.gpsriowdl.com`),瓶頸不是下載慢,是「太晚被發現」。
- **CLS 主因**:「Latest Bet And Big Wins」區塊位移 0.613 + 遊戲列表(No Data → Recommend)位移 0.184,合計佔 0.835 中的 0.797。

### 2.4 關鍵診斷數據(行動版)

- **LCP 40.7 s 的成因與桌面不同**:LCP 細目本身不誇張(TTFB 20 ms/資源載入延遲 2,340 ms/載入 40 ms/算繪延遲 340 ms),但行動版模擬 4G 頻寬(~1.6 Mbps)下,12.6 MB 總資源把頻寬吃滿,LCP 候選圖片被 5.3 MB 字型、1.8 MB GIF、1.4 MB marquee.svg 排擠到最後才完成 → **對行動版而言,§4.3/4.4/4.5 的「減總量」就是直接的 LCP 修復**。
- **CLS 主因**(0.623):「Latest Bet And Big Wins」0.475 + banner swiper 區塊合計 ~0.147 → 與桌面同源,§4.2 同一套修法涵蓋。
- **阻斷算繪共 780 ms**:`/env.js` 470 ms + `/_nuxt/entry.CwmqutG6.css` 310 ms — env.js 在行動網路下的阻塞成本比桌面明顯(桌面僅 120 ms)。
- 其餘診斷(無用 JS 164 KiB、JS 執行 1.3 s、主執行緒 2.6 s、9 項 long task、圖片估省 429 KiB)與桌面版報告相同。
- **總傳輸量 12,630 KiB**,大戶:
  | 資源 | 傳輸大小 |
  |---|---:|
  | `/fonts/NotoSansTC-VariableFont_wght.woff2` | 5,289 KiB |
  | wowdata CDN 的 GIF banner(單檔最大) | 1,822 KiB |
  | `/images/svg/marquee.svg` | 1,432 KiB |
  | `/images/bg-img-pc.png` | 787 KiB |
  | banner `98_en.jpeg` | 435 KiB(轉 WebP 估省 289 KiB) |
- 其他:阻斷算繪(entry CSS 38.8 KiB + env.js)估省 470 ms;無用 JS 估省 164 KiB;JS 執行 1.3 s;主執行緒 2.6 s;9 項 long task。

---

## 3. 範圍

**做**(Phase 1,本 spec 主體):

1. **LCP:banner 改為可提前發現的 `<img>`** — `libs/shared/ui-layer/src/lib/components/HomeBanner.vue`
2. **CLS:非同步區塊預留高度** — Latest Bet/Big Wins 與遊戲列表元件
3. **字型子集化** — `apps/r017/src/public/fonts/NotoSansTC-VariableFont_wght.woff2`(5.2 MB → 分片)
4. **marquee.svg 換成真向量** — `apps/r017/src/public/images/svg/marquee.svg`(1.4 MB → <5 KB)
5. **bg-img-pc.png 轉 WebP** — `apps/r017/src/public/images/bg-img-pc.png`
6. **preconnect 到 banner CDN 網域**

**不做 / 另案**:

- wowdata CDN 上的 banner/GIF 素材壓縮(後台上傳素材,屬營運側規範,本 spec 只列建議)
- TBT/JS 瘦身(unused JS 164 KiB、long tasks)— 列為 Phase 2,等 Phase 1 重測後再評估
- `/env.js` 的阻斷算繪(行動版 470 ms)— env.js 是 runtime 環境設定,app 啟動前必須就緒,改為非阻塞載入涉及啟動順序重構,列 Phase 2 評估
- Accessibility 84 分的修復(button-name、aria-dialog-name 等)— 與效能無關,另開需求
- r001 的字型/圖片資產(r001 有同樣的 5.2 MB 字型,但本需求以 gsi2/r017 為目標;r001 比照辦理與否由 Ken 決定)

**跨站影響(必須先讓 Ken 確認)**:

- 項目 1、2 改的是 `libs/shared/ui-layer` 共用元件,**r001 與 r017 都會吃到**。改動設計為「視覺結果不變、只改載入方式與佔位」,但仍屬共用碼變更。
- 項目 3、4、5、6 只動 `apps/r017`,無跨站影響(項目 6 的 preconnect 寫在 r017 的 `nuxt.config.ts`)。

---

## 4. 實作細節

### 4.0 分階段執行順序(CP 值優先)

§4.1 - §4.6 的 6 個修法依「動的檔案少 / 邏輯改動小 / 風險低 / 收益顯著」的 CP 值排序,分三批推進。不是所有項目要在同一個 PR 完成 — Phase 1a 可獨立上線先看到分數變化,再決定下一步範圍。

**Phase 1a — 保守版(零/低風險,幾天內可完成)**

| 順序 | 項目 | 主要收益(實測 / 估) | 前置條件 |
|:---:|---|---|---|
| 1 | §4.4 marquee 改 WebP | **實測 −1,429 KiB** | 無(Figma 源檔已下載,§8 記錄) |
| 2 | §4.5 bg-img PC + mobile 轉 WebP | **實測 −1,001 KiB** | §7.3.4 決定是否要 PNG fallback + 上線前視覺確認 |
| 3 | §4.2 CLS 佔位(RankBoard + ProviderListCarousel + 圖片 w/h) | CLS 0.835→<0.1,**分數 +15-25**(權重 25%) | 有 skeleton 樣式共識(Figma 是否有 loading state) |
| 4 | §4.6 preconnect banner CDN | LCP −100-300 ms | 用 nuxt plugin 動態注入(§7.2.6) |

Phase 1a 估算:總傳輸量 12,630 KiB → **~10,200 KiB(−19.2%)**;桌面 Perf 11 → **~30-40**、行動 Perf 23 → **~35-45**;CLS 直接達標。**這一批不需要動 P0.3(字型)/ P0.4(CDN)/ P0.1(preload API)的決策也能上線。**

**Phase 1b — 加碼(中風險,需 QA 驗證共用元件視覺回歸)**

| 順序 | 項目 | 主要收益 | 前置條件 |
|:---:|---|---|---|
| 5 | §4.1 精簡版:HomeBanner `<img>` + fetchpriority(不加 preload API) | LCP −500-800 ms | §7.2.4 loop slide 識別、§7.2.5 視覺比對;§7.1.1 已排除(P0.2 確認 r001 未引用) |

Phase 1b 疊加後估算:桌面 Perf **~45-55**、行動 Perf **~50**。

**Phase 2 — 依 2026-07-08 實測後的 CP 值重排(高 → 低)**

Phase 1b #5 上線後桌面 41 / 行動 47,證實 SPA 下 `<img>` + fetchpriority 收益有限(§8 記錄)。之後路線 D+B 一次上線,桌面 41→57 / 行動 47→53(桌面 LCP 7.1s→2.4s 進入 CWV 良好門檻)。下面依「動的行數 vs 分數收益」重新排序 Phase 2 剩餘路線。

| 順序 | 代號 | 項目 | 主要收益 | 前置條件 | 狀態 |
|:---:|:---:|---|---|---|---|
| 6 | D | §4.7 移除 NotoSansTC preload | 行動 +15-25 分、桌面 +3-5 分 | 無 | ✅ 已上線 |
| 7 | E | §4.10 font-family stack 移除 Noto Sans TC | Mac/Win 零下載 5.3 MB;實測 +3-5 分 | PM 對齊跨平台字型 | ✅ 已上線 |
| 8 | B | §4.9 inline preload API(banner list) | LCP 局部改善 | — | ✅ 已上線 |
| — | F | §4.11 CSS 非阻斷載入 | FCP/TBT 改善但 CLS 大回歸 | 需先解無樣式 DOM 佔位 | ❌ **已試失敗,回退**(§8 記錄) |
| 9 | **H** | **未用字型 preload 清理 + nuxt.config Noto Sans TC family 條目移除** | +1-2 | 檢查首屏字型使用 | 未做,**建議下一步** |
| 10 | G | §4.12 JS bundle 瘦身(G1-G5 分批) | 桌面 +6-10、行動 +2-6 | `nuxi analyze` 先行;單獨 branch | 未做,spec 已備 |
| 11 | C | §4.8 env.js 從外部 script 改為 inline | 桌面 FCP −240 ms、行動 −470 ms、+3-5 分 | 部署工作流變更(需 DevOps) | 暫緩 |
| — | A | §4.3 字型子集化 | 極邊際(PSI 已不下載) | P0.3/P0.4 | **降級為非優先**(§8 記錄) |

**Phase 2 疊加後估算(依實測 baseline 41-47 起跳)**:
- 只做 D:桌面 **~48-52**、行動 **~65-72**
- D+C:桌面 **~52-58**、行動 **~68-75**
- D+C+B:桌面 **~60-68**、行動 **~72-80**
- 全部四項(含 A):桌面 **~65-75**、行動 **~75-85**

**建議動線**:一次做完 D+C(B 之後),各驗一次 PSI,避免一次疊太多改動造成回歸難定位。A 留最後看實際需求再決定是否投入。

**歷史動線紀錄**:先開 `perf/pagespeed-optimization` 分支跑 Phase 1a,上線並用 PSI 重測拿到實測分數(桌面 45 / 行動 44),再決定 Phase 1b/2 是否進場。實務證明這流程有效。

---

### 4.1 LCP:HomeBanner 改用 `<img>` + fetchpriority(精簡版,SPA 現實)

**背景**:§8 P0.1 已證實 r017 為 `ssr: false` SPA(Capacitor 需求),原第 4 點 SSR 路徑不可行。精簡版只做「換 `<img>` + 首張 fetchpriority」,不含 preload API(那是 Phase 2)。

**現況**:[HomeBanner.vue](../../whitelabel-gsi-platform-multiverse-nx/libs/shared/ui-layer/src/lib/components/HomeBanner.vue) slide 用 `div` + CSS `background-image`,URL 來自 `useBanner()` API。線上實測「資源載入延遲 2,180 ms」是主要瓶頸;`background-image` 無法被 preload scanner 提前發現。

**改法(照這順序做,每步驟本機驗一次)**:

1. **template slide 內改渲染 `<img>`**:
   ```vue
   <SwiperSlide v-for="(banner, idx) in bannerList" :key="banner.id">
     <img
       :src="getBannerImage(banner)"
       :alt="banner.title || ''"
       :fetchpriority="idx === 0 ? 'high' : undefined"
       :loading="idx === 0 ? 'eager' : 'lazy'"
       class="h-full w-full object-cover cursor-pointer"
       @click="handleBannerClick(banner)"
     />
   </SwiperSlide>
   ```
   - `object-cover` + `h-full w-full` 直接接手原本 `bg-cover bg-center` 的視覺行為
   - Phase 1a #3 已把 wrapper aspect-ratio 拉出來、swiper 加 `h-full`,這步不用再動容器

2. **注意 swiper `loop: true` 會複製 slide**(§7.2.4):`loop` 模式下 swiper 內部會克隆首尾 slide,`idx === 0` 判斷會誤觸複製那張。可用「僅 `v-for` 原始 array 的 idx 0」,swiper 內建 clone 不含 fetchpriority(swiper clone 保留 attribute,但 clone 不進 DOM initial paint,對 LCP 無影響 — 以 DevTools Network 面板 Priority 欄實測為準)。

3. **視覺回歸驗證**(§7.2.5):
   - 桌面 `aspect-[1200/380]`(3.16:1)容器 + object-cover:banner 圖比例相同 → 完全相同視覺
   - Mobile `aspect-[16/9]`(1.78:1)容器 + object-cover:banner 圖是 3.16:1 時,mobile 會裁掉左右邊(**與原 `bg-center` 行為相同**)
   - 用 Figma R017_優化中 的 banner 節點對照,或線上實 banner 素材本機 QA

4. **不動的地方**(避免範圍蔓延):
   - `useBanner()` hook 不動
   - swiper autoplay / pagination 不動
   - Phase 1a #3 已建立的 aspect-ratio wrapper 不動

**預期效果**:
- 桌面 LCP 7.4 s → ~4-5 s(資源載入延遲 2,180 ms 縮到 500-800 ms)
- 行動 LCP 40.4 s → ~25-30 s(部分改善;真正大改善要靠 §4.3 字型)
- 分數桌面 45 → 55-60、行動 44 → 50-55

**動工前 checklist**:
- [ ] 讀完 §8 P0.1(SSR 已確認不可行,不要再嘗試 useAsyncData 路徑)
- [ ] 讀完 §7.2.4、§7.2.5(loop + 視覺回歸兩個技術風險)
- [ ] 讀完 P0.2 記錄(共用元件動 r001 無影響,可安心改)

**驗收 checklist**:
- [ ] 本機 Lighthouse 或 ngrok+PSI(依 §5.5)桌面 + 行動各跑一次,分數比 baseline 45/44 高
- [ ] DevTools Network 面板:第一張 banner 圖 Priority 欄顯示 High、未 lazy-load
- [ ] Figma 對照 + 6 個 HomeView 頁面(index/login/login-phone/register/deposit/withdraw)banner 視覺無差異

### 4.2 CLS:預留高度(估:CLS 0.835 → <0.1,行動 0.623 → <0.1)

**根本原因不在被歸咎的元件,而在 HomeView 上方的 v-if 分區**

閱讀 [HomeView.vue](../../whitelabel-gsi-platform-multiverse-nx/libs/shared/ui-layer/src/lib/components/views/HomeView.vue) 後發現,RankBoard 本身內部高度是鎖定的([RankBoardBase.vue:75-81](../../whitelabel-gsi-platform-multiverse-nx/libs/shared/ui-layer/src/lib/components/RankBoard/RankBoardBase.vue) `viewportHeight = rowHeight * visibleCount = 56*8 = 448px`,空狀態同高)。但 PSI 仍把 CLS 0.613 歸給它,是因為 HomeView 上方的區塊在載入時**用 `v-if` 決定是否掛載**,資料到位後從 0 高度膨脹,把 RankBoard 整塊往下推:

```
<HomeBanner />                    <-- 高度已鎖 aspect-ratio(§4.1 修好後不推)
<HomeInformationImageSection />   <-- CMS 圖,載入前 0 高
<HomeMarqueeList />               <-- 固定高
<HomeCmsSection v-for>            <-- CMS sections 逐條長出來,最大位移主兇
<div v-if="allProductList?.length">
  <ProviderListCarousel />        <-- 有資料才掛載,從 0 → 完整高
</div>
<RankBoard />                     <-- 被上面所有東西推來推去,CLS 被歸給它
```

**改法(按貢獻由大到小)**:

1. **[HomeView.vue:30](../../whitelabel-gsi-platform-multiverse-nx/libs/shared/ui-layer/src/lib/components/views/HomeView.vue)** 把 `<div v-if="allProductList?.length">` 改為始終渲染 wrapper,或改用 `v-show`,並給 wrapper 一個 `min-height`(依 mobile / desktop 的 ProviderItem 尺寸算)。這樣即使資料未到,空間也預留好。

2. **HomeCmsSection 迴圈的 skeleton 佔位**:若 `useHome()` 的 `homeCmsList` 是 async 載入,在 loading 期間至少渲染 N 個固定高度的 skeleton `<div>`(N = 預期常見的 CMS section 數量,例如 2-3 個),避免資料到位時整塊往下擠。

3. **[HomeInformationImageSection.vue](../../whitelabel-gsi-platform-multiverse-nx/libs/shared/ui-layer/src/lib/components/) 內部**:確認該元件在資料未到時是否有 min-height。若沒有,補一個(讀該元件實作再定尺寸)。

4. **順手處理**:Lighthouse「圖片元素沒有明確的 width 和 height」清單內的圖片補 `width`/`height` 屬性或 CSS `aspect-ratio`。

**不必動的地方**(避免過度改動):
- `RankBoardBase.vue` 內部高度邏輯已正確,不用改
- `ProviderListCarousel.vue` 本身也不用改,只要外層 wrapper 有預留高度即可

**mobile CLS 額外污染源(記錄但不修)**:
本機 Lighthouse 測 mobile 時 CLS 會被 `.p-toast-message-error`(staging API 錯誤 toast)大幅放大到 2.25,這是本機測試環境問題,線上 PSI(0.623)才是實際值,不需要為此改動 toast 樣式。

**預期效果**:CLS 0.835 → <0.1,是本 Phase 分數收益的主體(權重 25%,單一項可拿回 15-25 分)。

### 4.3 字型子集化(估:總傳輸量 −5 MB;行動 FCP/SI 顯著改善)

現況:`@nuxt/fonts` local provider 直接載入完整 CJK 變體字型 `NotoSansTC-VariableFont_wght.woff2`(5,289 KiB),單檔佔全頁流量 42%。

改法(擇一,優先 A):

- **A. unicode-range 分片**:用 `cn-font-split` 把 woff2 切成多個 unicode-range 分片 + 對應 `@font-face` CSS,瀏覽器只下載頁面實際用到的分片(首屏常用字通常 100-300 KiB)。產出物放 `apps/r017/src/public/fonts/noto-sans-tc/`,並把 `nuxt.config.ts` `fonts.families` 的 Noto Sans TC 改為引用分片 CSS。
- **B. 靜態子集**:若站上繁中字量可枚舉(UI 字串 + 常見字表),用 pyftsubset 產單一子集檔。風險:動態內容(玩家暱稱、遊戲名)出現子集外字元會 fallback,故僅在 A 不可行時採用。

同場處理:`fonts.families` 中每個字型的 `src` 陣列移除 `.ttf` fallback 項(所有目標瀏覽器都支援 woff2,ttf 只是徒增 build 產物;`public/fonts/` 內的 `.ttf` 原始檔可留在 repo 但不應被引用)。`font-display` 維持 `@nuxt/fonts` 預設 `swap`。

### 4.4 marquee 圖示改用 WebP(實測:−1,429 KiB)

**Figma 源檔就是 PNG,不是向量**:2026-07-07 檢查 Figma node [`7890:38407`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=7890-38407)(News Ticker 元件),marquee 圖示的原始素材是 2000×2000 PNG,設計名稱「futuristic-holographic-megaphone-icon-graphic-design-concept 1」(3D 光影渲染的喇叭)。Repo 內的 1.4 MB「SVG」就是這張 PNG 被包成 SVG 容器。「真向量」路徑不可行,除非重設計。

改法(調整為 WebP,視覺與 Figma 一致):

1. Figma 匯出原 PNG → 縮圖至 96×96(4x 視網膜,實際只顯示 24×24)→ WebP 品質 85。實測後 = **2.7 KiB**(vs. 原 1,432 KiB,省 99.8%)。
2. 產出檔:`apps/r017/src/public/images/marquee.webp`;舊 `apps/r017/src/public/images/svg/marquee.svg` 可刪。
3. 改共用元件預設路徑:[libs/shared/ui-layer/src/lib/components/MarqueeList.vue:20](../../whitelabel-gsi-platform-multiverse-nx/libs/shared/ui-layer/src/lib/components/MarqueeList.vue) `iconSrc || '/images/svg/marquee.svg'` → `iconSrc || '/images/marquee.webp'`。P0.2 已確認 r001 未引用 MarqueeList,無跨站影響。

備援指令(scratchpad 已預生成):
```sh
sips -Z 96 marquee-orig.png --out marquee-96.png
cwebp -q 85 marquee-96.png -o marquee.webp
```

### 4.5 bg-img PC + mobile 轉 WebP(實測:−1,001 KiB)

**同場加映 mobile 版**:原 spec 只列 `bg-img-pc.png`;檢查引用點時發現 mobile 版 `bg-img-mobile.png`(231 KiB)也需一起換。

- `apps/r017/src/public/images/bg-img-pc.png`(787 KiB)→ WebP q=82 = **13.5 KiB**(−773 KiB,壓縮率 98%)
- `apps/r017/src/public/images/bg-img-mobile.png`(231 KiB)→ WebP q=82 = **2.9 KiB**(−228 KiB,壓縮率 99%)

壓縮率極高的原因:兩張圖看起來是漸層裝飾背景,不是複雜照片。**上線前需視覺確認**(用 Figma 對照或本機瀏覽器比對),若品質不足可提高 q 值至 90。

引用點(4 個位置):
- [apps/r017/src/layouts/default.vue:118](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/src/layouts/default.vue):`background-image: url("/images/bg-img-pc.png")` → `.webp`
- [apps/r017/src/pages/announcement.vue:10](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/src/pages/announcement.vue):Tailwind 任意值 `url(/images/bg-img-pc.png)` 與 `url(/images/bg-img-mobile.png)` 各一
- [apps/r017/src/pages/promotion/[id].vue:15](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/src/pages/promotion/[id].vue):同上,PC + mobile 各一

舊瀏覽器 WebP fallback 依 §7.3.4 決策;若走純 WebP(不留 PNG fallback),保留原 PNG 檔一段時間(方便回滾),或直接刪。

### 4.6 preconnect banner CDN(估:LCP 再省 100-300 ms)

在 `apps/r017/nuxt.config.ts` 的 `app.head.link` 加:

```ts
{ rel: "preconnect", href: "https://wowdata.gpsriowdl.com", crossorigin: "" }
```

注意:CDN base 實際值來自 runtime `env.js` 的 imageBase,preconnect 網域需與線上實際 CDN 網域一致;若各環境網域不同,改為在 app 啟動時依 runtimeConfig 動態注入 `<link rel="preconnect">`。

---

### 4.7 移除 NotoSansTC preload(路線 D,多語系友善)

**發現於 2026-07-08 Phase 1b 上線後**:PSI 行動 LCP 39.7 s、資源載入延遲 2,020 ms 卡住不動,是因為 5.4 MB NotoSansTC 字型佔滿 4G 頻寬,把 banner 圖排到後面。原以為要走 §4.3 字型子集化(高風險大改動),但檢查後發現有零風險替代方案:**關掉這隻字型的 preload,讓瀏覽器按需下載即可**。

**現況追蹤(從 dist 挖出來的實況)**:

1. HTML head 有 `<link rel="preload" as="font" crossorigin href="/fonts/NotoSansTC-VariableFont_wght.woff2">`
2. CSS 也有正常的 `@font-face { font-family: "Noto Sans TC"; src: url(...); font-display: swap; font-weight: 100 900 }`
3. 這個 preload **不是手寫**,是 `@nuxt/fonts` 模組自動幫每個 `families` 條目生成的
4. Site 支援 en / zh-TW / zh-CN 三種語系,英文用戶完全不需要 CJK 字型

**改法(1 行,零程式邏輯風險)**:

在 [apps/r017/nuxt.config.ts:161-165](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/nuxt.config.ts) 的 Noto Sans TC family 條目加 `preload: false`:

```ts
{
  name: "Noto Sans TC",
  src: ["/fonts/NotoSansTC-VariableFont_wght.woff2", "/fonts/NotoSansTC-VariableFont_wght.ttf"],
  weight: "100 900",
  preload: false  // ← 新增
}
```

**預期效果**:

| 用戶類型 | 目前行為 | 改動後行為 |
|---|---|---|
| 英文語系 | 強制下載 5.4 MB(用不到) | 完全不下載 |
| 中文語系 | 高優先預載,佔滿頻寬 | CSS `@font-face` + `font-display: swap` 觸發下載,瀏覽器優先渲染 fallback 字型(PingFang SC / Microsoft YaHei),字型下完再 swap |

- 行動 LCP 39.7 s → **潛在 10-15 s**(英文用戶)/ 15-20 s(中文用戶,swap 前用系統字型)
- 桌面 LCP 7.1 s → **~4-5 s**
- 分數估:行動 47 → **~65-72**,桌面 41 → **~48-52**

**動工前 checklist**:
- [ ] 確認 `@nuxt/fonts` 版本支援 family-level `preload: false`(較新版本才有;不支援時退回手寫 CSS + 移除 head.link)
- [ ] 確認站上首屏英文語系 UI 沒有硬寫 `font-family: "Noto Sans TC"` 的元件(否則英文語系反而變 fallback)
- [ ] 溝通:中文用戶會看到 1-2 秒的字型 FOUT(從系統字型 → NotoSansTC),需 PM/設計確認可接受

**驗收 checklist**:
- [ ] Build 後 DevTools Network 面板:英文語系 → NotoSansTC 未在 request 清單;中文語系 → NotoSansTC 出現但不是最高優先 High
- [ ] 兩種語系切換測試:視覺無崩壞、字型 swap 在合理時間內完成
- [ ] PSI 各語系重測:桌面 41 / 行動 47 → 至少一個維度明顯改善

**風險**:@nuxt/fonts 若不支援 `preload: false`,需改為手寫 `@font-face` 並從 `families` 移除該條目,增加改動複雜度。

---

### 4.8 env.js 從外部 script 改為 inline(路線 C,消除阻斷算繪)

**背景**:PSI render-blocking 診斷顯示 `/env.js` 阻塞算繪 —— 桌面 240 ms、行動 470 ms。目前它是 head 內的外部 sync script,瀏覽器必須等它下載完並執行才能繼續解析 body。

**現況**:
- [apps/r017/nuxt.config.ts:66](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/nuxt.config.ts):`script: [{ src: "/env.js", tagPosition: "head" }]`
- [apps/r017/src/public/env.js](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/src/public/env.js) 內容約 30 行,設 `window.__ENV__ = {...}`
- 部署流程依賴「替換 public/env.js 即可切換環境」的能力(不重 build)

**改法(方案 A — 保留 env.js 檔案,額外 inline 到 HTML head)**:

在 nuxt build hook 或 vite plugin 中,讀取 `public/env.js` 內容,注入到 `app.head.script` 的 `innerHTML`:

```ts
// apps/r017/nuxt.config.ts(修改)
import { readFileSync } from "fs"
import { resolve } from "path"

const envJsContent = readFileSync(resolve(__dirname, "src/public/env.js"), "utf-8")

// ...
app: {
  head: {
    // ...
    script: [{ innerHTML: envJsContent, tagPosition: "head" }],  // 改為 inline
    // 不再引用 /env.js 外部檔案
  }
}
```

**⚠️ 缺點**:「換 env.js 就能切環境不重 build」的部署工作流會失效,因為內容已 baked 進 HTML。**動工前必須跟 DevOps 確認**是否可以接受(或走方案 B)。

**改法(方案 B — 保留 env.js 外部檔案 + 部署後複製到 index.html)**:

保留 `public/env.js` 供部署替換,但在 deployment pipeline 中新增一步:讀 env.js 內容 → 內嵌到 index.html 的 `<script>` tag。這樣 build 產物依然通用,inline 化在部署時發生。改動落在 CI/CD 而非 repo。

**預期效果**:
- 桌面 FCP 0.9 s → ~0.65-0.7 s(−240 ms)
- 行動 FCP 4.2 s → ~3.7 s(−470 ms)
- 桌面 分數 +3-5 分、行動 +2-4 分

**動工前 checklist**:
- [ ] 跟 DevOps 確認方案 A 或 B(是否可接受「切環境需重 build」)
- [ ] 若走方案 A:確認所有環境(dev/staging/prod)build pipeline 都能讀到正確的 env.js
- [ ] 若走方案 B:確認 CI/CD 有能力做 HTML 後處理

**驗收 checklist**:
- [ ] PSI render-blocking-insight audit 中 env.js 不再列為阻塞資源
- [ ] window.__ENV__ 仍在 hydration 前就緒(不改變運行時序)
- [ ] 三個環境切換測試通過

---

### 4.9 inline preload API(路線 B,提早發起 banner API 呼叫)

**背景**:SPA 架構下 `<img>` + fetchpriority(§4.1)只能省一點 LCP,因為 banner URL 要等 useBanner() API 回應才知道。想突破這個天花板,只能讓 API 呼叫**提早發起**,不用等 main.js bundle 下載完 + Nuxt 掛載完 + 元件 setup 完。

**現況**(§8 P0.1 記錄):
```
HTML → env.js → main.js bundle → Nuxt hydrate → HomeBanner setup → useBanner() 呼叫 → 拿到 URL → 圖片下載
```

**改法**:在 HTML head 的 env.js 之後、main bundle 之前,注入 inline `<script>` 立即發起 banner API 的 fetch;結果存 `window.__BANNER_PRELOAD__`;`useBanner` hook 用 vue-query `initialData` seed。

**實作步驟**:

1. **[apps/r017/nuxt.config.ts](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/nuxt.config.ts) `app.head.script`** 新增 inline script(env.js 之後):

```html
<script>
(function(){
  var env = window.__ENV__ || {};
  if (!env.apiBase) return;
  var lang = (document.cookie.match(/i18n_redirected=([^;]+)/) || [])[1] || 'en';
  window.__BANNER_PRELOAD__ = fetch(
    env.apiBase + '/v1/player/banners/list?position=1',
    { headers: { 'Accept-Language': lang, 'Agentcode': env.agentCode || '' } }
  )
  .then(function(r){ return r.json(); })
  .catch(function(){ return null; });
})();
</script>
```

2. **[libs/shared/ui-layer/src/lib/api/hooks/useBanner.ts](../../whitelabel-gsi-platform-multiverse-nx/libs/shared/ui-layer/src/lib/api/hooks/useBanner.ts)** 加 `initialData`(vue-query 首次 fetch 時優先用 window preload):

```ts
initialData: async () => {
  if (typeof window === "undefined") return undefined
  const preload = (window as any).__BANNER_PRELOAD__
  if (!preload) return undefined
  const response = await preload
  return response?.data || undefined
}
```

**預期效果**:
- API fetch 與 main.js bundle 下載**平行**發生,不再序列
- 桌面 LCP 7.1 s → ~5.0-5.5 s
- 行動 LCP 40.4 s → ~35-38 s(受字型頻寬拖累的絕對值仍高)
- 分數估:桌面 +5-10、行動 +3-5

**動工前 checklist**:
- [ ] 確認 banner API 是 guest 可呼叫的(§8 P0.1 已驗證 code:0 success)
- [ ] 決定 preload 只做 position=1(HOME banner)還是要加其他 position
- [ ] 確認 vue-query `initialData` 的正確用法(避免與 staleTime 衝突)

**驗收 checklist**:
- [ ] DevTools Network 面板:banner API 呼叫在 main.js bundle 完成之前發生
- [ ] `useBanner()` 返回時直接有資料,不觸發第二次 fetch
- [ ] 首頁 banner 呈現時間比 baseline 短

**風險**:
- inline script 增加 HTML 檔大小(約 500 bytes)
- 如果 window.__BANNER_PRELOAD__ 賦值時機比 vue-query 讀取還晚,initialData 會為 undefined 走正常路徑(降級成 Phase 1b 效果,不會壞事)

---

### 4.11 CSS 非阻斷載入 / Critical CSS 內嵌(路線 F)

**背景**:E 上線後,PSI 行動 render-blocking 頭號兇手變成:
- `entry.css` 38.5 KiB / 300 ms(佔行動 render-blocking 780 ms 中的近一半)
- `env.js` 450 ms(對應路線 C,已暫緩)

**SPA 特殊情境**:r017 是 `ssr: false` SPA,初始 HTML 幾乎只有 `<div id="__nuxt"></div>`。**沒有 server-rendered 內容,傳統「Critical CSS 抽取首屏樣式 inline」的效益比 SSR 情境小很多** — 因為即使 CSS 立即可用,螢幕上也沒東西可畫,要等 JS 執行 + Vue 掛載才能渲染。

但**「讓 CSS 不阻斷 HTML parser」** 這個收益仍然存在:HTML parser 不必停在 `<link rel="stylesheet">` 等 CSS 下載完,可以更快解析剩下的 head、繼續下載後續資源。FCP 可小幅改善,LCP 連帶受益。

**改法(擇一,依實作成本從低到高)**:

**方案 A(推薦)— 純非阻斷載入,無 Critical CSS 抽取**

改 nuxt.config.ts,把 `<link rel="stylesheet">` 換成 `<link rel="preload" as="style">` + JS swap:

```ts
// nuxt.config.ts
app: {
  head: {
    // ...
    link: [
      // 原本自動生成的 stylesheet 改用 preload + onload swap
      // 需要 hook 進 Nuxt 的資源注入邏輯,或用 nitro:document 掛鉤
    ]
  }
}
```

實際做法會用 **nitro hook** 在 render 完 HTML 後把 stylesheet link 改為 preload 形式:

```ts
hooks: {
  "render:html": (html) => {
    html.head = html.head.map(tag =>
      tag.replace(
        /<link rel="stylesheet" href="([^"]+)"/g,
        '<link rel="preload" href="$1" as="style" onload="this.rel=\'stylesheet\'"'
      )
    )
  }
}
```

備援:`<noscript>` 內放回原本的 `<link rel="stylesheet">`,防止 JS 關掉時完全無 CSS。

- 優點:改動極小、無需 build 抽取步驟、對整個 app 生效
- 缺點:短暫 FOUC(不過 SPA 首屏本來也是白畫面,幾乎察覺不到)
- 預期:FCP 桌面 0.9s → ~0.8s、行動 4.2s → ~3.8-4.0s;分數 +2-4

**方案 B — Critical CSS pre-render 抽取**

使用 `critical` npm package 或 `beasties` 之類,在 build 後:
1. 用 Puppeteer 開啟 build 產物的 index.html
2. **等待 SPA hydration 完成**(關鍵:SPA 情境需 hydrate 後才有 above-the-fold)
3. 抽取 above-the-fold CSS
4. 內嵌到 HTML head,把原 stylesheet 改 async

- 優點:更精準,避免 FOUC
- 缺點:build 時間增加、SPA 抽取結果不穩定(每次 hydration 可能不同)、setup 複雜
- **不推薦**在 SPA 環境優先採用此方案

**方案 C — 手工列出關鍵 CSS,build-time 內嵌**

手動識別哪些 CSS 對「不看 FOUC」最關鍵(通常是:CSS reset、body 背景色、字型宣告、header/nav 基本 layout),寫進 nuxt.config.ts 的 `app.head.style` 直接內嵌:

```ts
head: {
  style: [{ innerHTML: "body{margin:0;background:#0a0a0a;color:#fff;...}" }]
}
```

- 優點:build 靜態,可預測
- 缺點:CSS 修改後需手動維護、易漏

**推薦選方案 A**:改動最小、收益明確、SPA 情境下 FOUC 風險極低。

**預期效果**:
- 桌面 FCP 0.9s → ~0.8s、LCP 2.4s(已達標,可能持平)
- 行動 FCP 4.2s → ~3.8-4.0s、LCP 13.2s(小幅連帶改善)
- 分數:桌面 62 → **~64-66**、行動 56 → **~59-61**

**動工前 checklist**:
- [ ] 檢查 Nuxt 3 hook `render:html` 或 nitro `render:response` 的可用性(不同版本 API 可能不同)
- [ ] 決定備援:`<noscript>` 內是否放同一 CSS
- [ ] 準備 A/B build 對照:改動前後同一 URL,confirm 樣式無差

**驗收 checklist**:
- [ ] DevTools Network 面板:entry.css 的 Priority 從 "Highest" 變為 "Low",且從 Request initiator 變為 preload
- [ ] Lighthouse render-blocking-insight audit:entry.css 不再列為阻塞資源
- [ ] 桌面 + 行動 FCP 小幅改善,LCP 不惡化
- [ ] 手動視覺檢查:桌面 Chrome / Firefox / Safari 首頁載入時無明顯 FOUC(尤其 slow 3G throttling 下)

**風險**:
- Nitro hook API 若在版本升級時變更,可能需重新調整
- 若備援 `<noscript>` 太保守(重複載一次 CSS),用戶關 JS 時反而更慢
- 若某些 CSS 動畫依賴同步載入,可能出現初始化跳動

**與其他路線的關係**:
- 與路線 C(§4.8 env.js inline)**部分競合**:C 直接消除 env.js 450ms 阻塞,F 消除 CSS 300ms 阻塞。兩者疊做效果最好,但單獨做 F 也有效果。
- 與 §4.6 preconnect **正交**:各自解不同問題

---

### 4.12 JS bundle 瘦身(路線 G)

**背景**:E 上線後(桌面 62 / 行動 56),PSI 剩餘主要扣分項:
- 桌面主執行緒工作 2.1 s、TBT 460 ms(TBT 權重 30%,目前桌面最大的失分項)
- 無用 JavaScript 可省 167 KiB
- JS 執行時間 1.3 s

**現況盤點(2026-07-08 從 dist 產物調查)**:

- `dist/_nuxt/` 共 **279 個 JS chunk、合計 9.5 MB**(未壓縮;gzip 後傳輸約 1 MB+)
- Entry chunk `0UCunOxW.js` **668 KB**(單一入口,包含 Nuxt runtime + 大量 Base components)
- 另有 7 個 300-430 KB 的大 chunk
- Swiper 被 24 處 import(HomeBanner、ProviderListCarousel、HomeCmsSection、CmsCustomPageSlider 等)
- PrimeVue 使用 19 種元件(button/carousel/chart/checkbox/column/datatable/dialog/iconfield/inputicon/inputnumber/inputtext/progressbar/radiobutton/select/toast 等),經 `@primevue/nuxt-module` 自動載入
- `primevue/chart`(內含 chart.js)只被 3 個檔案用到:`BaseChart.vue`、`SummayDisplayBlocks.vue`、`member/summary.vue` — **只有會員中心 summary 頁需要,首頁不用**

**改法(按 CP 值排序,可分批做)**:

**G1. Chart.js 延遲載入(預估 entry −100-150 KB)**

chart.js + primevue/chart 只有 member/summary 頁用,但若被打進 entry chunk 就是首頁白付的成本。
1. 確認 chart 相關代碼在哪個 chunk:`npx nuxi analyze`(或 `nuxi build --analyze`)
2. 若在 entry:把 `BaseChart.vue` 改為 `defineAsyncComponent` 或在 summary 頁用 `<LazyBaseChart>`(Nuxt Lazy 前綴)
3. 驗收:首頁 Network 面板不載入 chart 相關 chunk

**G2. PrimeVue 元件按需載入確認(預估 −50-100 KB)**

`@primevue/nuxt-module` 預設 `autoImport: true` 已做 tree-shaking(runtimeConfig 顯示 `autoImport: true`),理論上只打包用到的 19 種元件。要確認的是:
1. `nuxi analyze` 檢查是否有未使用的 PrimeVue 元件被打包(例:datatable 只有會員中心用,是否進了 entry?)
2. PrimeVue theme(aura-present)的 CSS-in-JS 部分是否過大
3. 若 datatable/carousel 等重元件在 entry:確認引用點是否可 Lazy 化

**G3. Swiper 模組共用與按需(預估 −30-50 KB)**

Swiper 被 24 處 import。Vite 會去重,但要確認:
1. `swiper/css` 每處 import 是否造成 CSS 重複
2. HomeBanner 用的 Autoplay/Pagination 模組 vs 其他處的 FreeMode — 只 import 用到的模組(目前看起來已按需,驗證即可)

**G4. Route-level chunk 檢視(預估 TBT −100-200 ms)**

Nuxt pages 自動 code-split,但 shared ui-layer 的自動 import(`imports.dirs` 掃整個 composables/stores/constants)可能把跨頁面共用碼全拉進 entry:
1. `nuxi analyze` 看 entry chunk 的組成
2. 特別檢查:member 中心的 composables(useHistory、usePendingOrder、useMembershipManagement 等)是否進了 entry — 首頁用不到這些
3. 若進了:評估把 `imports.dirs` 的掃描範圍縮小,或把重 composable 改為顯式 import

**G5. 無用 JS 細查(PSI 標的 167 KiB)**

PSI 的 unused-javascript audit 列出的檔案逐一對照,通常是:
- polyfill 過度(target browsers 太舊)— 檢查 `vite build target`
- 第三方 SDK 全量載入(GA、sensorsdata、Tawk 等 — 從 cookie 看到有這些)
- **注意**:第三方 SDK(GA、Tawk chat)若由 GTM/後台注入,前端 repo 管不到,列出來但不動

**執行順序建議**:先跑 `npx nuxi analyze` 拿到 bundle 全貌(一次),再依 G1 → G4 → G2 → G3 → G5 逐項確認。每做完一項本機 build + Lighthouse 驗一次,確認 TBT 有動再繼續。

---

**2026-07-10 analyze 實測後的修正(取代上面部分項目)**:

`nuxi analyze` 報告(`dist/apps/r017/.nuxt/analyze/client.html`)解析結果:

- **G1 原生已達成**:chart.js 本來就只在 summary chunk,entry 沒有,無需動作
- **G4 疑慮排除**:member composables 沒進 entry,`imports.dirs` 沒造成污染
- **Entry 717 KB 組成**(前幾名):@primeuix/themes 107 KB、Vue runtime 73 KB、@primevue/core 51 KB、shared src 49 KB、axios 41 KB、tanstack query 33 KB、其餘為 <31 KB 長尾 — 多為拿不掉的基礎設施
- **真正的肉在 i18n 語系檔**(見新項目 G6)

**G6. i18n 語系檔瘦身(新發現,最大的肉)**

Analyze 顯示 top chunks 排名 entry 之後全是語系檔,每個語系一個 JS chunk:

| chunk | 大小 |
|---|---:|
| my.js | 619 KB |
| th.js | 613 KB |
| bn.js | 564 KB |
| ar.js | 525 KB |
| zh-TW.js | 342 KB |
| en.js | 294 KB |

來源:`libs/shared/ui-layer/i18n/locales/*.json`(16 個語系,每個 205-347 KB)被 @nuxtjs/i18n 打成 lazy chunk。啟動時當前語系 chunk 必載,首次載入要下載 + parse ~300 KB JS,直接貢獻 TBT 與行動 LCP。

**架構級疑點:本地語系與 remote locale 可能重複**。r017 有 [remote-locale.client.ts](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/src/plugins/remote-locale.client.ts) plugin,啟動時抓 `https://locale.templates.gsiwl.com/locale/frontend/<locale>.json` 並 `setLocaleMessage` 蓋進 i18n(實測 network log 確認有此請求)。**即 app 打包了 294-342 KB 本地語系,啟動後又下載一份遠端語系覆蓋** — 本地那份可能大部分白載。

改法方向(需先回答架構問題):
1. **先確認 remote locale 的角色**:遠端是完整語系還是差分?本地檔是否為「斷網 / remote 掛了」的 fallback?→ 讀 `useRemoteLocaleMessages` 的 merge 邏輯 + 問產品決策
2. 若 remote 是完整的:本地語系縮成「首屏 critical keys」(登入按鈕、導航、錯誤訊息等,幾 KB),其餘靠 remote;或本地檔 lazy 到 hydration 完成後才載
3. 若本地必須完整保留(fallback 需求):至少確認 lazy loading 已生效(只載當前語系),並考慮 JSON 改為 fetch(不打進 JS,省 parse 成本,瀏覽器 JSON.parse 比 JS eval 快)

預期:當前語系 chunk −250-300 KB,TBT 明顯改善,行動 LCP 連帶受益。

---

**2026-07-10 G6 架構調查結果(修正上面的假設)**:

實測比對本地 `en.json` 與遠端 `locale.templates.gsiwl.com/locale/frontend/en.json`:

| 項目 | 數字 |
|---|---:|
| 本地 keys(en) | 3,778 |
| 遠端 keys(en) | 2,040 |
| 交集 | **僅 279** |
| 本地獨有 | 3,499 |
| 遠端獨有 | 1,761 |

**結論:本地與遠端「不重複」,原假設推翻**。本地 = app UI 主翻譯(3,499 個獨有 key),遠端 = CMS flat-key 翻譯(1,761 個獨有 key),merge 是疊加關係而非覆蓋。**「本地縮成 critical keys、靠 remote」的方案 2 不可行** — 遠端沒有 app UI 的翻譯。

其他查證:
- **Lazy loading 已生效**:locale JSON 不在 entry chunk(entry 內只有 vue-i18n runtime 17 KB + @nuxtjs/i18n runtime ~12 KB),只有當前語系 chunk 會載
- **未使用 key 抽樣**:隨機抽 30 個本地 key,只有 2 個在代碼中以字面量出現(28 個 grep 不到;但含動態 key 如 `account_flow_type.${x}`、錯誤碼 I18nKeys,naive grep 會漏)— 顯示本地檔案很可能含大量舊 Multiverse 遺留的未使用 key,**但修剪需要動態 key 白名單保護,風險高**

**修正後的 G6 可行選項**:

- **G6a. 未使用 key 修剪**:靜態分析所有 `t("...")` 字面量 + 動態 key 前綴白名單(`account_flow_type.*`、錯誤碼 enum、`wallet.*` 等),把 16 個語系檔修剪到只剩實際使用的 key。預估 294 KB → 100-180 KB/語系。⚠️ 風險:漏掉動態 key 會讓 UI 顯示 raw key;且違反「不動 i18n key」慣例的邊緣,需完整回歸。工程量大。
- **G6b. JSON 改 fetch 不打進 JS**:@nuxtjs/i18n 的語系 chunk 是 JS(需 parse+eval);改為 runtime fetch JSON(JSON.parse 較快)。需研究 @nuxtjs/i18n v10 是否支援(`experimental.jsTsFormatResource` 或自訂 lazy loader)。收益:parse 成本降,傳輸大小不變。
- **G6c. 接受現狀**:單一語系 lazy chunk ~300 KB(gzip 後約 60-80 KB),在 lazy 已生效的前提下,對 PSI 的實際影響可能有限。先量測「當前語系 chunk 對 TBT 的實際貢獻」再決定要不要投入 G6a。

**建議**:先做 G6c 的量測(Chrome DevTools Performance 面板看 locale chunk 的 eval 時間),若 eval < 100 ms 就不值得做 G6a 的大工程;把力氣留給 G7 或 H。

**G7. @primeuix/themes 檢查(次要)**

Entry 內最大單一依賴 107 KB(PrimeVue 主題系統)。查 `aura-present.ts` preset 是否整包 import Aura 再覆寫 — 若是,評估只引用用到的 component tokens。預期 entry −30-60 KB,但 PrimeVue 主題結構耦合較深,成本可能高於收益,查完再決定做不做。

**預期效果(全部完成)**:
- Entry chunk 668 KB → ~400-450 KB
- 桌面 TBT 460 ms → ~250-350 ms、主執行緒 2.1 s → ~1.5 s
- 分數:桌面 62 → **~68-72**、行動 56 → **~58-62**

**動工前 checklist**:
- [ ] `npx nuxi analyze` 或等效工具跑出 bundle 組成報告(存檔進 PR / spec §8)
- [ ] 確認 `@primevue/nuxt-module` autoImport 的實際 tree-shaking 效果
- [ ] 列出 entry chunk 前 10 大依賴,標記「首頁需要 / 不需要」

**驗收 checklist**:
- [ ] 首頁 Network 面板:chart.js 相關 chunk 不載入
- [ ] 本機 Lighthouse 桌面 TBT 有感下降(≥100 ms)
- [ ] 會員中心 summary 頁 chart 功能正常(lazy 化後)
- [ ] 所有既有頁面 smoke test:首頁、遊戲大廳、會員中心、存提款

**風險**:
- `defineAsyncComponent` / Lazy 化會讓對應 UI 出現短暫載入延遲(summary 頁圖表晚半拍),需 UX 可接受
- 動 `imports.dirs` 掃描範圍是全域行為變更,可能造成某頁 runtime error(auto-import 失效),需全站 smoke test
- **本路線改動分散、回歸面大,建議單獨開 branch、單獨驗證,不與其他路線混在同一次發版**

---

### 4.10 font-family stack 重排(路線 E,對齊 Figma 設計原意)

**發現於 2026-07-08 D+B 上線後**:PSI 行動仍看到 NotoSansTC 5.3 MB 出現在 total-byte-weight 頂端。追查 Tailwind `sans` font-family 排序後發現順序反了,Noto Sans TC 排在系統 CJK 字型之前,瀏覽器永遠優先下載 5.3 MB,而不用 Mac / Windows 已內建的中文字型。同時對照 Figma 設計節點,證實**設計師的品牌字型 = Open Sans + 系統 CJK 字型**,而非強制 Noto Sans TC。

**現況**:[apps/r017/tailwind.config.mjs:31-41](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/tailwind.config.mjs)

```js
sans: [
  '"Open Sans"',
  "Arial",
  '"Noto Sans TC"',      // ← 排在 CJK 系統字型之前,強制觸發 5.3 MB 下載
  '"PingFang SC"',       // Mac 中文備援(輪不到)
  '"Microsoft YaHei"',   // Windows 中文備援(輪不到)
  ...
]
```

**Figma 對照(node 58:179「當天」)**:
- 字型設定:`Open Sans / SemiBold / 14 / weight 600`
- 設計 token:`body/semiBold-500 = Font(family: "Open Sans", weight: 600, ...)`
- **沒指定 CJK 字型**。Figma 上顯示的中文其實是設計師 macOS 的 Open Sans + PingFang SC 系統 fallback 組合。
- 結論:**現況的「強制 Noto Sans TC」反而不符合 Figma 設計原意**。

**改法(一行順序調整)**:

```js
sans: [
  '"Open Sans"',
  "Arial",
  '"PingFang SC"',       // Mac / iOS 中文,系統字型,零下載
  '"Microsoft YaHei"',   // Windows 中文,系統字型,零下載
  '"Noto Sans TC"',      // 無 CJK 系統字型時的下載 fallback
  "ui-sans-serif",
  "system-ui",
  "sans-serif",
  ...emojiFonts
]
```

**不動**:同檔 `notosans` 專用 class(L42)保留 `Noto Sans TC` 為首選 — 這是設計師明確指定強制字型的地方。

**預期效果分裝置**:

| 用戶 | 目前 | 改後 | 是否符合 Figma 原意 |
|---|---|---|---|
| Mac / iOS | 下載 5.3 MB(即使有 PingFang SC) | PingFang SC 系統字型,零下載 | ✅ 對齊 |
| Windows | 下載 5.3 MB(即使有 Microsoft YaHei) | Microsoft YaHei 系統字型,零下載 | ✅ 跨平台差異可接受 |
| Android(多數低階機無 CJK) | 下載 5.3 MB | 下載 5.3 MB(無選擇) | — 不影響 |
| Linux / 無 CJK 系統 | 下載 5.3 MB | 下載 5.3 MB(無選擇) | — 不影響 |

**對 PSI 分數的影響(可能不明顯)**:

- 桌面 PSI(Google Linux 伺服器,通常無 PingFang / YaHei)→ 分數變化可能不大
- 行動 PSI(模擬 Moto G Power Android,通常無 CJK)→ 分數變化可能不大
- **但真實用戶(Mac / Windows 佔多數桌面流量)體驗巨幅提升**;CrUX field data 過 4-8 週會展現改善

**動工前 checklist**:
- [ ] 跟 PM / 設計團隊確認:接受 Mac PingFang SC / Windows Microsoft YaHei 的跨平台字型差異(附上 Figma 設計節點證據:設計師 Figma 上看到的本來就是 Open Sans + PingFang SC 組合)
- [ ] 檢查 `.font-notosans` class 的使用點,確認保留專屬中文字型的元件不受影響

**驗收 checklist**:
- [ ] Mac Safari / Chrome:視覺與 Figma 對照 CJK 用 PingFang SC 渲染
- [ ] Windows Chrome / Edge:CJK 用 Microsoft YaHei 渲染
- [ ] DevTools Network 面板(Mac / Windows):NotoSansTC 不在 request 清單
- [ ] Android / Linux:仍能載入 NotoSansTC(fallback 正常)

**風險**:
- 極低:改動只是 CSS font-family 順序,無邏輯風險
- 若 PSI 對 CJK 判斷邏輯有變化,Lighthouse 可能給不同分數 — 但實際用戶體驗一定改善

**與其他路線的關係**:
- 與路線 D(§4.7)**互補**:D 只關 preload,E 讓字型完全不需要下載(對 Mac/Win 用戶)
- 與路線 A(§4.3 字型子集化)**部分競合**:若 E 讓 90% 用戶已不需下載,A 的 CP 值下降
- 建議順序:**D → E → A**(或 D+E 一次做,A 之後看實際需求)

---

## 5. 預期改進(估算,以重測為準)

依 Lighthouse v10 lognormal 評分曲線估算,**不是承諾值**;實際分數以 PSI 重測為準。

### 5.1 指標層

桌面版:

| 指標 | 現況 | Phase 1 目標 | 主要貢獻項 |
|---|---:|---:|---|
| LCP | 7.8 s | **≤ 2.5 s** | 4.1(img+SSR)、4.6(preconnect) |
| CLS | 0.835 | **≤ 0.1** | 4.2 |
| FCP | 1.1 s | ~1.0 s | 4.3(字型不再佔滿頻寬) |
| Speed Index | 4.8 s | ~2.5-3 s | 4.3、4.4、4.5(總量 12.6 MB → ~5.5 MB) |
| TBT | 1,230 ms | 小幅改善(Phase 2 主戰場) | — |

行動版(4G 頻寬模擬下,減總量的收益比桌面大):

| 指標 | 現況 | Phase 1 目標 | 主要貢獻項 |
|---|---:|---:|---|
| LCP | 40.7 s | **≤ 5 s** | 4.3/4.4/4.5(釋放頻寬)+ 4.1(提早發現) |
| CLS | 0.623 | **≤ 0.1** | 4.2 |
| FCP | 4.2 s | ~2.5-3 s | 4.3、渲染阻斷(env.js 470 ms) |
| Speed Index | 18.5 s | ~6-8 s | 4.3、4.4、4.5 |
| TBT | 460 ms | 小幅改善 | — |

### 5.2 分數層(估算區間)

依 §4.0 分階段執行,每階段可獨立驗收:

| 階段 | 桌面 Perf | 行動 Perf | 主要收益來源 | 狀態 |
|---|---:|---:|---|---|
| Baseline(2026-07-06) | 11 | 23 | — | — |
| Phase 1a(#1-#4)| ~30-40 估 / **45 實測** | ~35-45 估 / **44 實測** | CLS 佔位、marquee/bg 減量、preconnect | ✅ 上線 |
| Phase 1b(+#5)| ~45-55 估 / **41 實測** | ~50 估 / **47 實測** | HomeBanner img + fetchpriority | ✅ 上線 |
| +路線 D+B(§4.7 + §4.9)| ~48-52 估 / **57 實測** | ~65-72 估 / **53 實測** | 字型 preload 移除 + banner API preload | ✅ 上線(2026-07-08) |
| +路線 E(§4.10 stack 重排) | 可能不動(PSI Linux)、真實 Mac/Win +3-8 | 可能不動(PSI Android) | Mac/Win 用戶不再下載 5.3 MB | 未做 |
| +路線 C(§4.8 env.js inline)| +3-5 | +2-4 | 消除 240-470 ms 阻斷算繪 | 未做 |
| +路線 A(§4.3 字型子集化)| — | ~65-75 | 補足 D/E 未覆蓋(無 CJK 系統)用戶頻寬 | 未做,需 P0.3/P0.4 |

說明:LCP(25%)與 CLS(25%)兩項現在幾乎是 0 分,Phase 1a 光 CLS 修好即拿回約 15-25 分。桌面 TBT 1,230 ms(權重 30%)Phase 1/2 都不主動處理,是分數上限的主因;若日後要衝 80+,需要另做 JS 瘦身。所有數字為估算區間,實際以 PSI 重測為準。

---

## 5.5 本機分數測試流程

改動每個 Phase(或每個項目)後,用同一套流程重測,才能比較差異。**dev server 不能用來測分數**(HMR、未 minify、source map 會讓分數失真,§7.2.7 已記)。

### 5.5.1 標準流程:build → preview → ngrok → PageSpeed Insights

```sh
# 1. Production build
pnpm nx build r017

# 2. 起 preview server(預設 port 3000)
pnpm nx preview r017
# 或直接跑 Nitro 產物:
# HOST=0.0.0.0 PORT=3000 node apps/r017/.output/server/index.mjs

# 3. 另一個 terminal 開 ngrok
ngrok http 3000

# 4. 拿到 https://xxxx.ngrok-free.app 這種 URL
#    貼到 https://pagespeed.web.dev/ 跑分,桌面 + 行動各跑一次
```

**重要注意事項**:

- `ngrok http <port>` 才是正確語法,`ngrok <port>`(舊寫法)雖然可能運作但語意錯
- 若 ngrok 顯示 403 Forbidden:
  - 先 `lsof -i :3000` 確認 port 對且有服務
  - Nuxt preview 預設 3000,不是 9000。指定其他 port 要 `PORT=xxxx pnpm nx preview r017`
  - 極少數情境是 server 有 Host header 檢查(nginx / 特殊 Nitro 配置)拒絕 ngrok 網域,一般 Nuxt preview 不會擋
- ngrok Free 版首次打開會有一頁 interstitial 警告,對 PSI 抓取無影響 — PSI 送的 header 會自動繞過
- **每次分數受網路波動影響 ±3-5 分**,同一版本至少跑 3 次取中位數
- **PSI 抓的是「當下的 ngrok URL」**,不會存 URL 對應時間軸;每次改動要自己記錄分數與時間

### 5.5.2 快速迭代替代方案:本機 Chrome DevTools Lighthouse

不用 ngrok、不用等 Google API,適合每次改完立刻驗證方向對不對:

```sh
pnpm nx build r017
pnpm nx preview r017
# 開 Chrome 無痕視窗 → 打 http://localhost:3000
# → DevTools → Lighthouse tab
# → Mode: Navigation
# → Device: Desktop 或 Mobile(各跑一次)
# → Categories: 只勾 Performance(跑更快)
# → Analyze page load
```

**與 PSI 差異**:本機 Lighthouse 分數與 PSI 會差 ±3-5 分(硬體與網路模擬不同)。DevTools 適合看趨勢,PSI 適合看正式數字。

### 5.5.3 分數記錄範本

每次測完把結果貼進 §8 調查記錄或 PR 描述:

```
版本:{branch/commit hash}
測試時間:YYYY-MM-DD HH:mm
測試方式:PSI ngrok / DevTools Lighthouse
URL:{ngrok URL 或 localhost}

桌面:Perf {分數} / LCP {X.X}s / CLS {0.XXX} / TBT {XXX}ms / FCP {X.X}s / SI {X.X}s
行動:Perf {分數} / LCP {X.X}s / CLS {0.XXX} / TBT {XXX}ms / FCP {X.X}s / SI {X.X}s

改動內容摘要:
- {項目 1}
- {項目 2}
```

---

## 6. 驗收標準(Checklist)

實作完成的定義:以下每項都可勾選,且附上實測數據。

**功能不回歸:**
- [ ] 首頁 banner 輪播視覺與行為與線上一致(自動輪播、點擊跳轉/開遊戲、pagination)
- [ ] r001 首頁 banner 與跑馬燈視覺無異常(共用元件改動的跨站驗證)
- [ ] 繁中/簡中/英文介面文字字型顯示正常,無明顯 FOUT 劣化、無缺字方塊(含動態內容:玩家暱稱、遊戲名)
- [ ] 跑馬燈圖示、PC 背景圖視覺與現況一致

**效能實測(依 §5.5.1 build + ngrok + PSI 或 §5.5.2 DevTools Lighthouse,桌面 + 行動各跑一次,分數依 §5.5.3 範本記錄):**
- [ ] 桌面:LCP ≤ 2.5 s、CLS ≤ 0.1
- [ ] 行動:LCP ≤ 5 s、CLS ≤ 0.1
- [ ] 首頁總傳輸量 ≤ 6 MB(原 12.6 MB)
- [ ] NotoSansTC 首屏實際下載量 ≤ 500 KiB(原 5,289 KiB)
- [ ] marquee.svg ≤ 5 KiB(原 1,432 KiB)
- [ ] 第一張 banner 圖以 high priority 載入且未被 lazy-load(DevTools Network 面板 Priority 欄佐證)

**上線後(merge 至 main 並發版後):**
- [ ] 重跑 PSI,桌面 Performance ≥ 50、行動 ≥ 50,並與本 spec §2 基準表(含 §2.3/§2.4 診斷數據)逐項對照記錄

**流程:**
- [ ] 全程在 `perf/pagespeed-optimization` 分支作業
- [ ] 驗證用測試檔不進 commit

---

## 7. 開放問題與風險

### 7.0 依重要度排序(單張總覽)

四級:P0 = 不處理 Phase 1 就跑不動或主要收益消失;P1 = 明顯影響分數上限或有回歸風險;P2 = 實作階段技術細節,實測即可校正;P3 = 長期治理或少數用戶影響,不影響本次上線。

| 優先度 | 項目 | 詳細位置 | 若不處理的後果 |
|:---:|---|---|---|
| **P0** | `useBanner()` SSR 友善驗證 | §7.2.1 | §4.1 主要收益(3.6 s 延遲)蒸發,只剩 300-500 ms 改進 |
| **P0** | 共用 HomeBanner 改動的 r001 影響 | §7.1.1 | 無 Ken 同意就不能動 shared lib,§4.1 只能改 r017 局部方案 |
| **P0** | Variable Font 子集化可行性 POC | §7.2.2 | 若可變字重不能子集,§4.3 方案要換,行動版最大收益打折 |
| **P0** | 字型分片 CDN CORS / cache headers | §7.3.3 | 上線後 CORS 被擋,字型 fallback 出現方塊字 → 直接故障 |
| **P1** | 後台 banner 素材上傳規範 | §7.1.3 + §7.3.1 | LCP 元素仍是 434 KiB JPEG,§4 減總量目標守不住 |
| **P1** | Swiper `loop` 第一張 slide 識別 | §7.2.4 | `fetchpriority` 誤加給複製 slide,LCP 沒改善 |
| **P1** | `background-image` → `<img>` 視覺回歸 | §7.2.5 | banner 邊緣裁切錯位,QA 打回 |
| **P1** | `env.js` Phase 2 fallback 觸發條件 | §7.2.8 | 行動分數若 <50,驗收判定會混亂 |
| **P2** | `@nuxt/fonts` 與手寫 `@font-face` 衝突 | §7.2.3 | 字型雙重下載,分片收益打折 |
| **P2** | preconnect 環境動態注入 | §7.2.6 | dev/staging preconnect 到錯網域,浪費連線 slot |
| **P2** | marquee.svg 真向量來源 | §7.1.4 | 找不到來源就無法完成 §4.4 |
| **P2** | 本機 Lighthouse vs PSI 量測差異 | §7.2.7 | 驗收基準要事先講清楚,避免爭議 |
| **P3** | r001 是否比照處理字型 / marquee | §7.1.2 | 只影響 r001 分數,不影響 r017 主線 |
| **P3** | 後台跑馬燈圖示上傳限制 | §7.3.2 | 長期治理,§4.4 成效隨時間可能回退 |
| **P3** | WebP 舊瀏覽器 fallback | §7.3.4 | 少數舊裝置背景圖不顯示(視覺降級) |

實作建議:動工前先解 P0(讀 code / POC / 開需求單);Phase 1 進行中同步處理 P1;P2 在對應 section 實作階段處理;P3 上線後看情況。

### 7.1 需 Ken 拍板(實作前)

1. 共用元件 `HomeBanner.vue` 的改動會同時影響 r001,是否接受?(設計上視覺不變,僅載入方式)
2. r001 是否比照處理字型子集化與 marquee.svg?
3. wowdata CDN 的 banner 素材(435 KiB JPEG、1.8 MB GIF)是否要開營運側需求,規範上傳格式(WebP/大小上限)?
4. marquee.svg 的真向量來源:Figma 有現成節點可重匯,還是需要設計師提供?

### 7.2 實作前必須先驗證的技術風險

以下每項若沒先確認就動工,可能導致做完發現效能沒改善、或功能回歸。

1. **`useBanner()` 是不是 SSR 友善** — §4.1 的最大收益(3.6 s 資源載入延遲)來自「banner URL 出現在初始 HTML」。如果 hook 內部靠 `onMounted` 或 client-only cookie 才 fetch,SSR 拿不到資料,§4.1 就退化成「只是把 background 換 img」,LCP 只省 3-500 ms。**動工第一步:讀 `useBanner` 實作,確認 SSR 路徑;若不通,先評估改造成本再決定是否放進 Phase 1。**

2. **Variable Font 子集化的可行性** — `cn-font-split` 對可變字重(`weight: 100 900`)的支援需先跑一次概念驗證。若切完 axis 失效,備案是改用固定字重(400 + 700 各一份子集),但要重新估算總量。**動工第二步:先做一份 concept POC(切一份子集、瀏覽器實測 100/400/700/900 顯示正確),再全面採用。**

3. **`@nuxt/fonts` 與手寫 `@font-face` 衝突** — Nuxt Fonts 模組會自動生 `@font-face`。手動注入分片 CSS 可能造成重複 `@font-face` 定義或雙重下載。分片方案要把 Noto Sans TC 從 `fonts.families` 移除,改純手寫 CSS 引入,並用 DevTools Network 面板確認沒有兩份都在下載。

4. **Swiper `loop: true` 會複製 slide** — 第一張 slide 在 loop 模式下會被複製到頭尾,如果每個 `<img>` 一律 `fetchpriority="high"`,反而多幾張圖搶頻寬。要用 index 或 `swiper-slide-active` 判斷,只給真正的第一張高優先級。

5. **`background-image` 改 `<img>` 的視覺差異** — `bg-cover bg-center` 與 `<img object-fit: cover; object-position: center>` 在極端比例下裁切結果一致,但仍要用實際 banner 素材在 PC(1200/380)與 mobile(16/9)兩種 aspect 下肉眼比對,特別是有文字或人物在邊緣的 banner。

6. **preconnect 網域與環境綁定** — `wowdata.gpsriowdl.com` 是目前線上環境的 CDN,dev/staging 可能不同。硬寫在 `nuxt.config.ts` 會導致其他環境 preconnect 錯網域(對載入無害但浪費連線 slot)。實作用 nuxt plugin 依 `runtimeConfig.public.imageBase` 動態注入 `<link rel="preconnect">`。

7. **量測方法與驗收基準** — 本機 Lighthouse 跟 PSI 分數會有 ±3-5 分差異(硬體與網路不同)。§6 「本機 Lighthouse ≥ 50」是開發回饋門檻,**最終驗收以「上線後 PSI 重測」為準**。另外 PSI 上方的 CrUX field data 是過去 28 天累積,上線後 4-8 週才會反映改動,不能拿來做 sprint 結算指標。

8. **`env.js` 阻斷算繪的 fallback 計畫** — 行動版 env.js 阻塞 470 ms 目前列 Phase 2。若 Phase 1 做完行動版分數仍 < 50,需回頭把 env.js 拉進來(改為 inline 進 HTML head、或改為非阻塞載入 + 啟動順序調整)。**驗收時若行動分數不達標,不視為 Phase 1 失敗,而是觸發 env.js 修復並重新驗收。**

### 7.3 別端相依(需跨團隊協調的問題)

前端本 spec 只能解一半,以下每項都需要對應團隊配合;若這些不推,前端做完的效果會被素材/基礎設施拉回去。**建議在 Phase 1 動工同時,把這幾項對應窗口找齊、開對應需求單,不要等前端做完才發現卡住。**

1. **後台 banner 素材上傳規範(對口:營運端 / 後台團隊)**
   - 現況:`wowdata.gpsriowdl.com` 上運營端上傳的 banner 素材,單張 JPEG 434 KiB(可省 289 KiB)、GIF 動圖單檔 1.8 MB。
   - 需要:上傳時強制轉 WebP/AVIF、或動圖改 WebP animation / mp4;檔案大小上限(建議 JPEG ≤ 200 KiB、動圖 ≤ 500 KiB);上傳後自動生成多尺寸版本(PC/mobile),前端 `<img srcset>` 才能吃到。
   - 沒推的後果:前端把 background 換 `<img>` + fetchpriority 後,LCP 元素還是這張 434 KiB JPEG,節省 289 KiB 這一塊拿不到;GIF 那 1.8 MB 更是持續佔滿行動版頻寬,§4 減總量的目標(12.6 MB → ≤ 6 MB)可能守不住。

2. **後台跑馬燈圖示上傳限制(對口:營運端 / 後台團隊)**
   - 現況:`MarqueeList.vue` 的 `iconSrc` 是 props,運營端可從後台上傳。前端把預設值換成真向量 SVG 後,若運營端上傳另一張 1.4 MB PNG 包裝的 SVG,問題會重現。
   - 需要:後台上傳時限制檔案大小(建議 ≤ 20 KiB)、格式偏好純 SVG(vector-only,禁止內嵌 base64 圖片)。
   - 沒推的後果:§4.4 的成效會隨營運端上傳而回退,無法保證長期。

3. **CDN cache-control / CORS(對口:Infra / DevOps)**
   - 現況:字型檔目前直接由 nuxt 靜態產物提供(gsi2.gsiwl.com),沒走獨立 CDN;banner 素材走 wowdata CDN,cache TTL 7 天。
   - 需要(字型分片方案):分片後會產生數十到上百個 `.woff2` 檔,cache-control 建議 `public, max-age=31536000, immutable`(1 年 + 檔名 hash);若字型檔改由跨網域 CDN 提供,`Access-Control-Allow-Origin` 必須放行,否則 `@font-face` 會被 CORS 擋掉出現 fallback 字型。
   - 需要(banner CDN):目前 7 天 TTL 對 banner 素材偏短,建議 30 天以上;若 §7.3.1 的多尺寸方案落地,新舊檔要能共存不互相蓋。
   - 沒推的後果:字型分片上線後 CORS 沒開會直接壞掉出現方塊字;cache TTL 短則二次訪問拿不到快取收益。

4. **舊瀏覽器 WebP 相容策略(對口:PM / QA)**
   - 現況:§4.5 直接把 `bg-img-pc.png` 換 WebP,沒保 PNG fallback。
   - 需要:確認 gsi2 的 GA / 埋點資料裡,iOS 13 以下與其他不支援 WebP 的瀏覽器實際流量比例。若 > 1% 需要保留 PNG fallback(`<picture>` 或 CSS `image-set`);< 1% 可直接淘汰。
   - 沒推的後果:少數舊裝置使用者看不到背景圖(視覺降級,非功能故障)。屬於接受度決策,不是技術風險。

---

## 8. 調查記錄(Investigation Log)

實作前的 P0/P1 檢查發現,先記錄不動 §4 / §5 目標,等所有 P0 檢查完再一次校正。

### 2026-07-07 · P0.1 useBanner SSR 檢查

**結論**:整個 r017 為 SPA(`ssr: false`),SSR 路徑不存在。§4.1 point 4「SSR 讓 banner URL 出現在初始 HTML」不可行,不是 hook 寫錯,是架構決定(Capacitor 需要)。

**證據**:
- [apps/r017/nuxt.config.ts:37](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/nuxt.config.ts):`ssr: false, // 關閉 SSR，改為 SPA 模式（Capacitor 需要）`
- [libs/shared/ui-layer/src/lib/api/hooks/useBanner.ts](../../whitelabel-gsi-platform-multiverse-nx/libs/shared/ui-layer/src/lib/api/hooks/useBanner.ts) → `useApiQuery` → `@tanstack/vue-query` 的 `useQuery`,無 dehydrate/hydrate 設定,無 vue-query nuxt module
- [libs/shared/ui-layer/src/lib/api/axiosInterceptors.ts:59-60](../../whitelabel-gsi-platform-multiverse-nx/libs/shared/ui-layer/src/lib/api/axiosInterceptors.ts):`apiBase` 從 `runtimeConfig.public.apiBase` 讀,由 env.js → runtime-env plugin 注入
- [apps/r017/src/plugins/runtime-env.client.ts](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/src/plugins/runtime-env.client.ts):`.client.ts` 命名 + `enforce: "pre"`,純客戶端

**客戶端關鍵路徑(現況,對應 PSI 的 3,640 ms 桌面 / 2,340 ms 行動「資源載入延遲」)**:

```
HTML → env.js(阻塞:桌面 120ms / 行動 470ms)
     → main JS bundle 下載 + 解析
     → runtime-env plugin 寫入 apiBase
     → Nuxt hydrate → HomeBanner setup → vue-query useQuery → axios fetch
     → 拿到 banner URL → 下載圖片
```

**副作用觀察(對後續方案有利)**:
- Banner API 是 guest 可呼叫的:`needToken` 預設 true,但無 token 時只是不加 Authorization header,不會擋。可在 auth 就緒前發起 fetch。
- Banner API 只需要 `apiBase`(env.js)+ `Accept-Language`(cookie);兩者都在 main JS bundle 執行前就可以拿到。

**SPA 現實下取代 §4.1 point 4 的候選方案(尚未拍板)**:

- **A. Inline `<script>` preload API**:在 HTML head 的 env.js 之後、main bundle 之前,注入小 script 發起 `fetch()`,結果存 `window.__BANNER_PRELOAD__`;`useBanner` 用 vue-query `initialData` 或 queryFn 檢查 window 讀入。API fetch 與 main bundle 下載平行,估省 1-2 s。
- **B. Preconnect 到 apiBase + imageBase**:env.js 之後 inline 注入 `<link rel="preconnect">`。單獨做只省 100-300 ms,成本極低,值得順手做。
- **C.(可選)首張 banner 靜態化**:build 時把主推 banner 打進 `<link rel="preload" as="image">`,LCP 元素直接是這張。最激進,需編輯/發版流程配合,不建議 Phase 1 做。

**對 §4/§5 目標的潛在影響(暫未套用,等所有 P0 完成再一次校正)**:
- 桌面 LCP 目標可能從 ≤ 2.5 s 放寬到 ≤ 4.5 s
- 行動 LCP 目標可能從 ≤ 5 s 放寬到 ≤ 10 s
- 分數估算下修約 5-10 分

**狀態**:已檢查、方案候選已提出,等 Ken 決策再更新 §4.1 / §5.1 / §5.2 / §7.0。

### 2026-07-07 · P0.2 共用元件對 r001 的影響檢查

**結論**:r001 目前**完全沒有引用** `HomeBanner` / `HomeView` / `MarqueeList` 三個共用元件。§4.1、§4.2、§4.4 對共用 lib 的改動在現階段實務影響為零。§7.1.1 可從「需 Ken 拍板」降級為「知會即可」。

**證據**:
- `apps/r001/src/pages/` 只有 `index.vue`(demo playground)與 `about.vue` 兩個檔案
- 全 repo `.vue` 檔數比:r001 = 4 個,r017 = 36 個(r001 為搭建期 scaffold,不是產品化 tenant)
- [apps/r001/src/pages/index.vue](../../whitelabel-gsi-platform-multiverse-nx/apps/r001/src/pages/index.vue) 內容為 PrimeVue 按鈕測試、Tailwind 測試、字型測試、i18n 測試、Store 測試;底部確有使用 `useBanner`,但用**自己 hardcode 的 `BaseImage` 循環**(L482-513),未引用 `<HomeBanner />`
- Grep `HomeBanner|HomeView|MarqueeList` 全 repo,所有引用點都指向 r017 或共用 lib 內部,無 r001 使用

**未來影響評估**:
- 若 r001 未來引用共用元件 → 自動繼承本次優化,是紅利非負擔
- 若 r001 未來改走 CMS 首頁或自訂 layout → 本次優化不影響它

**額外發現(不改變 P0.2 結論,但擴大驗收範圍)**:

r017 的 5 個 route:`login.vue`、`login/phone.vue`、`register.vue`、`deposit.vue`、`withdraw.vue` 整頁只渲染 `<HomeView />`(即包含 banner + 跑馬燈 + 遊戲列表 + RankBoard)。因此:
- §2.3 CLS 主因(RankBoard 的「Latest Bet And Big Wins」0.613)不是首頁獨有問題,是這 6 個 route 共通問題
- §4.1、§4.2 修好後,這 6 個 route 一起受益
- **§6 驗收 checklist 需擴充**:「首頁 banner 輪播視覺與行為」要涵蓋 index + login + login/phone + register + deposit + withdraw 共 6 頁

**§4.2 CLS 修法的具體元件浮出(供實作參考)**:
- `RankBoard.vue`(貢獻 CLS 0.613,最大兇手,首要處理)
- `ProviderListCarousel.vue`(貢獻 CLS 0.097,次要)
- `HomeBanner.vue` 內含的 swiper 首張 slide 高度初始化(貢獻 CLS 少量)

以上元件路徑於 [HomeView.vue](../../whitelabel-gsi-platform-multiverse-nx/libs/shared/ui-layer/src/lib/components/views/HomeView.vue) 中一次列出,實作時可作為 §4.2 佔位處理的清單。

**狀態**:已檢查、跨站風險排除。**§7.1.1 建議降級**,並在 §6 驗收 checklist 補上「login/register/deposit/withdraw 五頁的 HomeView 視覺驗證」;§4.2 更新時可帶上具體元件清單。等所有 P0 完成再一次校正。

### 2026-07-07 · Phase 1a #1 marquee 資產調查 + WebP 轉檔實測

**Figma 節點確認**:R017_優化中檔 node [`7890:38407`](https://www.figma.com/design/VTP9b24C87Yyir5R7E1tqo/R017_%E5%84%AA%E5%8C%96%E4%B8%AD?node-id=7890-38407),為 News Ticker 元件。左側圖示 node `2508:29885`,設計名稱 `futuristic-holographic-megaphone-icon-graphic-design-concept 1` — Figma 內就是 **2000×2000 PNG**(3D 光影渲染的喇叭),不是向量。Repo 內 1.4 MB 的 SVG 是這張 PNG 被包裝而成。

**結論**:「換真向量」路徑不可行(除非重新設計)。改採「PNG 縮至實用尺寸 → WebP」,視覺與 Figma 一致。§7.1.4 開放問題可視為關閉。

**scratchpad 實測數字**(尚未寫入 repo,待 work branch 建立):

| 項 | 原檔 | 產出 | 大小 |
|---|---|---|---:|
| Figma 源 PNG | 2000×2000 PNG | — | 1,094 KiB(下載自 Figma) |
| Repo 舊 SVG | — | 目前線上 | 1,432 KiB |
| 建議產出 | 縮 96×96 → WebP q=85 | `marquee.webp` | **2.7 KiB** |
| 參考:24×24 | 縮 24×24 → WebP q=85 | 一般顯示 1x | ~600 B |
| 參考:48×48 | 縮 48×48 → WebP q=85 | 2x 視網膜 | 1.2 KiB |

推薦 96×96(4x 視網膜)= 2.7 KiB — 對現代高 DPI 螢幕更保險,額外成本只有 1.5 KiB。

### 2026-07-07 · Phase 1a #2 bg 圖 WebP 轉檔實測

Scratchpad 實測(尚未寫入 repo):

| 檔案 | 原 PNG | WebP q=82 | 省 |
|---|---:|---:|---:|
| bg-img-pc.png | 787 KiB | **13.5 KiB** | −773 KiB(98%) |
| bg-img-mobile.png | 231 KiB | **2.9 KiB** | −228 KiB(99%) |

**注意**:壓縮率異常高,推測原圖是漸層/簡單裝飾背景。**上線前必須開瀏覽器視覺確認**;若品質不足可提高 q 值至 88-92,大小仍會遠低於原 PNG。

**引用點清單(4 處字串替換)**:
- [apps/r017/src/layouts/default.vue:118](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/src/layouts/default.vue)(全站主 layout,PC 版)
- [apps/r017/src/pages/announcement.vue:10](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/src/pages/announcement.vue)(hero 區,PC + mobile 各一)
- [apps/r017/src/pages/promotion/[id].vue:15](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/src/pages/promotion/[id].vue)(hero 區,PC + mobile 各一)

**Phase 1a #1 + #2 合計效益(實測)**:總傳輸量 12,630 KiB → **10,204 KiB(−2,426 KiB / −19.2%)**,是原 §4.0 估算 −1,550 KiB 的 1.5 倍,主要來自 bg-img 意外高壓縮率。

**狀態**:轉檔已在 scratchpad 完成,等 Ken 確認 work branch(`perf/pagespeed-optimization`)建立後,即可 (a) 複製 WebP 檔到 `apps/r017/src/public/images/`、(b) 更新 4 個引用點字串、(c) 開啟本機 PSI/Lighthouse 重測驗收。

### 2026-07-08 · Phase 1a #1 + #2 上線並實測(本機 Lighthouse,branch vs main)

Commit `5f56fbe` 在 `perf/pagespeed-optimization` branch,依 §5.5.1 標準流程(build + preview + Lighthouse)桌面 + 行動各跑一次。同時切回 main 做同樣測試,做「同一測試環境」對照。

| 指標 | main Desktop | branch Desktop | main Mobile | branch Mobile |
|---|---:|---:|---:|---:|
| **Performance** | 42 | 41 | 19 | 21 |
| FCP | 2.2 s | 2.2 s | 12.0 s | 12.0 s |
| LCP | 10.8 s | 9.0 s | 58.2 s | 49.3 s |
| TBT | 30 ms | 20 ms | 450 ms | 400 ms |
| CLS | 0.434 | 0.435 | 1.827 | 2.25 |
| Speed Index | 2.4 s | 2.5 s | 12.0 s | 12.0 s |
| Total size | 10,783 KiB | **8,554 KiB** | 10,228 KiB | **8,543 KiB** |

**關鍵觀察**:

- **傳輸量降低確認生效**:desktop −2,229 KiB / mobile −1,685 KiB,新資產 marquee.webp + bg-img-*.webp 桌面合計 18.8 KB / 行動 7.9 KB,舊 marquee.svg + bg-img-*.png 已從 network 面板消失。
- **分數幾乎沒動**:desktop 42 → 41、mobile 19 → 21,和預期一致。**Phase 1a #1/#2 是打底流量,不是拿分項目**,LCP/CLS 這兩個佔 50% 權重的指標都沒動就不會影響分數。
- **CLS 仍為主要扣分項**:desktop 0.435 幾乎沒變(Phase 1a 尚未做 §4.2 佔位);mobile 2.25 被本機 staging `.p-toast-message-error` 大幅放大,線上 PSI(0.623)才是真實值。
- **LCP 相對於原 PSI 桌面 7.8s 現在本機顯示 9.0s**:本機 Lighthouse 與 PSI 硬體/網路模擬不同(spec §5.5.1 已記 ±3-5 s 誤差),不代表退步,不需追查。

**線上 PSI 現況(2026-07-08 重跑)**:
- 桌面:<https://pagespeed.web.dev/analysis/https-gsi2-gsiwl-com/5gua0gf562?form_factor=desktop>
- 行動:<https://pagespeed.web.dev/analysis/https-gsi2-gsiwl-com/5gua0gf562?form_factor=mobile>
- 尚未部署,線上分數為原基準(即 §2 桌面 11 / 行動 23),不受本次 branch 改動影響。

**下一步建議**:進入 §4.2 CLS 佔位(Phase 1a #3),這是分數收益最大的單一項目;結束後預期 desktop 從 40 出頭跳到 55-65 區間。

**狀態**:Phase 1a #1/#2 已 commit 但未 merge。等 §4.2 完成後合併同一 branch 一起走 dev → staging → main。

### 2026-07-08 · Phase 1a #3(+ preconnect)部署後線上實測 — 大成功

Phase 1a 全部三批(#1 marquee/#2 bg WebP/#3 CLS 佔位 + #4 preconnect plugin)已上線 gsi2.gsiwl.com。PSI 重測:<https://pagespeed.web.dev/analysis/https-gsi2-gsiwl-com/avl2hkm3q7?form_factor=desktop>

| 指標 | Baseline(2026-07-06) | 現在(2026-07-08 上線後) | 變化 |
|---|---:|---:|---:|
| **桌面 Performance** | 11 | **45** | **+34** |
| 桌面 CLS | 0.835 | **0** | 完美達標 |
| 桌面 TBT | 1,230 ms | **470 ms** | −760 ms |
| 桌面 LCP | 7.8 s | 7.4 s | −0.4 s |
| 桌面 FCP | 1.1 s | 0.9 s | −0.2 s |
| 桌面 SI | 4.8 s | 4.2 s | −0.6 s |
| **行動 Performance** | 23 | **44** | **+21** |
| 行動 CLS | 0.623 | **0.017** | −0.606(達標) |
| 行動 TBT | 460 ms | 520 ms | +60 ms(輕微 regression) |
| 行動 LCP | 40.7 s | 40.4 s | −0.3 s |
| 行動 FCP | 4.2 s | 4.2 s | — |
| 行動 SI | 18.5 s | 16.5 s | −2 s |

**關鍵觀察**:
- **CLS 佔位改動 100% 生效**:原線上 CLS 主兇(RankBoard 0.466、HomeView wrapper 0.230、ProviderListCarousel 0.058)在新報告全部消失。剩下只有 mobile 底部 nav tab bar 位移 0.016(非本 spec 範圍,已達 <0.1)。
- **意外的桌面 TBT −760 ms**:spec §5 原判斷「Phase 1/2 不處理 TBT」。實際 TBT 大幅下降,推測來自 layout 佔位減少了 reflow / 主執行緒同步排版開銷。連帶讓桌面分數從估算的 30-40 直接跳到 45。
- **超越 §5.2 Phase 1a 估算**:原估桌面 30-40 / 行動 35-45,實測桌面 45 / 行動 44,雙雙靠 CLS 完全歸零而超標。
- **本機 Lighthouse toast 汙染確認為本機獨有**:線上 CLS 主兇清單無任何 `p-toast-message-error`,證實 §4.2 的判斷「toast 是本機 headless 環境問題,不影響線上」正確。

**尚未修的線上剩餘問題(2026-07-08)**:
- LCP 40.4 s 行動 / 7.4 s 桌面 — 「資源載入延遲 2,180 ms」→ §4.1 精簡版目標
- 阻斷算繪:entry.css 780 ms 桌面 / env.js 470 ms 行動 → §7.2.8 未做
- 5.4 MB NotoSansTC 字型 → §4.3 未做(P0.3/P0.4 未解)

**下一步**:準備進入 Phase 1b #5 — HomeBanner `<img>` + fetchpriority,目標 LCP 桌面 7.4 s → 4-5 s、行動 40.4 s → 25-30 s,分數估桌面 55+、行動 55+。

### 2026-07-08 · 路線 E(font stack 移除 NotoSansTC)上線實測

繼 D+B 之後,把 [apps/r017/tailwind.config.mjs](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/tailwind.config.mjs) 的 `sans` stack 徹底移除 Noto Sans TC(採用 §4.10 選項 1),並移除 `notosans` class 定義(全 r017 無使用點,只有 r001 demo 使用其自身 config)。PSI:<https://pagespeed.web.dev/analysis/https-gsi2-gsiwl-com/rj2np5fumb?form_factor=mobile>

**分數變化(對比 D+B 上線後)**:

| 指標 | D+B(前) | **+E(現在)** | 變化 |
|---|---:|---:|---:|
| 桌面 Performance | 57 | **62** | +5 |
| 桌面 TBT | 630 ms | 460 ms | −170 ms |
| 桌面 CLS | 0 | 0 | — |
| 桌面 LCP | 2.4 s | 2.4 s | 持平 |
| 行動 Performance | 53 | **56** | +3 |
| 行動 TBT | 340 ms | 240 ms | −100 ms |
| 行動 CLS | 0.024 | 0.017 | 小幅改善 |
| 行動 LCP | 13.2 s | 13.2 s | 持平(但局部改善,見下) |

**傳輸量對比(行動,關鍵發現)**:

| 檔案 | D+B(前) | 現在 | 變化 |
|---|---:|---:|---:|
| **gsiwl.com 第一方總量** | 6,414 KiB | **1,165 KiB** | **−5,249 KiB(−82%)** |
| NotoSansTC.woff2 | 5,289 KiB | **不在清單** | −5,289 KiB ✅ |
| 其他資源 | 略 | 略 | 略 |

**LCP 明細局部改善但整體分數持平**(行動):
- 資源載入延遲:1,670 ms → 1,350 ms(−320 ms)
- 資源載入時長:100 ms → 30 ms(−70 ms)
- 元素算繪延遲:110 ms → 70 ms(−40 ms)
- 但 PSI 顯示 LCP 仍 13.2 s(單次測量離散度 ±1-2 s 常見)

**行動 render-blocking 新兇手浮出**:
- entry.css(38.5 KiB / 300 ms)
- **env.js(1.4 KiB / 450 ms)← 阻斷算繪頭號兇手**,對應 §4.8 路線 C

**關鍵結論**:
- 路線 E 選項 1(直接移除)**100% 生效**,PSI 環境完全不下載 5.3 MB NotoSansTC
- 分數改善略低於預估(原估行動 +15-25,實測 +3),因為 PSI mobile 的 LCP 瓶頸從「頻寬佔用」轉移到「env.js 阻斷 + 其他因素」
- **路線 A(§4.3 字型子集化)因 E 生效,PSI 上已無明顯收益**,可視情況降級或跳過
- **下一頭號槓桿是路線 C(§4.8 env.js inline)**,可再拿 +3-5 分

**狀態**:E 上線,累積桌面 11→62(+51)、行動 23→56(+33)。桌面 LCP 2.4 s 已達 CWV 良好門檻,行動 LCP 13.2 s 仍需推進。

### 2026-07-08 · 路線 C 決策記錄 — 暫緩,列替代方案

**路線 C(§4.8 env.js inline)決策**:因涉及部署工作流變更(env.js baked 進 HTML → 改 env.js 需重 build),決定**暫緩**。等後續有機會跟 DevOps 對齊時再回頭做。

**保留條件**:若日後行動分數需要突破 60+,C 仍是「單一改動 +3-5 分」的最直接槓桿。

**在 C 之外的替代方案(不動部署工作流)**:

| 路線 | 攻擊的指標 | 預期分數 | 成本 | 備註 |
|---|---|---:|---|---|
| **F. Critical CSS 內嵌** | 桌面 render-blocking 120 ms、行動 300 ms | +2-4 | 中(需 nuxt module 或手工提取) | 把首屏必要 CSS inline,其餘 CSS defer 載入 |
| **G. JS bundle 瘦身** | TBT / 無用 JS(可省 167 KiB) | +3-8 | 高(需 bundle analyzer + 逐條處理) | route-level lazy load、移除未使用 PrimeVue components |
| **H. 移除未用字型的 preload/宣告** | 減少初始網路請求 | +1-2 | 低 | 檢查 Segoe UI、DINPro 是否首屏必要,不必要就從 families 移除或關 preload |
| **I. 減少 entry.css 檔案大小** | render-blocking | +1-2 | 中 | 檢查 Tailwind 掃描範圍是否過廣、有無多餘 CSS |
| **J. 圖片壓縮(可省 370 KiB)** | Speed Index、傳輸量 | +1-3 | 需跨團隊 | 見 §7.3.1 wowdata CDN 素材規範,前端可先加 `<picture>` fallback |
| **K. 服務端加 HTTP/2 Server Push 或 Early Hints** | render-blocking、TTFB | +1-3 | 高(DevOps) | 若後續有機會動 nginx 配置可考慮 |

**建議下一輪動線**:

1. **F. Critical CSS 內嵌** — 中等成本、明確收益,不需跨團隊
2. **H. 未用字型 preload 移除** — 低成本快速拿分,順手清理
3. **G. JS bundle 瘦身** — 若前兩者收益不夠,再考慮動 JS(高成本)

**跳過的**:
- **路線 A(§4.3 字型子集化)**:E 上線後 PSI 環境已完全不下載 NotoSansTC,再做字型子集化的 PSI 收益極小,幾乎無理由做。若日後真實 Android 用戶(無 CJK)體驗變成議題,再考慮 A 或改為 SDF 字型服務。**路線 A 從清單降級為「非優先」**。

### 2026-07-08 · 路線 F(CSS 非阻斷載入)上線實測 — 失敗,已回退

依 §4.11 方案 A 實作(nitro `prerender:generate` hook 把 stylesheet 改 preload+swap),上線後 PSI:<https://pagespeed.web.dev/analysis/https-gsi2-gsiwl-com/cvxeqyy1q4>

**實測結果(對比 E)**:

| 指標 | E(前) | +F | 變化 |
|---|---:|---:|---:|
| 桌面 Perf | 62 | **56** | **−6** ❌ |
| 桌面 CLS | 0 | **0.545** | 大回歸 ❌ |
| 桌面 FCP | 0.9 s | 0.8 s | −0.1 s ✓ |
| 桌面 TBT | 460 ms | 160 ms | −300 ms ✓ |
| 行動 Perf | 56 | **52** | **−4** ❌ |
| 行動 LCP | 13.2 s | 11.6 s | −1.6 s ✓ |

**失敗原因**:CSS 非阻斷後,頁面先以無樣式狀態渲染,CSS 到位後 **footer 從無樣式堆疊跳到正確位置**,PSI 桌面 CLS 主兇清單顯示 footer 一項就貢獻 0.545。§4.11 原本判斷「SPA 首屏是白畫面,FOUC 察覺不到」**是錯的** — Nuxt SPA 的早期 DOM(footer 等)在 CSS 前後位置不同,全部被 Lighthouse 記為 CLS。CLS 權重 25%,0.545 幾乎歸零該項,FCP/TBT 的改善補不回來。

**處置**:2026-07-08 當日回退(`git checkout` 移除 hook)。**F 標記為「已試失敗」**。

**若日後重啟 F 的前置條件**:必須先給「無 CSS 狀態的初始 DOM」做 inline 佔位樣式(至少 footer、header 的 min-height / 排版鎖定),驗證 CSS swap 前後零位移,才能重新上。成本高,優先級低。

**教訓**:CLS 0 是目前分數的最大支柱,任何「先渲染再套樣式」類的優化(async CSS、lazy hydration)都會直接威脅這個支柱,上線前必須本機驗證 CLS 不動。

### 2026-07-08 · 路線 G2(PrimeVue auto-import 收斂)本機驗證完成

分支:`perf/pagespeed-js-bundle-slimming`(依 §4.12 建議單獨開)。改動:[apps/r017/nuxt.config.ts:177](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/nuxt.config.ts) 把 PrimeVue auto-import 限縮到 `components: ["Button","ConfirmDialog","Toast"]`、`directives: ["Ripple"]`、`composables: ["useConfirm","useToast"]`。

**安全性驗證**(review 記錄):16 種非白名單 PrimeVue 元件全部包在 `Base*` wrapper 內且有顯式 `import X from "primevue/x"`,不受 auto-import 限縮影響;白名單 3 個(`<Button>`/`<Toast>`/`<ConfirmDialog>`)是唯一靠全域註冊的用法,已涵蓋。逐 tag 掃描無漏網。

**實測結果**:
- PrimeVue async wrappers in entry:**119 → 3**
- Entry JS:668.97 KB → 647.34 KB(gzip 197.69 KB → 193.60 KB)
- chart.js / primevue/chart 確認只在 summary chunk,不在 entry(G1 目標原生已達成,無需另做)
- 首頁 headless Chrome request log:無 chart chunk;`/member/summary` 正常載入 chart chunk
- 驗證指令:`nuxi analyze`、`nx build --skip-nx-cache`、靜態 server + CDP request log

**附帶發現**:`nx preview r017` 報 `Cannot find nitro.json` — 專案 generate output 與 preview target 路徑不吻合,**與本次改動無關**(既有問題)。驗證改用 `dist/apps/r017/.output/public` 靜態 server。待有空可修 project.json 的 preview target。

**評估**:entry gzip 只省 ~4 KB,G2 的分數收益有限(async wrapper 119→3 對 runtime 初始化成本有幫助,但主要重量不在此)。**Entry 647 KB 的大頭還在別處**,下一步 G4 要用 analyze 報告找出 entry 的實際組成。

### 2026-07-10 · G4 analyze 報告解讀 — G1/G4 排除,發現 G6(i18n 語系檔)為最大標的

報告:`dist/apps/r017/.nuxt/analyze/client.html`。完整解讀已寫入 §4.12 的「2026-07-10 analyze 實測後的修正」段落,摘要:

1. **G1 無需做**:chart.js 原生就只在 summary chunk
2. **G4 疑慮排除**:member composables 沒進 entry
3. **Entry 717 KB 是均勻的基礎設施**(PrimeVue theme 107 KB 最大,其餘 <75 KB 長尾),無單一大肥肉
4. **真正的肉:i18n 語系檔** — 16 個語系各 294-619 KB JS chunk,當前語系啟動必載;且 app 同時有 remote locale plugin 啟動時抓遠端語系覆蓋,**本地打包的語系可能大部分白載**(架構級重複)
5. 新增 G6(語系檔瘦身,最大標的)、G7(@primeuix/themes 107 KB,次要)兩個項目至 §4.12

**下一步**:G6 — 先讀 `useRemoteLocaleMessages` merge 邏輯,回答「remote 是完整語系還是差分、本地檔是否為 fallback」的架構問題,再決定瘦身策略。

### 2026-07-10 · F 回退 + G2/G5 部署後線上實測 — 桌面 79

PSI:<https://pagespeed.web.dev/analysis/https-gsi2-gsiwl-com/dik43n5i7r>

| 指標 | E 版(07-08) | 現在 | 變化 |
|---|---:|---:|---:|
| 桌面 Performance | 62 | **79** | **+17** |
| 桌面 FCP / LCP / TBT | 0.9s / 2.4s / 460ms | 0.7s / **2.1s** / **190ms** | 全面改善 |
| 桌面 CLS | 0 | 0 | F 回退生效 |
| 行動 Performance | 56 | 44 | 單次 TBT 噪聲(見下) |
| 行動 FCP / LCP | 4.2s / 13.2s | 3.8s / **11.5s** | 改善 |
| 行動 TBT | 240 ms | 670 ms | ⚠️ 單次波動,其他指標全改善,代碼同版桌面 TBT 反而 −270ms,判定為 4× throttle 噪聲 |

**關鍵觀察**:
- **桌面 79,距 80 綠燈 1 分**。G2 的 PrimeVue async wrapper 收斂(119→3)對 TBT 的效果(−270 ms)遠大於 bundle 體積數字(gzip −4 KB)所暗示 — wrapper 初始化成本才是重點。
- 行動 44 判定為單次噪聲:LCP −1.7s、FCP −0.4s、CLS 持平,唯 TBT +430ms。行動 4× CPU throttle 下 TBT 波動可達數百 ms。**待多次重測取中位**,預估實際水位 55-60。

**狀態**:`perf/pagespeed-js-bundle-slimming`(21db1df)已部署驗證,待走正式合併流程。

**2026-07-10 行動版 3 次重測確認水位**(`sbez1evpiq` 49 / `xeatukcf3m` 51 / `k6yxdbavtj` 51):

- **行動真實水位 ~50(中位 51)**,TBT 穩定在 410-420 ms、LCP 穩定 11.4-11.6 s、FCP 3.8 s、CLS 0.017
- **修正歷史解讀**:E 時期的行動 56 分含 TBT 幸運值(240 ms,歷史中位 ~420 ms)。「56→51」非 G2/G5 回歸,是 TBT 回歸常態。真實的持續改善:LCP −1.6 s、FCP −0.4 s(對比 E 時期)
- 先前單次 44(TBT 670 ms)確認為往下的離群值

**最終累積:桌面 11→79(+68)、行動 23→51(+28)**。行動 TBT 410 ms 與 LCP 11.5 s 是下一階段目標(路線 C env.js + 營運端圖片素材)。

### 2026-07-10 · G6c / G7 Chrome trace 實測 — 不進行高風險拆分

以最新 production static build 啟動本機靜態 server,Chrome 冷載首頁並套用 **4× CPU slowdown** 錄製 trace。當前英文 locale chunk 為 `B8CGhNaF.js`(288,851 bytes;build gzip 59.67 KB)。

| locale chunk 階段 | 4× CPU 實測 |
|---|---:|
| background parse | 6.832 ms |
| compile module | 0.020 ms |
| module script execute | 5.182 ms |
| **合計** | **約 12.0 ms** |

**G6c 結論**:即使在 4× CPU slowdown 下仍遠低於 §4.12 設定的 100 ms 門檻。G6a 修剪 3,778 個 key 的 raw-key 回歸風險與工程成本不成比例;G6b 改 loader 也缺乏足夠效益。**G6 維持現狀,不做 G6a/G6b。**

**G7 查證**:`SharedAuraPreset` 透過 `@primeuix/themes/aura` 靜態匯入 90 個 component token modules;Aura source components 合計約 116.8 KB,production theme chunk 107.85 KB。相同 4× CPU trace 中該 theme chunk background parse 僅 **3.220 ms**。若改為手動組 minimal preset,需補齊 DataTable、Carousel 等內部 PrimeVue 元件的 transitive tokens,會影響 R017 所有 PrimeVue 畫面。**收益不足以覆蓋回歸面,G7 不實作。**

**G5 低風險清理**:[apps/r017/src/app.vue](../../whitelabel-gsi-platform-multiverse-nx/apps/r017/src/app.vue) 移除只供 `console.log` 使用的 `palette` import/debug log。Production entry 647.66 KB → 646.86 KB(gzip 194.45 KB → 194.14 KB),約省 0.80 KB raw / 0.31 KB gzip。Build 通過。
