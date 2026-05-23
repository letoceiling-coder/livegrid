# Iteration 17.2 — Geo Tier Definitions

## Mode

ARCHITECTURE RFC · canonical semantics · 2026-05-22

---

## Purpose

Define the **six-tier GEO CONTRACT** with strict meaning, derivation rules, and allowed usage. These tiers are normative for all future viewport, API, UI, search, and analytics work.

---

## Tier enum

```typescript
type GeoQuality =
  | 'EXACT'
  | 'BUILDING_CENTROID'
  | 'BLOCK_CENTROID'
  | 'APPROXIMATE_UI_ONLY'
  | 'MISSING'
  | 'INVALID';
```

---

## EXACT

### Definition

Coordinates represent the **best known location of the specific listing/object** — manually placed, survey-grade feed geometry, or verified geocode of the unit address with confirmed match.

### Derivation rules

| Condition | Source |
|---|---|
| `listings.lat/lng` set AND `data_source = MANUAL` AND valid WGS84 | Listing row |
| Future: feed adds per-unit geometry | Feed geometry → listing row |
| Future: verified geocode with match score ≥ threshold | Geocode service |

### Coordinate precision

≥ 4 decimal degrees (~11 m) required. Sub-meter precision allowed but not required.

### Allowed usage

| Capability | Allowed |
|---|---|
| Individual map pin | ✓ |
| Viewport bbox inclusion | ✓ |
| Distance sorting ("nearest first") | ✓ |
| Radius search center | ✓ |
| Turn-by-turn routing destination | ✓ (with usual map ToS) |
| Analytics spatial aggregation | ✓ |
| Legal "object location" claims | ✓ (with source attribution) |

### Prohibited

- Must not be assigned via silent copy from block/building
- Must not be inferred from list index or region center

---

## BUILDING_CENTROID

### Definition

Coordinates are the **centroid of the building footprint polygon** (or Point geometry) from FEED. Represents the building, not the individual apartment unit.

### Derivation rules

| Condition | Source |
|---|---|
| `listings.building_id` → `buildings.latitude/longitude` | Building row |
| Used when building coords exist AND listing has no EXACT coords | Precedence over BLOCK |

Iter 16: 75,998 region-1 apartments have building coords; 100% differ from block centroid.

### Typical precision

~10–50 m from true unit location depending on building size.

### Allowed usage

| Capability | Allowed |
|---|---|
| Individual pin at zoom ≥ 15 | ✓ (with badge) |
| Clustered pin at zoom < 15 | ✓ **required** |
| Viewport bbox inclusion | ✓ |
| Approximate routing ("near building") | ✓ |
| JK-level area search | ✓ |
| Distance sorting with precision claim | ✗ |
| "Exact location" UI copy | ✗ |
| Turn-by-turn to unit | ✗ |

### Prohibited

- Exact distance claims ("500 m from metro" computed from centroid)
- Pin-per-unit at high zoom without disclosure
- Storing as EXACT in listing row without `geo_source` audit trail

---

## BLOCK_CENTROID

### Definition

Coordinates are the **centroid of the residential complex (JK) polygon** from FEED. All units in the JK share this point unless BUILDING or EXACT tier applies.

### Derivation rules

| Condition | Source |
|---|---|
| `listings.block_id` → `blocks.latitude/longitude` | Block row |
| Block viewport markers | Block row directly |
| Used when no EXACT, no building coords | Lowest resolvable tier |

Iter 16: up to **705 apartments** share one block point (ЗилАрт).

### Allowed usage

| Capability | Allowed |
|---|---|
| Cluster-only rendering (zoom < 16) | ✓ **required** |
| JK-level map mode (one pin per complex) | ✓ |
| Viewport bbox inclusion | ✓ (counts listing as "in area") |
| Catalog geo filter (blockId IN geoZone) | ✓ (already implemented) |
| Individual apartment pin at any zoom | ✗ |
| Distance sorting | ✗ |
| Routing | ✗ |
| "Apartment location" on detail page without badge | ✗ |

### Prohibited

- Individual listing pins at zoom ≥ 16 without cluster/coalesce
- Materializing to `listings.lat/lng` without `geo_source = BLOCK_CENTROID`

---

## APPROXIMATE_UI_ONLY

### Definition

Coordinates exist **only for legacy visual placement** on the client. Not derived from any authoritative source. **Not geo data.**

### Current instances

| Instance | Mechanism |
|---|---|
| `fallbackCoords()` | Spiral offset from `region.mapCenterLat/Lng` by list index |
| Used when | `marketType === 'secondary'` AND listing has no lat/lng |

```typescript
// RedesignMap.tsx — NOT geo data
const radius = 0.018 * ring;  // ~2 km per ring
return [center[0] + sin(angle) * radius, center[1] + cos(angle) * radius];
```

### Allowed usage

| Capability | Allowed |
|---|---|
| Legacy map visual placeholder | ✓ (existing production, pending deprecation) |
| Viewport API | ✗ **Never** |
| Search / geo filters | ✗ |
| Analytics | ✗ |
| Bbox queries | ✗ |
| Distance / routing | ✗ |
| Persistence to DB | ✗ |
| Materialization to listing row | ✗ |

### Migration path

Replace with MISSING tier behavior (no pin) OR honest BLOCK_CENTROID with badge when block FK exists. Remove spiral fallback in viewport era.

---

## MISSING

### Definition

No resolvable coordinates at any tier. Object cannot be placed on a map truthfully.

### Derivation rules

| Condition | Result |
|---|---|
| No listing lat/lng AND no block/building FK with coords | MISSING |
| Nullable FK but parent row has NULL coords | MISSING |
| EXACT tier validation failed | MISSING (not INVALID unless coords present but bad) |

Iter 16: 11 listings globally have no block and no coords.

### Allowed usage

| Capability | Allowed |
|---|---|
| Exclude from map | ✓ **required** |
| Show in list/catalog sidebar | ✓ |
| Viewport bbox | ✗ (excluded from visible count) |
| Geo filters via blockId | ✗ (unless block exists) |

### UI behavior

- No map pin
- Optional "Location unavailable" in detail
- Include in `meta.geoMissingCount` (future observability)

---

## INVALID

### Definition

Coordinates exist but fail WGS84 validation or known corruption patterns.

### Detection rules

```typescript
function isInvalidGeo(lat: number, lng: number): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return true;
  if (lat < -90 || lat > 90) return true;
  if (lng < -180 || lng > 180) return true;
  if (lat === 0 && lng === 0) return true;  // null island
  return false;
}
```

Iter 16: 0 invalid coords in current DB.

### Allowed usage

Same as MISSING — **exclude everywhere**. Log for data quality alerting.

---

## Tier precedence (resolution algorithm)

```
function resolveGeoQuality(listing): GeoQuality {
  if (listing.lat != null && listing.lng != null) {
    if (isInvalidGeo(listing.lat, listing.lng)) return 'INVALID';
    if (listing.geoSource === 'MANUAL' || listing.geoSource === 'FEED_EXACT')
      return 'EXACT';
    if (listing.geoSource === 'BUILDING_INHERIT') return 'BUILDING_CENTROID';
    if (listing.geoSource === 'BLOCK_INHERIT') return 'BLOCK_CENTROID';
    // Ambiguous stored coords without geo_source → treat as BLOCK_CENTROID max
    return 'BUILDING_CENTROID';  // conservative downgrade pending audit
  }

  if (listing.buildingId) {
    const b = lookupBuilding(listing.buildingId);
    if (b?.latitude != null && !isInvalidGeo(b.latitude, b.longitude))
      return 'BUILDING_CENTROID';
  }

  if (listing.blockId) {
    const b = lookupBlock(listing.blockId);
    if (b?.latitude != null && !isInvalidGeo(b.latitude, b.longitude))
      return 'BLOCK_CENTROID';
  }

  return 'MISSING';
}
```

**APPROXIMATE_UI_ONLY is never assigned by server resolution.** Client may compute locally but must not emit to API.

---

## geoSource (companion field — future)

| geoSource | Maps to tier |
|---|---|
| `MANUAL` | EXACT |
| `FEED_EXACT` | EXACT |
| `GEOCODE_VERIFIED` | EXACT |
| `BUILDING_GEOMETRY` | BUILDING_CENTROID |
| `BLOCK_GEOMETRY` | BLOCK_CENTROID |
| `UI_FALLBACK` | APPROXIMATE_UI_ONLY (client-only) |

---

## geoConfidence (companion field — future)

Numeric 0.0–1.0 indicating placement confidence:

| Tier | Default confidence |
|---|---:|
| EXACT (manual) | 0.95 |
| EXACT (geocode) | 0.70–0.90 (match-score scaled) |
| BUILDING_CENTROID | 0.50 |
| BLOCK_CENTROID | 0.30 |
| APPROXIMATE_UI_ONLY | 0.05 |
| MISSING / INVALID | 0.00 |

Used for observability and sort tie-breaking — **not** for upgrading tier.

---

## Contract invariants

1. **Tier is immutable within a response** — same listing always resolves to same tier for same DB state
2. **Tier downgrade only** — never promote BLOCK → EXACT without explicit source
3. **lat/lng alone never implies EXACT** — tier must accompany coordinates in API
4. **APPROXIMATE_UI_ONLY never crosses API boundary**
5. **Viewport counts MISSING/INVALID as excluded from `visible`**
