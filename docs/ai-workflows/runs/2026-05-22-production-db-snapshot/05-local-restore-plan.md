# 05 — Local restore plan

**Date:** 2026-05-22  
**Target:** `lg_development` @ `localhost:5432`

---

## Prerequisites

| Item | Command / path |
|------|----------------|
| PostgreSQL + PostGIS | `~/livegrid/scripts/local-infra-start.sh` |
| Node 22, pnpm | nvm |
| Schema current | `cd ~/livegrid/packages/database && npx prisma migrate deploy` |
| Dump file | `~/livegrid-snapshots/lg_map_msk_*.dump` |
| `.env` | `DATABASE_URL=postgresql://lg_admin:lg_dev_password@localhost:5432/lg_development` |

**Verify target before any write:**

```bash
psql -U lg_admin -d lg_development -c "SELECT current_database();"
```

---

## Restore procedure (ordered)

### 1. Stop consumers

```bash
# Stop Nest API and Vite to avoid connection pool during restore
pkill -f 'node dist/main.js' || true
```

### 2. Ensure extensions

PostGIS must exist (migration or manual):

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
```

Verified by local setup; `migrate deploy` includes PostGIS migration.

### 3. Clear map data (lg_development only)

Use truncate list from [03-snapshot-strategy.md](./03-snapshot-strategy.md) — **never run on `lg_production`**.

### 4. Restore dump

```bash
pg_restore \
  --dbname=lg_development \
  --username=lg_admin \
  --no-owner \
  --no-privileges \
  --data-only \
  --disable-triggers \
  --verbose \
  ~/livegrid-snapshots/lg_map_msk_YYYYMMDD.dump
```

`--disable-triggers` allows loading child tables before parents complete; run sanity checks after.

### 5. Fix sequences

After `--data-only` restore:

```bash
psql -U lg_admin -d lg_development -v ON_ERROR_STOP=1 <<'SQL'
SELECT setval(pg_get_serial_sequence('blocks', 'id'), COALESCE((SELECT MAX(id) FROM blocks), 1));
SELECT setval(pg_get_serial_sequence('listings', 'id'), COALESCE((SELECT MAX(id) FROM listings), 1));
SELECT setval(pg_get_serial_sequence('districts', 'id'), COALESCE((SELECT MAX(id) FROM districts), 1));
-- repeat for other serial tables if inserts fail with duplicate key
SQL
```

Or use pg_dump without `--data-only` into empty schema (not recommended — schema drift vs Prisma).

### 6. Sanitize

```bash
psql -U lg_admin -d lg_development -f ~/livegrid/scripts/sanitize-local-map-snapshot.sql
```

### 7. Seed local admin + CMS defaults

```bash
cd ~/livegrid && set -a && source .env && set +a && pnpm db:seed
```

Upserts admin user and baseline site_settings without wiping restored map rows.

### 8. Refresh materialized view

Included in sanitize script; manual fallback:

```sql
REFRESH MATERIALIZED VIEW catalog_apartment_active_mv;
```

### 9. Clear Redis cache

```bash
redis-cli FLUSHDB
```

### 10. Start stack

```bash
~/livegrid/scripts/local-dev-api.sh &
cd ~/livegrid && pnpm dev:web
```

---

## Prisma compatibility notes

| Topic | Guidance |
|-------|----------|
| Migrations | Apply **local** migrations first; import **data** only |
| Schema drift | If prod ahead of git, run `prisma db pull` on separate branch — do not auto-push to prod |
| `listings.lat/lng` | Ensure local schema has columns (`db push` if needed — see local-setup doc) |
| Prisma Client | `pnpm db:generate` after schema changes |

---

## Rollback (local only)

```bash
# Full reset to empty + seed
psql -U lg_admin -d lg_development -c "
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
"
cd ~/livegrid/packages/database && npx prisma migrate deploy
pnpm db:seed
```

Or restore previous dump file.

---

## Alternative: parallel database

Keep existing mirror data in `lg_development`, test snapshot in `lg_development_snapshot`:

```bash
createdb -U lg_admin lg_development_snapshot
DATABASE_URL=postgresql://lg_admin:lg_dev_password@localhost:5432/lg_development_snapshot \
  npx prisma migrate deploy
pg_restore --dbname=lg_development_snapshot ...
```

→ [06-postgis-compatibility.md](./06-postgis-compatibility.md)
