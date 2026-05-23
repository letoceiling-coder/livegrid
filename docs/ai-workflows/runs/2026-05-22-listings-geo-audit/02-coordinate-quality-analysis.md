# Iteration 16.2 — Coordinate Quality Analysis

## Mode

DATA PLATFORM AUDIT · measured on `lg_development` · 2026-05-22

---

## Scope

Analysis covers the **56 listings with stored coordinates** plus **parent-entity coords** available via FK for the 14,917 Moscow apartments lacking listing-level geo.

---

## Listing-level coords (n=56)

### Validity

| Check | Count |
|---|---:|
| Invalid lat (< −90 or > 90) | 0 |
| Invalid lng (< −180 or > 180) | 0 |
| Zero coords (0, 0) | 0 |

All 56 stored coords are **within valid WGS84 bounds**.

### Precision

| Metric | Count |
|---|---:|
| lat with 0 decimal places (whole degrees) | 0 |
| lng with 0 decimal places | 0 |
| lat with ≥ 4 decimal places | 56 |

Stored precision is **sub-meter to ~10 m** — adequate for map markers.

### Duplicate clusters

No coordinate pair hosts > 10 active published listings. Duplication is not a problem at listing level (sample too small).

### Geographic distribution

All 56 coords are in **region 7** (Belgorod oblast, ~50.4–50.6°N, 36.5–36.7°E).  
10 are `APARTMENT` (manual); 46 are `HOUSE`/`LAND`.

**Moscow listing coords: zero.**

---

## Parent-entity coords (available but not on listing row)

### Block centroids (region 1)

| Metric | Value |
|---|---:|
| Blocks with coords | 1,336 / 1,336 |
| Max apartments sharing one block coord | **705** (ЖК «ЗилАрт») |
| Blocks with > 50 apartments at same point | 10+ |

Top block clusters:

| Block | lat | lng | Apartments |
|---|---:|---:|---:|
| ЗилАрт | 55.6988 | 37.6348 | 705 |
| Лучи | 55.6451 | 37.3891 | 582 |
| Прокшино | 55.5927 | 37.4264 | 537 |
| Вейв | 55.6369 | 37.7087 | 394 |
| Большое Юрлово | 55.9019 | 37.2543 | 392 |

Using block centroids as listing coords would create **massive marker overlap** — clustering is mandatory, not optional.

### Building coords vs block coords

| Metric | Count |
|---|---:|
| Listings with `building_id` (region 1, APARTMENT) | 75,998 |
| Building coord ≠ block coord | **75,998 (100%)** |

Every building has its own geometry centroid, distinct from the block centroid. Building-level coords are **more precise than block centroids** but still represent building footprint center, not unit location.

### Hypothetical bbox coverage (Moscow, via block join)

| Path | Count in bbox (55.6–55.9, 37.4–37.9) |
|---|---:|
| `listings.lat/lng` direct | **0** |
| `blocks.latitude/longitude` via `block_id` | **6,555** |

Geo data exists in the system — it is simply **not on the listing row**.

---

## Staleness

| Metric | Count |
|---|---:|
| FEED listings with NULL coords | 78,540 |
| FEED listings ever receiving coord update | 0 |

Import upserts refresh price, FKs, status — but never touch `lat`/`lng`. Coords are not stale; they were **never written**.

---

## Precision quality matrix (preliminary)

| Source | SRID | Precision | Trust for unit marker |
|---|---|---|---|
| `listings.lat/lng` (MANUAL) | implicit 4326 | 6–8 dp | High (if manually placed) |
| `blocks.latitude/longitude` | implicit 4326 | 6–8 dp | Approximate (JK centroid) |
| `buildings.latitude/longitude` | implicit 4326 | 6–8 dp | Approximate (building centroid) |
| `fallbackCoords()` frontend | N/A | ~2 km spiral | **Not geo data** |

See `06-data-quality-matrix.md` for full classification strategy.

---

## Conclusions

1. **Stored listing coords are valid but negligible** — 0.07% coverage, none in primary region.
2. **Block/building parent coords are complete and valid** — suitable as *approximate* display geo after explicit normalization policy.
3. **Duplicate-coordinate density is extreme at block level** — viewport must cluster or aggregate; individual pin-per-listing at block centroid is misleading.
4. **Building coords differ from block coords universally** — if normalizing, building-level is strictly better than block-level when `building_id` is present.
