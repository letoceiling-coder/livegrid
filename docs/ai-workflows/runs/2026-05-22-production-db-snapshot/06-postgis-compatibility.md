# 06 — PostGIS compatibility

**Date:** 2026-05-22

---

## Production PostGIS usage

Migration `20260414130000_postgis_public_site_url`:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE INDEX IF NOT EXISTS "blocks_geo_gist_idx" ON "blocks" USING GIST (
  (ST_SetSRID(ST_MakePoint("longitude"::double precision, "latitude"::double precision), 4326))
) WHERE "latitude" IS NOT NULL AND "longitude" IS NOT NULL;
```

Runtime queries in `GeoSpatialService` use:

- `ST_DWithin` — radius filter (`geo_lat`, `geo_lng`, `geo_radius_m`)
- `ST_Within` — polygon filter (`geo_polygon`)

**Map markers themselves** use decimal columns on `blocks` / `listings`; PostGIS is required for **geo filter queries**, not basic pin display.

---

## Local PostGIS setup (verified)

| Method | Status |
|--------|--------|
| Miniforge `postgis` package | ✅ Used in local setup |
| Docker `postgres:16-alpine` + PostGIS image | Alternative |
| Native `postgresql-16-postgis-3` | With sudo |

After extension install:

```bash
psql -U lg_admin -d lg_development -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -U lg_admin -d lg_development -c "SELECT PostGIS_Version();"
```

---

## Version compatibility

| Concern | Mitigation |
|---------|------------|
| Prod PostGIS newer than local | Use same major PG (16+) locally |
| Extension missing on restore | Run `CREATE EXTENSION` before geo queries |
| GIST index missing | Re-run migration SQL or `prisma migrate deploy` |

Index is in Prisma migration — **do not pg_dump index separately** if schema from migrations.

---

## Restore order with PostGIS

1. `prisma migrate deploy` (creates extension + GIST index on empty tables)
2. Load block/listing **data** (lat/lng columns)
3. Index automatically applies to rows matching `WHERE latitude IS NOT NULL`

If restoring to DB without running migrations:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
-- then run blocks_geo_gist_idx SQL from migration file
```

---

## Testing geo filters locally

After restore:

```bash
# Radius ~5km around Moscow center
curl -s "http://localhost:3000/api/v1/blocks?region_id=1&geo_lat=55.7558&geo_lng=37.6173&geo_radius_m=5000&per_page=5" | jq '.meta'

# With polygon (encoded polyline from frontend)
# curl "...&geo_polygon=..."
```

Failure modes:

| Error | Fix |
|-------|-----|
| `function st_dwithin does not exist` | Install PostGIS extension |
| Empty results | Check blocks have non-null lat/lng in MSK |
| Slow queries | Confirm `blocks_geo_gist_idx` exists |

```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'blocks' AND indexname LIKE '%geo%';
```

---

## Dump / restore notes

- `pg_dump` includes **table data**, not PostGIS extension objects in `--table` mode
- Extension lives in schema `public` / `tiger` — local DB must create extension once
- No special PostGIS flags needed for `pg_restore` of lat/lng columns (plain numeric)

→ [07-risk-analysis.md](./07-risk-analysis.md)
