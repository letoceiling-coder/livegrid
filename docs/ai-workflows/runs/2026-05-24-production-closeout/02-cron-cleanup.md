# 02 — Cron Cleanup Verification

**Iteration:** 71 · **Date:** 2026-05-24

## Audit method

`scripts/reliability/cron-governance-audit.sh` on production  
Log: `/var/log/lg/iter71-cron-audit.log`

## crontab (root)

```
0 4 * * 1 /var/www/lg/deploy/cron-feed-import.sh
```

**Removed during iter 71:**
- Legacy Laravel: `* * * * * cd /var/www/livegrid && php artisan schedule:run`
- Tuesday duplicate: `0 3 * * 2 ...`

## /etc/cron.d

No feed/import/lg entries (only certbot).

## PM2 env (lg-api)

| Variable | Value |
|----------|-------|
| `FEED_IMPORT_CRON` | `0 4 * * 1` (via ecosystem default) |
| `FEED_IMPORT_CRON_TZ` | `Europe/Moscow` |
| `FEED_HTTP_FETCH_ALLOWED` | `true` |
| `FEED_IMPORT_DISABLE_REPEAT` | unset (BullMQ repeat active) |

## BullMQ / Redis repeatables

```
bull:feed-import:repeat
bull:feed-import:repeat:c543bd063b2873b108369bd077e7ac19
bull:feed-import:repeat:c543bd063b2873b108369bd077e7ac19:1779667200000
```

Single weekly repeatable job — **no 6h hidden imports detected**.

## Emergency fallback

`deploy/cron-feed-import.sh` — Monday 04:00 MSK crontab only; logs to `/var/log/lg/cron-feed-import.log`.

## Policy checklist

| Check | Status |
|-------|--------|
| Weekly Monday scheduler only | ✅ |
| No `*/6` or `*/12` feed crons | ✅ |
| No legacy Laravel scheduler | ✅ |
| BullMQ single repeat pattern | ✅ |
| `FEED_HTTP_FETCH_ALLOWED=true` on server | ✅ |

## Holds

- Deploy iter 65–68 git to production for `FEED_IMPORT_DISABLE_REPEAT` governance UI and degraded-import quarantine hooks.
- Confirm BullMQ cron matches `0 4 * * 1` after next Monday run.

## Verdict

**Cron cleanup verified.** Only weekly Monday scheduler + single BullMQ repeat remain.
