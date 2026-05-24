# 02 — Cron Governance Fix

**Iteration:** 70 · **Date:** 2026-05-24

## Canonical policy (TrendAgent + iter 65–68)

| Setting | Value |
|---------|-------|
| `FEED_IMPORT_CRON` | `0 4 * * 1` |
| `FEED_IMPORT_CRON_TZ` | `Europe/Moscow` |
| Scheduler | **BullMQ repeatable job only** |
| Manual trigger | `POST /admin/feed-import/trigger` — **retained** |
| Emergency shell | `deploy/cron-feed-import.sh` — Monday fallback, stuck >3h reset only |

## Mandatory removals (production server)

1. **crontab** — any `*/6`, `*/12`, or hourly feed import lines
2. **cron.d** — legacy LiveGrid import entries duplicating BullMQ
3. **FEED_IMPORT_DISABLE_REPEAT** — must be **`false`** after recovery validation (currently may be `true` on some envs)

## Audit script (iter 70)

```bash
bash /var/www/lg/scripts/reliability/cron-governance-audit.sh
```

Checks: crontab, `/etc/cron.d`, PM2 `FEED_*` env, `.env`, Redis repeat keys.

## Repo state (verified)

| Location | 6h cron? |
|----------|----------|
| `deploy/ecosystem.config.js` | Default `0 4 * * 1` ✅ |
| `deploy/cron-feed-import.sh` | Weekly comment only ✅ |
| Application code | No hardcoded 6h ✅ |

## PM2 env (production template)

From `ecosystem.config.js`:

```
FEED_IMPORT_CRON=0 4 * * 1
FEED_IMPORT_CRON_TZ=Europe/Moscow
FEED_HTTP_FETCH_ALLOWED=true
FEED_MARK_SOLD_MIN_RATIO=0.85
```

## Post-recovery enable

```bash
# In /var/www/lg/.env
FEED_IMPORT_DISABLE_REPEAT=false
pm2 restart lg-api --update-env
```

Verify API log: `Registered BullMQ weekly import: pattern="0 4 * * 1"`

## Verdict

**Code policy correct.** Ops must **audit live server crons** and enable weekly BullMQ after recovery.
