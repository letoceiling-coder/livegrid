# 05 — Local import results

**Date:** 2026-05-22  
**Method:** Catalog mirror script (Plan B)  
**Target:** `lg_development` @ localhost:5432

## Execution log

```bash
cd ~/livegrid/packages/database
set -a && source ../../.env && set +a
pnpm exec tsx ../../scripts/populate-local-map-data.ts
```

### Script output (verbatim summary)

```
Populating local map data from public catalog API (read-only)...
  Target DB: lg_development
  Reference: 40 districts, 50 subways
  Block: 1-й Донской (id=2)
  Block: 1-й Измайловский (id=3)
  … (10 mirrored blocks)
  Secondary listings: up to 3
Done. { blocks: 11, listings: 24, districts: 40, subways: 50 }
```

## Post-import database

| Table | Count | Notes |
|-------|-------|-------|
| `blocks` | 11 | 10 mirrored + 1 early test block |
| `listings` | 24 | 20 block-linked + 3 secondary + 1 test |
| `districts` | 40 | Filter sidebar |
| `subways` | 50 | Filter + block_subways |
| `blocks_with_coords` | 11 | All MSK blocks have lat/lng |
| `import_batches` | 0 | No feed import run |

## API verification (after `redis-cli FLUSHDB`)

```bash
curl -s "http://localhost:3000/api/v1/blocks?region_id=1&per_page=5"
```

| Metric | Value |
|--------|-------|
| `meta.total` | **11** |
| Sample names | 1-й Донской, 1-й Измайловский, 1-й Ленинградский, … |
| `listingPriceMin/Max` | Present on blocks |

```bash
curl -s "http://localhost:3000/api/v1/listings?region_id=1&kind=APARTMENT&is_published=true&per_page=3"
```

| Metric | Value |
|--------|-------|
| `meta.total` | **24** |

```bash
curl -s "http://localhost:3000/api/v1/districts?region_id=1"
# → 40 districts

curl -s "http://localhost:3000/api/v1/blocks/deadlines?region_id=1"
# → ["Сдан"]  (1 token)

curl -s "http://localhost:5173/api/v1/blocks?region_id=1&per_page=2"
# → meta.total: 11 (Vite proxy OK)
```

## Health

```json
GET /api/v1/health
{"status":"ok","services":{"database":"up"}}
```

## Production access audit

| Action | Performed |
|--------|-----------|
| Production PostgreSQL | **No** |
| Production Redis | **No** |
| SSH to server | **No** |
| Read public livegrid.ru API | **Yes** (HTTPS catalog only) |
| TrendAgent dataout | Attempted → **403**, not used |

## Artifacts added

| Path | Purpose |
|------|---------|
| `~/livegrid/scripts/populate-local-map-data.ts` | Reproducible local population |

## Re-run

Script is idempotent for blocks (upsert by `regionId+externalId`) and skips existing mirror listings.

→ [06-map-flow-verification.md](./06-map-flow-verification.md)
