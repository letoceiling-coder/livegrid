# 02 — Local data strategy (options analysis)

**Date:** 2026-05-22  
**Goal:** Minimal realistic map dataset in `lg_development` only

## Options evaluated

| # | Option | Realism | Safety | Reproducibility | Complexity | Map usefulness | Verdict |
|---|--------|---------|--------|-----------------|------------|----------------|---------|
| 1 | Full TrendAgent HTTP import (`POST …/trigger`) | ★★★★★ | ★★★★★ (local DB only) | ★★★★ | Medium | Full | **Blocked here** (403) |
| 2 | `FEED_LOCAL_DIR` + import | ★★★★★ | ★★★★★ | ★★★★★ | Medium | Full | **Best when dump available** |
| 3 | Minimal feed subset (truncate apartments.json) | ★★★★ | ★★★★★ | ★★★★ | High prep | Good | Good if dump + truncate |
| 4 | Admin manual blocks + listings | ★★★ | ★★★★★ | ★★★ | Low | Good | OK for smoke tests |
| 5 | Seed extension (hardcoded fixtures) | ★★ | ★★★★★ | ★★★★★ | Low | Limited | **Rejected** (invented fixtures) |
| 6 | **Catalog mirror from public API** | ★★★★ | ★★★★★ | ★★★★ | Low | Good | **Selected & executed** |

## Decision: catalog mirror (executed)

**Why not full feed import now**

```bash
curl -s -o /dev/null -w "%{http_code}" https://dataout.trendagent.ru/msk/about.json
# → 403 (verified 2026-05-22, WSL)
```

No local TrendAgent dump found under `/home/dsc-2` (only conda `about.json` noise).

**Why catalog mirror is acceptable**

- Reads **public** `https://livegrid.ru/api/v1/*` (same contracts as local Nest API)
- **Does not** connect to production PostgreSQL, Redis, or SSH
- Data shapes are production-aligned (real block names, coords, districts, images)
- Writes only to `lg_development` with explicit guard in script

**Script:** `~/livegrid/scripts/populate-local-map-data.ts`

## What was populated

| Entity | Count | Source |
|--------|-------|--------|
| Districts | 40 | `GET livegrid.ru/api/v1/districts?region_id=1` |
| Subways | 50 | `GET livegrid.ru/api/v1/subways?region_id=1` |
| Blocks | 10 mirrored + 1 earlier test | `GET livegrid.ru/api/v1/blocks?per_page=10` |
| Listings | 20 block-linked + 3 secondary + 1 test | Manual rows per block + secondary coords |
| Addresses, images, subway links | From production block payload | Copied URLs (CDN) |

## Future upgrade path

1. Obtain TrendAgent dump → set `FEED_LOCAL_DIR=/path/to/data` → `POST /admin/feed-import/trigger?region=msk`
2. Or run import from network where TrendAgent returns 200 (see `PROJECT_PLAN.md` §3.1)
3. Replace mirror slugs (`*-local`) with full feed import when available

## Explicitly rejected

- Fake JSON with invented field names
- Pointing `DATABASE_URL` at production
- SQL copy from production server
- Laravel monolith seed/fixtures

→ [03-import-requirements.md](./03-import-requirements.md)
