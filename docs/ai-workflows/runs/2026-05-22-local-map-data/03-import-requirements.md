# 03 — Import requirements (verified)

**Date:** 2026-05-22

## Full feed import (TrendAgent pipeline)

### Environment variables

| Variable | Required | Local value / notes |
|----------|----------|---------------------|
| `DATABASE_URL` | Yes | `postgresql://lg_admin:lg_dev_password@localhost:5432/lg_development` |
| `REDIS_URL` | Yes | `redis://localhost:6379` (BullMQ worker) |
| `TRENDAGENT_BASE_URL` | Yes | `https://dataout.trendagent.ru` |
| `TRENDAGENT_DEFAULT_REGION` | Optional | `msk` |
| `TRENDAGENT_REGIONS` | Cron | `msk` |
| `FEED_IMPORT_ALLOWED_REGIONS` | Optional | Default `msk` |
| `FEED_IMPORT_DISABLE_REPEAT` | Optional | `true` locally (skip cron) |
| `FEED_LOCAL_DIR` | Optional | Absolute path to `{region}/*.json` tree |
| `FEED_IMPORT_CRON` | Optional | `0 */6 * * *` |

### Directory layout (`FEED_LOCAL_DIR`)

```
$FEED_LOCAL_DIR/
  msk/
    about.json
    rooms.json
    finishings.json
    buildingtypes.json
    regions.json      # → districts
    subways.json
    builders.json
    blocks.json
    buildings.json
    apartments.json   # large (~62k rows MSK)
```

`about.json` format: array of `{ name, url, scope, exported_at, description }`.

### Feed file → processor mapping

| `name` in about | Processor method |
|-----------------|------------------|
| rooms | `processRooms` |
| finishings | `processFinishings` |
| buildingtypes | `processBuildingTypes` |
| regions | `processDistricts(regionId)` |
| subways | `processSubways(regionId)` |
| builders | `processBuilders(regionId)` |
| blocks | `processBlocks(data, regionId)` |
| buildings | `processBuildings(data, regionId)` |
| apartments | `processApartments(data, regionId)` |

### Infrastructure prerequisites

```bash
~/livegrid/scripts/local-infra-start.sh   # PostgreSQL + Redis
pnpm db:migrate / db push           # schema synced
pnpm build:api && node apps/api/dist/main.js   # API (not dev:api)
```

### Trigger import (admin JWT)

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@livegrid.ru","password":"admin123!"}' \
  | jq -r .accessToken)

curl -s -X POST "http://localhost:3000/api/v1/admin/feed-import/trigger?region=msk" \
  -H "Authorization: Bearer $TOKEN"
# → {"batchId":N,"status":"QUEUED"}

curl -s http://localhost:3000/api/v1/admin/feed-import/progress \
  -H "Authorization: Bearer $TOKEN"
```

### Probe before import

```bash
curl -s "http://localhost:3000/api/v1/admin/feed-import/probe?region=msk" \
  -H "Authorization: Bearer $TOKEN"
```

### Retry / failure behavior

- Fetch retries: 3 attempts, 2s×attempt backoff (`FeedFetcherService`)
- BullMQ job: `attempts: 1` on manual trigger
- Batch statuses: `PENDING` → `RUNNING` → `COMPLETED` | `FAILED`
- Partial errors collected in `stats.errors` array; batch may still `COMPLETED`

### Post-import cache

- `refreshCatalogSearchCache()` — materialized view / Meilisearch
- `blocks.invalidateCatalogCache()` — Redis catalog keys
- Manual: `redis-cli FLUSHDB` on local Redis if needed

### Images

- Block images stored as **URLs** from feed (CDN); not downloaded to MinIO by import
- Manual listings require media URLs from `/uploads/` for some fields

## Catalog mirror script (used locally)

```bash
cd ~/livegrid/packages/database
set -a && source ../../.env && set +a
pnpm exec tsx ../../scripts/populate-local-map-data.ts
```

**Guards in script:**

- Aborts if `DATABASE_URL` lacks `lg_development`
- Aborts if `lg_production` detected

### After population

```bash
redis-cli FLUSHDB
curl -s "http://localhost:3000/api/v1/blocks?region_id=1&per_page=5"
```

→ [04-safe-import-plan.md](./04-safe-import-plan.md)
