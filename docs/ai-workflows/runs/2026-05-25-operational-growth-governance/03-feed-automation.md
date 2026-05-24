# 03 — Feed Operational Automation

**Iteration:** 76 · **Date:** 2026-05-25

## Automated health issues (iter 76)

| Issue kind | Trigger |
|------------|---------|
| `parity_drift_apartments` | Region parity < `FEED_PARITY_MIN_PERCENT` |
| `parity_drift_blocks` | ЖК parity below threshold |
| `sitemap_stale` | Sitemap age > `SITEMAP_STALE_DAYS` |
| `sitemap_missing` | No generation record |
| `sitemap_coverage_drift` | Sitemap apartments < 90% of catalog |
| `snapshot_retention` | Completed batches > `FEED_SNAPSHOT_RETENTION_WARN` |

## Existing (prior iters)

- Stale feed regions, stuck batches, degraded quarantine
- Per-region health table with parity % (iter 76 extends)
- Post-import sitemap regen (no extra cron)

## Not added

- New cron schedules
- Telegram push (deferred — health visible in admin)

## Verdict

**Hands-off feed ops** via consolidated `getHealthSummary` escalation signals.
