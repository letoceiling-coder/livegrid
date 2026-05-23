# Iteration 17.3 — Viewport Contract RFC

## Mode

ARCHITECTURE RFC · future DTO proposal · 2026-05-22 · **NOT for implementation this iteration**

---

## Purpose

Extend the Iter 15 viewport contract with **truth-preserving geo semantics** so consumers can render, cluster, and paginate without inferring precision from bare `lat`/`lng`.

---

## Current contract (baseline)

```typescript
// viewport-contract.types.ts — Iter 15
type ViewportResponseMeta = {
  prototype: true;
  total: number;       // catalog filter match (no bbox)
  visible: number;     // catalog ∩ bbox
  returned: number;    // rows in this response
  hasMore: boolean;
  cursor: string | null;
  bbox: ViewportBboxMeta;
  zoom: number | null;
  density: number;
  catalogParity: 'shared-where' | 'id-fallback';
  filtersApplied: boolean;
  sortApplied: string;
  geoComposition: 'catalog_and_bbox';
  visibleExact: boolean;  // COUNT accuracy — not coord precision
};
```

**Gap:** No coordinate quality disclosure. Listing markers are `{ id, lat, lng, price, title }`.

---

## Proposed marker DTO

```typescript
type GeoQuality =
  | 'EXACT'
  | 'BUILDING_CENTROID'
  | 'BLOCK_CENTROID'
  | 'MISSING'      // never in marker array — excluded server-side
  | 'INVALID';     // never in marker array

type GeoSource =
  | 'LISTING_ROW'
  | 'BUILDING_GEOMETRY'
  | 'BLOCK_GEOMETRY';

type ViewportGeoMarker = {
  /** WGS84 decimal degrees — display point for this response */
  lat: number;
  lng: number;

  /** Canonical tier — drives clustering and UI rules */
  geoQuality: GeoQuality;

  /** Which entity supplied the coordinates */
  geoSource: GeoSource;

  /** 0.0–1.0 placement confidence — never upgrades tier */
  geoConfidence: number;

  /** Server-computed: client MUST cluster below threshold zoom */
  clusterRequired: boolean;

  /** Minimum zoom for individual (non-clustered) pin */
  minIndividualZoom: number;

  /** Whether "X km away" copy is permitted */
  exactDistanceAllowed: boolean;

  /** Whether turn-by-turn routing to this point is permitted */
  routingAllowed: boolean;

  /** Stable id of geo source entity for dedup/debug */
  geoEntityId?: number;
  geoEntityKind?: 'listing' | 'building' | 'block';
};
```

### Blocks marker (extended)

```typescript
type ViewportBlockMarkerV2 = ViewportGeoMarker & {
  id: number;
  slug: string;
  name: string;
  priceFrom: number | null;
  district: string | null;
  imageUrl: string | null;

  // Blocks are always BLOCK_CENTROID by definition
  geoQuality: 'BLOCK_CENTROID';
  geoSource: 'BLOCK_GEOMETRY';
  geoConfidence: 0.30;
  clusterRequired: boolean;  // computed from zoom + density
  exactDistanceAllowed: false;
  routingAllowed: false;     // JK center, not entrance
};
```

### Listings marker (extended)

```typescript
type ViewportListingMarkerV2 = ViewportGeoMarker & {
  id: number;
  price: string;
  title: string | null;
  photoUrl: string | null;
  blockId: number | null;
  buildingId: number | null;
};
```

---

## Proposed response meta extension

```typescript
type ViewportGeoMeta = {
  /** Breakdown of visible set by tier */
  geoComposition: {
    exact: number;
    buildingCentroid: number;
    blockCentroid: number;
    excludedMissing: number;
    excludedInvalid: number;
  };

  /** Aggregate honesty flags */
  allExact: boolean;           // true only if geoComposition.exact === visible
  anyApproximate: boolean;     // building or block centroid present
  approximateShare: number;    // (building + block) / visible — 0.0–1.0

  /** Highest tier in this response */
  maxGeoQuality: GeoQuality;

  /** Recommended client cluster mode */
  clusterPolicy: 'none' | 'soft' | 'required';
};
```

Merge into `ViewportResponseMeta`:

```typescript
type ViewportResponseMetaV2 = ViewportResponseMeta & {
  geo: ViewportGeoMeta;

  /** Rename for clarity (breaking, future) */
  countExact: boolean;  // replaces visibleExact — count precision only
};
```

---

## Full response shape (example)

```json
{
  "data": [
    {
      "id": 12345,
      "lat": 55.69883,
      "lng": 37.63485,
      "geoQuality": "BLOCK_CENTROID",
      "geoSource": "BLOCK_GEOMETRY",
      "geoConfidence": 0.30,
      "clusterRequired": true,
      "minIndividualZoom": 16,
      "exactDistanceAllowed": false,
      "routingAllowed": false,
      "geoEntityId": 2515,
      "geoEntityKind": "block",
      "price": "12500000",
      "title": "2-комн., 54 м²",
      "photoUrl": null,
      "blockId": 2515,
      "buildingId": 8821
    }
  ],
  "meta": {
    "prototype": true,
    "total": 14917,
    "visible": 6555,
    "returned": 300,
    "hasMore": true,
    "cursor": "12345",
    "bbox": { "sw_lat": 55.6, "sw_lng": 37.4, "ne_lat": 55.9, "ne_lng": 37.9 },
    "zoom": 12,
    "density": 42.5,
    "catalogParity": "shared-where",
    "geo": {
      "geoComposition": {
        "exact": 0,
        "buildingCentroid": 6555,
        "blockCentroid": 0,
        "excludedMissing": 0,
        "excludedInvalid": 0
      },
      "allExact": false,
      "anyApproximate": true,
      "approximateShare": 1.0,
      "maxGeoQuality": "BUILDING_CENTROID",
      "clusterPolicy": "required"
    }
  }
}
```

---

## Server-side resolution rules

### Point selection

```
1. If listing.lat/lng valid AND geo_source indicates EXACT → use listing point
2. Else if building_id + building coords valid → use building point, BUILDING_CENTROID
3. Else if block_id + block coords valid → use block point, BLOCK_CENTROID
4. Else → exclude from data[], increment excludedMissing
```

**Never** use APPROXIMATE_UI_ONLY on server.

### Bbox inclusion

A listing is **visible** iff:
- Resolved tier ∈ { EXACT, BUILDING_CENTROID, BLOCK_CENTROID }
- Resolved point ∈ bbox envelope (ST_Within)
- Passes catalog SQL filters

MISSING/INVALID listings count toward `total` (catalog match) but not `visible`.

### clusterRequired computation

```typescript
function computeClusterRequired(tier: GeoQuality, zoom: number | null): boolean {
  if (tier === 'EXACT') return false;
  if (tier === 'BUILDING_CENTROID') return (zoom ?? 12) < 15;
  if (tier === 'BLOCK_CENTROID') return (zoom ?? 12) < 16;
  return true;
}
```

Server sets flag per marker; client may apply stricter policy.

### exactDistanceAllowed / routingAllowed

| Tier | exactDistanceAllowed | routingAllowed |
|---|---|---|
| EXACT | true | true |
| BUILDING_CENTROID | false | false |
| BLOCK_CENTROID | false | false |

Enforced in DTO — client must not override.

---

## SQL path alignment (future)

Per Iter 16, listings viewport must use:

```
catalogListingWhereToSql(l, la, ...) AND bboxSql(resolved_point)
```

Where `resolved_point` is CASE expression:

```sql
CASE
  WHEN l.lat IS NOT NULL AND l.geo_source IN ('MANUAL','FEED_EXACT')
    THEN ST_MakePoint(l.lng, l.lat)
  WHEN bld.latitude IS NOT NULL
    THEN ST_MakePoint(bld.longitude, bld.latitude)
  WHEN b.latitude IS NOT NULL
    THEN ST_MakePoint(b.longitude, b.latitude)
  ELSE NULL
END
```

**Id-fallback path retired.** Markers include tier from same CASE logic — no drift.

---

## Backward compatibility

| Phase | Strategy |
|---|---|
| Phase 0 (now) | Current DTO unchanged |
| Phase 1 | Add optional `geo` meta block; markers unchanged |
| Phase 2 | Add marker geo fields behind `?geo_contract=v2` query param |
| Phase 3 | v2 default; v1 deprecated |
| Phase 4 | Remove v1 |

Prototype gate (`VIEWPORT_PROTOTYPE_ENABLED`) covers Phases 1–3.

---

## Contract validation extensions (future contract-check)

| Check | Assertion |
|---|---|
| `geo_tier_present` | Every marker has geoQuality |
| `no_ui_fallback_in_api` | No marker with geoConfidence < 0.10 |
| `block_marker_tier` | All block markers are BLOCK_CENTROID |
| `approximate_share_honest` | MSK apartments: approximateShare > 0.99 |
| `missing_excluded_from_visible` | excludedMissing + visible ≤ total |
| `cluster_required_consistent` | BUILDING/BLOCK tiers have clusterRequired=true at zoom<15 |

---

## Non-goals (this RFC)

- No migration adding `geo_source` column
- No backfill of listing coords
- No production DTO deployment
- No frontend consumption

This document is the **target contract** for Iteration 18+ implementation.
