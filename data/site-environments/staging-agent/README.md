# GSI Staging 代理站 (Dashboard) environment.json

抓取時間: 2026-06-22

代理站 = `agent-*.gsiwl.com`（會員端對應的 Dashboard 後台）。對照 [memory:wow-gsi-side-terminology] — 會員端=Multiverse, 代理端=Dashboard。

## 結果

- 提供清單共 100 個 agent URL
- 成功抓到：**85 個**站點 → 個別檔案 `<code>.json`（檔名已去除 `agent-` 前綴）
- 合併檔案：[all-staging-agent-environments.json](all-staging-agent-environments.json)

## environment.json 結構（與會員端不同）

```json
{
  "mode": "agent",
  "baseApi": "https://api-stagingagent.gsiwl.com",
  "staticResourceUrl": "/statics/staging",
  "dynamicResourceUrl": "https://wowdata.gpsriowdl.com/gsi/staging/SITS",
  "apiPath": "/v1/agent",
  "version": "1.0.0"
}
```

差異重點：

| 欄位 | 會員端 (player) | 代理端 (agent) |
|------|----------------|---------------|
| `mode` | （無） | `"agent"` |
| `apiPath` | `/v1/player` | `/v1/agent` |
| `siteKey` | 有，每站不同 | **無** |
| `agentCode` | 有 | **無** |

代理端因為沒有 `siteKey` / `agentCode`，無法從 environment.json 識別站點身份 — 那是由前端讀 URL/路由決定的。

## baseApi 分布

| baseApi | 站數 |
|---------|------|
| `https://api-stagingagent.gsiwl.com` | 38 |
| `https://api-gogm.gsiwl.com` | 5 |
| `https://api-anib.gsiwl.com` | 2 |
| `https://api-argm.gsiwl.com` | 2 |
| 其他每站獨立 `api-<code>.gsiwl.com` | 38 |
| 共 | 85（42 種 baseApi） |

代理端有共用的中心 baseApi (`api-stagingagent`) 比例比會員端高（38 vs 28）。

## 未抓到的站點（與會員端完全一致）

### DNS 不存在 (2)
- `agent-r281.gsiwl.com` (R028 / set_r028)
- `agent-ice1.gsiwl.com` (R001 / set_obtd)

### `/environment.json` 回 404 (13)
agent- 系列：`w001 w002 f003 w004 w005 f006 w007 w008 w009 g001 f011 w012 f013`

### 已停用，從清單剔除
- `bo.auroragaming.vip` (2026/5/13 移除)

## 重新抓取單站

```bash
cd /Users/kenyu/wow/ai-config/data/site-environments/staging-agent
curl -s https://agent-obtd.gsiwl.com/environment.json -o obtd.json
```
