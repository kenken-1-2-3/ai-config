# GSI-480 BCY1 BETBY container、offset 與語系同步

> 交接合約：Spec 作者產出，指定實作者依此實作，reviewer 對照「驗收條件」逐條 review。
> 位置：`~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-480-bcy1-betby-container-options-language.md`（版控於 ai-config）。
> 本 spec 只涵蓋 GSI-480；實作者不得依對話記憶擴張需求。
> 狀態：規格待使用者確認；實作前仍需取得對 shared CSS／BETBY API surface touch 的明確確認。

## 背景 / 目標

- 需求來源：[Jira GSI-480](https://gamingsoft.atlassian.net/browse/GSI-480)。
- Jira 標題：`[需求 會員端]BCY1 產品BETBY頁面調整參數-8/3`。
- Jira 狀態（2026-08-05）：待開發；Priority：Medium；Assignee：Unassigned。
- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 環境：測試、正式。
- 總代／代理：BCYM／BCY1；目標 template/siteKey：`template/set_r031`。
- 目標頁面：
  - 測試：[https://bcy1.gsiwl.com/](https://bcy1.gsiwl.com/)
  - 正式：[https://bcy1.gpsriowdl.com/](https://bcy1.gpsriowdl.com/)
- 產品：BETBY，`product_code = 1244`。
- 關聯工單：GSI-255、GSI-257、GSI-409（Jira 均標示已完成）。
- BETBY 官方參考：[Frontend integration / Defining container](https://docs-integration.sptenv.com/#/integration/IG2-frameIntegration?id=defining-container)。

本需求要完成三件事：

1. 讓 BCY1 BETBY container 與其所有 DOM 祖先不再套用自訂 `display`、`position`、`overflow`；最終不得依賴 `revert !important` 抵銷原始規則。
2. `betSlipOffsetTop` 使用 R031 頁眉高度：PC `68px`、H5 `59px`；`stickyTop` 只避讓 fixed header，PC 為 `68px`、H5 為 `0px`。
3. 切換會員端語系後，重新初始化 BETBY；launch API 產生的 JWT 語系與 `BTRenderer.initialize({ lang })` 必須來自同一次選定語系，不得繼續停留在舊的 `en`。

## 官方 contract

實作者與 reviewer 必須依 BETBY 官方文件遵守下列 contract：

- Container 必須是一般 DOM element（目前的 `<div id="betby-sportsbook">` 可沿用），不得自行建立 iframe container。
- BETBY target 與 target 以上的 DOM 祖先不得套用 Partner 自訂的 `display`、`position`、`overflow`。
- `betSlipOffsetTop` 表示 viewport top 到展開 betslip 的距離。
- `stickyTop` 建議使用 Partner fixed header 高度；沒有 fixed header 才使用 `0`。
- 語系、登入／登出改變後，必須 `kill()` 舊 renderer，再以更新後參數呼叫 `initialize()`。
- `updateOptions()` 官方支援 `betSlipOffsetTop` 與 `stickyTop`，因此只發生 viewport breakpoint／header 高度改變時，不需為 offset 重新 launch API 或重建 renderer。
- `lang` abbreviation case-sensitive；不得自行猜測 BETBY 未確認的語系代碼。

## 研究基準與 main 現況

> 研究日期：2026-08-05。程式基準：最新 `origin/main` commit `8fb90175c4a2d50a8950ab126960010a51cda682`。實作者開始前仍須重新 fetch／pull 最新 `main` 並更新本節差異。

### Container / overflow 現況

- `src/css/app.sass` 對 `html`、`body`、`#q-app`、`.q-layout`、`.q-page-container`、`.q-page` 套用 `overflow: auto`。
- `src/App.vue` 對 `.outer-layout` 套用 `position: relative`。
- `template/set_r031/layout/Index.vue` 的一般 layout 會套用：
  - `.home-page { position: relative; overflow: hidden; }`
  - `.layout-main { position: relative; overflow: hidden; }`
  - `.hm-content { position: relative; }`
  - `.inner-content { overflow-y: auto; }`
  - `.page-layout { position: relative; }`
- `template/set_r031/pages/BetByPage/Index.vue` 的 `.betby-wrapper` 套用 flex display。
- `src/common/components/BetByArea/Index.vue` 的 `.betby-area`、`.iframe-stack` 套用 flex display。
- GSI-257 目前以 `set-r031-bcym-betby-host` class 搭配一組高 specificity selector，對 target 與完整祖先鏈設定：
  - `display: revert !important`
  - `position: revert !important`
  - `overflow: revert !important`
- 2026-08-05 實頁檢查結果：PC 與 390×844 H5 viewport 的完整 target ancestor chain，computed `display = block`、`position = static`、`overflow-x/y = visible`；document scrolling element 為 `HTML`，功能結果已正確。
- 但 GSI-480／廠商要求是不套用自訂 property；本 spec 採用「讓原始規則在 BCY1 BETBY host context 不匹配」的方式，移除 `revert` workaround，而不是直接刪除 workaround 後讓舊規則恢復。

### Offset 現況

- `src/common/hooks/useBetByGame.ts` 目前寫死：
  - `betSlipOffsetTop: 59`
  - `stickyTop: 0`
- R031 實際 Header 高度與定位：
  - PC：`4.25rem = 68px`，BCY1 BETBY host context 為 fixed。
  - H5：`3.6875rem = 59px`，目前為 relative 並已在 normal flow 佔位，不可再以 `stickyTop` 重複避讓。
- BCY1 Desktop 的 `betSlipOffsetBottom = 0` 與 PC/H5 `betslipZIndex = 100` 已由 GSI-409 完成，本需求不得回退。

### 語系現況

- `src/common/components/BetByArea/Index.vue` 已註冊 language-change callback，語系切換後會呼叫 `relaunchBetByGame()`。
- `useLanguage().setLanguage()` 會先更新 `locale`／language store，再執行 language-change callbacks。
- `useBetByGame.ts` 目前分別讀取 reactive `nowLang`：
  - launch payload：`LANGUAGE_CODE.Enums[nowLang.value]`
  - renderer option：`BTLangCode.value`
- 兩者在不同 async 時點讀取，沒有以單次 locale snapshot 綁定，也沒有阻止較舊 launch request 在較晚完成後覆蓋最新語系。
- BETBY renderer mapping 對部分語系明確／隱含 fallback `en`；backend `LANGUAGE_CODE` 也未涵蓋 `LANGUAGE_TYPE` 的所有值。缺 mapping 時不得再默默送出 `undefined` 或 fallback `en` 後宣稱切換成功。
- JWT 是 backend launch API 產生；前端不得直接修改 JWT，只能確保 launch request 的 `language_code` 正確，並驗證回傳 token claim。

## 範圍

### 1. 以 source exclusion 取代 `revert` workaround

#### 1.1 Host context 與 class lifecycle

修改 `template/set_r031/layout/Index.vue`：

- 沿用 `isBcymBetByPage = isBCYM && (route.name === "home" || route.name === "BetByPage")`；BCY1 `/` 會以 `home` route name render `BetByPage`，不可漏掉。
- 沿用單一 host class 名稱 `set-r031-bcym-betby-host`。
- Host active 時，class 必須同步存在於：
  - `html`
  - `body`
  - `#q-app`
  - `.outer-layout`
  - `.home-page`
- `.home-page` 可繼續使用 template class binding；其餘由目前的 toggle lifecycle 擴充。
- 離開 BCY1 BETBY route或 layout unmount 時，必須移除所有上述 class；不得污染 R031 其他 route 或其他 template。
- 若 `.outer-layout` 在 immediate watcher 當下尚未存在，需在 mount 後補同步；不得因 timing 讓 class 永久漏掛。

#### 1.2 Shared root CSS source exclusion

修改 `src/css/app.sass`：

- 保留 `height`、`min-height`、font 與其他全站共用屬性。
- 只把 `overflow: auto` 拆成可排除 host 的 selector；概念上需達到：
  - 一般頁面仍取得既有 `overflow: auto`。
  - `html.set-r031-bcym-betby-host`、`body.set-r031-bcym-betby-host`、`#q-app.set-r031-bcym-betby-host` 不匹配任何本專案 author `overflow` declaration。
- 不得把 R031 import、agent 判斷或 Vue runtime 邏輯放進 shared CSS；shared CSS 只能辨識 generic opt-out class。
- `.q-layout`、`.q-page-container`、`.q-page` 不在目前 BCY1 BETBY ancestor chain；維持既有行為。若實頁 DOM 變更後它們成為 ancestor，先更新 spec，不自行擴大 shared selector。

修改 `src/App.vue`：

- 一般 `.outer-layout` 維持 `position: relative`。
- `.outer-layout.set-r031-bcym-betby-host` 不得匹配該 `position` declaration。
- 不使用 `:has()` 作為唯一判斷，以免 browser support／dynamic route timing 造成差異；使用明確 class opt-out。

#### 1.3 R031 layout source exclusion

修改 `template/set_r031/layout/Index.vue` 的 layout styles：

- 保留一般 R031 頁面的既有 shell 與 inner-scroll 行為。
- 將會命中 BETBY ancestor chain 的下列 property 改成 host context 不匹配，而不是再以 `revert` 覆寫：
  - `.home-page` 的 `position`、`overflow`
  - `.layout-main` 的 `position`、`overflow`
  - `.hm-content` 的 `position`
  - `.inner-content` 的 `overflow-y`
  - `.page-layout` 的 `position`
- Margin、padding、width、height、min-height、background、transition 等非官方禁止屬性可保留；不得為了移除三個 property 刪掉整個 layout rule。
- BCY1 BETBY PC 仍使用 document natural scroll：
  - `.home-page`、`#layout-main`、`.hm-content`、`.inner-content` 的既有 host-specific auto/min-height 規則保留。
  - Header 與 Sidebar 是 BETBY target 的 sibling，可維持 fixed；其 PC offset 必須與本 spec 第 2 節一致。
- H5 仍由 document scroll 到完整 BETBY/頁尾；不得恢復 `.inner-content` nested scroll。

#### 1.4 BETBY wrapper/component display source exclusion

修改 `template/set_r031/pages/BetByPage/Index.vue`、`src/common/components/BetByArea/Index.vue`：

- 新增一個語意清楚、default-off 的 optional prop／class contract（名稱可依現有風格選擇，例如 `useNativeContainerFlow`），只供 caller 表示「BETBY target ancestor 不可設定 display」。
- BCY1 R031 BetByPage opt in；非 BCY1／其他 consumers 不傳時維持現有 flex layout。
- Opt-in 時：
  - `.betby-wrapper` 不得匹配 `display: flex`。
  - `.betby-area` 不得匹配 `display: flex`。
  - `.iframe-stack`／`.betby-renderer-stack` 不得匹配 `display: flex`。
  - `#betby-sportsbook` 不新增任何 display／position／overflow。
- Width／height utilities 可保留；禁止為了達成 native flow 改成另一個自訂 display 值（例如 `block !important`）。
- Shared component 只新增 optional plumbing，不得 import R031、BCY1、agent code 或 route。

#### 1.5 移除 workaround

- 只有在 1.1～1.4 完成、靜態檢查與實頁 computed-style audit 通過後，才刪除 `template/set_r031/layout/Index.vue` 中完整 target/ancestor selector 的：
  - `display: revert !important`
  - `position: revert !important`
  - `overflow: revert !important`
- 最終 production code 不得留下針對 BCY1 BETBY container/ancestor 的 `revert`、`unset`、`initial`、`inherit` 或空值 workaround。
- 不得只刪 `overflow: revert`；若原始 overflow 規則仍會命中，即判定不符合 spec。

### 2. 設定 PC/H5 `betSlipOffsetTop` 與 `stickyTop`

修改 `src/common/hooks/useBetByGame.ts`：

- 在 `UseBetByGameOptions` 新增 backward-compatible optional live getters：
  - `betSlipOffsetTop?: () => number | undefined`
  - `stickyTop?: () => number | undefined`
- Initial initialize／任何 kill + reinitialize 都必須讀取當下 getter：
  - `betSlipOffsetTop: options?.betSlipOffsetTop?.() ?? 59`
  - `stickyTop: options?.stickyTop?.() ?? 0`
- 未 opt in consumer 的 shared defaults 必須完全不變。
- 暴露一個只更新 SDK public options 的 method（名稱依現有風格），可一次更新 `betSlipOffsetTop` 與 `stickyTop`：
  - Renderer 不存在時安全 no-op；下一次 initialize 仍使用 getter 最新值。
  - Renderer 存在時使用 `btInstance.updateOptions({ betSlipOffsetTop, stickyTop })`。
  - 不得因單純 breakpoint／header height 改變而呼叫 launch API、kill 或 initialize。

修改 `src/common/components/BetByArea/Index.vue`：

- 新增 optional props：
  - `betSlipOffsetTop?: number`
  - `stickyTop?: number`
- 傳給 hook 時使用 live getter，不得在 component setup snapshot。
- Watch 兩個 props 的組合；值實際改變且兩者都有有效 number 時，呼叫 shared update method 一次。
- Watch initial 執行不得在 renderer 尚未建立時報錯，也不得造成 duplicate initialize。

修改 `template/set_r031/pages/BetByPage/Index.vue`：

- 只在 `isBCYM` 時傳入 offset。
- 使用現有 reactive breakpoint：
  - Desktop：`betSlipOffsetTop = 68`、`stickyTop = 68`。
  - H5：`betSlipOffsetTop = 59`、`stickyTop = 0`。
- `betSlipOffsetTop` 與 `stickyTop` 必須使用各自的 computed value，避免 H5 relative Header 已佔位後再把 BETBY sticky sidebar 下推 `59px`。
- Desktop↔H5 resize 後兩者一起更新；不得有任一值停留在舊 breakpoint。
- 保留既有：
  - BCY1 PC/H5 `betslipZIndex = 100`
  - BCY1 Desktop `betSlipOffsetBottom = 0`
  - BCY1 H5 sidebar hide 行為
  - 其他 consumer defaults

### 3. 統一 launch JWT 與 renderer initialize 語系

修改 `src/common/hooks/useBetByGame.ts`，必要時只讀／調整既有 language mapping constant：

- 建立單一純 mapping path，以明確的會員端 locale snapshot 同時產生：
  - launch API `language_code`
  - `BTRenderer.initialize({ lang })`
- Language-change callback 執行時，必須在 locale 已更新後取得一次 snapshot，並把該 snapshot／解析結果一路傳入本次 relaunch；不得在 API 前後分別重新讀 reactive `nowLang`。
- `fetchGameUrlAndToken()` 與 `setupBTRenderer()` 必須收到同一份 resolved language context。
- 初次 launch、登入／登出、wallet relaunch、currency-confirm fallback、token refresh 都必須沿用相同 mapping function；不得只修 language-change path。
- 語系切換仍須走現有 renderer lifecycle：
  1. 取得新語系的 launch token。
  2. 將舊 `btInstance` reference 設為 `null`。
  3. `kill()` 舊 renderer。
  4. 使用新 token 與新 `lang` initialize 一個 renderer。
- 增加 latest-launch guard／等效 last-write-wins 機制：若舊語系 request 比新語系 request 晚完成，舊結果不得 kill 或覆蓋最新 renderer。
- 不得透過 `window.location.reload()` 實作語系切換。
- 不得直接改寫／重簽 JWT，也不得把 token 或完整 JWT payload輸出到 console。

#### 語系 mapping gate

- 實作開始時先取得 BCY1 runtime agent setting 的 enabled language list，記錄於實作驗證結果，不寫入 production hardcode。
- 每個 BCY1 enabled language 都必須有：
  - 經 BETBY 官方文件確認、case-sensitive 的 renderer `lang` code。
  - 經現有 backend contract 或 API 文件確認的 numeric `language_code`。
- 可沿用目前已存在且已確認的 mappings；不得猜測缺少的 backend numeric code。
- 如果 BCY1 enabled language 在 BETBY 或 backend 沒有可確認 mapping：
  - 停止該語系實作並回報。
  - 先由需求方／BETBY／backend 確認預期 fallback，再更新本 spec。
  - 未確認前不得默默 fallback `en`，也不得把驗收標成通過。
- 本需求不新增或修改任何 UI copy／remote i18n key。

已確認的 backend numeric mapping（2026-08-06）：

- `fr = 10`
- `tl = 33`
- `br = 27`（原本共用常數的 `br = 12` 對應 Portuguese，需依 backend contract 修正為 Brazilian Portuguese）
- `hi = 39`
- Kiswahili `sw` 不在目前 backend enum 表內，維持 blocked，不得猜值。

## Out of scope

- 不修改代理端 `Whitelabel_GSI_Dashboard`。
- 不把 BCY1/R031 container、offset 或語系特規變成所有 template 的 default。
- 不移除所有頁面／所有 template 的 global overflow、position 或 display。
- 不修改非 BETBY R031 頁面的 inner scroll、layout shell、Header、Sidebar、Footer、Dialog scroll 或其他 visual behavior。
- 不移除 Height／min-height／width／padding／margin 等 BETBY 官方未禁止且維持頁面所需的 layout property。
- 不把 Header 或 Sidebar 移進 BETBY container；它們必須保持 target sibling。
- 不用 iframe 作為 container，不 query/patch BETBY iframe、shadow DOM、SDK internal class 或 private method。
- 不修改 `betslipZIndex = 100`、Desktop `betSlipOffsetBottom = 0`、Login/Register callback、wallet hydration、currency-confirm rerender 或 sidebar hide 的既有 GSI-409 行為。
- 不修改 product code 1244、integration id、wallet/currency resolution、themeName、recharge、session refresh、route/SEO 或 launch endpoint。
- 不以 reload 取代 renderer lifecycle。
- 不發明 backend language numeric code，不新增翻譯或 local locale JSON。
- 不 inspect、修改、格式化或提交 `src/env/environment.json`。
- 不順手清理 shared hook 既有 console、`/* eslint-disable */`、imports 或無關 lint。
- 不在本需求內自行 commit、push、merge、開 MR/PR 或部署；每一步需使用者另行明確指示。

## 受影響範圍

- 端別：會員端 `Whitelabel_GSI_Platform_Multiverse`。
- 目標 runtime：`agentCode === "BCY1"`（case-insensitive，由既有 `isBCYM` 判斷）。
- 目標 template/siteKey：`template/set_r031`。
- 預期修改的 production files：
  1. `src/css/app.sass`
  2. `src/App.vue`
  3. `src/common/hooks/useBetByGame.ts`
  4. `src/common/components/BetByArea/Index.vue`
  5. `template/set_r031/layout/Index.vue`
  6. `template/set_r031/pages/BetByPage/Index.vue`
- 條件式修改：
  - `src/common/utils/constants/languageCode.ts`：只有 BCY1 enabled language 缺少 mapping，且 backend 已提供正式 numeric code 時才可修改；否則先更新 spec。
- 預期只讀參考：
  - `src/common/composables/useLanguage.ts`
  - `src/stores/languageStore.ts`
  - `src/common/utils/constants/languageType.ts`
  - `template/set_r031/components/Header/Index.vue`
  - `template/set_r031/router/routes.ts`
  - GSI-257／GSI-409 specs 與 commits
- 跨站影響：
  - `src/css/app.sass`、`src/App.vue`、`BetByArea`、`useBetByGame` 是 shared surface。
  - Shared 變更只能新增 generic class opt-out／optional default-off APIs；class/props 不存在時，所有其他 template 必須維持 byte-equivalent behavior outcome。
  - 使用者目前只確認「寫 spec」與此方向，尚未授權 production shared touch；實作前必須再次確認。

## 參考實作 / 要遵循的現有 pattern

1. `template/set_r031/layout/Index.vue:118-153`
   - 現有 `isBcymBetByPage`、host class toggle 與 cleanup lifecycle。
2. `template/set_r031/layout/Index.vue:212-304`
   - 現有 `revert` workaround 與 PC document-scroll/Header/Sidebar sibling layout；需保留後半段有效 layout，替換前半段 workaround。
3. `src/css/app.sass:37-54`
   - Shared root height/font/overflow rule；只拆分 overflow selector，不複製整份 global rule。
4. `src/App.vue:31-34`
   - `.outer-layout { position: relative }` 的 shared source。
5. `src/common/components/BetByArea/Index.vue:22-43,97-100,162-175`
   - Optional props/live getter、language callback 與 current flex wrapper styles。
6. `src/common/hooks/useBetByGame.ts:34-46`
   - Existing optional live getter pattern；offset API 必須照此模式。
7. `src/common/hooks/useBetByGame.ts:88-109,151-214`
   - Renderer language mapping、kill/reinitialize 與 initialize options。
8. `src/common/hooks/useBetByGame.ts:322-344,416-459`
   - Launch payload language 與 async install path；language snapshot/latest-launch guard 應集中在此，不另建 renderer lifecycle。
9. `template/set_r031/pages/BetByPage/Index.vue:22-40`
   - BCY1 Desktop/H5 computed options 與 site opt-in pattern。
10. `template/set_r031/components/Header/Index.vue:197-229`
    - PC `68px` fixed／H5 `59px` relative header behavior。
11. `src/common/composables/useLanguage.ts:118-135`
    - Locale 先更新、再執行 registered callbacks 的既有順序。
12. `~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-257-bcy1-betby-h5-adjustments.md`
    - 前置 container/document-scroll/sidebar 決策。
13. `~/wow/ai-config/specs/Whitelabel_GSI_Platform_Multiverse/gsi-409-bcy1-betby-callback-options.md`
    - 前置 reactive options、wallet/reinitialize 與 R031 opt-in 決策。

## 關鍵決策與理由 (Key decisions)

1. **不直接刪 `revert`，先讓原始 property 在 host context 不匹配。**
   - 直接刪除會讓 `html/body/#q-app overflow:auto`、R031 `overflow:hidden/auto`、wrapper flex 與 ancestor relative position重新生效，回復廠商問題。
2. **最終移除所有 container-chain `revert` workaround。**
   - `revert` 的 computed 結果雖正確，但廠商要求是不對 container/ancestors 套用 Partner 自訂 property；source exclusion 更符合字面 contract。
3. **使用 generic host class opt-out，站點判斷仍留在 R031。**
   - Shared CSS/App/BetBy component 不得知道 BCY1；只有 R031 caller 決定何時加 class／prop，避免其他 template 受影響。
4. **保留 Header/Sidebar fixed，因為它們是 BETBY target sibling。**
   - 官方限制只涵蓋 target 與 ancestor；把 fixed UI 改回 normal flow 會造成已知 PC UX regression，且沒有必要。
5. **Offset 初始值走 initialize，breakpoint 變更走 `updateOptions()`。**
   - 官方明確支援動態更新 top/sticky offset；避免 resize 時重新打 launch API或重建 BETBY。
6. **PC/H5 分別依 Header 定位設定 top/sticky。**
   - PC Header fixed，因此 top/sticky 都使用 `68`；H5 Header 在 normal flow，因此 betslip top 使用 `59`，sticky sidebar 使用 `0`，避免重複位移。
7. **JWT 與 renderer 使用同一次 locale snapshot。**
   - 避免 async launch 前後讀到不同 reactive value，也讓 request/token/init 可以逐次核對。
8. **語系 relaunch 使用 last-write-wins。**
   - 快速切換或舊 request 慢回時，舊語系不得覆蓋最新選擇。
9. **缺語系 mapping 時 fail closed，不默默 fallback `en`。**
   - GSI-480 正是在修正「切語系但兩邊仍是 en」；未確認 fallback 不能偽裝成成功。
10. **Shared API 全部 optional/default-off。**
    - 需求只針對 BCY1/R031；其他 BETBY consumers 不得取得新的 layout、offset 或 callback behavior。

## 驗收條件

> Reviewer 必須逐條判定通過／不通過；因 BETBY 地區限制或缺 backend mapping 無法完成的項目需標示「待 QA／blocked」，不得宣稱全部通過。

### Container / CSS source

- [ ] BCY1 `/`（route name `home`）與 `/betByPage` 都能啟用 `set-r031-bcym-betby-host`；非 BCY1、非 BETBY route 不啟用。
- [ ] Host active 時 `html`、`body`、`#q-app`、`.outer-layout`、`.home-page` 都有 host class；離開 route/unmount 後全部清除。
- [ ] BCY1 BETBY context 的 target 與 ancestor chain 不匹配本專案 author `display`、`position`、`overflow` declaration。
- [ ] 最終 BCY1 BETBY host/container CSS 不含 `revert`、`unset`、`initial`、`inherit` 或空值 workaround。
- [ ] `src/css/app.sass` 的 overflow opt-out 只對帶 host class 的 root nodes 生效；一般頁面仍維持原本 `overflow: auto`。
- [ ] `.outer-layout` 在一般 template/page 仍為 `position: relative`；BCY1 BETBY host 不套用該 position。
- [ ] 一般 R031 `.home-page/.layout-main/.hm-content/.inner-content/.page-layout` 維持既有 position/overflow outcome。
- [ ] BCY1 native-container opt-in 時 `.betby-wrapper/.betby-area/.iframe-stack` 不套用 flex display；非 opt-in consumer 仍維持既有 flex layout。
- [ ] PC 與 H5 的 `#betby-sportsbook` 仍可完整 render，沒有寬度塌陷、高度歸零、footer 覆蓋或空白頁。

### PC runtime

- [ ] 以至少 1280px 寬 viewport 驗證，`#betby-sportsbook` 至 `html` 的完整祖先鏈 computed：`overflow-x/y = visible`、`position = static`、預期 block flow；沒有 nested scroll container。
- [ ] `document.scrollingElement === document.documentElement`，長 BETBY event page 可從頂部滑到最底，最後內容完整可見。
- [ ] Header 高度為 `68px` 且 fixed；Sidebar 維持 fixed sibling，捲動方向與位置正常。
- [ ] Initial `BTRenderer.initialize()` 收到 `betSlipOffsetTop = 68`、`stickyTop = 68`、`betSlipOffsetBottom = 0`、`betslipZIndex = 100`，全部為 number。

### H5 runtime

- [ ] 以至少 390×844 與一台實機驗證，`#betby-sportsbook` 至 `html` 的完整祖先鏈 computed：`overflow-x/y = visible`、`position = static`，沒有 `.inner-content` nested scroll。
- [ ] Document 可捲到 BETBY 最底與頁尾，賽事詳情／投注內容不被 viewport shell裁切。
- [ ] Header 高度為 `59px` 且維持 relative normal flow；Initial initialize 收到 `betSlipOffsetTop = 59`、`stickyTop = 0`，BETBY `left-sidebar` 不因 Header 已佔位而重複留下 `59px` 上方空隙。
- [ ] H5 的既有 `betSlipOffsetBottom`、sidebar hide、launcher/toggle guard 與 Login/Register callback 無 regression。

### Responsive offset

- [ ] BCY1 BETBY page 從 PC breakpoint 切到 H5，renderer 存在時只呼叫一次有效 `updateOptions({ betSlipOffsetTop: 59, stickyTop: 0 })`，不 launch/kill/reinitialize。
- [ ] 從 H5 切回 PC 同理更新成 `68/68`，沒有一個值停留在舊 breakpoint。
- [ ] Renderer 尚未建立或已 cleanup 時 resize 不丟錯；下一次 initialize 使用最新 breakpoint 值。
- [ ] 非 BCY1／未傳 props 的 consumers 仍使用 shared defaults `betSlipOffsetTop = 59`、`stickyTop = 0`。

### 語系／JWT／renderer

- [ ] 實作驗證記錄列出 BCY1 enabled language list，以及每個語系確認後的 backend `language_code`／BETBY `lang` mapping；未確認者明確 blocked，不 fallback 假通過。
- [ ] 對每個 BCY1 enabled 且雙方支援的非英文語系，切換後 launch request 的 `language_code` 符合 mapping。
- [ ] 同一次 launch 回傳 JWT 的 `lang` claim 符合選定語系；驗證不得記錄完整 token。
- [ ] 新 `BTRenderer.initialize({ lang })` 符合相同語系 snapshot與 BETBY case-sensitive mapping，不再是舊 `en`。
- [ ] 語系切換會 kill 舊 renderer 並 initialize 一個新 renderer；沒有兩個 live instances。
- [ ] 快速依序切換兩個語系且舊 request 較晚完成時，畫面、JWT、initialize option 最終仍為最後一次選擇。
- [ ] 切回 English 後 payload/JWT/renderer 都正確回到 English，流程不是只支援單向非英文切換。
- [ ] 初次 launch、登入／登出、wallet/currency relaunch、token refresh 不會把目前非英文語系意外改回 `en`。
- [ ] 語系切換不 reload 整頁、不新增 toast、不輸出 token／JWT payload／額外 diagnostic console。

### Scope / regression / static checks

- [ ] 至少 smoke 一個非 set_r031 BETBY consumer：container flex、root/inner scroll、offset defaults、語系、launch/relaunch 無 regression。
- [ ] 至少 smoke 一個 R031 非 BCY1 或非 BETBY route：layout/scroll/Header/Sidebar/Footer 與修改前一致。
- [ ] GSI-409 的 `betslipZIndex = 100`、Desktop bottom `0`、Login/Register、wallet hydration、currency-confirm rerender 保持通過。
- [ ] Diff 只包含本 spec 預期 production files；若新增其他檔案，先更新 spec。
- [ ] 臨時 test/harness 不在 commit；`src/env/environment.json`、帳密、token、站點設定不在 diff。
- [ ] Targeted Prettier/ESLint、`git --no-pager diff --check` 通過；未執行 `tsc --noEmit`。

## 邊界情況 / 例外

- Host class immediate watcher 可能早於 `.outer-layout` 或 route subtree mount；需在 mount 後補同步且 cleanup 對稱。
- Route name `home` 在 BCY1 render BetByPage，但其他 R031 site 的 `home` 是一般首頁；必須同時 guard `isBCYM`。
- Loading skeleton／`v-show` 暫時設定 target display 屬於 Vue 顯示 lifecycle；renderer 顯示後 target/ancestor audit 仍需符合本 spec。不得把永久 layout display 放回 container chain。
- Header fixed state受 sidebar state影響時，仍依 Jira 明確要求使用 layout header height；若產品確認某狀態不 fixed，要先更新 spec，不自行把 stickyTop 改回 0。
- Resize 可能連續觸發相同值；需 dedupe，避免重複 updateOptions。
- Language callback可能與 login、wallet、currency callback 同時要求 relaunch；latest-launch guard 必須涵蓋所有 launch origins，不只 language callback。
- Renderer install 前若 target 已 unmount或 route 已離開，該 launch 結果必須丟棄，不得在 stale DOM initialize。
- JWT claim 名稱若不是 `lang`，或 backend 對 numeric code 的 claim mapping與文件不一致，先保存 sanitized evidence並更新 spec，不直接 patch token。
- BETBY 不支援的語系 fallback 必須由需求方／廠商明確確認；本 spec 不授權自行使用 `en`。
- 當地區限制顯示 `Access is forbidden from your location` 時，可做 container/option audit，但投注、完整語系畫面驗證必須交 QA 可用網路執行。

## 測試計畫

> Repo 沒有既定 unit test script。依專案規則仍需寫測試驗證，但不得引入新 test framework；臨時 harness 驗證後刪除或 unstage，不可進 commit。

### 1. 臨時 renderer / launch harness（不可提交）

- Fake `BTRenderer` 與 launch API，至少驗證：
  1. 未傳新 options 時 initialize 仍為 `59/0`。
  2. BCY1 PC initialize 為 `68/68`，H5 為 `59/0`。
  3. Resize 只呼叫 `updateOptions`，相同值不重複呼叫，renderer 不存在安全 no-op。
  4. Language snapshot 同時決定 request `language_code` 與 renderer `lang`。
  5. 舊 language request 晚完成時被 guard 丟棄，不 kill/覆蓋最新 renderer。
  6. Language relaunch、login relaunch、wallet relaunch 交錯時仍只有最新有效 instance。
  7. Cleanup 後 pending request不會 initialize stale target。
- 測試不得輸出或保存完整 JWT；可使用合成 token/payload。

### 2. CSS source audit

- 以 scoped `rg`／diff確認：
  - 最終 host/container 規則沒有 `revert|unset|initial|inherit` workaround。
  - Shared root overflow 與 outer-layout position 都有 host class source exclusion。
  - R031 非 host rule 仍保留原始 property。
  - Native-container prop只有 BCY1 R031 opt in，shared default false。
- 用本地 build CSS 或 Chrome DevTools確認 matched rules；只看 computed value 不足以判定「source 沒有套用 property」。

### 3. Chrome PC/H5 runtime audit

- 依專案規則，所有 URL 使用 Chrome extension。
- 測試站：`https://bcy1.gsiwl.com/`；正式站只在使用者明確要求正式驗證時打開。
- PC 至少 1280px；H5 至少 390×844與一台實機。
- `/` 與 `/betByPage` 各驗證：
  - Host classes。
  - Target ancestor chain computed style。
  - `document.scrollingElement`、scrollHeight/clientHeight、可滑到頁尾。
  - Header height、fixed sibling、Sidebar。
  - Initialize options。
- Resize 跨 breakpoint，記錄 updateOptions 次數與 payload，確認無 launch API。
- 語系測試針對每個 enabled/supported locale記錄 sanitized：UI locale、launch numeric code、JWT lang claim、renderer lang。
- 離開 BETBY 到一般 R031 長頁，再確認 `.inner-content` 原有捲動恢復。

### 4. Cross-template regression

- 選至少一個使用 shared `BetByArea` 的非 set_r031 template：
  - 不傳 native-container/offset props。
  - Existing flex/display/scroll 不變。
  - Initialize offset defaults仍為 `59/0`。
  - Language/login/wallet/currency relaunch 可正常運作。

### 5. Targeted static validation

- 依實際 touched files執行 targeted Prettier/ESLint，至少包含：
  - `src/css/app.sass`
  - `src/App.vue`
  - `src/common/hooks/useBetByGame.ts`
  - `src/common/components/BetByArea/Index.vue`
  - `template/set_r031/layout/Index.vue`
  - `template/set_r031/pages/BetByPage/Index.vue`
  - 若有修改，加入 `src/common/utils/constants/languageCode.ts`
- 執行 `git --no-pager diff --check`。
- ESLint 只處理本次新增且阻擋驗證的 error，不清理無關既有 warning。
- `git status --short` 排除 `src/env/environment.json` 後，確認沒有臨時測試、帳密、token、環境設定或無關檔案。
- 不執行 `tsc --noEmit`。

## Git Flow

- 基底分支：`main`。
- 工作分支名稱：`fix/gsi-480-bcy1-betby-container-options-language`。
- 實作者開始前：
  1. 先取得使用者對 shared files (`src/css/app.sass`、`src/App.vue`、`BetByArea`、`useBetByGame`) default-off 變更的明確確認。
  2. 目前既有本地 `main` 曾因 protected branch push失敗而與 `origin/main` 分岔；不可在該 local state直接實作或把舊 merge commit帶入本需求。
  3. 保留使用者工作樹修改與 stash，不得 reset、drop 或帶入本 fix。
  4. Pull/fetch 前先以 `GIT_TERMINAL_PROMPT=0 git ls-remote origin HEAD` 確認 HTTPS token／Keychain；失敗時停止，不改用 SSH。
  5. 從最新 `origin/main` 建立並切換到 `fix/gsi-480-bcy1-betby-container-options-language`，確認 work branch只含 GSI-480後才開始實作。
  6. 不可直接在 `main`、`develop`、`staging` 或其他共享／舊 feature branch修改。
- 推進路徑：工作分支 → `develop`（dev 測試）→ `staging`（staging QA）→ `main`（正式）；每階段測試通過後才可進下一關，不得跳關。
- 每一次 commit 都必須先取得使用者針對該次 commit 的明確確認；本次「寫 spec」不構成 production 或 spec commit 授權。
- 合併到任何分支前需使用者再次明確確認；有 conflict 時停止／abort並回報，不自行解 conflict或改 merge strategy。
- 不預設 rebase，不主動把 develop/staging/main合回工作分支。
- 不主動開 MR/PR；只有使用者明確要求才建立。
- Merge 到環境分支不等於發版；只有使用者明確要求「發版/release」才可執行 `yarn deploy`，並選擇 `set_r031`、接受預設版號、最後確認 `y`。

## 交接備註給實作者

- 先依 Git Flow 建立乾淨 work branch，再開始修改。
- 建議順序：
  1. 臨時 renderer/language harness。
  2. Shared host-class source exclusions與 class lifecycle。
  3. Native-container optional prop/class。
  4. 移除 revert workaround並做 PC/H5 CSS audit。
  5. Offset optional getters/updateOptions與 R031 opt in。
  6. Language snapshot/latest-launch guard。
  7. Cross-template smoke、targeted checks、刪除臨時 harness。
- 實作前重新檢查最新 `origin/main`；如果 GSI-480 已有其他 branch／commit或上述檔案已變更，先更新 spec，不套用舊 line number。
- 若 source exclusion 無法在不影響其他 template 的前提下完成，停止並回報；不得退回全站刪 overflow或保留 `revert` 後宣稱完成。
- 若 enabled language缺正式 mapping，先回報並更新 spec；不得猜值。
- Reviewer 必須逐條 review「驗收條件」與 Out of scope，並提供 PC/H5、BCY1/non-BCY1、BETBY/non-BETBY evidence。
