# Iteration 18.6 — Migration Strategy RFC

## Mode

DATA PLATFORM RFC · phased rollout · 2026-05-22 · **NO migration execution**

---

## Purpose

Define **future-safe migration and rollout plan** for geo lineage schema — additive, nullable, validated before enforcement.

---

## Phase overview

| Phase | Name | DB changes | Data changes | Enforcement |
|---|---|---|---|---|
| 0 | Baseline | None | None | — |
| 1 | Additive schema | Enums + nullable columns | None | None |
| 2 | Shadow resolver | None | Read-time compute only | Log diffs |
| 3 | Shadow population | None | Dry-run job → audit table | None |
| 4 | Materialization | GIST index | Batch write coords + lineage | Soft |
| 5 | Validation | CHECK constraints | Fix violations | Hard |
| 6 | Import hooks | Triggers/queues | Parent-update cascade | Hard |

**Iter 18 delivers Phase 0 documentation only.**

---

## Phase 1 — Additive schema migration

### Migration file (proposed name)

`2026XXXXXX_listing_geo_lineage`

```sql
-- CreateEnum
CREATE TYPE "GeoSource" AS ENUM (
  'MANUAL_EXACT',
  'FEED_EXACT',
  'BUILDING_INHERIT',
  'BLOCK_INHERIT',
  'GEOCODE_VERIFIED',
  'GEOCODE_APPROXIMATE',
  'UNKNOWN'
);

CREATE TYPE "GeoQuality" AS ENUM (
  'EXACT',
  'BUILDING_CENTROID',
  'BLOCK_CENTROID',
  'MISSING',
  'INVALID'
);

CREATE TYPE "GeoEntityKind" AS ENUM (
  'LISTING',
  'BUILDING',
  'BLOCK'
);

-- Fix schema drift: ensure lat/lng exist (IF NOT EXISTS)
ALTER TABLE "listings"
  ADD COLUMN IF NOT EXISTS "lat" DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS "lng" DECIMAL(11,8);

-- Lineage columns
ALTER TABLE "listings"
  ADD COLUMN "geo_source" "GeoSource",
  ADD COLUMN "geo_quality" "GeoQuality",
  ADD COLUMN "geo_confidence" DECIMAL(4,3),
  ADD COLUMN "geo_resolved_at" TIMESTAMPTZ(3),
  ADD COLUMN "geo_entity_id" INTEGER,
  ADD COLUMN "geo_entity_kind" "GeoEntityKind",
  ADD COLUMN "geo_resolution_version" INTEGER NOT NULL DEFAULT 1;

-- Indexes (non-blocking CONCURRENTLY in prod)
CREATE INDEX "listings_geo_quality_region_id_idx"
  ON "listings"("geo_quality", "region_id");
CREATE INDEX "listings_geo_source_idx"
  ON "listings"("geo_source");
CREATE INDEX "listings_geo_entity_idx"
  ON "listings"("geo_entity_kind", "geo_entity_id");
```

**Zero UPDATE statements.** Existing rows unchanged.

### Prisma sync

Update `schema.prisma` to match. Run `prisma migrate diff` to reconcile listing lat/lng drift.

---

## Phase 2 — Shadow resolver

### Deliverables

- `GeoResolverService` implemented
- Viewport prototype calls resolver in shadow mode
- Logs `{ listingId, stored, resolved, diff }` — no writes

### Validation gates

| Gate | Target |
|---|---|
| Resolver determinism | Same input → same output 1000/1000 |
| SQL parity sample | 100 random IDs: SQL geom = resolver |
| Zero UI_ONLY | Never in resolver output |

### Duration

Run in DEV/staging until contract-check green for 7 days.

---

## Phase 3 — Shadow population

### Job: `normalize-listing-geo --dry-run`

Writes to `listing_geo_events` with `eventType = MATERIALIZED` and `actorType = SYSTEM` flag `dry_run = true` OR separate shadow table.

### Reports

```
region_id=1:
  would_materialize: 14917
  would_BUILDING_INHERIT: ~12000
  would_BLOCK_INHERIT: ~2900
  would_remain_MISSING: 11
  would_classify_UNKNOWN: 56 (legacy manual)
  EXACT_downgrade_risk: 0
```

### Human review

- Review UNKNOWN classifications before real write
- Confirm no EXACT downgrades in diff
- Sign-off from data platform + product

---

## Phase 4 — Materialization

### Pre-conditions

- [ ] Phase 3 report approved
- [ ] Backup snapshot taken
- [ ] Rollback script tested (`CLEAR geo_* WHERE geo_resolved_at > $cutoff`)

### Execution

```bash
# Proposed — NOT run in Iter 18
normalize-listing-geo --region-id=1 --batch-size=500 --execute
normalize-listing-geo --region-id=7 --execute
```

### Post-migration index

```sql
CREATE INDEX CONCURRENTLY "listings_geo_gist_idx" ON "listings" USING GIST (
  ST_SetSRID(ST_MakePoint(lng::double precision, lat::double precision), 4326)
) WHERE lat IS NOT NULL AND lng IS NOT NULL
  AND geo_quality IN ('EXACT', 'BUILDING_CENTROID', 'BLOCK_CENTROID');
```

Requires PostGIS (already installed).

### Viewport enablement prerequisite

MSK listings viewport shadow: `visible > 0`, `approximateShare > 0.95` — **after** Phase 4.

---

## Phase 5 — Validation & enforcement

### Backfill geo for 56 legacy rows

One-time classification job:

```
lat/lng present + geo_source NULL → classify as UNKNOWN or MANUAL_EXACT
Emit ADMIN_OVERRIDE or MATERIALIZED event per row
```

### Apply CHECK constraints

From `02-schema-design-rfc.md` — all constraints.

### Application guards

- Prisma middleware rejects geo field writes outside resolver
- Feed import linter rule: no lat/lng in apartment upsert

---

## Phase 6 — Import hooks & ongoing

- Block/building feed update → SQS/job queue re-materialization
- `geo_resolution_version` bump → full region re-normalize
- Contract-check in CI against `lg_development`

---

## Rollback strategy

| Phase rolled back | Action |
|---|---|
| Phase 1 | Drop columns (if no data) — low risk |
| Phase 4 | `UPDATE listings SET lat=NULL, lng=NULL, geo_*=NULL WHERE geo_resolved_at >= $T` |
| Phase 5 | Drop constraints; keep data |

Keep `listing_geo_events` for forensic recovery.

---

## Environment progression

```
local (lg_development) → staging → production read replica shadow → production execute
```

**Production execute requires:**

- Phase 3 sign-off
- Maintenance window OR batched CONCURRENTLY indexes
- No viewport production enablement in same release (separate flag)

---

## Contract-check RFC (future CI)

Extend `/_prototype/viewport/contract-check`:

| Probe | Assertion |
|---|---|
| `geo_source_required_when_coords` | `COUNT(*) WHERE lat IS NOT NULL AND geo_source IS NULL` = 0 |
| `exact_requires_provenance` | No EXACT without source ∈ {MANUAL_EXACT, FEED_EXACT, GEOCODE_VERIFIED} |
| `ui_only_forbidden_in_db` | N/A — not in enum |
| `inherit_entity_exists` | BLOCK/BUILDING rows: FK to existing parent |
| `block_tier_density_sane` | max listings per geo_entity_id < 1000 OR cluster mode |
| `resolver_sql_parity` | sample 50 IDs geom match |
| `no_exact_downgrade_24h` | events: no EXACT→BLOCK without ADMIN |
| `geo_confidence_range` | all ∈ [0,1] |

Run on:

- Every API PR touching geo modules
- Nightly against staging DB
- Pre-viewport-enablement gate

---

## Timeline estimate (implementation, not Iter 18)

| Phase | Effort |
|---|---|
| 1 Schema | 1–2 days |
| 2 Resolver | 3–5 days |
| 3 Shadow pop | 2 days |
| 4 Materialize | 1 day + monitoring |
| 5 Enforcement | 2–3 days |
| 6 Import hooks | 2–3 days |

**Total:** ~2–3 weeks engineering before viewport listings shadow validation.

---

## What Iter 18 explicitly does NOT do

- [ ] Execute any migration
- [ ] Modify production or development DB
- [ ] Run normalization job
- [ ] Deploy resolver code
- [ ] Enable viewport
