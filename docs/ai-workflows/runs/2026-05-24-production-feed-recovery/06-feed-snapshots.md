# 06 — Feed snapshots

**API:** `GET /admin/feed-import/snapshots?region=msk&limit=12`

Stored in `import_batches.stats` (no new tables):

| Field | Purpose |
|-------|---------|
| apartments_in_feed | TrendAgent row count |
| apartments_upserted | Processed count |
| apartments_marked_sold | markSold count |
| mark_sold_skipped | Guard triggered |
| degraded / healthy_import | Quarantine vs healthy |
| durationMs | Computed from started/finished |

Admin UI: bar trend on `/admin/feed-import`.

Week-over-week: compare `feedExportedAt` + `apartments_in_feed` across points.
