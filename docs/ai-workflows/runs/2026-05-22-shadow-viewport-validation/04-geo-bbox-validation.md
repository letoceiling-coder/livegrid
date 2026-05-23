# Iteration 9.4 — Geo + Bbox Validation

## Mode

Critical path audit · measured geo drift · shadow warnings

---

## Production Geo Flow (Legacy)

```
URL geo_* params
  → blocks queryKey includes geo
  → buildBlocksSearchParams({ geo: { geoLat, geoLng, geoRadius, geoPolygon, geoPreset }})
  → GET /blocks
  → GeoSpatialService.resolveGeoBlockIds (PostGIS radius/polygon)
  → Prisma catalog where ∩ geo block IDs
  → max 200 rows returned
```

Listings mode: geo in URL; queryKey includes geo (post-Iter 5). Geo resolution differs — listings may use block join.

---

## Viewport Prototype Geo Flow

```
GET /_prototype/blocks/viewport?region_id&sw_lat&…&ne_lat&…
  → SQL: region_id + ST_Within(point, envelope) ONLY
  → geo_* params forwarded from client but NOT applied in SQL
```

**Known composition gap:** `bbox ∩ geo_filter` not implemented.

---

## Measured Geo Scenario (region 1)

**Geo filter:** center `55.751244, 37.618423`, radius `5000 m`

| Metric | No geo | Geo 5 km |
|---|---|---|
| API rows | 200 | **33** |
| meta.total | 359 | **33** |
| Wire bytes | 900 142 | **171 134** |
| Response time | ~327 ms | **~1.5 s** (cold geo PostGIS) |
| Legacy in Moscow bbox | 101 / 200 | **33 / 33** |
| Bbox coverage | 50.5% | **100%** |

---

## Expected Shadow Behavior (geo active)

When `geo_lat`, `geo_lng`, `geo_radius_m` present in `filterSearchParams`:

1. `shadowGeoActive = true`
2. Legacy `legacyInBbox` ≤ 33 (all geo-filtered rows in bbox)
3. Viewport prototype returns **all blocks in bbox** (~101+ without geo filter in SQL)
4. `extraInViewport` ≈ |viewport bbox| − |legacy geo ∩ bbox| — **large**
5. Warning: `geo filter active: viewport may include N out-of-geo IDs`

**This is correct mismatch detection, not a false positive.**

---

## Geo + Bbox Test Matrix

| Test | Legacy | Viewport prototype | Expected parity |
|---|---|---|---|
| Geo radius only | Geo-filtered set | Bbox-only superset | **Low** |
| Geo + pan outside geo center | Legacy unchanged until refetch | Viewport follows bbox | Parity varies |
| Geo polygon | Same as radius | Bbox-only | **Low** |
| Region switch + geo | New region refetch | New region bbox query | Reset metrics |
| Search + geo + bbox | Triple-filtered legacy | Bbox-only | **Very low** |
| Clear geo | 200 rows | Bbox superset | Partial |

---

## Geo Polygon

URL param: `geo_polygon` (encoded polygon). Legacy resolves via `GeoSpatialService` → block ID set.

Prototype: **ignores** `geo_polygon`. Shadow reports `filterMismatchWarning` when param present.

Manual verification: apply polygon preset in map UI with `viewport_debug=1` → confirm warning + red parity.

---

## Region Switch + Geo

On region change:

- `regionId` updates → legacy refetch + shadow hook deps
- `combinedShadowSignature` includes filter params
- Bbox listener re-fires on map `boundschange`

**Expected:** metrics reset; no cross-region ID contamination.

---

## Listings Geo Caveats

Secondary apartments without real coords use `fallbackCoords()` spiral — bbox filter operates on **synthetic** coordinates.

| Issue | Shadow impact |
|---|---|
| Fake coords | Bbox membership meaningless for some listings |
| Geo on listings | Block-centric geo may not match listing lat/lng |

Listings shadow parity with geo requires separate audit — flag as **lower confidence**.

---

## Recommended Production Geo Composition (future)

```sql
WHERE region_id = $R
  AND ST_Within(point, envelope(bbox))
  AND (
    $geo_block_ids IS NULL
    OR block_id = ANY($geo_block_ids)
  )
```

Until implemented, geo+bbox parity **cannot** reach production threshold.

---

## Verdict

| Item | Status |
|---|---|
| Geo drift detection | **Working** via shadow warnings |
| Geo + bbox correctness | **NOT READY** — prototype ignores geo |
| Legacy geo path | **Stable** — unchanged |
| False parity claims | **Prevented** — explicit warnings |
