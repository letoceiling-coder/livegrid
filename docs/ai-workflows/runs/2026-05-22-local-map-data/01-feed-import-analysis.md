# 01 — Feed import architecture analysis

**Date:** 2026-05-22  
**Scope:** `~/livegrid/apps/api/src/modules/feed-import/**` (Nest production platform)

## Module structure

| File | Role |
|------|------|
| `feed-import.module.ts` | BullMQ root + queue registration, imports `BlocksModule` |
| `feed-import.service.ts` | Orchestration: trigger, execute batch, cron, diagnostics |
| `feed-import.processor.ts` | BullMQ worker → `executeBatch` / `runScheduledImport` |
| `feed-fetcher.service.ts` | HTTP or `FEED_LOCAL_DIR` JSON loading |
| `feed-processor.service.ts` | Prisma upserts: rooms, districts, blocks, buildings, apartments |
| `feed-import.controller.ts` | Admin REST under `/api/v1/admin/feed-import` |
| `feed-import.constants.ts` | Queue name `feed-import`, job `FEED_IMPORT_JOB_RUN` |
| `feed-import.types.ts` | `FeedImportBatchJob`, scheduled job types |

## Import pipeline (verified from source)

```
about.json
  → map file name → URL
  → ref files: rooms, finishings, buildingtypes, regions (districts), subways, builders
  → blocks.json → blocks + addresses + images + subways
  → buildings.json
  → apartments.json (largest; batch progress callbacks)
  → deriveBlockStatuses()
  → refreshCatalogSearchCache() + blocks.invalidateCatalogCache()
```

### Required feed files (`REQUIRED_FEED_FILES`)

`rooms`, `finishings`, `buildingtypes`, `regions`, `subways`, `builders`, `blocks`, `buildings`, `apartments`

### Data source resolution (`FeedFetcherService`)

1. If `FEED_LOCAL_DIR` set → read `{FEED_LOCAL_DIR}/{region}/{file}.json`
2. Else → `fetch()` from URL in `about.json` (base `TRENDAGENT_BASE_URL/{region}/`)

### Prisma writes (map-relevant)

| Feed file | DB tables | Geo fields |
|-----------|-----------|------------|
| `regions.json` | `districts` | — |
| `subways.json` | `subways` | — |
| `blocks.json` | `blocks`, `block_addresses`, `block_images`, `block_subways` | `geometry` → `latitude`/`longitude` |
| `buildings.json` | `buildings` | `geometry` |
| `apartments.json` | `listings`, `listing_apartments`, related | via `block_id` |

PostGIS migration exists for spatial queries; map markers use decimal lat/lng on `blocks` and `listings`.

## Queues & cron

- **Queue:** `feed-import` (BullMQ, Redis `REDIS_URL`)
- **Job:** `FEED_IMPORT_JOB_RUN` with payload `{ batchId, regionId, regionCode }` or `{ regionCode }` for scheduled
- **Cron:** `FEED_IMPORT_CRON` (default `0 */6 * * *`), disabled when `FEED_IMPORT_DISABLE_REPEAT=true`
- **Allowed regions:** `FEED_IMPORT_ALLOWED_REGIONS` (default `msk` only)

## Admin endpoints (JWT, roles)

| Method | Path | Role | Purpose |
|--------|------|------|---------|
| POST | `/admin/feed-import/trigger?region=msk` | admin | Queue import |
| POST | `/admin/feed-import/trigger-selected` | admin | Multi-region |
| GET | `/admin/feed-import/progress` | editor | Live progress |
| GET | `/admin/feed-import/sources` | admin/editor | Configured regions + file URLs |
| GET | `/admin/feed-import/diagnostics?region=msk` | admin/editor | Feed vs DB report |
| GET | `/admin/feed-import/probe?region=msk` | admin/editor | Lightweight feed availability |
| GET | `/admin/feed-import/history` | editor | Batch history |
| POST | `/admin/feed-import/stop` | admin | Stop active imports |
| POST | `/admin/feed-import/refresh-cache` | admin | Catalog MV / cache refresh |

## Public map API coupling

`GET /api/v1/blocks` (public) defaults to **`require_active_listings=true`**:

- Block appears only if it has ≥1 listing: `kind=APARTMENT`, `status IN (ACTIVE, RESERVED)`, `isPublished=true`
- Frontend `RedesignMap.tsx` calls blocks with `requireActiveListings: true`
- Empty blocks → fallback to `GET /api/v1/listings`

## Local compatibility findings

| Path | Local status (2026-05-22) |
|------|---------------------------|
| Full TrendAgent HTTP import | **Blocked** — `403` from `dataout.trendagent.ru` (WSL egress) |
| `FEED_LOCAL_DIR` import | **Works** if JSON files present (same code path as HTTP) |
| Admin trigger + BullMQ | **Works** when feed reachable; requires built API (`node dist/main.js`) |
| `pnpm dev:api` | **Broken** at HEAD — `FeedImportService` DI error under tsx |

## Map schema dependencies

- `blocks.latitude`, `blocks.longitude` — markers for apartment/new-build flow
- `listings.lat`, `listings.lng` — listings map / secondary fallback
- `districts`, `subways` — sidebar filters (`district_names`, `subway_names`)
- Redis cache keys `api:catalog:blocks:*` — flush after manual data changes

→ [02-local-data-strategy.md](./02-local-data-strategy.md)
