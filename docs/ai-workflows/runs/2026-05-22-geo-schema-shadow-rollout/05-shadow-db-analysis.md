# Iteration 20.5 — Shadow DB Analysis

## Mode

SCHEMA GOVERNANCE · read-only · 2026-05-22 · `lg_development`

---

## Methodology

1. SQL aggregates on active published region 1 (MSK)
2. Full resolver shadow pass (14,917 listings) — **read only, no writes**
3. Sample limit 2,000 for contract-check probe (first by id)

---

## Schema state (MSK active published, n=14,917)

| Metric | Count |
|---|---:|
| geo_source populated | **0** |
| geo_quality populated | **0** |
| lineage_populated (both) | **0** |
| lat/lng on listing row | **0** |

Global: 56 listings with lat/lng (region 7 manual — outside MSK sample).

---

## SQL resolvable (parent FK, no listing coords required)

| Path | Count |
|---|---:|
| Via building FK + building coords | **14,917** |
| Via block FK only | **0** |

100% of MSK active apartments have `building_id` with building coordinates.

---

## Full resolver shadow breakdown (region 1, n=14,917)

| Resolver outcome | Count |
|---|---:|
| BUILDING_INHERIT (materialized=false) | **14,917** |
| BLOCK_INHERIT | 0 |
| SHADOW_UNCLASSIFIED | 0 |
| STORED_MATERIALIZED | 0 |
| MISSING | 0 |
| INVALID | 0 |

---

## Interpretation

- Normalization **would** resolve all MSK feed apartments via BUILDING_INHERIT
- No materialization performed — resolver runs in memory only
- Legacy 56 global coords (non-MSK) would hit SHADOW_UNCLASSIFIED when sampled

---

## Implication for materialization (future)

Expected MSK post-normalization:

```
geo_source = BUILDING_INHERIT
geo_quality = BUILDING_CENTROID
geo_entity_kind = BUILDING
geo_entity_id = buildings.id
lat/lng = building centroid (denormalized cache)
```

**Not executed in Iter 20.**
