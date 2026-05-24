# 01 — Production state audit

**API:** `GET /admin/feed-import/recovery/audit?region=msk`  
**SQL:** `scripts/reliability/production-state-audit.sql`

## Metrics collected

- `byStatus` / `byVisibility` — all apartments in region
- `feedSourceOnly` — `data_source='FEED'` breakdown (ACTIVE, SOLD, RESERVED, DRAFT, INACTIVE)
- `topBlocksBySold` — top 20 blocks by SOLD count
- `topBuildersBySold` — top 15 builders by SOLD count
- `orphanApartments`, `duplicateExternalIds`

## Production reference (2026-05-22)

| Metric | ~Value |
|--------|--------|
| ACTIVE+published FEED | 14 917 |
| Vitrine blocks | 359 |
| TrendAgent donor | ~67k / ~462 |

Run audit on server after deploy to capture before-recovery baseline.
