# Iteration 19.2 — Resolution Rules

## Mode

DATA PLATFORM IMPLEMENTATION · normative behavior · 2026-05-22

---

## Precedence (strict order)

| Step | Condition | Result |
|---:|---|---|
| 1 | Non-finite number input OR invalid WGS84 | `INVALID` |
| 2 | `lat/lng` + `geoSource` + `geoQuality` valid combo | `RESOLVED` materialized |
| 2b | Stored combo invalid | `INVALID` (STORED_COMBO_INVALID) |
| 3 | `lat/lng` present, `geoSource` absent | `SHADOW_UNCLASSIFIED` |
| 3b | `lat/lng` present, `geoQuality` absent | `SHADOW_UNCLASSIFIED` |
| 4 | `buildingId` + valid parent building coords | `BUILDING_INHERIT` |
| 5 | `blockId` + valid parent block coords | `BLOCK_INHERIT` |
| 6 | Else | `MISSING` |

**Never:** APPROXIMATE_UI_ONLY, fallbackCoords, inferred EXACT from `dataSource`.

---

## Building > block

When both FKs and parent coords exist, step 4 wins before step 5.

---

## Stored EXACT immunity

When step 2 returns `geoQuality: EXACT`, parent inherit is **not** evaluated — even if building/block coords differ.

---

## Source ↔ quality combos

| GeoSource | GeoQuality |
|---|---|
| MANUAL_EXACT | EXACT |
| FEED_EXACT | EXACT |
| GEOCODE_VERIFIED | EXACT |
| GEOCODE_APPROXIMATE | BUILDING_CENTROID |
| BUILDING_INHERIT | BUILDING_CENTROID |
| BLOCK_INHERIT | BLOCK_CENTROID |
| UNKNOWN | BUILDING_CENTROID or BLOCK_CENTROID |

Invalid stored combo → `INVALID`.

---

## Confidence defaults

| Source | Value |
|---|---:|
| MANUAL_EXACT | 0.95 |
| FEED_EXACT | 0.90 |
| GEOCODE_VERIFIED | 0.85 |
| GEOCODE_APPROXIMATE | 0.55 |
| BUILDING_INHERIT | 0.50 |
| BLOCK_INHERIT | 0.30 |
| UNKNOWN | 0.20 |

---

## Materialized flag

| Path | `materialized` |
|---|---|
| STORED_MATERIALIZED | `true` |
| BUILDING_INHERIT / BLOCK_INHERIT | `false` |
| SHADOW_UNCLASSIFIED | N/A |

---

## WGS84 rules

Rejected:

- NaN, ±Infinity
- lat ∉ [-90, 90]
- lng ∉ [-180, 180]
- (0, 0) null island

Coord equality for legacy match: **6 decimal places** (`COORD_EQUALITY_DECIMALS`).

---

## Resolution version

`GEO_RESOLUTION_VERSION = 1` — included on every result for future re-materialization tracking.
