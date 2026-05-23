# Iteration 17.1 — Current Geo Semantics Audit

## Mode

ARCHITECTURE RFC · read-only audit · 2026-05-22 · post-Iteration 16

---

## Purpose

Document how geo truth is represented, transformed, and **leaked** across the stack today — before defining the formal GEO CONTRACT.

---

## Entity geo model (database)

| Entity | Columns | Population | Intended semantics |
|---|---|---|---|
| `blocks` | `latitude`, `longitude` | 100% FEED (geometry centroid) | JK/complex center — **BLOCK_CENTROID** |
| `buildings` | `latitude`, `longitude` | 100% FEED (geometry centroid) | Building footprint center — **BUILDING_CENTROID** |
| `listings` | `lat`, `lng` | 0.07% (MANUAL only) | Unit-level — **EXACT** when set |

Per `PROJECT_PLAN.md` and Iter 16: apartment feed has no geometry; geo resolves via FK at read time, not on listing row.

---

## API layer truth map

### Catalog geo filters (truth-safe)

`GeoSpatialService.resolveGeoBlockIds()` operates on **blocks only**:

- Radius: `ST_DWithin` on block points
- Polygon/preset: `ST_Within` on block points
- Returns block IDs → `listings.blockId IN (...)` or blocks query

**Semantics:** Geo filter means "listing belongs to a JK in zone" — not "listing pin is in zone." Correct for FEED apartments.

### Listings `has_geo` filter

```typescript
if (query.has_geo) {
  where.lat = { not: null };
  where.lng = { not: null };
}
```

Filters to 56 MANUAL listings globally. Not used by production map. **Misleading name** — implies listing-level geo exists at scale.

### Viewport prototype DTOs (truth-leaking)

**Blocks marker** — `ViewportBlockMarkerDto`:

```typescript
{ id, slug, name, lat, lng, priceFrom, district, imageUrl }
```

`lat`/`lng` are block centroids. DTO carries **no tier indicator**. Consumer must treat as JK location — currently implicit.

**Listings marker** — `ViewportListingMarkerDto`:

```typescript
{ id, lat, lng, price, title, photoUrl }
```

Assumes listing-level point. Moscow returns empty (Iter 16). If populated via silent inheritance, would appear **EXACT** without disclosure.

**Response meta** — `ViewportResponseMeta`:

- `geoComposition: 'catalog_and_bbox'` — describes filter composition, not coord quality
- `visibleExact: boolean` — refers to count accuracy, **not** coordinate precision
- No `geoQuality`, `geoSource`, or tier aggregate

### Contract-check

`runContractChecks()` includes `listings_moscow_bbox_meta` — validates total/visible/exact counts, not coord semantics. Passes with `total=0`.

---

## Frontend truth map

### Production map (`RedesignMap.tsx`)

| Object type | Coord source | Tier (actual) | Tier (presented) |
|---|---|---|---|
| Complexes (JK) | `blocks.latitude/longitude` via API | BLOCK_CENTROID | Exact JK pin |
| Primary apartments | Block map mode — no listing pins | N/A | N/A |
| Secondary apartments | `l.lat/lng` OR `fallbackCoords()` | EXACT or **APPROXIMATE_UI_ONLY** | **Exact pin** |

**Truth leakage #1:** `fallbackCoords()` generates spiral offsets from region center for secondary market:

```typescript
const useApproximateCoords = objectType === 'apartments' && filters.marketType === 'secondary';
const fallback = useApproximateCoords ? fallbackCoords(regionCenter, index) : null;
const lat = l.lat ?? fallback?.[0] ?? null;
```

No badge, no flag, no API disclosure. Markers render identically to real coords via `buildListingMarkerDescriptors()`.

**Truth leakage #2:** Same pattern in `RedesignCatalog.tsx` map tab.

### Listing detail pages

| Page | Map source | Tier |
|---|---|---|
| `RedesignApartment` | `complex.coords` (block centroid) | BLOCK_CENTROID shown as unit location |
| `ListingLocationMap` | Yandex geocode of address string | Unknown — client-side, no tier |
| `RedesignComplex` | Block coords | BLOCK_CENTROID (correct for JK page) |

**Truth leakage #3:** Apartment detail map shows JK centroid with no "approximate location" disclosure.

### Marker rendering pipeline

```
ListingMapItem { lat, lng }  →  buildListingMarkerDescriptors  →  ymaps.Placemark
```

No quality field in `ListingMarkerSource` or `MapMarkerDescriptor`. Cluster layer (`useMapClusterLayer`) treats all coords equally.

Cluster presets:
- Blocks: `islands#invertedBlueClusterIcons`
- Listings: `islands#blueCircleClusterIcons` + pie chart

**No tier-aware cluster policy.**

### Viewport experimental hooks

`useViewportListingsExperimental` / `useViewportBlocksExperimental`:
- Shadow-only, DEV gated
- Types in `viewport-map-types.ts` mirror API DTOs — no geo quality
- Shadow render (Iter 11) diffs marker counts, not coord honesty

---

## Search + filter interactions

| Feature | Geo basis | Truth-safe? |
|---|---|---|
| `geo_preset` / `geo_polygon` | Block polygon intersection | ✓ |
| `geo_lat` + `geo_radius_m` | Block ST_DWithin | ✓ |
| `distance_min/max` (houses/land) | Listing attribute filter, not map coords | ✓ (non-spatial) |
| Map bbox (legacy) | Client-side filter of loaded page-1 (200 cap) | Partial — incomplete set |
| Map bbox (viewport proto) | Server ST_Within on listing lat/lng | ✗ Dead for MSK |
| Sidebar listing list | Catalog API, geo via blockId | ✓ |

---

## Popup / selection semantics

`ListingsMapSearch` bottom card on marker click:
- Shows photo, price, title, address
- Pans map to `[lat, lng]` at zoom 15
- **No approximation disclosure**
- Link to listing detail

For `fallbackCoords` listings, pan targets a **fabricated point** near region center.

---

## Observability gap

`map-render-observability.ts` tracks:
- `markerCount`, `clusterRebuilds`, `markerMode`
- Shadow diff counts (legacy vs viewport)

**Missing:**
- Geo tier breakdown
- Approximate marker count
- Fake precision detection

---

## Truth leakage summary

| # | Location | Leak type | Severity |
|---|---|---|---|
| L1 | `fallbackCoords()` → map pins | APPROXIMATE presented as EXACT | **Critical** |
| L2 | Viewport listing DTO | No geoQuality on lat/lng | **High** |
| L3 | Apartment detail map | Block centroid as unit pin | **High** |
| L4 | `ListingLocationMap` | Geocoded address, unknown accuracy | Medium |
| L5 | Block viewport DTO | Centroid without tier label | Medium |
| L6 | `visibleExact` meta field | Name implies coord precision | Low (count only) |
| L7 | `has_geo` query param | Implies listing coords exist | Low |

---

## What is already truth-safe

1. **Catalog geo filters** — block-based, semantically honest for "JK in area"
2. **Blocks map mode** — one pin per JK, matches BLOCK_CENTROID intent
3. **Iteration 16 audit** — documented mismatch; no silent backfill occurred
4. **Viewport prototype gate** — shadow-only, not production

---

## Implication

The platform has **implicit geo tiers** in data but **no contract** enforcing honest propagation. Future viewport work will amplify leakage unless tier semantics are formalized before any coord materialization or DTO extension.

See `02-geo-tier-definitions.md` for the canonical model.
