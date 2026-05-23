# 04 — Safe import plan (executed)

**Date:** 2026-05-22  
**Mode:** SAFE LOCAL DATA ONLY

## Pre-flight checklist (completed)

- [x] Confirm DB: `SELECT current_database();` → `lg_development`
- [x] Confirm `DATABASE_URL` in `~/livegrid/.env` points to localhost / `lg_development`
- [x] No production host in connection string
- [x] PostgreSQL + Redis running locally
- [x] API running on `:3000` (built mode)
- [x] Web running on `:5173`

### Pre-import counts

```
blocks=0, listings=0, districts=0, subways=0, import_batches=0
```

## Plan A — Full feed import (not executed)

**Reason:** TrendAgent HTTP 403 from this environment.

Steps if unblocked later:

1. Set `FEED_LOCAL_DIR` or ensure TrendAgent 200
2. Start API with Redis
3. `POST /admin/feed-import/trigger?region=msk`
4. Poll `/admin/feed-import/progress` until `Completed`
5. `redis-cli FLUSHDB`
6. Verify `/blocks`, `/listings`

## Plan B — Catalog mirror (executed)

### Step 1 — Create script

`~/livegrid/scripts/populate-local-map-data.ts`

- Reads public catalog from `https://livegrid.ru/api/v1` (read-only)
- Upserts districts, subways, blocks, listings into `lg_development`
- Idempotent via `externalId` / `mirror-*` keys

### Step 2 — Run

```bash
cd ~/livegrid/packages/database
set -a && source ../../.env && set +a
pnpm exec tsx ../../scripts/populate-local-map-data.ts
```

### Step 3 — Invalidate cache

```bash
~/miniforge/bin/redis-cli FLUSHDB
```

### Step 4 — Verify API

```bash
curl -s "http://localhost:3000/api/v1/blocks?region_id=1&per_page=5"
curl -s "http://localhost:3000/api/v1/listings?region_id=1&kind=APARTMENT&per_page=3"
curl -s "http://localhost:3000/api/v1/districts?region_id=1" | jq length
```

## Safety confirmations

| Check | Result |
|-------|--------|
| Production DB touched | **No** |
| Production Redis touched | **No** |
| SSH / deploy | **No** |
| `DATABASE_URL` production | **No** |
| Data source | Public HTTP API + local Prisma writes |

## Rollback (local only)

```bash
~/miniforge/bin/psql -U lg_admin -d lg_development -c "
  TRUNCATE listings, block_subways, block_images, block_addresses, blocks,
           districts, subways CASCADE;
"
pnpm db:seed   # restore admin user + site settings
```

→ [05-local-import-results.md](./05-local-import-results.md)
