# 06 — Observability

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /admin/feed-import/health` | Queue, stale, orphans, duplicates |
| `GET /admin/feed-import/integrity` | Forensic score + feed vs DB |
| `GET /admin/feed-import/diagnostics` | Heavy feed vs DB (blocks fetch) |
| `GET /admin/system/diagnostics` | Includes `feed` block |

## Batch stats (new fields)

- `apartments_in_feed`, `blocks_in_feed`, `buildings_in_feed`
- `apartments_upserted`, `apartments_marked_sold`
- `mark_sold_skipped`, `hasWarnings`, `errors[]`

## Scripts

- `deploy/audit-feed-db.sh` — server-side SQL + feed probe
- `scripts/reliability/feed-forensics.sh` — SOLD + batch stats extension

## Alerts to watch

- `mark_sold_skipped: true` → truncated feed detected
- `incompleteLast24h` > 0 with apartments errors
- `sold` count >> `active_published`
- `integrity_score` < 80
