# Provider Lobby vue-query Rollout（全版型）

- **Project**: `Whitelabel_GSI_Platform_Multiverse`
- **建立日**: 2026-06-22
- **背景需求單**: Notion「針對肯亞客戶 API 優化」（set_r031 pilot）／ commit `07cd9f7e`（合併）／ `b7c1189b`（refactor 本體）
- **目標版型**: 全版型（28 個）中所有「呼叫 product / game / favorite 三支 API」的位置

---

## 1. Goal

把已落地的 vue-query + 前端分桶 + virtual scroll 重構（目前只套在 `template/set_r031/`），**rollout 到其餘 27 個版型**所有會打下列 API 的頁面，達成：

- 減少重複 API 呼叫（不同 tab / 切換 provider / 切換 search type 共享同份快取）
- 移除帶 `integration_id` + `product_code` + `search_type` 的細粒度版本，**統一只打 `?game_type_id=`**，由前端做 filter
- 不再以 user 狀態驅動「全遊戲列表」快取，**收藏才綁 user**
- 對行情較差的客群（set_r031 / 肯亞為基準）顯著降低低階機型 DOM 數與重排

涉及 API：
- `GET /platform/v1/player/product?game_type_id=`
- `GET /platform/v1/player/product/game?game_type_id=`（**移除**帶 `integration_id` / `product_code` / `search_type` 的細粒度呼叫）
- `GET /platform/v1/player/game/favorite/list`
- `POST/DELETE /platform/v1/player/game/favorite`

## 2. Non-Goals

- 不重做基礎建設：`src/common/composables/useProviderQueries.ts`、`useProviderFavorites.ts`、`useProviderLobby.ts`、`useGameLobbyVirtualScroll.ts`、`src/common/hooks/useProviderLobbyRouteGuards.ts` 已在 commit `b7c1189b` 完成，本次只**消費**它們；除非過程中發現 bug 才動。
- 不改版面、不調整 layout / spacing / motion / SCSS（依 CLAUDE.local.md「Scope Control」）。
- 不刪 `src/common/composables/useGame.ts` 內的舊 `getProducts / getGameList / getAllProviderGames / addfavoriteGame / removefavoriteGame / getFavoriteGames` 等 API；只要全版型不再呼叫即可，是否刪除留到全部版型遷移完成後另案處理。
- 不動 i18n、不刪 `$t/t` key。
- 不動 ESLint / prettier 風格的舊問題（依專案規則）。
- 不在這份 spec 內處理 `Whitelabel_GSI_Dashboard` 或 `whitelabel-gsi-platform-multiverse-nx` 兩個 sibling project。

## 3. 共用基礎建設盤點（已存在，本次只消費）

| 路徑 | 暴露能力 |
|---|---|
| `src/common/composables/useProviderQueries.ts` | `providerQueryKeys` / `invalidateProviderQueries` / `useProviderProducts(gameTypeId)` / `useProviderGames(gameTypeId)` / `useProviderFavoriteList()` |
| `src/common/composables/useProviderFavorites.ts` | `useProviderFavoriteActions()`（add / remove + optimistic + rollback）／ `favoriteIdsToMap` / `isProviderGameFavorited` |
| `src/common/composables/useProviderLobby.ts` | `useProviderProductsLobby(gameTypeId, opts)`（ProductLobby 用）／ `useProviderGameLobby(router, gameTypeId, opts)`（GameLobby 用，回傳 `selectedProductCode/selectedProduct/productCodeOption/gameSearchType/searchKeyword/showGameList/selectProductCode/isGameFavorited/addFavorite/removeFavorite`）／ `useFilterProviderGames`（給非 lobby 頁面、如 CmsHomeDetail 用） |
| `src/common/composables/useGameLobbyVirtualScroll.ts` | `useGameLobbyVirtualScroll(showGameList, isDesktop)`：回傳 `virtualScrollRef / virtualRowHeight / virtualScrollSliceSize / virtualScrollSliceRatioBefore / virtualScrollSliceRatioAfter / resolvedVirtualScrollTarget / gameRows`（依 isDesktop 自動 6/3 欄、320/350 row 高） |
| `src/common/hooks/useProviderLobbyRouteGuards.ts` | `useProductLobbyRouteGuard` / `useGameLobbyRouteGuard`（非法 gameType / productCode 自動 fallback） |
| `src/common/hooks/useAuth.ts` | 登出時呼叫 `invalidateProviderQueries(queryClient)` 清收藏；本次不動 |

## 4. 版型骨架盤點 + Phase 切分

> 來源：`grep -l "getGameList\|getProductList\|getFavoriteGameList\|favoriteGame\|deleteFavoriteGame" template/`

### A. set_r031 同骨架（`pages/GameLobby.vue` + `pages/ProductLobby.vue`）
- 已完成 pilot：**set_r031**
- 本 spec 範圍：**set_r017 / set_r027 / set_r030 / set_r033**

### B. `pages/GameLobby/Index.vue` 骨架
- **set_r016 / set_r024 / set_r025 / set_r029 / set_ed3 / set_ed8888 / set_amuse / bmm_set_obtd / okbet / okbet_green / okbet_red / okbet_blackGold / okbet_redBlack**（13 個）

### C. `pages/GameLobby/GameList.vue` 骨架（多檔拆分）
- **set_r022 / set_r022_mga / set_r023 / set_r032**

### D. 大廳以外但也打那三支 API 的位置
每個版型多半都有一份 `pages/HomePage/Cms/CmsHomeDetail.vue`（或 `HomePage/CMS/CmsHomeDetail.vue`、`pages/Cms/CmsHomeDetail.vue`），會用 `addfavoriteGame/removefavoriteGame/getFavoriteGames`。
特例：
- `set_r022 / set_r022_mga / set_r032` 有 `HomePage/Components/HomeBetBy.vue`
- `set_r025` 有 `HomePage/Components/HomeFBSports.vue`
- `set_amuse` 另有 `PopularLobby/Index.vue`、`FavouriteLobby/Index.vue`、`HomePage/Home.vue`

### Phase 切分

| Phase | 範圍 | 分支 | 風險 |
|---|---|---|---|
| **Phase 1** | A 群 4 版型（set_r017 / set_r027 / set_r030 / set_r033）的 GameLobby + ProductLobby + 同 4 版型的 `CmsHomeDetail` | `refactor/provider-lobby-vue-query-rollout-phase-1` | 低（與 pilot 同骨架，逐字參照 set_r031） |
| **Phase 2** | B 群 13 版型的 `GameLobby/Index.vue`（+ 該版型 ProductLobby 若有）+ `CmsHomeDetail` | `refactor/provider-lobby-vue-query-rollout-phase-2` | 中（骨架差異較大，需各別比對 markup） |
| **Phase 3** | C 群 4 版型 + set_amuse 多檔特例 + HomeBetBy / HomeFBSports | `refactor/provider-lobby-vue-query-rollout-phase-3` | 高（部分檔案疑似含 Betby / sports 邏輯，需獨立驗證） |

每個 Phase 都按 git flow：`main` 開分支 → 完成後 merge → `develop` 驗證 → `staging` 驗證 → `main`；**不在這份 spec 內 deploy**，user 另指示時才 `yarn deploy`。

## 5. 替換樣板（以 set_r031 為準）

### 5.1 `ProductLobby.vue` 替換要點

刪除：
- `useGame()` 內取得 `productState`、`getProducts` 的呼叫
- `productStore` 的直接讀寫
- 任何 `await getProducts(...)` 啟動 fetch

新增 / 改用：
```ts
import { useProviderProductsLobby } from "src/common/composables/useProviderLobby"
import { useProductLobbyRouteGuard } from "src/common/hooks/useProviderLobbyRouteGuards"

const parsedGameTypeId = computed(() => {
  const v = Number(route.params.gameType)
  return Number.isNaN(v) ? null : v
})
const gameTypeId = computed(() =>
  parsedGameTypeId.value != null && parsedGameTypeId.value in GAME_TYPE.I18nKeys
    ? (parsedGameTypeId.value as GAME_TYPE.Enums)
    : GAME_TYPE.Enums.SLOT
)

const { productList } = useProviderProductsLobby(gameTypeId)
useProductLobbyRouteGuard({ route, router, parsedGameType: parsedGameTypeId })
```

Template：把原本 `productState.list` 改成 `productList`；其餘 markup / SCSS / class / 動畫不動。

### 5.2 `GameLobby.vue` 替換要點

刪除：
- `useGame()` 解構出的 `productState / gameState / integrationId / gameSearchType / getProducts / getFavoriteGames / getAllProviderGames / addfavoriteGame / removefavoriteGame / handleGameSearchTypeClick / getGameList`
- `useGameKeyword()` 整支替換
- `onMounted` 內 `await getFavoriteGames() / await getProducts(...)` 等 fetch trigger
- 自寫的 `productCode = ref(0)` / `productCodeOption = computed(...)` / `showGameList = computed(...)` / `handleTabClick`

新增 / 改用：
```ts
import { useProviderGameLobby } from "src/common/composables/useProviderLobby"
import { useGameLobbyVirtualScroll } from "src/common/composables/useGameLobbyVirtualScroll"
import { useGameLobbyRouteGuard } from "src/common/hooks/useProviderLobbyRouteGuards"

const parsedGameType = computed(...)
const safeGameType = computed(...)  // 同 5.1
const parsedRouteProductCode = computed(...)
const routeProductCode = computed(...)

useGameLobbyRouteGuard({ route, router, parsedGameType, parsedProductCode: parsedRouteProductCode })

const {
  selectedProductCode, selectedProduct, productCodeOption,
  searchKeyword, showGameList,
  gameSearchType,
  selectProductCode, isGameFavorited, addFavorite, removeFavorite,
} = useProviderGameLobby(router, safeGameType, { routeProductCode })

const {
  virtualScrollRef,
  virtualRowHeight, virtualScrollSliceSize,
  virtualScrollSliceRatioBefore, virtualScrollSliceRatioAfter,
  resolvedVirtualScrollTarget,
  gameRows,
} = useGameLobbyVirtualScroll(showGameList, isDesktop)
```

Template 對應改動：
- 搜尋框 `v-model.trim` 從 `searchState.keyword` → `searchKeyword`
- Product `q-select` 改 `:model-value="selectedProductCode" @update:model-value="selectProductCode"`，`v-slot:selected` 用 `selectedProduct?.product_name` / `getProductTabImage({ ...selectedProduct, siteKey: "<該版型>" })`
- 遊戲卡內收藏判斷 `game.is_favorite` → `isGameFavorited(game)`
- 收藏按鈕事件 `addfavoriteGame/removefavoriteGame` → `addFavorite/removeFavorite`
- 外層 `<ul class="game-row">` 包進 `<q-virtual-scroll>`，原本 `v-for="game in showGameList"` 改成兩層：`item: gameRow` 外層 + `v-for="game in gameRow"` 內層；**`.game-row` 改用 `gameRow` 渲染，CSS 不動**

> 注意：set_r031 commit 內 `q-virtual-scroll` 用的是 row-based 切片（`gameRows`）+ `virtual-scroll-item-size="virtualRowHeight"`。Phase 1/2/3 套用時需各別檢查該版型既有的 grid 欄數（mobile 3 / desktop 6 是 set_r031 規格；若該版型 mobile 是 2 欄、desktop 5 欄，需擴充 `useGameLobbyVirtualScroll` 接受 columns 參數，或就先沿用 6/3 對 layout 影響做視覺確認；以「視覺對齊原樣」為驗收標準）。

### 5.3 `CmsHomeDetail.vue` 替換要點

不一定有 product / game tabs，但 favorite icon 行為一致：
- 刪除 `useGame()` 解構出的 `addfavoriteGame / removefavoriteGame / getFavoriteGames` 與 `gameState.favoriteList` 讀取
- 改用：
```ts
import { useProviderFavoriteActions, favoriteIdsToMap, isProviderGameFavorited } from "src/common/composables/useProviderFavorites"
import { useProviderFavoriteList } from "src/common/composables/useProviderQueries"

const favoriteListQuery = useProviderFavoriteList()
const favoriteMap = computed(() => favoriteIdsToMap(favoriteListQuery.data.value ?? []))
const { addFavorite, removeFavorite } = useProviderFavoriteActions()
const isGameFavorited = (game: Response.GameItem) => isProviderGameFavorited(game.game_id, favoriteMap.value)
```
- Template 把 `addfavoriteGame(payload, true)` / `removefavoriteGame(payload, true)` 改成 `addFavorite(payload, true)` / `removeFavorite(payload, true)`，`game.is_favorite` 改成 `isGameFavorited(game)`。
- 不必呼叫 `onMounted(() => getFavoriteGames())`，query 會自動 enable 並在登入後抓。

### 5.4 `HomeBetBy.vue` / `HomeFBSports.vue` / `set_amuse/PopularLobby` 等特例（Phase 3）

這些檔案在 Phase 3 進入前**必須各自閱讀一次**，依該檔案實際用到的 API 子集（可能只用 `favoriteList` 或只用 `games`）對齊：
- 若僅用收藏：套 5.3 的 favorite 樣板
- 若用全遊戲列表：用 `useProviderGames(gameTypeId)` + `useFilterProviderGames()` 自行 filter，**不要直接呼叫 API**

## 6. Acceptance Criteria（每個 Phase 結束都要打勾）

> 全 phase 共用（每版型在該 phase 完成時逐項驗）

- [ ] `grep -nR "getProductList\|getGameList\|getFavoriteGameList\|favoriteGame\|deleteFavoriteGame" template/<該 phase 範圍版型>` 在「視圖層 / composable 直接呼叫」項中是 0
- [ ] `grep -nR "useGameKeyword" template/<該 phase 範圍版型>` 結果為 0
- [ ] `grep -nR "gameState\.\|productState\." template/<該 phase 範圍版型>/pages/{GameLobby*,ProductLobby*,Cms*}` 結果為 0（CmsHomeDetail 內若仍有非 favorite/list 相關用法可保留）
- [ ] 該 phase 範圍版型的 `GameLobby` / `ProductLobby` template 中不再見 `game.is_favorite`、`addfavoriteGame`、`removefavoriteGame`
- [ ] 該 phase 範圍版型的 `GameLobby` 使用 `q-virtual-scroll`（同 set_r031）
- [ ] `git --no-pager diff --check` 無 whitespace 錯誤
- [ ] 視覺對齊：與重構前的 mobile / desktop 截圖逐版型比對，layout / spacing / 字級 / icon 對齊不變（用 Chrome 擴充打開 dev 環境連結）
- [ ] 行為驗證腳本（手動）：
  - [ ] 進入 GameLobby：只發一次 `/platform/v1/player/product?game_type_id=`、一次 `/platform/v1/player/product/game?game_type_id=`、登入時一次 `/platform/v1/player/game/favorite/list`；切 provider、切 search type 不再 fetch
  - [ ] 切 provider 後 URL 的 `productCode` 同步更新
  - [ ] 重新整理在某個 provider 上時，仍停留同 provider（route 優先）
  - [ ] 搜尋輸入後 ~500ms 才篩選；清空立即還原
  - [ ] 未登入點 Favorites tab 觸發 login 開啟，按取消後 tab 還原
  - [ ] 收藏 / 取消收藏 → favorite icon 立刻翻轉；網路失敗 icon 還原；CmsHomeDetail 內同一首遊戲的 icon 同步翻轉（共用 favoriteList cache）
  - [ ] 登出 → favoriteList cache 被清；games / products cache 仍在
- [ ] 不執行 `yarn deploy`，僅推 branch，貼 MR/PR 連結給 user

## 7. Out-of-scope / 後續

- `src/common/composables/useGame.ts` / `useGameKeyword.ts` / `useProductStore` / `useGameStore` 的死碼清理：等三 phase 全合 main、且 staging 驗證一輪後另開 `refactor/...` 處理。
- 把 set_r031 的 lobby 元件（GameTab / GameBanner）共用化以減少版型 markup 差異，另案。
- 同步到 `whitelabel-gsi-platform-multiverse-nx` 新版型：另案 spec。
- `yarn deploy` 在所有 phase merge `main` 並驗證後再由 user 決定觸發時機。

## 8. 風險 / 注意

- **欄數差異**：`useGameLobbyVirtualScroll` 寫死 6/3 欄。若某版型原本是 5/2 或 4/2 欄，套用後排版會錯。建議遇到時擴充 hook 簽名為 `useGameLobbyVirtualScroll(showGameList, isDesktop, { columns?: { desktop, mobile } })`，**作為基礎建設改動，需在 PR 描述清楚**。
- **`v-slot:selected` 的 siteKey**：每版型把 `siteKey: "set_r031"` 改成自己版型的 key，否則會抓錯 product tab image。
- **CmsHomeDetail 的 favorite 顯示來源**：原本可能讀 `game.is_favorite`（後端回應），重構後改讀 cache 推導出來的 `isGameFavorited`，需確認 CmsHomeDetail 接到的 `entrance.payload` 物件含 `game_id`。
- **Betby / sports 分支**：Phase 3 進入前先用 `git --no-pager log -p -- template/set_r032/pages/HomePage/Components/HomeBetBy.vue` 確認該檔的呼叫意圖，再決定要不要套用本樣板，或留作另案。

## 9. 執行順序與交付

1. 寫 spec（本檔），user review。
2. 進 writing-plans skill，產出 Phase 1 implementation plan。
3. 依 plan 開 `refactor/provider-lobby-vue-query-rollout-phase-1` 分支，逐版型實作 → 自我驗收 → 視覺對比 → 推 branch，貼連結。
4. Phase 1 上 staging 驗證通過後，重複 2-3 給 Phase 2 / Phase 3。
