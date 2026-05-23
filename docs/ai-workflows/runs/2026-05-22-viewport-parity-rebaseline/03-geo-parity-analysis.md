# Iteration 24.3 — Geo Parity Analysis

## Mode

VIEWPORT VALIDATION · 2026-05-22

---

## Coordinate source (post-materialization)

| geo_source | Count (region 1) | Origin |
|---|---:|---|
| BUILDING_INHERIT | 75,851 | Building centroid |
| BLOCK_INHERIT | 416 | Block centroid |

All viewport listing coords are **inherited centroids** — deterministic from Iter 19 resolver.

---

## Bbox SQL parity

Both legacy client filter and viewport API use WGS84 envelope:

```sql
ST_Within(
  ST_SetSRID(ST_MakePoint(l.lng, l.lat), 4326),
  ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)
)
```

Legacy in-memory filter uses simple lat/lng bounds — equivalent for axis-aligned bbox.

**Result:** visible counts match exactly (visibleDelta = 0).

---

## Geo radius parity (5km from Kremlin)

| Metric | Legacy | Viewport |
|---|---:|---:|
| geoTotal | 421 | 421 |
| visible in moscow bbox | 421 | 421 |
| ID overlap | 421/421 | **100%** |

ST_DWithin on blocks → listing filter via shared geo resolution. No drift detected.

---

## Centroid correctness

Resolver parity sample (Iter 23): **200/200** materialized rows match resolver RESOLVED output.

Inherited coords consistent with parent building/block lat/lng at materialization time.

---

## Distance drift analysis

No systematic drift observed. Sample spot-check: building centroid coords match parent entity within 6-decimal precision (resolver COORD_EQUALITY_DECIMALS).

---

## Density grouping

| Scenario | Legacy density (visible/deg²) | Viewport density |
|---|---:|---:|
| moscow_wide | ~6533 / 0.09 ≈ 72k | identical |
| moscow_center_tight | 59 / 0.001 ≈ 59k | identical |

Same IDs → same cluster input when full set used.

---

## Verdict

**Geo parity: PASS** — bbox, radius, and centroid semantics aligned.
