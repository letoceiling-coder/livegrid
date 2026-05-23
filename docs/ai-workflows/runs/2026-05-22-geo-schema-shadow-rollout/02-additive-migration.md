# Iteration 20.2 — Additive Migration

## Mode

SCHEMA GOVERNANCE · migration applied locally · 2026-05-22

---

## Migration file

`packages/database/prisma/migrations/20260522120000_listing_geo_lineage/migration.sql`

---

## Enums created

### GeoSource (7 values — no UI_ONLY)

MANUAL_EXACT, FEED_EXACT, BUILDING_INHERIT, BLOCK_INHERIT, GEOCODE_VERIFIED, GEOCODE_APPROXIMATE, UNKNOWN

### GeoQuality

EXACT, BUILDING_CENTROID, BLOCK_CENTROID, MISSING, INVALID

### GeoEntityKind

BUILDING, BLOCK *(LISTING reserved for resolver-only EXACT suggestions — not in DB enum)*

---

## Safety features

```sql
-- Idempotent enum creation
DO $$ BEGIN CREATE TYPE "GeoSource" AS ENUM (...);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Schema drift reconciliation
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "lat" DECIMAL(10,8);
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "lng" DECIMAL(11,8);

-- All geo columns IF NOT EXISTS
```

---

## Explicitly forbidden (not in migration)

- NOT NULL constraints
- CHECK constraints
- UPDATE / backfill statements
- DROP / ALTER TYPE destructive changes
- GIST spatial index on listings

---

## Apply command (local)

```bash
cd ~/livegrid/packages/database && npx prisma migrate deploy
```

**Result:** Applied successfully to `lg_development`.

---

## Rollback (if needed)

```sql
ALTER TABLE listings DROP COLUMN IF EXISTS geo_source;
-- ... other columns
DROP TYPE IF EXISTS "GeoSource";
-- etc.
```

Not executed — documented for emergency only.
