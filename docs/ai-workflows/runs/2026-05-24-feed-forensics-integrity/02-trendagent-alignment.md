# 02 — TrendAgent documentation alignment

## TrendAgent policy (doc.txt / PROJECT_PLAN)

- Feed updates **once per week**, **Mondays**
- HTTP access **whitelist IP only** (`dataout.trendagent.ru`)

## Changes (iter 65)

| Before | After |
|--------|-------|
| `FEED_IMPORT_CRON=0 */6 * * *` (every 6h) | `0 4 * * 1` + `FEED_IMPORT_CRON_TZ=Europe/Moscow` |
| Stale warning 8h | `FEED_HEALTH_STALE_HOURS=200` (~8 days) |
| Any server could HTTP fetch | `FEED_HTTP_FETCH_ALLOWED=true` required (except `FEED_LOCAL_DIR`) |
| cron shell reset all RUNNING | Reset only stuck >3h |

## Preserved

- Manual trigger: `POST /admin/feed-import/trigger`
- Emergency: `deploy/cron-feed-import.sh` (weekly fallback)
- `FEED_IMPORT_DISABLE_REPEAT=true` disables BullMQ repeat

## Production deploy checklist

1. Set `FEED_HTTP_FETCH_ALLOWED=true` on backend PM2 only
2. Remove aggressive system crons (6h) if any
3. Ensure server IP whitelisted at TrendAgent
4. After deploy: one **full** manual import with `include_apartments` integrity check
