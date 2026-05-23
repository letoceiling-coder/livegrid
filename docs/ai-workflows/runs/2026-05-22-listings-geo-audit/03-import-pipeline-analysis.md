# Iteration 16.3 — Import Pipeline Analysis

## Mode

DATA PLATFORM AUDIT · code + schema trace · 2026-05-22

---

## Question

Where should listing coordinates come from, and why are they missing?

---

## Feed entity geometry map

| Feed file | Has `geometry`? | Import handler | Writes coords? |
|---|---|---|---|
| `blocks.json` | ✓ Point/Polygon | `processBlocks()` | `blocks.latitude/longitude` ✓ |
| `buildings.json` | ✓ Point/Polygon | `processBuildings()` | `buildings.latitude/longitude` ✓ |
| `apartments.json` | ✗ **no geometry field** | `processApartments()` | **nothing** ✗ |

Documented in `PROJECT_PLAN.md` Appendix A, field #36:

> `block_geometry` → — → — → **Берётся из blocks.latitude/longitude по FK**

The 41-field apartments feed mapping has **no lat/lng target column**. Geo is intentionally resolved at query time via JOIN, not denormalized.

---

## Code evidence

### Blocks — coords populated

```262:285:apps/api/src/modules/feed-import/feed-processor.service.ts
const [lat, lng] = this.extractCoordinates(item.geometry);
// ...
update: {
  latitude: lat ?? null,
  longitude: lng ?? null,
```

### Buildings — coords populated

```374:387:apps/api/src/modules/feed-import/feed-processor.service.ts
const [lat, lng] = this.extractCoordinates(item.geometry);
// ...
latitude: lat,
longitude: lng,
```

### Apartments — coords NOT populated

```459:481:apps/api/src/modules/feed-import/feed-processor.service.ts
const listing = await this.prisma.listing.upsert({
  where: { regionId_externalId: { regionId, externalId: apt._id } },
  update: {
    price: normalizedPrice,
    blockId,
    buildingId,
    builderId,
    districtId,
    status: 'ACTIVE',
  },
  create: {
    regionId,
    kind: 'APARTMENT',
    externalId: apt._id,
    // ... price, FKs, dataSource: 'FEED'
    // NO lat, NO lng
  },
});
```

**Root cause:** not a bug in enrichment — **by design**. Import never attempted to copy parent coords.

---

## Coordinate extraction logic (blocks/buildings only)

```686:704:apps/api/src/modules/feed-import/feed-processor.service.ts
private extractCoordinates(geometry: any): [number | null, number | null] {
  if (!geometry?.coordinates) return [null, null];
  if (geometry.type === 'Point') {
    return [geometry.coordinates[1], geometry.coordinates[0]];  // GeoJSON [lng,lat] → [lat,lng]
  }
  if (geometry.type === 'Polygon') {
    // centroid of ring vertices
  }
  return [null, null];
}
```

Works correctly for blocks (1,336/1,336 coords) and buildings (9,535/9,535). Never invoked for apartments.

---

## Manual listing creation

Admin API (`listings.service.ts`) accepts optional `dto.lat` / `dto.lng` on create/update for MANUAL listings. This explains the 56 coords — all `data_source = 'MANUAL'`, predominantly region 7 houses/land.

No automatic inheritance from block when admin omits coords.

---

## Dev-only coord backfill (NOT production)

`scripts/populate-local-map-data.ts` copies block coords to listing for mirror test data:

```185:186:scripts/populate-local-map-data.ts
lat: block.latitude,
lng: block.longitude,
```

Guarded by `assertLocalDb()` — refuses production. This is **test harness only**, not import pipeline behavior.

---

## Geo services

`GeoSpatialService.resolveGeoBlockIds()` operates exclusively on `blocks` table:

- `ST_DWithin` for radius queries
- `ST_Within` for polygon/preset queries
- Returns block IDs for Prisma `blockId: { in: geoIds }` filter

Listings catalog geo filter (`listings.service.buildWhere`) resolves geo via **block FK intersection**, not listing points:

```277:359:apps/api/src/modules/listings/listings.service.ts
const geoRes = await this.geo.resolveGeoBlockIds({ ... });
// ...
} else if (geoIds) {
  where.blockId = { in: geoIds };
}
```

Catalog geo filtering works without listing coords. Viewport bbox filtering does not.

---

## Root cause summary

| Question | Answer |
|---|---|
| Where should coords come from? | Per design: **JOIN to blocks/buildings at read time**. Not stored on listing. |
| Why missing on listing row? | `processApartments()` never writes them; feed has no geometry. |
| Are block coords a fallback? | They are the **intended source** per PROJECT_PLAN, accessed via FK — not copied. |
| Are building coords reused? | No — stored on `buildings` table, not propagated to listings. |
| Is geo enrichment broken? | **No** — blocks/buildings enrichment works. Listing denormalization was never implemented. |
| Do feeds contain apartment coords? | **No** — `apartments.json` has 41 fields; geometry is not among them. Denormalized `block_geometry` is a feed field name for JOIN semantics only. |

---

## Implication for viewport

The viewport prototype queries `listings.lat/lng` directly. The import pipeline and schema design query `blocks.latitude/longitude` (or `buildings`) via FK. **These are two incompatible geo models.**

Fixing viewport viability requires an explicit **geo normalization decision** (see `08-final-recommendation.md`) — not a hotfix to the import upsert alone.
