# 07 — Production Observability

**Iteration:** 68 · **Date:** 2026-05-24

## Dashboards & endpoints

| Surface | Metrics |
|---------|---------|
| **Feed Import admin** | Integrity, incident, snapshots, SOLD recovery, data quality, sitemap |
| **System Diagnostics** | Feed health, sitemap metrics, map viewport, runtime memory |
| `GET /admin/feed-import/health` | Stale, stuck, orphans, duplicates, governance |
| `GET /admin/feed-import/recovery/incident` | SOLD spike, recovery mode |
| `GET /admin/feed-import/snapshots` | Import trend bars |
| `GET /admin/feed-import/recovery/data-quality` | Catalog quality |
| `GET /admin/sitemap/metrics` | URL counts, last generation |
| `GET /admin/system/diagnostics` | Unified feed + sitemap + map |

## New iter 68 observability

1. **Governance block** in feed health — cron policy, degraded 7d count
2. **Sitemap metrics** in system diagnostics
3. **Data quality audit** API + admin panel
4. **Recovery runner log** — `scripts/reliability/feed-recovery-run.sh` → `/var/log/lg/feed-recovery-run.log`

## Alert conditions

| Issue kind | Severity |
|------------|----------|
| `stale_sync` | warning |
| `stuck_batch` | critical |
| `degraded_import` | critical |
| `duplicate_external_id` | critical |
| `orphan_apartments` | warning |
| SOLD spike (incident) | recovery mode |

## Recovery execution logs

Import batch `stats` JSON retains:

- `apartments_in_feed`, `apartments_marked_sold`, `mark_sold_skipped`
- `degraded`, `healthy_import`, `integrity_checkpoint`

## Verdict

**Production-safe admin observability complete** for feed + SEO lifecycle.
