# 03 — Snapshot strategy (pg_dump workflow)

**Date:** 2026-05-22  
**Safety class:** READ-ONLY on production source

---

## Golden rules

| Rule | Detail |
|------|--------|
| Export location | **On production server** via local socket (`localhost`) |
| Tool | `pg_dump` only — never `pg_dump \| psql` back to production |
| Local app | `DATABASE_URL` → `lg_development` only |
| Dump files | Never commit; store in `~/livegrid-snapshots/` (gitignored) |
| Writes | Zero on production |

---

## Step 0 — Pre-flight (production server)

```bash
# Read-only counts
sudo -u postgres psql -d lg_production -c "
SELECT 'blocks' t, count(*) FROM blocks WHERE region_id=1
UNION ALL SELECT 'listings', count(*) FROM listings WHERE region_id=1 AND is_published;
"
```

---

## Step 1 — Read-only export (production server)

Example script: `~/livegrid/scripts/map-snapshot-export.example.sh`

```bash
export ALLOW_PROD_SNAPSHOT=yes
bash /var/www/lg/scripts/map-snapshot-export.example.sh \
  /tmp/lg_map_msk_$(date +%Y%m%d).dump
```

### Why `--format=custom`

- Compressed single file
- Selective restore with `pg_restore --table=...`
- Preserves sequences when using `--data-only` mode

### Alternative: schema-free data into empty local DB

Local DB schema comes from **Prisma migrations**, not production dump:

```bash
# Production: data-only for listed tables
pg_dump -d lg_production --format=custom --data-only --no-owner \
  --table=blocks --table=listings ... \
  -f /tmp/lg_map_data.dump
```

Local first:

```bash
cd ~/livegrid/packages/database && npx prisma migrate deploy
```

Then restore data.

---

## Step 2 — Transfer dump (file only)

```bash
mkdir -p ~/livegrid-snapshots
scp root@85.198.64.93:/tmp/lg_map_msk_YYYYMMDD.dump ~/livegrid-snapshots/
```

**This is file transfer, not deployment.** No code changes on server.

Verify checksum optional:

```bash
sha256sum ~/livegrid-snapshots/lg_map_msk_*.dump
```

---

## Step 3 — Tier M filtered export (smaller)

When full dump is too large, use a **custom SQL export** on server into CSV/SQL, then import locally. Example pattern (operator adapts):

```bash
sudo -u postgres psql -d lg_production -c "
COPY (
  SELECT b.* FROM blocks b
  WHERE b.region_id = 1
  ORDER BY (
    SELECT count(*) FROM listings l
    WHERE l.block_id = b.id AND l.is_published AND l.status IN ('ACTIVE','RESERVED')
  ) DESC
  LIMIT 50
) TO STDOUT WITH CSV HEADER
" > /tmp/blocks_top50.csv
```

Repeat for dependent tables using `block_id IN (...)`. Document IDs in a manifest file.

Prefer `pg_dump --table` when whole tables fit disk budget.

---

## Step 4 — Local restore target

**Target database:** `lg_development`  
**Never:** `lg_production` on any host accessible from dev app

Add to `~/livegrid/.gitignore` (if missing):

```
/lg-snapshots/
*.dump
```

---

## Step 5 — pg_restore (local WSL)

### Option A — Clean restore (recommended)

```bash
# Stop API first
export PGDATA=~/livegrid/.local/infra/pgdata  # or docker postgres

# Truncate map tables in lg_development ONLY
psql -U lg_admin -d lg_development -v ON_ERROR_STOP=1 <<'SQL'
SELECT current_database();  -- must show lg_development
TRUNCATE TABLE
  listing_apartment_contracts, listing_apartment_banks,
  listing_apartments, listing_houses, listing_lands,
  listing_commercials, listing_parkings,
  listings,
  building_addresses, buildings,
  block_subways, block_images, block_addresses, blocks,
  builders, subways, districts,
  room_types, finishings, building_types,
  feed_regions
CASCADE;
SQL

pg_restore \
  --dbname=lg_development \
  --no-owner \
  --no-privileges \
  --data-only \
  --disable-triggers \
  ~/livegrid-snapshots/lg_map_msk_YYYYMMDD.dump
```

### Option B — New database `lg_development_snapshot`

For side-by-side comparison without wiping current dev data:

```bash
createdb -U lg_admin lg_development_snapshot
cd ~/livegrid/packages/database && DATABASE_URL=.../lg_development_snapshot npx prisma migrate deploy
pg_restore --dbname=lg_development_snapshot --data-only ... dump
```

Switch `.env` temporarily; switch back after testing.

---

## Step 6 — Post-restore (local)

```bash
psql -U lg_admin -d lg_development -f ~/livegrid/scripts/sanitize-local-map-snapshot.sql
cd ~/livegrid && set -a && source .env && set +a && pnpm db:seed
~/miniforge/bin/redis-cli FLUSHDB
```

If `REFRESH MATERIALIZED VIEW CONCURRENTLY` fails (empty MV), use:

```sql
REFRESH MATERIALIZED VIEW catalog_apartment_active_mv;
```

---

## Step 7 — Verify (local)

```bash
curl -s "http://localhost:3000/api/v1/blocks?region_id=1&per_page=3" | jq '.meta'
curl -s "http://localhost:3000/api/v1/listings?region_id=1&kind=APARTMENT&per_page=3" | jq '.meta'
curl -s "http://localhost:3000/api/v1/districts?region_id=1" | jq 'length'
```

Open http://localhost:5173/map

---

## Commands explicitly FORBIDDEN

```bash
# NEVER on production:
psql -d lg_production -c "TRUNCATE ..."
psql -d lg_production -c "DROP ..."
pg_dump ... | psql -d lg_production
DATABASE_URL=...lg_production pnpm db:migrate

# NEVER on local app .env:
DATABASE_URL=postgresql://...@prod-host:5432/lg_production
```

→ [04-sanitization-strategy.md](./04-sanitization-strategy.md)
