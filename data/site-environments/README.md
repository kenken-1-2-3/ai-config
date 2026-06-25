# GSI Multiverse Dev 站點 environment.json

抓取時間: 2026-06-22

> - Staging 會員端 (Multiverse) environment 存於 [staging/](staging/README.md)（86 個）
> - Staging 代理端 (Dashboard, `agent-*`) environment 存於 [staging-agent/](staging-agent/README.md)（85 個）

每個站點的 `/environment.json` 都已下載：
- 個別檔案：`<code>.json`（檔名為小寫 agentCode）
- 合併檔案：`all-environments.json`（key 為大寫 agentCode）

所有站點共用：
- `baseApi`: `https://api-devm-dev.gsiwl.com`
- `apiPath`: `/v1/player`
- `staticResourceUrl`: `/statics/staging`
- `dynamicResourceUrl`: `https://wowdata.gsiwl.com/gsi/dev/devm`
- `version`: `1.0.0`（GSAI 例外，是 `v0.0.1`）

## 站點對照表

| Agent | URL | siteKey | version |
|-------|-----|---------|---------|
| DOBT | https://dobt-dev.gsiwl.com | okbet | 1.0.0 |
| GOGD | https://gogd-dev.gsiwl.com | okbet | 1.0.0 |
| BKGD | https://bkgd-dev.gsiwl.com | okbet_blackGold | 1.0.0 |
| FP1D | https://fp1d-dev.gsiwl.com | okbet_green | 1.0.0 |
| DOBR | https://dobr-dev.gsiwl.com | okbet_red | 1.0.0 |
| OBRB | https://obrb-dev.gsiwl.com | okbet_redBlack | 1.0.0 |
| DBOD | https://dbod-dev.gsiwl.com | set_DBO88 | 1.0.0 |
| ED03 | https://ed03-dev.gsiwl.com | set_ed3 | 1.0.0 |
| ED88 | https://ed88-dev.gsiwl.com | set_ed8888 | 1.0.0 |
| JKHD | https://jkhd-dev.gsiwl.com | set_jokerhill | 1.0.0 |
| R016 | https://r016-dev.gsiwl.com | set_r016 | 1.0.0 |
| GSAI | https://gsai-dev.gsiwl.com | set_r017 | v0.0.1 |
| R022 | https://r022-dev.gsiwl.com | set_r022 | 1.0.0 |
| R023 | https://r023-dev.gsiwl.com | set_r023 | 1.0.0 |
| R024 | https://r024-dev.gsiwl.com | set_r024 | 1.0.0 |
| R025 | https://r025-dev.gsiwl.com | set_r025 | 1.0.0 |
| RYSD | https://rysd-dev.gsiwl.com | set_royalslot88 | 1.0.0 |
| XGAD | https://xgad-dev.gsiwl.com | set_sjpn2 | 1.0.0 |
| D334 | https://d334-dev.gsiwl.com | set33_GREEN | 1.0.0 |
| SKD1 | https://skd1-dev.gsiwl.com | set33_RED | 1.0.0 |
| DJPN | https://djpn-dev.gsiwl.com | set_amuse | 1.0.0 |

## 與原始清單的差異

實際抓到的 `siteKey` 與你提供的對照有幾處不同：

| Agent | 你提供的 | 實際 environment.json |
|-------|---------|----------------------|
| DBOD | `set50` | `set_DBO88` |
| JKHD | `set_51(set_jokerhill)` | `set_jokerhill` |

GSAI 的 version 也是唯一不是 `1.0.0` 的（`v0.0.1`），可能是部署版本還沒更新。

## 重新抓取

```bash
cd /Users/kenyu/wow/ai-config/data/site-environments
# 重新抓單一站點
curl -s https://gsai-dev.gsiwl.com/environment.json -o gsai.json
```
