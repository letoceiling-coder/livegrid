# Iteration 23.4 — Post-Materialization Validation

## Mode

CONTROLLED STAGING · 2026-05-22

---

## Resolver parity

```
validateResolverParity(regionId=1, sampleSize=200)
→ parityOk=200, parityFail=0
```

All sampled materialized rows match resolver RESOLVED output with `materialized=true`.

---

## Field correctness

| Check | Result |
|---|---|
| geo_source populated | ✓ BUILDING_INHERIT / BLOCK_INHERIT only |
| geo_quality matches source | ✓ BUILDING_CENTROID / BLOCK_CENTROID |
| geo_entity_id matches FK | ✓ building_id or block_id |
| geo_entity_kind | ✓ BUILDING or BLOCK |
| geo_resolution_version | ✓ 1 |
| geo_resolved_at set | ✓ |

---

## Safety invariants

| Invariant | Result |
|---|---|
| DANGEROUS_OVERWRITE | **0** |
| LINEAGE_CONFLICT | **0** |
| EXACT downgrade | **0** |
| Belgorod geo_source writes | **0** (region 7 untouched) |
| Review table integrity | **56 decisions** preserved |

---

## Before/after comparison (MSK active published apartments)

| Metric | Before | After |
|---|---:|---:|
| Listings with lat/lng (region 1, active) | 0 | **14,888** |
| Viewport bbox visible (Moscow) | 0 | **6,533** |

**Critical finding:** MSK listings viewport path transitions from `total=0` to `total=14,888` after materialization — coords now exist on listing rows.

---

## Contract-check impact

Updated `shadow_db_lineage_sample` probe — no longer fails on `lineage_populated > 0`. Reports materialization mode instead.

New probe: `post_materialization_viewport_listings` — verifies `total > 0` implies `visible > 0`.

---

## Dry-run reconciliation

Iter 21 predicted 75,998 BUILDING + 416 BLOCK for all regions. Region 1 measured **75,851 + 416 = 76,267** — delta ~147 rows (listings outside inherit scope or classification edge cases in region boundary).

---

## tsc verification

| Package | Result |
|---|---|
| api | ✓ pass |
| web | ✓ pass |
| geo tests | ✓ 59/59 |
