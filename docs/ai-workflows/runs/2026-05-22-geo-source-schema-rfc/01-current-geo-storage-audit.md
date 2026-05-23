# Iteration 18.1 — Current Geo Storage Audit

## Mode

DATA PLATFORM RFC · read-only audit · 2026-05-22 · post-Iteration 16/17

---

## Purpose

Document how geo is **stored, mutated, and consumed** today — establishing baseline for geo lineage schema design.

---

## Prisma schema (current)

### Blocks

```prisma
model Block {
  latitude   Decimal? @db.Decimal(10, 8)
  longitude  Decimal? @db.Decimal(11, 8)
  dataSource DataSource @default(FEED)
  // no geo_source, no geo_quality, no lineage fields
}
```

- Migration: `20260411184623_init` + PostGIS GIST partial index (`20260414130000`)
- Population: `feed-processor.processBlocks()` via `extractCoordinates(geometry)`
- Coverage (Iter 16): **1,336 / 1,336** region-1 blocks have coords

### Buildings

```prisma
model Building {
  latitude   Decimal? @db.Decimal(10, 8)
  longitude  Decimal? @db.Decimal(11, 8)
  dataSource DataSource @default(FEED)
  blockId    Int
}
```

- Population: `feed-processor.processBuildings()` via `extractCoordinates(geometry)`
- Coverage: **9,535 / 9,535** region-1 buildings have coords
- No lineage; coords updated on feed re-import overwrite

### Listings

```prisma
model Listing {
  lat         Decimal? @db.Decimal(10, 8)
  lng         Decimal? @db.Decimal(11, 8)
  blockId     Int?
  buildingId  Int?
  dataSource  DataSource @default(FEED)  // FEED | MANUAL only
  address     String?
  // NO geo_source, geo_quality, geo_confidence, geo_resolved_at,
  //     geo_entity_id, geo_entity_kind, geo_resolution_version
}
```

### Schema drift finding

| Finding | Evidence |
|---|---|
| `listings.lat` / `listings.lng` in Prisma schema | `schema.prisma` lines 504–505 |
| **No migration adds these columns** | Grep across `prisma/migrations/` — zero `ADD COLUMN "lat"` |
| Columns exist in `lg_development` | Iter 16 queries returned data (56 rows with coords) |

**Implication:** Listing geo columns were likely applied via `db push` or manual DDL outside migration history. Future geo schema **must** ship via tracked migrations to avoid further drift.

---

## Related enums (current)

```prisma
enum DataSource {
  FEED
  MANUAL
}
```

`DataSource` conflates **provenance** (where record came from) with **geo trust** (whether lat/lng is exact). A FEED listing could theoretically have EXACT coords; a MANUAL listing may have NULL coords. **Insufficient for geo lineage.**

---

## Population paths

### FEED import (`feed-processor.service.ts`)

| Handler | Writes listing lat/lng? | Writes parent coords? |
|---|---|---|
| `processBlocks()` | ✗ | `blocks.latitude/longitude` ✓ |
| `processBuildings()` | ✗ | `buildings.latitude/longitude` ✓ |
| `processApartments()` | ✗ | FKs only (`blockId`, `buildingId`) |

Apartment upsert update clause touches: price, FKs, status — **never lat/lng**.

### MANUAL create (`listings.service.ts`)

All manual kind creators accept optional `dto.lat` / `dto.lng`:

```typescript
lat: dto.lat ?? null,
lng: dto.lng ?? null,
dataSource: 'MANUAL',
// no geo_source set — EXACT implied by convention only
```

Kinds: APARTMENT, HOUSE, LAND, COMMERCIAL, PARKING — same pattern.

**Gap:** Coords stored without provenance. `dataSource=MANUAL` is indirect trust signal only.

### Admin update (`UpdateListingAdminDto`)

Fields: `status`, `isPublished` only — **no geo edit path** in admin DTO today.

### Dev mirror (`populate-local-map-data.ts`)

Copies block coords to listing for local test data:

```typescript
lat: block.latitude,
lng: block.longitude,
dataSource: 'MANUAL',  // mislabels inherited coords as manual listing
```

Guarded by `assertLocalDb()` — not production. **Anti-pattern:** would appear as MANUAL+coords without BLOCK_INHERIT lineage.

---

## Consumption paths

### Catalog geo filters (truth-safe)

`GeoSpatialService.resolveGeoBlockIds()` → `listings.blockId IN (geoIds)`

Does **not** read `listings.lat/lng`. Operates on blocks table only.

### Listings `has_geo` filter

```typescript
if (query.has_geo) {
  where.lat = { not: null };
  where.lng = { not: null };
}
```

Matches 56 global rows. Misleading param name for block-resolvable geo.

### Viewport prototype

`findListingsInViewport()` requires `lat IS NOT NULL AND lng IS NOT NULL` → Moscow **total=0**.

### Frontend map

| Surface | Coord source | Persisted? |
|---|---|---|
| JK map (`MapSearch`) | Block coords from API | Parent row |
| Listings map primary | Block mode / no unit pins | — |
| Listings map secondary | `l.lat/lng` OR `fallbackCoords()` | Spiral **not persisted** |
| Apartment detail | `complex.coords` (block) | Parent row |
| `ListingLocationMap` | Yandex client geocode | **Not persisted** |

**Lineage gap:** Geocode results and UI fallbacks leave no DB audit trail.

---

## Index inventory (geo-relevant)

| Index | Table | Type |
|---|---|---|
| `blocks_geo_gist_idx` | blocks | GIST partial (lat/lng NOT NULL) |
| `listings_block_id_idx` | listings | btree |
| `listings_building_id_idx` | listings | btree |
| *(none)* | listings lat/lng | — |

No constraint linking `listings.lat/lng` to `geo_source` or parent FKs.

---

## Iter 16 measurements (reference)

| Metric | Value |
|---|---:|
| Total listings | 78,602 |
| With lat/lng | 56 (0.07%) |
| FEED with lat/lng | 0 |
| MSK active apartments with lat/lng | 0 |
| MSK resolvable via block FK | 14,917 |
| Could inherit building coords | 75,998 |

---

## Lineage questions unanswered today

| Question | Answer today |
|---|---|
| Where did coords originate? | Unknown — only `dataSource` hint |
| When resolved? | `updatedAt` (unreliable — any field change) |
| Inherited from which entity? | Not recorded |
| Can they be trusted? | Inferred from `dataSource` + convention |
| Upgrade/downgrade history? | None |
| UI fallback in DB? | No (client only) |
| Geocode in DB? | No |

---

## Audit conclusion

Current storage supports **three implicit geo layers**:

1. **Parent entity coords** (blocks/buildings) — populated, no lineage
2. **Listing coords** (sparse) — no provenance, schema drift
3. **Ephemeral coords** (geocode, fallbackCoords) — not persisted

**No field governs geo truth.** Iteration 17 GEO CONTRACT exists only in RFC docs — not in schema.

See `02-schema-design-rfc.md` for proposed persistence model.
