# Provider Lobby vue-query Rollout — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `b7c1189b` 已在 `set_r031` 落地的 vue-query + 前端分桶 + virtual scroll 重構，rollout 到 A 群 4 版型（`set_r017` / `set_r027` / `set_r030` / `set_r033`）的 `GameLobby.vue`、`ProductLobby.vue`、`Cms/CmsHomeDetail.vue`。

**Architecture:** 4 版型骨架與 `set_r031` 完全一致（皆是 `pages/GameLobby.vue` + `pages/ProductLobby.vue` + `pages/Cms/CmsHomeDetail.vue`）。每版型一個 task，套用同一套「3 個檔案的逐字替換 recipe」，差異只在 `siteKey` 與該版型既有元件 import 路徑。基礎建設 `src/common/composables/useProviderQueries.ts` / `useProviderLobby.ts` / `useProviderFavorites.ts` / `useGameLobbyVirtualScroll.ts` / `src/common/hooks/useProviderLobbyRouteGuards.ts` 已存在，**本 phase 不動**。

**Tech Stack:** Vue 3 (`<script setup>`) + Quasar 2 + `@tanstack/vue-query` 5 + `vue-router` 4 + `@vueuse/core`。

## Global Constraints

- 樣式不動：只改 `<script setup>` 與必要的 `v-model` / `v-for` / 事件綁定；`<style>`、class 名、SCSS 一律不動。
- 不修改 `src/common/composables/useProviderQueries.ts` / `useProviderLobby.ts` / `useProviderFavorites.ts` / `useGameLobbyVirtualScroll.ts` / `src/common/hooks/useProviderLobbyRouteGuards.ts` / `src/common/hooks/useAuth.ts`。
- 不刪 `src/common/composables/useGame.ts` / `useGameKeyword.ts` 的舊 method。其他版型還在用。
- 不執行 `yarn deploy` / `yarn deploy:all`。
- 不開 MR/PR；push 後把 GitLab MR 連結貼給 user，由 user 決定何時 open。
- `src/env/environment.json` 不看不改不 commit。
- 不執行 `tsc --noEmit`；驗證走 `git --no-pager diff --check` + 手動瀏覽器行為。
- Chrome 擴充打開任何 URL（依 user 規則），不要用 in-app browser。
- 不寫 unit test 檔（依 user 規則 "Do not include test files in commits"）；驗證用瀏覽器 + Network tab。
- i18n key 一律保留，不增、不刪。
- ESLint 警告非阻塞時不主動修。

## Files Touched

每個版型同樣 3 個檔案：

| 版型 | 檔案 1 | 檔案 2 | 檔案 3 |
|---|---|---|---|
| set_r017 | `template/set_r017/pages/GameLobby.vue` | `template/set_r017/pages/ProductLobby.vue` | `template/set_r017/pages/Cms/CmsHomeDetail.vue` |
| set_r027 | `template/set_r027/pages/GameLobby.vue` | `template/set_r027/pages/ProductLobby.vue` | `template/set_r027/pages/Cms/CmsHomeDetail.vue` |
| set_r030 | `template/set_r030/pages/GameLobby.vue` | `template/set_r030/pages/ProductLobby.vue` | `template/set_r030/pages/Cms/CmsHomeDetail.vue` |
| set_r033 | `template/set_r033/pages/GameLobby.vue` | `template/set_r033/pages/ProductLobby.vue` | `template/set_r033/pages/Cms/CmsHomeDetail.vue` |

Reference（不動，僅作為「正確結果」對照）：
- `template/set_r031/pages/GameLobby.vue`
- `template/set_r031/pages/ProductLobby.vue`
- `src/common/composables/useProviderQueries.ts`
- `src/common/composables/useProviderLobby.ts`
- `src/common/composables/useProviderFavorites.ts`
- `src/common/composables/useGameLobbyVirtualScroll.ts`
- `src/common/hooks/useProviderLobbyRouteGuards.ts`

---

## Recipes

> 每個 template task 都會直接套這三段。**每出現一次都把 `<SITE_KEY>` 換成該版型 key**（例如 `set_r017`），並把該版型既有的 `GameBanner` / `GameTab` / `useSiteImg` 等 import 路徑保留原樣（4 版型 import 路徑各自不同；只改 script 內邏輯，不改 component 路徑）。

### Recipe A — `ProductLobby.vue` `<script setup>` 整段替換

讀完現檔後，把 `<script setup>` 內所有 `useGame()` 衍生的 `productState`、`getProducts`、`productStore` 寫入、`useProductStore` import，以及任何 `await getProducts(...)` 呼叫**全部刪除**。然後保留該版型既有的 `GameBanner` / `GameTab` / `RankBoard`（若有）/ `useSiteImg` 等 component import；script 邏輯以下列為準：

```ts
import { computed, watchEffect, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useProviderProductsLobby } from "src/common/composables/useProviderLobby"
import { useGame } from "src/common/composables/useGame"
import { useMediaQuery } from "src/common/hooks/useMediaQuery"
import { useCommonImg } from "src/common/hooks/useCommonImg"
import { useProductLobbyRouteGuard } from "src/common/hooks/useProviderLobbyRouteGuards"
import { GAME_TYPE, AI_HELPER_EVENT_ROUTES } from "src/common/utils/constants"
import { useAIHelperEvent } from "src/common/hooks/useAIHelperEvent"
// ↑ 以上 import 為固定。下方為該版型 specific 的 GameBanner / GameTab / RankBoard import — 保留原檔現有路徑。

const route = useRoute()
const router = useRouter()
const { handleProductClick, getProductSquareImage } = useGame()
const { productDefaultImg } = useCommonImg()
const { isDesktop } = useMediaQuery()
const { handleAIHelperRouteEvent } = useAIHelperEvent()

const parsedGameTypeId = computed(() => {
  const value = Number(route.params.gameType)
  return Number.isNaN(value) ? null : value
})
const gameTypeId = computed(() =>
  parsedGameTypeId.value != null && parsedGameTypeId.value in GAME_TYPE.I18nKeys
    ? (parsedGameTypeId.value as GAME_TYPE.Enums)
    : GAME_TYPE.Enums.SLOT
)
const { productList } = useProviderProductsLobby(gameTypeId)

useProductLobbyRouteGuard({
  route,
  router,
  parsedGameType: parsedGameTypeId
})

watchEffect(() => {
  if (GAME_TYPE.Category[gameTypeId.value as GAME_TYPE.Enums] === GAME_TYPE.CategoryEnums.GameOpen) {
    router.push({ name: "GameLobby", params: { gameType: gameTypeId.value } })
  }
})

onMounted(() => {
  if (GAME_TYPE.Category[gameTypeId.value as GAME_TYPE.Enums] === GAME_TYPE.CategoryEnums.LobbyOpen) {
    handleAIHelperRouteEvent(AI_HELPER_EVENT_ROUTES.Enums.PRODUCT_LOBBY)
  }
})
```

Template 內：
- `productState.list` → `productList`
- `getProductSquareImage({ ...product, siteKey: "set_r031" })` 若該版型原本就帶 `siteKey: "<SITE_KEY>"`，保持版型自己的 siteKey 不要動。
- 不動 layout / class / SCSS。

### Recipe B — `GameLobby.vue` `<script setup>` 整段替換

讀完現檔後，把所有 `useGame()` 衍生的 `productState / gameState / integrationId / gameSearchType / getProducts / getFavoriteGames / getAllProviderGames / addfavoriteGame / removefavoriteGame / handleGameSearchTypeClick / getGameList` 解構**全部移除**，並移除 `useGameKeyword` 整段。同時：

- 移除 `productCode = ref(0)`、自寫 `productCodeOption = computed(...)`、自寫 `showGameList = computed(...)`、`handleTabClick`、舊 `onMounted` 內的 `await getFavoriteGames() / await getProducts(...) / await handleGameSearchTypeClick(...)`、`watch(() => gameSearchType.value, ...)` 區段（這段邏輯改由 composable 內處理）。

替換後的 `<script setup>` 邏輯：

```ts
import { useProviderGameLobby } from "src/common/composables/useProviderLobby"
import { useGameLobbyVirtualScroll } from "src/common/composables/useGameLobbyVirtualScroll"
import { useGameLobbyRouteGuard } from "src/common/hooks/useProviderLobbyRouteGuards"
import { useGame } from "src/common/composables/useGame"
import { useAIHelperEvent } from "src/common/hooks/useAIHelperEvent"
import { useCommonImg } from "src/common/hooks/useCommonImg"
import { AI_HELPER_EVENT_ROUTES, GAME_TYPE } from "src/common/utils/constants"
import { computed, onMounted, ref } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useMediaQuery } from "src/common/hooks/useMediaQuery"
import { cx } from "src/common/utils/cx"
// ↑ 以上 import 為固定。下方為該版型 specific 的 GameBanner / GameTab / useSiteImg import — 保留原檔現有路徑。

const route = useRoute()
const router = useRouter()
const { gameTagList, getProductTabImage, openGame, getGameImage } = useGame()
const { setDefaultGameImg } = useCommonImg()
const { isDesktop } = useMediaQuery()
const { svgIcon, hotTagImg, newTagImg, setDefaultProductTabImg } = useSiteImg()
const { handleAIHelperRouteEvent } = useAIHelperEvent()

const parsedGameType = computed(() => {
  const value = Number(route.params.gameType)
  return Number.isNaN(value) ? null : value
})
const safeGameType = computed(() =>
  parsedGameType.value != null && parsedGameType.value in GAME_TYPE.I18nKeys
    ? (parsedGameType.value as GAME_TYPE.Enums)
    : GAME_TYPE.Enums.SLOT
)
const gameType = safeGameType
const parsedRouteProductCode = computed(() => {
  const raw = route.params.productCode
  if (raw == null || raw === "") return undefined
  const code = Number(raw)
  return Number.isNaN(code) ? null : code
})
const routeProductCode = computed(() =>
  parsedRouteProductCode.value == null ? undefined : parsedRouteProductCode.value
)

useGameLobbyRouteGuard({
  route,
  router,
  parsedGameType,
  parsedProductCode: parsedRouteProductCode,
})

const {
  selectedProductCode,
  selectedProduct,
  productCodeOption,
  searchKeyword,
  showGameList,
  selectProductCode,
  isGameFavorited,
  addFavorite,
  removeFavorite,
  gameSearchType,
} = useProviderGameLobby(router, safeGameType, { routeProductCode })

const {
  virtualScrollRef,
  virtualRowHeight,
  virtualScrollSliceSize,
  virtualScrollSliceRatioBefore,
  virtualScrollSliceRatioAfter,
  resolvedVirtualScrollTarget,
  gameRows,
} = useGameLobbyVirtualScroll(showGameList, isDesktop)

const selectedGameId = ref<number | null>(null)
const hoveredGameId = ref<number | null>(null)

const handleGameClick = (gameId: number, event: Event) => {
  event.stopPropagation()
  if (!isDesktop.value) {
    selectedGameId.value = selectedGameId.value === gameId ? null : gameId
  }
}

const handleWrapperClick = (event: Event) => {
  const target = event.target as HTMLElement
  if (target.closest(".img-container")) {
    return
  }
  selectedGameId.value = null
}

const handleGameHover = (gameId: number) => {
  if (!isDesktop.value) return
  hoveredGameId.value = gameId
}

const handleGameHoverLeave = () => {
  if (!isDesktop.value) return
  hoveredGameId.value = null
}

onMounted(() => {
  handleAIHelperRouteEvent(AI_HELPER_EVENT_ROUTES.Enums.GAME_LOBBY)
})
```

Template 替換點（每個版型 markup 微差，但下列 6 個改動是固定的）：
1. 搜尋框：`v-model.trim="searchState.keyword"` → `v-model.trim="searchKeyword"`
2. Provider `q-select`：
   - `v-model="productCode"` → `:model-value="selectedProductCode"`
   - 新增 `@update:model-value="selectProductCode"`，並移除原本 `@update:model-value="(value) => handleTabClick(integrationId, value)"`
   - `v-slot:selected` 內 `<img :src="getProductTabImage({ product_code: productCode, siteKey: '<SITE_KEY>' })" :alt="productCode" />` 改為 `<img v-if="selectedProduct" :src="getProductTabImage({ ...selectedProduct, siteKey: '<SITE_KEY>' })" :alt="String(selectedProductCode)" />`
   - `v-slot:selected` 內 `productCodeOption.find(...)?.label` 改為 `selectedProduct?.product_name`
3. 收藏 icon 顯隱：`v-if="game.is_favorite"` / `v-if="!game.is_favorite"` → `v-if="isGameFavorited(game)"` / `v-if="!isGameFavorited(game)"`
4. 收藏按鈕事件：`@click="removefavoriteGame(game, true)"` → `@click="removeFavorite(game, true)"`、`@click="addfavoriteGame(game, true)"` → `@click="addFavorite(game, true)"`
5. **遊戲列表外層** 從 `<ul v-if="showGameList.length > 0" class="game-row"> <li v-for="game in showGameList" ...>` 改為：
```html
<q-virtual-scroll
  ref="virtualScrollRef"
  v-if="showGameList.length > 0"
  :items="gameRows"
  :virtual-scroll-item-size="virtualRowHeight"
  :virtual-scroll-slice-size="virtualScrollSliceSize"
  :virtual-scroll-slice-ratio-before="virtualScrollSliceRatioBefore"
  :virtual-scroll-slice-ratio-after="virtualScrollSliceRatioAfter"
  :scroll-target="resolvedVirtualScrollTarget"
>
  <template #default="{ item: gameRow, index }">
    <ul :key="`game-row-${index}`" class="game-row">
      <li
        v-for="game in gameRow"
        :key="game.game_id"
        class="game-item"
        @mouseenter="handleGameHover(game.game_id)"
        @mouseleave="handleGameHoverLeave"
      >
        <!-- 原本 li 內所有內容保持不動 -->
      </li>
    </ul>
  </template>
</q-virtual-scroll>
```
6. **欄數**：若該版型 SCSS `grid-cols-6` (desktop) / `grid-cols-3` (mobile) 是預設值（4 版型大概率是；確認 `<style>` 內 `.game-row { grid-cols-6 ... @include phone-width { grid-cols-3 } }`），則直接用，**不需擴充 `useGameLobbyVirtualScroll`**。若不同（例如 4/2），停下來呼叫 user 決定要不要動 `useGameLobbyVirtualScroll` 接受 columns 參數（依 spec §8 風險條目）。

### Recipe C — `Cms/CmsHomeDetail.vue` 收藏邏輯替換

讀完現檔後：
- 移除 `useGame()` 解構中的 `addfavoriteGame / removefavoriteGame / getFavoriteGames` 及 `gameState.favoriteList` 讀取
- 移除 `onMounted` 內 `await getFavoriteGames()`（若有）
- 新增以下三段 import + setup：

```ts
import { useProviderFavoriteActions, favoriteIdsToMap, isProviderGameFavorited } from "src/common/composables/useProviderFavorites"
import { useProviderFavoriteList } from "src/common/composables/useProviderQueries"
import { computed } from "vue"
import type * as Response from "src/api/response.type"

const favoriteListQuery = useProviderFavoriteList()
const favoriteMap = computed(() => favoriteIdsToMap(favoriteListQuery.data.value ?? []))
const { addFavorite, removeFavorite } = useProviderFavoriteActions()
const isGameFavorited = (game: Response.GameItem) => isProviderGameFavorited(game.game_id, favoriteMap.value)
```

Template 改動：
- `addfavoriteGame(entrance.payload as Response.GameItem, true)` → `addFavorite(entrance.payload as Response.GameItem, true)`
- `removefavoriteGame(entrance.payload as Response.GameItem, true)` → `removeFavorite(entrance.payload as Response.GameItem, true)`
- 顯示收藏狀態若原本用 `(entrance.payload as Response.GameItem).is_favorite` 或 `gameState.favoriteList.includes(...)`，改用 `isGameFavorited(entrance.payload as Response.GameItem)`。

---

## Verification Recipes

### V1 — git diff check（每個 template task 結尾）

```bash
git --no-pager diff --check
```
Expected: 無 whitespace 警告。

```bash
grep -nE "useGameKeyword|gameState\.|productState\.|addfavoriteGame|removefavoriteGame|getFavoriteGames|game\.is_favorite|getGameList\(|getProductList\(|integrationId" template/<SITE_KEY>/pages/GameLobby.vue template/<SITE_KEY>/pages/ProductLobby.vue template/<SITE_KEY>/pages/Cms/CmsHomeDetail.vue
```
Expected: 無命中（CmsHomeDetail 內若有 `gameState.` 但非 favorite/list 相關語意 — 例如 `gameState.using` 等，留下並在 commit message 註明跳過）。

### V2 — `yarn dev` + Chrome 擴充行為驗證（每個 template task 結尾）

```bash
# 先確認 dev server 正在跑（若沒跑開新 terminal）：
yarn dev
```

在 Chrome 擴充打開該版型 `GameLobby` 路由（例如 `http://localhost:8080/<sitekey-dev-url>/gameLobby/1/1006`，實際 URL 依該版型 dev host）。需驗：
- [ ] Network tab：進入後**只看到 1 次** `/platform/v1/player/product?game_type_id=1`、**1 次** `/platform/v1/player/product/game?game_type_id=1`，登入時加 1 次 `/platform/v1/player/game/favorite/list`。
- [ ] 切 provider（下拉選單）：不再有新的 `product/game` 請求；URL 的 `productCode` 同步更新。
- [ ] 切 search type（All / Hot / New / Favorite）：不再有新的 `product/game` 請求；列表正確篩選。
- [ ] 搜尋輸入字串：~500ms 後篩選；清空輸入立即還原全列表。
- [ ] 未登入點 Favorite tab：跳 login 彈窗；取消後 tab 回 All。
- [ ] 點愛心：icon 立即翻轉；網路關掉後重點愛心，失敗會回滾。
- [ ] 重新整理 URL 帶 `productCode=1006`：依然停留在該 provider（route 優先）。
- [ ] 視覺對比：mobile / desktop 與 `git stash` 暫存前的截圖比，layout / spacing / 字級 / icon 對齊不變。
- [ ] 登出：再進 GameLobby 不打 favorite/list；games / products 不重打（cache 保留）。

---

## Tasks

### Task 0: Branch setup

**Files:**
- 無；建立分支。

**Interfaces:**
- Consumes: 無
- Produces: 工作分支 `refactor/provider-lobby-vue-query-rollout-phase-1`，供 Task 1-5 在其上提交。

- [ ] **Step 1: 拉 main 最新**

```bash
git checkout main
git pull --ff-only origin main
```
Expected: working tree clean, on main.

- [ ] **Step 2: 開 phase-1 分支**

```bash
git checkout -b refactor/provider-lobby-vue-query-rollout-phase-1
```
Expected: switched to new branch.

- [ ] **Step 3: 確認 dev server 可起**

```bash
yarn install
```
然後另開一個 terminal：
```bash
yarn dev
```
Expected: Quasar dev server 起得來、無 build error；任一版型 dev URL 可載入。
若 build error，**先停止本 plan，回報 user**。

- [ ] **Step 4: 記錄基線**

不提交檔案，但在繼續前用 Chrome 擴充開 set_r017 / set_r027 / set_r030 / set_r033 各自的 GameLobby + ProductLobby dev URL，網路 throttling 設 Slow 3G，截兩張圖（mobile / desktop）暫存到 `/tmp/phase-1-baseline/<SITE_KEY>-<page>-<mobile|desktop>.png`。後續 Task 1-4 收尾的視覺比對需要它。

---

### Task 1: set_r017

**Files:**
- Modify: `template/set_r017/pages/GameLobby.vue`
- Modify: `template/set_r017/pages/ProductLobby.vue`
- Modify: `template/set_r017/pages/Cms/CmsHomeDetail.vue`

**Interfaces:**
- Consumes: `src/common/composables/useProviderLobby.ts` 的 `useProviderProductsLobby(gameTypeId)` / `useProviderGameLobby(router, gameTypeId, { routeProductCode })`；`useProviderFavorites.ts` 的 `useProviderFavoriteActions / favoriteIdsToMap / isProviderGameFavorited`；`useProviderQueries.ts` 的 `useProviderFavoriteList`；`useGameLobbyVirtualScroll.ts` 的 `useGameLobbyVirtualScroll`；`useProviderLobbyRouteGuards.ts` 的 `useProductLobbyRouteGuard / useGameLobbyRouteGuard`。
- Produces: set_r017 在 GameLobby / ProductLobby / CmsHomeDetail 上消費共用 composable，下一個 task 用同樣 pattern 處理 set_r027。

- [ ] **Step 1: 讀現檔**

讀完 `template/set_r017/pages/ProductLobby.vue`、`template/set_r017/pages/GameLobby.vue`、`template/set_r017/pages/Cms/CmsHomeDetail.vue`，並比對 `template/set_r031/pages/ProductLobby.vue`、`template/set_r031/pages/GameLobby.vue` 作為「期望結果」對照。

- [ ] **Step 2: 替換 `ProductLobby.vue`**

依 **Recipe A**，`<SITE_KEY>` = `set_r017`。
注意：保留 set_r017 自己 `GameBanner` / `GameTab` / `RankBoard`（如有）/ `useSiteImg` 的 `app/template/set_r017/...` import 路徑不動，只動 script 內的邏輯與 composable import；template 內把 `productState.list` 改為 `productList`，`getProductSquareImage` 內若有 `siteKey: "set_r017"` 保留不變。

- [ ] **Step 3: 替換 `GameLobby.vue`**

依 **Recipe B**，`<SITE_KEY>` = `set_r017`。
- 在 `<style scoped>` 確認 `.game-row` 是 `grid-cols-6` + phone `grid-cols-3`。若是 → 直接套；若不是 → 停下回報 user。
- Template 內所有 `'set_r031'` 字串（若有殘留）改回 `'set_r017'`。
- markup 內非「Recipe B 列出的 6 個改動點」部位不要動。

- [ ] **Step 4: 替換 `Cms/CmsHomeDetail.vue`**

依 **Recipe C**。
- 不刪該檔案內其他與 favorite 無關的邏輯（如 banner / link entrance 處理）。
- 若該檔案沒在用 `addfavoriteGame / removefavoriteGame / getFavoriteGames`，跳過本 step，並在 commit message 標 `set_r017 cms: no favorite usage, skipped`。

- [ ] **Step 5: 跑 V1 grep / diff 檢查**

```bash
git --no-pager diff --check
grep -nE "useGameKeyword|gameState\.|productState\.|addfavoriteGame|removefavoriteGame|getFavoriteGames|game\.is_favorite|getGameList\(|getProductList\(|integrationId" template/set_r017/pages/GameLobby.vue template/set_r017/pages/ProductLobby.vue template/set_r017/pages/Cms/CmsHomeDetail.vue
```
Expected: diff --check 無警告；grep 無命中（CmsHomeDetail 若殘留非 favorite 語意的 `gameState.` 例外時，記入 commit message）。

- [ ] **Step 6: 跑 V2 瀏覽器行為驗證**

依 **Verification Recipe V2** 走過 10 項手動驗證。任何一項不通過就回到對應檔案修正再驗。

- [ ] **Step 7: Commit**

```bash
git add template/set_r017/pages/GameLobby.vue template/set_r017/pages/ProductLobby.vue template/set_r017/pages/Cms/CmsHomeDetail.vue
git commit -m "refactor(set_r017): adopt provider lobby vue-query composables

- ProductLobby: useProviderProductsLobby + useProductLobbyRouteGuard
- GameLobby: useProviderGameLobby + useGameLobbyVirtualScroll + useGameLobbyRouteGuard
- Cms/CmsHomeDetail: useProviderFavoriteActions + useProviderFavoriteList"
```

---

### Task 2: set_r027

**Files:**
- Modify: `template/set_r027/pages/GameLobby.vue`
- Modify: `template/set_r027/pages/ProductLobby.vue`
- Modify: `template/set_r027/pages/Cms/CmsHomeDetail.vue`

**Interfaces:**
- Consumes: 同 Task 1。
- Produces: set_r027 完成。

- [ ] **Step 1: 讀現檔**

讀完 `template/set_r027/pages/ProductLobby.vue`、`template/set_r027/pages/GameLobby.vue`、`template/set_r027/pages/Cms/CmsHomeDetail.vue`。

- [ ] **Step 2: 替換 `ProductLobby.vue`**

依 **Recipe A**，`<SITE_KEY>` = `set_r027`。保留 set_r027 自己 component import 路徑。

- [ ] **Step 3: 替換 `GameLobby.vue`**

依 **Recipe B**，`<SITE_KEY>` = `set_r027`。
- 確認 `.game-row` 欄數為 6/3；若不是停下回報。
- markup 內 `set_r031` 殘留字串改 `set_r027`（若有）。

- [ ] **Step 4: 替換 `Cms/CmsHomeDetail.vue`**

依 **Recipe C**。

- [ ] **Step 5: V1 grep / diff 檢查**

```bash
git --no-pager diff --check
grep -nE "useGameKeyword|gameState\.|productState\.|addfavoriteGame|removefavoriteGame|getFavoriteGames|game\.is_favorite|getGameList\(|getProductList\(|integrationId" template/set_r027/pages/GameLobby.vue template/set_r027/pages/ProductLobby.vue template/set_r027/pages/Cms/CmsHomeDetail.vue
```
Expected: 同 Task 1 Step 5。

- [ ] **Step 6: V2 瀏覽器行為驗證**

依 **Verification Recipe V2** 走 10 項驗收。

- [ ] **Step 7: Commit**

```bash
git add template/set_r027/pages/GameLobby.vue template/set_r027/pages/ProductLobby.vue template/set_r027/pages/Cms/CmsHomeDetail.vue
git commit -m "refactor(set_r027): adopt provider lobby vue-query composables

- ProductLobby: useProviderProductsLobby + useProductLobbyRouteGuard
- GameLobby: useProviderGameLobby + useGameLobbyVirtualScroll + useGameLobbyRouteGuard
- Cms/CmsHomeDetail: useProviderFavoriteActions + useProviderFavoriteList"
```

---

### Task 3: set_r030

**Files:**
- Modify: `template/set_r030/pages/GameLobby.vue`
- Modify: `template/set_r030/pages/ProductLobby.vue`
- Modify: `template/set_r030/pages/Cms/CmsHomeDetail.vue`

**Interfaces:**
- Consumes: 同 Task 1。
- Produces: set_r030 完成。

- [ ] **Step 1: 讀現檔**

讀完 `template/set_r030/pages/ProductLobby.vue`、`template/set_r030/pages/GameLobby.vue`、`template/set_r030/pages/Cms/CmsHomeDetail.vue`。

- [ ] **Step 2: 替換 `ProductLobby.vue`**

依 **Recipe A**，`<SITE_KEY>` = `set_r030`。

- [ ] **Step 3: 替換 `GameLobby.vue`**

依 **Recipe B**，`<SITE_KEY>` = `set_r030`。確認欄數 6/3。

- [ ] **Step 4: 替換 `Cms/CmsHomeDetail.vue`**

依 **Recipe C**。

- [ ] **Step 5: V1 檢查**

```bash
git --no-pager diff --check
grep -nE "useGameKeyword|gameState\.|productState\.|addfavoriteGame|removefavoriteGame|getFavoriteGames|game\.is_favorite|getGameList\(|getProductList\(|integrationId" template/set_r030/pages/GameLobby.vue template/set_r030/pages/ProductLobby.vue template/set_r030/pages/Cms/CmsHomeDetail.vue
```

- [ ] **Step 6: V2 驗證**

依 **Verification Recipe V2**。

- [ ] **Step 7: Commit**

```bash
git add template/set_r030/pages/GameLobby.vue template/set_r030/pages/ProductLobby.vue template/set_r030/pages/Cms/CmsHomeDetail.vue
git commit -m "refactor(set_r030): adopt provider lobby vue-query composables

- ProductLobby: useProviderProductsLobby + useProductLobbyRouteGuard
- GameLobby: useProviderGameLobby + useGameLobbyVirtualScroll + useGameLobbyRouteGuard
- Cms/CmsHomeDetail: useProviderFavoriteActions + useProviderFavoriteList"
```

---

### Task 4: set_r033

**Files:**
- Modify: `template/set_r033/pages/GameLobby.vue`
- Modify: `template/set_r033/pages/ProductLobby.vue`
- Modify: `template/set_r033/pages/Cms/CmsHomeDetail.vue`

**Interfaces:**
- Consumes: 同 Task 1。
- Produces: set_r033 完成；Phase 1 4 個版型全部 migrate 完。

- [ ] **Step 1: 讀現檔**

讀完 `template/set_r033/pages/ProductLobby.vue`、`template/set_r033/pages/GameLobby.vue`、`template/set_r033/pages/Cms/CmsHomeDetail.vue`。

- [ ] **Step 2: 替換 `ProductLobby.vue`**

依 **Recipe A**，`<SITE_KEY>` = `set_r033`。

- [ ] **Step 3: 替換 `GameLobby.vue`**

依 **Recipe B**，`<SITE_KEY>` = `set_r033`。確認欄數 6/3。

- [ ] **Step 4: 替換 `Cms/CmsHomeDetail.vue`**

依 **Recipe C**。

- [ ] **Step 5: V1 檢查**

```bash
git --no-pager diff --check
grep -nE "useGameKeyword|gameState\.|productState\.|addfavoriteGame|removefavoriteGame|getFavoriteGames|game\.is_favorite|getGameList\(|getProductList\(|integrationId" template/set_r033/pages/GameLobby.vue template/set_r033/pages/ProductLobby.vue template/set_r033/pages/Cms/CmsHomeDetail.vue
```

- [ ] **Step 6: V2 驗證**

依 **Verification Recipe V2**。

- [ ] **Step 7: Commit**

```bash
git add template/set_r033/pages/GameLobby.vue template/set_r033/pages/ProductLobby.vue template/set_r033/pages/Cms/CmsHomeDetail.vue
git commit -m "refactor(set_r033): adopt provider lobby vue-query composables

- ProductLobby: useProviderProductsLobby + useProductLobbyRouteGuard
- GameLobby: useProviderGameLobby + useGameLobbyVirtualScroll + useGameLobbyRouteGuard
- Cms/CmsHomeDetail: useProviderFavoriteActions + useProviderFavoriteList"
```

---

### Task 5: Phase 1 final smoke + push

**Files:** 無。

**Interfaces:**
- Consumes: Task 1-4 的 4 個 commit。
- Produces: GitLab MR 連結，貼給 user 決定何時 open。

- [ ] **Step 1: 全 phase grep**

```bash
grep -rnE "useGameKeyword|addfavoriteGame|removefavoriteGame|getFavoriteGames|game\.is_favorite|getGameList\(|getProductList\(" template/set_r017 template/set_r027 template/set_r030 template/set_r033
```
Expected: 無命中（若 CmsHomeDetail 內因 entrance 結構需保留 `is_favorite` 讀取以外的引用，視內容判斷；非 lobby/favorite 流程的可以保留並在 push 描述註記）。

- [ ] **Step 2: 共用 infra 未動確認**

```bash
git --no-pager diff main -- src/common/composables/useProviderQueries.ts src/common/composables/useProviderLobby.ts src/common/composables/useProviderFavorites.ts src/common/composables/useGameLobbyVirtualScroll.ts src/common/hooks/useProviderLobbyRouteGuards.ts src/common/hooks/useAuth.ts
```
Expected: 空 diff。若非空，stop 並回報 user。

- [ ] **Step 3: 4 版型橫掃驗證**

在 dev 環境依次走完 4 個版型的 GameLobby + ProductLobby + 主要 CmsHomeDetail 觸發點：
- [ ] set_r017：V2 10 項驗收 + Cms 收藏點擊
- [ ] set_r027：V2 10 項驗收 + Cms 收藏點擊
- [ ] set_r030：V2 10 項驗收 + Cms 收藏點擊
- [ ] set_r033：V2 10 項驗收 + Cms 收藏點擊

- [ ] **Step 4: Push**

```bash
git push -u origin refactor/provider-lobby-vue-query-rollout-phase-1
```
Expected: GitLab 回傳一個 MR 建立連結（不執行該連結；複製給 user）。

- [ ] **Step 5: 把連結貼給 user**

回到對話貼出 MR 建立連結，並列出 4 個 commit hash 與 phase 1 acceptance 勾選結果（spec §6）。不要主動 `glab mr create`。

---

## Self-Review notes（已內化，不需執行）

- Spec coverage：
  - Spec §3 共用 infra 盤點 → Recipes A/B/C 完整消費。
  - Spec §4 Phase 1 範圍 → Task 1-4 對應 4 版型。
  - Spec §5.1 ProductLobby 替換 → Recipe A。
  - Spec §5.2 GameLobby 替換 → Recipe B + Template 6 改動點。
  - Spec §5.3 CmsHomeDetail → Recipe C。
  - Spec §6 Acceptance Criteria → V1 + V2 + Task 5 Step 1-3。
  - Spec §8 風險 (欄數差異) → Recipe B Step 6 + 各 Task Step 3 確認欄數，不同時停下回報。
- Placeholder scan：無 TBD / TODO。
- Type consistency：`useProviderGameLobby` 回傳的 destructure key 與 set_r031 commit 中相符；`useGameLobbyVirtualScroll` 回傳 key 同。
