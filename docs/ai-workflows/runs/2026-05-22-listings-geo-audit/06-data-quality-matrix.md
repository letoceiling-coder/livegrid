# Iteration 16.6 — Data Quality Matrix

## Mode

DATA PLATFORM AUDIT · classification strategy · 2026-05-22

---

## Purpose

Define geo quality tiers for listings so viewport, map, and catalog can make **honest** spatial claims. No tier should be silently upgraded.

---

## Classification matrix

| State | DB representation | Meaning | Map marker trust | Viewport eligible? |
|---|---|---|---|---|
| **EXACT** | `listings.lat/lng` set, `data_source=MANUAL` or verified | Human or verified unit-level placement | Trustworthy pin | ✓ Yes |
| **BUILDING_CENTROID** | `listings.lat/lng` NULL; `building_id` → `buildings.latitude/longitude` | Building footprint center | Approximate — correct building, wrong floor/unit | ✓ With `geoQuality` flag |
| **BLOCK_CENTROID** | `listings.lat/lng` NULL; `building_id` NULL or building coords unavailable; `block_id` → `blocks.latitude/longitude` | JK/complex center | Approximate — all units stack | ✓ With cluster + `geoQuality` flag |
| **INFERRED** | Computed at runtime (e.g. `fallbackCoords()` spiral) | **Not real geo** | Dangerous — arbitrary offset | ✗ **Never** |
| **MISSING** | No listing coords AND no resolvable block/building FK | Unknown location | Excluded | ✗ No |
| **INVALID** | Coords outside WGS84 bounds or (0,0) | Corrupted | Excluded | ✗ No |

---

## Current population by tier (measured)

| Tier | Count | % of total | % of active MSK apartments |
|---|---:|---:|---:|
| EXACT | 56 | 0.07% | 0% |
| BUILDING_CENTROID (available via FK, not stored) | 75,998 | 96.7% | ~99%+ |
| BLOCK_CENTROID (available via FK, not stored) | 14,917 | 19.0% | 100% |
| INFERRED (frontend only) | unbounded | — | secondary without coords |
| MISSING | 11 (no block, no coords) | 0.01% | ~0% |
| INVALID | 0 | 0% | 0% |

Note: BUILDING and BLOCK tiers overlap — apartments with `building_id` should prefer building centroid over block.

---

## Assignment algorithm (proposed — not implemented)

```
function classifyListingGeo(listing):
  if listing.lat && listing.lng && isValidWGS84(listing.lat, listing.lng):
    return EXACT

  if listing.buildingId:
    coords = lookupBuildingCoords(listing.buildingId)
    if coords && isValidWGS84(coords):
      return BUILDING_CENTROID

  if listing.blockId:
    coords = lookupBlockCoords(listing.blockId)
    if coords && isValidWGS84(coords):
      return BLOCK_CENTROID

  return MISSING
```

**Never** assign INFERRED in API responses. Reserve for legacy frontend display with explicit `approximate: true` UI badge if retained.

---

## Viewport response contract extension (future)

When geo normalization is implemented, markers should expose quality:

```typescript
type ViewportListingMarker = {
  id: number;
  lat: number;
  lng: number;
  geoQuality: 'EXACT' | 'BUILDING_CENTROID' | 'BLOCK_CENTROID';
  price: string;
  // ...
};
```

Enables client-side clustering policy:
- `EXACT` → individual pin
- `BUILDING_CENTROID` → pin with building offset jitter optional
- `BLOCK_CENTROID` → must cluster above z13

---

## Clustering requirements by tier

| Tier | Max listings per point (observed) | Cluster threshold |
|---|---:|---|
| EXACT | 1 | None |
| BUILDING_CENTROID | ~10–50 per building | z < 15 |
| BLOCK_CENTROID | **705** (ЗилАрт) | z < 14 mandatory |

---

## Data quality gates (pre-viewport enablement)

| Gate | Threshold | Current |
|---|---|---|
| Active catalog with resolvable geo (BLOCK or better) | ≥ 95% | **100%** (via FK) |
| Active catalog with EXACT geo | ≥ 0% (optional) | 0% MSK |
| INVALID coords | 0 | ✓ 0 |
| INFERRED coords in API | 0 | ✓ 0 (frontend only) |
| Listing.lat/lng populated for FEED | policy decision | 0% |

**Key insight:** Parent-entity geo coverage is excellent. Listing-row geo coverage is zero. The gate that blocks viewport is **denormalization policy**, not upstream feed quality.

---

## What NOT to do

| Action | Why forbidden |
|---|---|
| Copy block coords to `listings.lat/lng` silently | Misrepresents as EXACT |
| Use `fallbackCoords()` in API | INFERRED tier — fake geo |
| Enable viewport without `geoQuality` | Users cannot distinguish stacked JK pins |
| Backfill production in this iteration | Out of audit scope |

---

## Summary

The platform has **three layers of geo truth** today:

1. **Stored listing point** — nearly empty, only manual entries
2. **Parent entity centroid** — complete, approximate, JOIN-resolvable
3. **Frontend spiral** — legacy display hack, not data

Viewport architecture must declare which layer it uses and expose quality explicitly.
