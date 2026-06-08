---
name: multiverse-cms-navigation
description: 在 Whitelabel_GSI_Platform_Multiverse 中，當使用者提到 CMS 入口 active 判斷、FooterNav isActive、menu active 誤點亮、CMS sidebar active、footerNav cms ref、h5BottomMenuList、RouterNameMapping 或 createDidRouteResolver 時使用。
---

# Multiverse CMS Navigation

當任務涉及 CMS 選單 active 狀態、FooterNav 資料來源或 DID-to-route mapping 時使用。這個 surface 反覆出現同類型 bug；先讀 invariants，再改 code。

## 先讀的 truth sources

- `src/common/composables/useCms.ts`：`isCmsEntranceActive()` 是 active 判斷的唯一 source of truth。
- `template/<siteKey>/utils/constants/menu.ts`（或 `constants.ts`）：`MENU.RouterNameMapping` — DID 到 route name 的映射表。
- `template/<siteKey>/components/Footer/FooterNav.vue`：h5 底部選單入口；每個 template 的 data source 可能不同。
- `template/<siteKey>/components/Header/Index.vue`、`AsideMenu.vue`：desktop 選單的 active 判斷使用相同 `isCmsEntranceActive` + `createDidRouteResolver` 模式。

## Active 判斷的正確模式

每個需要 active 判斷的 CMS 選單元件，都必須同時具備以下三個：

```ts
import { createDidRouteResolver, isCmsEntranceActive } from "src/common/composables/useCms"
import type * as Response from "src/api/response.type"
import { MENU } from "../../utils/constants"

const route = useRoute()
const resolveCmsRouteByDid = createDidRouteResolver(MENU.RouterNameMapping)

const isActive = (entrance: Response.CmsEntranceItem) => {
  return isCmsEntranceActive(entrance, route, resolveCmsRouteByDid)
}
```

**缺少任何一個都會導致 active 誤判。**

## `isCmsEntranceActive` 的判斷優先順序

1. `payload.link_id` + `routeName === "CmsCustomPage"` → match `cmsCustomPageId` param
2. `payload.link_id` + `routeName === "CmsHome"` → match `cmsId` param
3. `payload.did` 有對應的 `RouterNameMapping` → 直接比對 route name（**優先於 game_type**，避免非遊戲入口的 game_type 殘留誤點亮）
4. `entranceType` 為 `GAME_LINK` 或 `CATEGORY_LOBBY` 才使用 `game_type` 比對；ProductLobby 路由無 `productCode` 時只比 `game_type`

## FooterNav 的正確資料來源

h5 底部選單必須使用 `useCms()` 提供的 `h5BottomMenuList`，**不是** `useH5MenuListCms()` 的 `h5MenuList`：

```ts
// 正確
import { useCms } from "src/common/composables/useCms"
const { h5BottomMenuList } = useCms()

// 錯誤（已棄用的 hook，icon/active 資料不完整）
import { useH5MenuListCms } from "src/common/apiHooks/cms/useH5MenuListCms"
const { h5MenuList } = useH5MenuListCms()
```

## RouterNameMapping 維護規則

- `template/<siteKey>/utils/constants/menu.ts` 的 `RouterNameMapping` 必須包含該 template 所有會被 CMS DID 對應到的 route name。
- 新增頁面後，若該頁面會出現在 CMS 選單，必須同步更新 `RouterNameMapping`。
- DID 對不到 route name（`undefined`）時，`isCmsEntranceActive` 會往下 fallback 到 `game_type` 判斷，可能造成非遊戲入口被誤點亮。

## 常見 bug 類型

| Bug 症狀 | Root cause |
|----------|-----------|
| 特定入口永遠不 active | `RouterNameMapping` 缺少對應 DID |
| 非遊戲入口點亮了遊戲頁 | `payload.did` 沒有 mapping，fallback 到 `game_type` |
| ProductLobby 分類層級入口顯示 inactive | `product_code` 比對邏輯誤判（有 `product_code` payload 但 route 無 `productCode` param）|
| FooterNav icon 不切換 / selected_icon 不顯示 | 使用 `h5MenuList` 而非 `h5BottomMenuList`，缺少 `Setting.selected_icon_path` |
| 所有入口同時 active | `isActive` 未傳入 `resolveCmsRouteByDid`，第三個參數缺失 |

## 流程

1. 確認 bug 出現在哪個 surface（FooterNav / Header / AsideMenu / MobileNav）與哪個 template。
2. 讀該 template 的元件，確認三件事：資料來源是否 `h5BottomMenuList`、`isActive` 是否有正確的三個參數、`RouterNameMapping` 是否覆蓋了問題 DID。
3. 比對同 family 的其他 template 的對應元件，確認是否共用同一個問題。
4. 只修有問題的 template；已正確的不動。
5. 回報：修了什麼、RouterNameMapping 有無新增 entry、其他 templates 是否也受影響。
