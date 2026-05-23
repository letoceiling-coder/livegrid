# Iteration 20.1 — Schema Audit

## Mode

SCHEMA GOVERNANCE · shadow rollout · 2026-05-22

---

## Pre-rollout state

| Finding | Evidence |
|---|---|
| `listings.lat/lng` in Prisma | Present since manual/dev use |
| No prior migration for lat/lng | Confirmed Iter 18 — schema drift |
| Geo lineage columns absent | Pre-Iter 20 |
| 78,602 listings; 56 with lat/lng | Iter 16 measurement |
| 0 FEED rows with listing coords | Iter 16 |
| Viewport listings path | Requires lat/lng — MSK total=0 |
| Resolver (Iter 19) | Pure TS, no DB dependency |

---

## Safe additive rollout assessment

| Risk | Mitigation |
|---|---|
| lat/lng drift | `ADD COLUMN IF NOT EXISTS` in migration |
| Enum creation on re-run | `DO $$ … duplicate_object` guards |
| Row mutation | Migration has zero UPDATE |
| Viewport breakage | No query path changes |
| Import breakage | Feed import unchanged |
| NOT NULL enforcement | Forbidden this iteration |

**Verdict:** Safe to apply nullable additive migration locally.

---

## Post-rollout verification (`lg_development`)

| Metric | Value |
|---|---:|
| Total listings | 78,602 |
| `geo_source` populated | **0** |
| `geo_quality` populated | **0** |
| `lineage_populated` (both set) | **0** |
| `lat` populated | 56 (unchanged) |

**No row mutations from migration.**

---

## New columns (all nullable)

| Column | Type |
|---|---|
| geo_source | GeoSource enum |
| geo_quality | GeoQuality enum |
| geo_confidence | DECIMAL(4,3) |
| geo_resolved_at | TIMESTAMPTZ(3) |
| geo_entity_id | INTEGER |
| geo_entity_kind | GeoEntityKind enum |
| geo_resolution_version | INTEGER |

---

## Indexes added

- `listings_geo_quality_region_id_idx`
- `listings_geo_source_idx`
- `listings_geo_entity_idx`

No GIST on listings (deferred until materialization).
