# 07 — PM2 + Cron Governance

**Iteration:** 83 · **Date:** 2026-05-25

## PM2

- Single app: `lg-api`
- Config: `deploy/ecosystem.config.js`
- Secrets from `/var/www/lg/.env` only

## Cron model

| Job | Schedule | Purpose |
|-----|----------|---------|
| `cron-feed-import.sh` | `0 4 * * 1` (Mon 04:00) | Weekly emergency fallback |
| BullMQ `FEED_IMPORT_CRON` | `0 4 * * 1` (default) | Primary feed scheduler |

**No legacy 6h import cron** on production (verified).

## Env governance

| Variable | Production | Intent |
|----------|------------|--------|
| `LISTINGS_EXPIRE_DISABLE` | `true` | Disable auto-expire job |
| `FEED_IMPORT_DISABLE_REPEAT` | optional | Dedupe repeat jobs |

## Sitemap

Generated to `SITEMAP_OUTPUT_DIR` (default `apps/api/sitemaps`). Regenerated via API/cron post-deploy.

## BullMQ

Repeat jobs use `FEED_IMPORT_CRON` from ecosystem — single operational model.
