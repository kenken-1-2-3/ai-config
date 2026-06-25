# GSI Multiverse Staging 站點 environment.json

抓取時間: 2026-06-22

## 結果

- 提供清單共 101 個 player URL（含多 URL 列）
- 成功抓到：**86 個**站點 → 個別檔案 `<host-first-label>.json`
- 合併檔案：[all-staging-environments.json](all-staging-environments.json)（key 為大寫 host first-label）

## 未抓到的站點

### DNS 不存在（2 個）

| URL | 備註 |
|-----|------|
| https://r281.gsiwl.com | `set_r028` / R028 — 在 dev 環境有，staging 未上線 |
| https://ice1.gsiwl.com | `set_obtd` / R001 — 尚未上線 |

### `/environment.json` 回 404（13 個，可能尚未發布）

w001, w002, f003, w004, w005, f006, w007, w008, w009, g001, f011, w012, f013

這批的根網站可達但缺少 `environment.json` route。

### 已標註停用（從清單剔除）

- https://bo.auroragaming.vip / https://auroragaming.vip（2026/5/13 移除）

## 與 dev 環境的差異

| 項目 | dev | staging |
|------|-----|---------|
| `baseApi` | 全部共用 `https://api-devm-dev.gsiwl.com` | 大致 3 群：`api-stagingagent.gsiwl.com` (28)、`api-sits.gsiwl.com` (11)、其餘每站獨立的 `api-<code>.gsiwl.com` |
| `dynamicResourceUrl` | `.../gsi/dev/devm` | 大多 `https://wowdata.gpsriowdl.com/gsi/staging/SITS`，少數每站獨立 |
| `apiPath` / `staticResourceUrl` | 一致 | 一致 |

## 多 URL 的站點

| 同 environment 但有多個 player URL |
|------------------------------------|
| `aggx.gsiwl.com` ＋ `aggx.csg333slup.com` — 內容完全一致（已驗證），只存一份 `aggx.json` |
| `r017` 在 staging 有 `r171.gsiwl.com`（agentCode `R171`）、`r017.gsiwl.com`（agentCode `R017`）、`demo1.playsoft88.com`（`R017`） — 是不同 agent，各自有檔 |
| `gsi1/2/3`、`demo2.playsoft88.com` 等 set_obtd 系列 — 各站有獨立檔 |

## 重新抓取單一站

```bash
cd /Users/kenyu/wow/ai-config/data/site-environments/staging
curl -s https://obtd.gsiwl.com/environment.json -o obtd.json
```

## 完整對照表（成功 86 個）

依 baseApi 群組分類，存於 [all-staging-environments.json](all-staging-environments.json)。
每筆結構：

```json
{
  "OBTD": {
    "siteUrls": ["https://obtd.gsiwl.com"],
    "environment": {
      "baseApi": "https://api-stagingagent.gsiwl.com",
      "apiPath": "/v1/player",
      "version": "1.0.0",
      "siteKey": "okbet",
      "staticResourceUrl": "/statics/staging",
      "dynamicResourceUrl": "https://wowdata.gpsriowdl.com/gsi/staging/SITS",
      "agentCode": "OBTD"
    }
  }
}
```
