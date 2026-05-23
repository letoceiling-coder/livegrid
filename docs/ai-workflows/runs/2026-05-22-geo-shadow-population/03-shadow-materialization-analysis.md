# Iteration 21.3 — Shadow Materialization Analysis

## Mode

SHADOW NORMALIZATION · measured · `lg_development` · 2026-05-22

---

## Full-table dry-run (all regions)

```
pnpm --filter api geo:dry-run
processed=78,602  duration=5,986ms  hash=5cdbb712284bfbb4
```

| Metric | Count | % |
|---|---:|---:|
| WOULD_WRITE_BUILDING | **75,998** | 96.7% |
| WOULD_WRITE_BLOCK | **416** | 0.5% |
| EXACT_PRESERVED | 0 | 0% |
| SHADOW_UNCLASSIFIED | **56** | 0.07% |
| INVALID | 0 | 0% |
| MISSING | **2,132** | 2.7% |
| DANGEROUS_OVERWRITE | **0** | 0% |
| LINEAGE_CONFLICT | **0** | 0% |
| UNCHANGED | 0 | 0% |

---

## Region 1 (MSK) scoped dry-run

```
--region=1  processed=78,543  duration=4,780ms  goNoGo=GO
```

| Metric | Count |
|---|---:|
| WOULD_WRITE_BUILDING | 75,998 |
| WOULD_WRITE_BLOCK | 416 |
| SHADOW_UNCLASSIFIED | 0 |
| MISSING | 2,129 |

All 56 legacy coord rows are **outside region 1** (Belgorod/manual region 7).

---

## Schema state (unchanged)

| Field | Before | After |
|---|---:|---:|
| geo_source populated | 0 | 0 |
| geo_quality populated | 0 | 0 |
| lat/lng rows | 56 | 56 |
| lineage_populated | 0 | 0 |

**Proof: zero DB mutations.**

---

## Interpretation

### Safe bulk path (96.7%)

76,414 listings would receive inherit coords via BUILDING_INHERIT or BLOCK_INHERIT. No stored coords to overwrite. This is the expected MSK feed apartment population.

### Human review path (0.07%)

56 listings with legacy manual coords need classification review before materialization. Stub suggests lineage but does not auto-classify UNKNOWN sources.

### No-op path (2.7%)

2,132 listings have no building/block resolvable parent coords. Materialization would skip (MISSING). These require upstream geo enrichment, not blind inherit.

---

## Expected post-materialization state (simulated, NOT executed)

If inherit-only scope approved:

```
geo_source = BUILDING_INHERIT | BLOCK_INHERIT
geo_quality = BUILDING_CENTROID | BLOCK_CENTROID
geo_entity_id = buildings.id | blocks.id
lat/lng = parent centroid (denormalized cache)
geo_resolution_version = 1
```

76,414 rows would change. **Not executed in Iter 21.**
