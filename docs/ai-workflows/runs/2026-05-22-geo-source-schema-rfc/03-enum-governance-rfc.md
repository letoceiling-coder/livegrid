# Iteration 18.3 — Enum Governance RFC

## Mode

DATA PLATFORM RFC · canonical enums · 2026-05-22

---

## Purpose

Define **GeoSource** and **GeoQuality** enums with strict mapping to Iter 17 tiers — preventing semantic drift between DB, resolver, API, and UI.

---

## GeoQuality (DB-persisted subset)

```prisma
enum GeoQuality {
  EXACT
  BUILDING_CENTROID
  BLOCK_CENTROID
  MISSING
  INVALID
}
```

### Excluded from DB (Iter 17 contract)

| Tier | Where it lives |
|---|---|
| APPROXIMATE_UI_ONLY | Client runtime only — **never persisted** |

`MISSING` is persisted when materialization runs and finds no resolvable point. Rows with NULL lat/lng AND NULL geo_quality are **unclassified** (pre-normalization legacy state).

---

## GeoSource (provenance)

```prisma
enum GeoSource {
  MANUAL_EXACT       // Admin/seller placed pin on map or entered verified coords
  FEED_EXACT         // Future: per-unit geometry from feed
  BUILDING_INHERIT   // Materialized from buildings.latitude/longitude
  BLOCK_INHERIT      // Materialized from blocks.latitude/longitude
  GEOCODE_VERIFIED   // Geocoder match kind=house, score ≥ threshold
  GEOCODE_APPROXIMATE // Geocoder street/locality match — NOT EXACT tier
  UNKNOWN            // Legacy rows post-classification — coords exist, origin unclear
}
```

### Explicitly excluded

| Value | Rule |
|---|---|
| `UI_ONLY` | **FORBIDDEN in DB** — CHECK constraint rejects |

`UI_ONLY` exists only in application code for `fallbackCoords()` — must never be written by resolver or import.

---

## GeoSource → GeoQuality mapping (normative)

| GeoSource | GeoQuality | geo_entity_kind | geo_entity_id |
|---|---|---|---|
| MANUAL_EXACT | EXACT | LISTING or NULL | listing.id or NULL |
| FEED_EXACT | EXACT | LISTING or NULL | listing.id or NULL |
| GEOCODE_VERIFIED | EXACT | LISTING | listing.id |
| GEOCODE_APPROXIMATE | BUILDING_CENTROID | LISTING | listing.id |
| BUILDING_INHERIT | BUILDING_CENTROID | BUILDING | building.id |
| BLOCK_INHERIT | BLOCK_CENTROID | BLOCK | block.id |
| UNKNOWN | BUILDING_CENTROID or BLOCK_CENTROID | best guess | audit required |
| *(null)* | MISSING | NULL | NULL |
| *(invalid coords)* | INVALID | NULL | NULL |

### Mapping notes

**GEOCODE_APPROXIMATE → BUILDING_CENTROID (not EXACT):**  
Street-level geocode is approximate per Iter 17. `ListingLocationMap` client geocode must use this source if ever persisted.

**UNKNOWN:**  
Reserved for classifying 56 existing MANUAL coords without audit trail. Normalization job assigns best-effort tier + flags for manual review. **Never assigned to new writes.**

---

## Default geoConfidence by source

| GeoSource | geoConfidence | Rationale |
|---|---:|---|
| MANUAL_EXACT | 0.95 | Human verified |
| FEED_EXACT | 0.90 | Vendor geometry |
| GEOCODE_VERIFIED | 0.85 | Algorithmic, house match |
| GEOCODE_APPROXIMATE | 0.55 | Street/locality |
| BUILDING_INHERIT | 0.50 | Footprint centroid |
| BLOCK_INHERIT | 0.30 | JK centroid |
| UNKNOWN | 0.20 | Legacy — review queue |

Confidence is **informational** — does not upgrade tier. `exactDistanceAllowed` derives from `geoQuality`, not confidence alone.

---

## GeoEntityKind

```prisma
enum GeoEntityKind {
  LISTING
  BUILDING
  BLOCK
}
```

| geoQuality | geoEntityKind | geoEntityId points to |
|---|---|---|
| EXACT (manual/feed/geocode) | LISTING or NULL | Self or unset |
| BUILDING_CENTROID | BUILDING | buildings.id |
| BLOCK_CENTROID | BLOCK | blocks.id |
| MISSING | NULL | — |
| INVALID | NULL | — |

---

## Parent entity GeoSource (optional Phase 2b)

For blocks/buildings feed coords:

```prisma
enum ParentGeoSource {
  FEED_GEOMETRY     // extractCoordinates from feed
  FEED_POINT
  FEED_POLYGON_CENTROID
  MANUAL_OVERRIDE
}
```

Not required for listing normalization v1. Documented for future parent stale detection.

---

## API DTO mapping (future — not implemented)

Viewport DTO `geoSource` (Iter 17) maps from DB:

| DB GeoSource | API geoSource string |
|---|---|
| MANUAL_EXACT | `LISTING_ROW` |
| FEED_EXACT | `LISTING_ROW` |
| GEOCODE_VERIFIED | `LISTING_ROW` |
| BUILDING_INHERIT | `BUILDING_GEOMETRY` |
| BLOCK_INHERIT | `BLOCK_GEOMETRY` |
| GEOCODE_APPROXIMATE | `LISTING_ROW` (with BUILDING_CENTROID quality) |

DB stores fine-grained provenance; API exposes simplified consumer labels.

---

## Enum evolution rules

1. **Adding values:** Requires migration + `geo_resolution_version` bump + resolver update
2. **Removing values:** Forbidden — deprecate via comment, stop writing
3. **Renaming:** New enum value + mapping layer — no in-place rename
4. **UI_ONLY:** Never add to Prisma enum (prevents accidental persistence)

---

## Validation matrix (application layer)

```typescript
const VALID_COMBOS: Record<GeoSource, GeoQuality[]> = {
  MANUAL_EXACT:         ['EXACT'],
  FEED_EXACT:           ['EXACT'],
  GEOCODE_VERIFIED:     ['EXACT'],
  GEOCODE_APPROXIMATE:  ['BUILDING_CENTROID'],
  BUILDING_INHERIT:     ['BUILDING_CENTROID'],
  BLOCK_INHERIT:        ['BLOCK_CENTROID'],
  UNKNOWN:              ['BUILDING_CENTROID', 'BLOCK_CENTROID'],
};
```

Invalid combo → reject write + log `ListingGeoEvent` with `INVALIDATED`.

---

## Governance ownership

| Decision | Owner |
|---|---|
| New GeoSource value | Data platform + product |
| Confidence defaults | Data platform |
| Tier mapping changes | Architecture RFC required |
| UNKNOWN reclassification | Ops manual review queue |

---

## Legacy row classification (future one-time job)

| Current state | Proposed classification |
|---|---|
| lat/lng + MANUAL + has blockId | UNKNOWN → manual review → MANUAL_EXACT or BLOCK_INHERIT |
| lat/lng + MANUAL + no blockId | UNKNOWN → MANUAL_EXACT if coords valid |
| NULL lat/lng + FEED + buildingId | MISSING → normalization → BUILDING_INHERIT |
| NULL lat/lng + FEED + blockId only | MISSING → normalization → BLOCK_INHERIT |
| NULL lat/lng + no FK | MISSING |

**Not executed in Iter 18** — documented for Phase 3 normalization only.
