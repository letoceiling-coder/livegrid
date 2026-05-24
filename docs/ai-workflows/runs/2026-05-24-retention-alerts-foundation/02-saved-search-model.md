# 02 — Saved Search Model

**Migration:** `20260524200000_retention_saved_searches`

## Table: `saved_searches`

| Column | Type | Purpose |
|--------|------|---------|
| user_id | UUID | Owner |
| name | text | User label |
| params_json | JSONB | Normalized catalog params + region + geo |
| region_id | int? | Region context |
| geo_context | JSONB? | lat/lng/radius/polygon/preset |
| query_hash | text | SHA256 dedupe (unique per user) |
| alerts_enabled | bool | Master toggle |
| alert_new_matches | bool | New listing matches |
| alert_price_drop | bool | Reserved for search-scoped drops |
| alert_restored | bool | Restored listings |
| last_match_at | timestamp | Watermark for match scan |
| last_checked_at | timestamp | Scan cursor |

## Shared types

`packages/shared/src/retention/saved-search.ts` — param keys, normalization, catalog URL builder.

## Dedupe

`@@unique([userId, queryHash])` — create returns 409; `overwrite: true` updates name/alerts.
