# Spec: GSI-84 GSI Pay 前端整合與分支協作

> 交接合約：本 spec 管理 GSI-85／86／87 的共用前端基礎、整合順序與 Git Flow；各頁功能仍以各自 spec 為驗收依據。
>
> 正式位置：`~/wow/ai-config/specs/Whitelabel_GSI_Dashboard/gsi-84-gsi-pay-integration.md`

## 需求來源

- 父需求：[GSI-84](https://gamingsoft.atlassian.net/browse/GSI-84)「新增 GSI Pay 為預設金流」。
- 本批次子需求：
  - [GSI-85](https://gamingsoft.atlassian.net/browse/GSI-85)「GSI Pay 帳戶費率」。
  - [GSI-86](https://gamingsoft.atlassian.net/browse/GSI-86)「GSI Pay 計費中心」。
  - [GSI-87](https://gamingsoft.atlassian.net/browse/GSI-87)「GSI Pay 交易報表」。
- 子需求 specs：
  - `gsi-85-gsi-pay-account-rate.md`
  - `gsi-86-gsi-pay-billing-center.md`
  - `gsi-87-gsi-pay-transaction-report.md`
- 端別：代理端 `Whitelabel_GSI_Dashboard`。

## 背景 / 目標

GSI-85／86／87 是同一 GSI Pay domain 下的三個 CashFlow sibling pages，會共同修改 route、API domain、central contracts、constants、permissions、timezone rules與export infrastructure。若三張票各自從`main`平行實作，容易重複建立modules或在central files發生互相覆蓋。

本 spec 採「一張做完再做下一張」：建立 `feat/gsi-pay` 作整合父分支，各 Jira 在獨立 flat child branch 實作、review並經使用者批准後merge回父分支。父分支最後統一推進到dev／staging／production。

## 範圍

- 定義 GSI-85／86／87 的父整合分支、child branches與開發順序。
- 定義shared frontend surfaces的單一owner／additive extension規則。
- 記錄目前GSI-85 UI-first commit的安全處理方式。
- 定義child → parent與parent → environment branches的merge gates。
- 確保Git父分支與UI route hierarchy不混為一談。
- 提供三張需求整合後的cross-feature驗收與安全檢查。

## 分支拓撲與順序

```text
main
└── feat/gsi-pay                         # GSI-84 整合父分支
    ├── feat/gsi-pay-account-rate        # GSI-85（已存在）
    ├── feat/gsi-pay-billing-center      # GSI-86（85 整合後才建立）
    └── feat/gsi-pay-transaction-report  # GSI-87（86 整合後才建立）
```

- `feat/gsi-pay`已於2026-07-15由最新`main`建立，目前與`main`同commit。
- Child branches採flat names。不可改成`feat/gsi-pay/...`，因Git不能同時保存`feat/gsi-pay`與同前綴子ref。
- 一次只進行一張ticket-specific實作：GSI-85 → GSI-86 → GSI-87。
- 每張child必須先完成其spec驗收與獨立review，再取得使用者對該次merge的明確批准，才能merge回父分支。
- 下一張child只從「包含前一張已批准整合結果」的`feat/gsi-pay`建立，不從sibling branch建立，也不rebase／cherry-pick前一張commit。

## GSI-85 現況與處理方式

- 現有branch：`feat/gsi-pay-account-rate`，沒有upstream，遠端沒有同名branch。
- 現有唯一commit：`55652a80 feat: 新增 GSI Pay 帳戶費率頁面（UI-first）`。
- 該commit直接基於建立父分支時的同一`main`，沒有分叉；保留原branch、branch name與commit hash，不rebase、不cherry-pick、不force-push。
- Commit內容是GSI-85 feature-local UI、route、placeholder data／types；未包含正式API、central contracts、permission IDs、time rules或i18n，不能視為GSI-85完整完成。
- 在使用者批准merge前，`55652a80`只留在GSI-85 child；父分支不自行fast-forward。
- 若使用者先批准把UI-first phase整合進父分支，可用fast-forward merge完整保留commit；之後GSI-85後續commit仍在原child完成並逐次批准merge。若未批准，則先在child完成GSI-85全部scope再一次整合。

## 共用前端基礎

以下surfaces可共用，但只在正式contract確認後建立：

- `src/api/gsiPay.ts`：同一domain module，GSI-85／86／87各自新增semantic wrappers；不建立三個重複API modules。
- `src/api/request.type.ts`、`src/api/response.type.ts`：同一GSI Pay區段additive保存wallet、billing、report contracts。
- `src/utils/constants/gsiPay.ts`與constants index：enabled currencies、business types、order types、withdrawal statuses等正式enums。
- `src/utils/constants/permission.ts`：每頁View／Export與GSI-85 Buy／Withdraw正式IDs；不同action不共用猜測ID。
- `src/utils/timeFieldRules.ts`、`useRfc3339()`：站點時區、今日、1日／31日date range與endpoint fields。
- `useSearch()`、shared query／pagination、`useExport()`或blob export pattern：只共用既有infra，不改shared behavior。
- 金額／幣別formatter、GSI單號顯示規則、Ultrapay第三方單號只留typed response的安全規則。

共用限制：

- GSI-85 wallet account ledger、GSI-86 billing points ledger、GSI-87 report rows／summaries是不同DTO，不得為了共用合併成一個巨型row type。
- GSI-87 aggregates由backend report endpoints產生，不從GSI-86 UI list在frontend加總，也不取GSI-85目前費率回算歷史。
- Shared UI component只有在至少兩頁contract與interaction真正相同時才抽取；否則維持feature-local，避免提早抽象。
- Central type merge conflict必須保留三張票的additive exports，除非使用者明確要求移除。

## UI Information Architecture

- Git父整合分支不等於UI parent route。
- 本批次三頁維持既有`/CashFlow`下的sibling entries：
  - `/CashFlow/GSIPayAccountRate/`
  - `/CashFlow/GSIPayBillingCenter/`
  - `/CashFlow/GSIPayTransactionReport/`
- 不新增top-level「GSI Pay管理中心」route、不修改`/CashFlow` redirect或其他CashFlow pages。
- 若產品日後要新增UI parent，先同步更新四份spec並另立獨立需求，不能由任一child順手修改shared navigation。

## 跨站與安全影響

- GSI-84是全站點共用功能，不做單一siteKey hardcode。
- 每站只讀取自己的enabled currencies、wallet、ledger與report data；不可跨站快取或套用預設資料。
- GSI Pay與Ultrapay可共存，provider設定、transactions與單號不可互相覆蓋。
- UI只顯示GSI單號；Ultrapay reference只留在typed Network response供排查，不render到UI／DOM／export／logs。
- Jira中任何live-looking credentials不得進frontend、spec、fixture、console或client response；若仍有效由owner輪替。

## Out of scope

- 本spec不取代GSI-85／86／87各自功能與驗收spec。
- 不在父分支直接實作任一頁的ticket-specific code。
- 不納入GSI-88 Telegram Bot／backend workflow；Dashboard若日後有獨立GSI-88 scope，另寫spec與分支。
- 不新增UI top-level GSI Pay parent。
- 不重構shared query／table／permission／menu architecture。
- 不修改會員端、Ultrapay既有流程或`src/assets/env/environment.json`。
- 不自行commit、merge、push、開MR／PR或推進環境branch。

## 受影響範圍

- Git branches：`feat/gsi-pay`及三張flat child branches。
- `src/router/routes.ts`
- `src/pages/CashFlow/GSIPayAccountRate/**`
- `src/pages/CashFlow/GSIPayBillingCenter/**`
- `src/pages/CashFlow/GSIPayTransactionReport/**`
- `src/api/gsiPay.ts`
- `src/api/request.type.ts`、`src/api/response.type.ts`
- `src/utils/constants/gsiPay.ts`、`src/utils/constants/index.ts`
- `src/utils/constants/permission.ts`
- `src/utils/timeFieldRules.ts`
- Remote i18n system（不建立local locale files）

## 參考實作 / 要遵循的現有 pattern

- CashFlow route branch：`src/router/routes.ts`。
- 目前GSI-85 UI-first branch：`feat/gsi-pay-account-rate`、commit`55652a80`。
- GSI-85／86／87各自spec與`GSI_Pay_管理中心_v7_11.html`。
- Query／pagination：`src/components/query/common.vue`、`src/components/query/pagination.vue`、`src/hook/useSearch.ts`。
- Export：`src/hook/useExport.ts`、既有report blob／job patterns。
- Timezone：`src/utils/timeFieldRules.ts`、`src/composables/useRfc3339.ts`。
- Permission：`src/hook/usePermission.ts`、`src/utils/constants/permission.ts`、route guard。

## 關鍵決策與理由

- 採父整合分支：三頁共享central files，集中整合可避免平行分支重複定義或互相覆蓋。
- 採flat child names：Git ref限制使`feat/gsi-pay`不能和`feat/gsi-pay/...`同時存在。
- 保留GSI-85 commit原貌：現有branch沒有分叉或upstream，不需要rebase／cherry-pick等歷史操作。
- 一次完成一張：先讓shared contract在已知consumer需求下演進，避免三頁同時猜API／types。
- 父分支不直接開發：確保每張Jira diff、review與驗收邊界清楚。
- 不提早抽shared UI：只共用穩定contract／infra，避免把不同財務語意硬塞進同一component。

## 驗收條件

- [ ] `feat/gsi-pay`由最新`main`建立，沒有ticket-specific direct commits。
- [ ] GSI-85現有`55652a80`與branch完整保留，未rebase／cherry-pick／force-push。
- [ ] 三張child使用本spec定義的flat branch names，沒有`feat/gsi-pay/...` ref衝突。
- [ ] 每張child只包含自身scope與必要additive shared foundation，沒有實作下一張需求。
- [ ] 每次child merge前皆有對該次merge的使用者明確批准與通過的spec review。
- [ ] 下一張child由包含前一張正式整合結果的父分支建立。
- [ ] 三頁在CashFlow下為sibling routes，未新增UI parent或改CashFlow redirect。
- [ ] Shared API／contracts／constants沒有重複modules，central exports保留三張additive contracts。
- [ ] Wallet ledger、billing ledger、report DTOs維持明確分離。
- [ ] GSI Pay／Ultrapay共存且無credentials、cross-site data或third-party reference洩漏。
- [ ] 三張child整合後完成route／build／permission／timezone／export cross-feature驗證。
- [ ] Parent推進develop／staging／main前每階段都有使用者批准與環境驗證結果。

## 邊界情況 / 例外

- 若child merge出現conflict，立即停止，不自行resolve或把parent merge回child；回報conflict files與雙方來源。
- 若新backend contract改變shared DTO，先更新受影響的所有spec，再修改code。
- 若GSI-85只完成UI-first但尚未達完整驗收，是否先整合該phase必須由使用者明確決定；不得默認部分完成等於ticket完成。
- 若某張需求被取消，父分支不得保留其placeholder route／data；移除仍需更新spec與取得commit／merge批准。
- 若父分支落後main，不自行merge main回父分支；依使用者確認的策略處理。

## 測試計畫

- 每張child依各自spec執行暫存tests、fixtures、focused lint／format、build與Chrome視覺驗證。
- 每次merge後在父分支執行：
  - `git --no-pager diff --check -- <integration diff files>`
  - Node 22專案build。
  - 三頁route可達性與permission matrix。
  - Shared API imports／central exports／time field rules編譯檢查。
  - GSI單號顯示、Ultrapay reference不render、credentials不存在。
- 不執行`tsc --noEmit`。
- 測試檔不可進commit；repo無現有runner時使用deterministic fixtures並明確回報限制。

## Git Flow

- `feat/gsi-pay`已從最新`main`建立。
- GSI-85使用現有`feat/gsi-pay-account-rate`；完成並經批准後merge回父分支。
- GSI-86從更新後父分支建立`feat/gsi-pay-billing-center`；完成並經批准後merge回父分支。
- GSI-87從再次更新後父分支建立`feat/gsi-pay-transaction-report`；完成並經批准後merge回父分支。
- 所有child完成後：`feat/gsi-pay` → `develop`（dev驗證）→ `staging`（staging驗證）→ `main`（production）。
- 每次commit、merge、push與MR／PR都需依repo規則取得相應使用者授權；不得沿用先前授權。
- Merge conflict停止回報，不自行resolve、rebase或改策略。

## 交接備註給實作者

- 開始任何child前先讀本spec及該Jira自己的spec。
- 確認parent包含哪些已批准功能，再建立下一張branch。
- Ticket-specific code只寫在child；shared changes需列出目前與未來consumers並保持additive。
- 若發現需求必須跨頁改shared UI／behavior，先更新相關spec與回報影響，不可順手擴scope。
- 完成後由另一context依child spec與本integration spec雙重review。
