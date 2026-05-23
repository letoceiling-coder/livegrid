# Iteration 23.6 — Shadow Viewport Validation

## Mode

CONTROLLED STAGING · no production enablement · 2026-05-22

---

## Viewport listings impact (MSK)

| Metric | Pre-materialization | Post-materialization |
|---|---:|---:|
| total (active published, has coords) | **0** | **14,888** |
| visible (Moscow bbox 55.6–55.9, 37.4–37.9) | **0** | **6,533** |
| returned (limit 500) | 0 | up to 500 |

**Transformative change:** viewport listings prototype can now return real coords for MSK feed apartments.

---

## Viewport query path (unchanged)

`findListingsInViewport()` still uses:

```sql
WHERE lat IS NOT NULL AND lng IS NOT NULL
```

No code changes — materialization populates the missing coords that blocked the path since Iter 16.

---

## Contract-check probes

| Probe | Post-materialization result |
|---|---|
| listings_moscow_bbox_meta | total=14888 visible=6533 |
| post_materialization_viewport_listings | total>0 visible>0 ✓ |
| shadow_db_lineage_sample | lineage_populated=76267 mode=materialized |
| geo resolver probes (5) | unchanged ✓ |

---

## Bbox parity

Materialized coords derive from building/block centroids — consistent with parent entity locations. No random coord injection.

---

## Density behavior

| Metric | Value |
|---|---|
| Viewport density (visible/bbox area) | Non-zero for first time |
| Cluster distribution | Not modified (frontend unchanged) |
| fallbackCoords | Still present — not removed |

---

## Explicit non-changes

| Component | Status |
|---|---|
| Frontend viewport switch | ✗ not enabled |
| RedesignMap.tsx | ✗ unchanged |
| MapDevOverlay | ✗ unchanged |
| Cluster layer | ✗ unchanged |
| Production viewport | ✗ not deployed |

---

## Shadow comparison summary

Post-materialization shadow parity now meaningful for listings layer:

- Legacy path: catalog fetch + client filter (had 0 coords)
- Prototype path: can now return 14,888 geo-qualified listings
- Parity measurement requires re-baseline (Iter 24 recommendation)

---

## Viewport enablement gate

Materialization prerequisite **MET** for MSK. Frontend viewport switch remains blocked pending dedicated enablement iteration with parity re-baseline.
