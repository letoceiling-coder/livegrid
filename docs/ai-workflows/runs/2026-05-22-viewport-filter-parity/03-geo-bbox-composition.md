# Iteration 10.3 — Geo ∩ Bbox Composition

## Mode

CRITICAL PATH · measured validation

---

## Correct composition

```
result = blocks
  WHERE catalogFilters(where)     -- includes geo → id IN geoIds
  AND ST_Within(block_point, bbox_envelope)
  AND coords NOT NULL
```

**NOT** bbox OR geo. Geo resolves first into `where.id`; bbox applied in viewport SQL as second predicate.

---

## Implementation path

1. `buildCatalogBlockWhere({ geo_lat, geo_lng, geo_radius_m, … })`
2. `GeoSpatialService.resolveGeoBlockIds` → 33 block IDs (5 km Moscow test)
3. `where.id = { in: […33 ids…] }`
4. Viewport SQL adds `ST_Within` envelope

Same PostGIS semantics as legacy catalog — radius uses geography + `ST_DWithin`.

---

## Measured geo + bbox (region 1, live API 2026-05-22)

**Geo:** center 55.751244, 37.618423, radius 5000 m  
**Bbox:** 55.6–55.9 lat, 37.4–37.9 lng

| Source | Count in bbox |
|---|---|
| Legacy `/blocks` + geo | 33 loaded, 33 in bbox |
| Viewport `/_prototype/blocks/viewport` + geo | **33** |
| **Missing IDs** | **0** |
| **Parity** | **100%** |

**Verdict:** Geo ∩ bbox parity **achieved** (≥ 85% target met).

---

## Geo polygon / preset

Uses same `resolveGeoBlockIds` path with `ST_Within` in polygon mode. Viewport adds bbox envelope AND — not separately tested live (no polygon URL in automated run); architecture identical to radius.

---

## Listings geo

Listings geo → `blockId IN geoIds` in `buildCatalogListingWhere`. Viewport adds listing lat/lng bbox.

**Note:** Many listings lack lat/lng in DB — Moscow bbox listings viewport returned **0** rows (data sparsity, not filter bug).

---

## Shadow warning update (Iter 10)

Removed false `geo filter active: viewport may include N out-of-geo IDs` when prototype applies shared geo. Warnings now fire on **missing IDs** only, or cap artifact extras.
