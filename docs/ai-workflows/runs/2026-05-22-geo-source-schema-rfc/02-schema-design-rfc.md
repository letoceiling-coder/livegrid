# Iteration 18.2 — Schema Design RFC

## Mode

DATA PLATFORM RFC · proposed schema · 2026-05-22 · **NOT for migration execution**

---

## Purpose

Define production-grade **geo lineage persistence** on `listings` — governing when `lat`/`lng` may exist and what they mean.

---

## Design principles

1. **Provenance accompanies coordinates** — no lat/lng without `geo_source` + `geo_quality`
2. **Tier is stored, not inferred** — resolver writes tier at materialization time
3. **Inheritance is explicit** — `geo_entity_id` + `geo_entity_kind` for non-EXACT
4. **UI_ONLY never persisted** — CHECK constraint + application guard
5. **Additive migration** — all new fields nullable until normalization Phase 3
6. **Audit trail optional but recommended** — append-only events table for overrides

---

## Proposed Prisma additions

### New enums

See `03-enum-governance-rfc.md` for full enum definitions and tier mapping.

```prisma
enum GeoSource { ... }      // how coords were obtained
enum GeoQuality { ... }     // Iter 17 tier (DB-safe subset)
enum GeoEntityKind {
  LISTING
  BUILDING
  BLOCK
}
```

### Listing model extensions

```prisma
model Listing {
  // --- existing ---
  lat  Decimal? @db.Decimal(10, 8)
  lng  Decimal? @db.Decimal(11, 8)

  // --- proposed geo lineage (all nullable Phase 1) ---
  geoSource            GeoSource?     @map("geo_source")
  geoQuality           GeoQuality?    @map("geo_quality")
  geoConfidence        Decimal?       @map("geo_confidence") @db.Decimal(4, 3)
  geoResolvedAt        DateTime?      @map("geo_resolved_at") @db.Timestamptz(3)
  geoEntityId          Int?           @map("geo_entity_id")
  geoEntityKind        GeoEntityKind? @map("geo_entity_kind")
  geoResolutionVersion Int            @default(1) @map("geo_resolution_version")

  @@index([geoQuality, regionId])
  @@index([geoSource])
  @@index([geoEntityKind, geoEntityId])
}
```

### Optional audit table (recommended Phase 2)

```prisma
model ListingGeoEvent {
  id              BigInt      @id @default(autoincrement())
  listingId       Int         @map("listing_id")
  eventType       GeoEventType @map("event_type")
  previousSource  GeoSource?  @map("previous_source")
  previousQuality GeoQuality? @map("previous_quality")
  newSource       GeoSource?  @map("new_source")
  newQuality      GeoQuality? @map("new_quality")
  previousLat     Decimal?    @map("previous_lat") @db.Decimal(10, 8)
  previousLng     Decimal?    @map("previous_lng") @db.Decimal(11, 8)
  newLat          Decimal?    @map("new_lat") @db.Decimal(10, 8)
  newLng          Decimal?    @map("new_lng") @db.Decimal(11, 8)
  geoEntityId     Int?        @map("geo_entity_id")
  geoEntityKind   GeoEntityKind? @map("geo_entity_kind")
  actorType       GeoActorType @map("actor_type")
  actorId         String?     @map("actor_id")
  reason          String?     @db.Text
  resolutionVersion Int       @map("resolution_version")
  createdAt       DateTime    @default(now()) @map("created_at")

  listing Listing @relation(fields: [listingId], references: [id], onDelete: Cascade)

  @@index([listingId, createdAt])
  @@map("listing_geo_events")
}

enum GeoEventType {
  MATERIALIZED
  UPGRADED
  DOWNGRADED
  INVALIDATED
  CLEARED
  PARENT_UPDATED
  ADMIN_OVERRIDE
}

enum GeoActorType {
  SYSTEM
  FEED_IMPORT
  NORMALIZATION_JOB
  ADMIN_USER
  GEOCODE_SERVICE
}
```

---

## Field ownership rules

| Field | Owner | Writable by |
|---|---|---|
| `lat`, `lng` | Geo resolver / normalization job | Resolver only (not raw import) |
| `geoSource` | Geo resolver | Resolver + admin override (audited) |
| `geoQuality` | Geo resolver | Resolver + admin override (audited) |
| `geoConfidence` | Geo resolver | Resolver (computed from source rules) |
| `geoResolvedAt` | Geo resolver | Set on each materialization |
| `geoEntityId` | Geo resolver | Set when quality ∈ {BUILDING, BLOCK} inherit |
| `geoEntityKind` | Geo resolver | Paired with geoEntityId |
| `geoResolutionVersion` | Platform | Incremented on resolver algorithm change |

**Rule:** Application code outside `GeoResolverService` must not SET geo fields without emitting `ListingGeoEvent`.

---

## Integrity constraints (enforcement phase)

PostgreSQL CHECK constraints — applied Phase 5, not Phase 1:

```sql
-- Coords require provenance
CONSTRAINT listings_geo_provenance_chk CHECK (
  (lat IS NULL AND lng IS NULL AND geo_source IS NULL AND geo_quality IS NULL)
  OR
  (lat IS NOT NULL AND lng IS NOT NULL AND geo_source IS NOT NULL AND geo_quality IS NOT NULL)
);

-- Both coords or neither
CONSTRAINT listings_geo_pair_chk CHECK (
  (lat IS NULL AND lng IS NULL) OR (lat IS NOT NULL AND lng IS NOT NULL)
);

-- UI_ONLY forbidden in DB
CONSTRAINT listings_geo_no_ui_only_chk CHECK (
  geo_source IS NULL OR geo_source <> 'UI_ONLY'
);

-- Inheritance requires entity reference
CONSTRAINT listings_geo_inherit_entity_chk CHECK (
  geo_quality NOT IN ('BUILDING_CENTROID', 'BLOCK_CENTROID')
  OR (geo_entity_id IS NOT NULL AND geo_entity_kind IS NOT NULL)
);

-- EXACT requires no inherit entity (or entity = self)
CONSTRAINT listings_geo_exact_entity_chk CHECK (
  geo_quality <> 'EXACT'
  OR geo_entity_kind IS NULL
  OR geo_entity_kind = 'LISTING'
);

-- Confidence range
CONSTRAINT listings_geo_confidence_chk CHECK (
  geo_confidence IS NULL OR (geo_confidence >= 0 AND geo_confidence <= 1)
);

-- Quality/source consistency (see enum mapping table in doc 03)
-- Implemented as trigger or application-level validation initially
```

---

## WGS84 validation

```sql
CONSTRAINT listings_geo_wgs84_chk CHECK (
  lat IS NULL OR (lat >= -90 AND lat <= 90)
);
CONSTRAINT listings_geo_wgs84_lng_chk CHECK (
  lng IS NULL OR (lng >= -180 AND lng <= 180)
);
CONSTRAINT listings_geo_no_null_island_chk CHECK (
  NOT (lat = 0 AND lng = 0)
);
```

---

## Future GIST index (post-normalization)

```sql
CREATE INDEX listings_geo_gist_idx ON listings USING GIST (
  ST_SetSRID(ST_MakePoint(lng::double precision, lat::double precision), 4326)
) WHERE lat IS NOT NULL AND lng IS NOT NULL
  AND geo_quality IN ('EXACT', 'BUILDING_CENTROID', 'BLOCK_CENTROID');
```

Partial index excludes MISSING/INVALID. Added **after** materialization Phase 3 validates row counts.

---

## Blocks/buildings: lineage extensions (optional Phase 2b)

Parent entities do not require full lineage for viewport v1, but recommended for stale detection:

```prisma
model Block {
  geoResolvedAt DateTime? @map("geo_resolved_at")
  geoSource     GeoSource? @map("geo_source")  // FEED_GEOMETRY default
}

model Building {
  geoResolvedAt DateTime? @map("geo_resolved_at")
  geoSource     GeoSource? @map("geo_source")
}
```

Feed import sets `geoSource = FEED_GEOMETRY` (new enum value on parent) + `geoResolvedAt = now()` on coord write.

**Out of scope Phase 1** — listing lineage is priority.

---

## Nullable Phase 1 rationale

All new listing geo fields **nullable** initially because:

- 78,546 listings have NULL lat/lng today — valid MISSING state
- 56 listings have coords **without** lineage — cannot backfill geo_source retroactively without classification job
- Enforcement constraints would fail migration if applied immediately

Phase 1 migration = columns + enums only. Zero row updates.

---

## Relationship to materialized vs read-time geo

| Strategy | lat/lng on listing | When |
|---|---|---|
| Read-time only | NULL; resolver JOINs parent | Rejected — no GIST, id-fallback persists |
| **Materialized (recommended)** | Populated by normalization job | Phase 3 |
| Hybrid | NULL until first viewport shadow pass | Phase 2 shadow |

Stored `lat`/`lng` are **display coordinates** — denormalized cache of resolved point. Source of truth for **tier meaning** is `geo_source` + `geo_quality`, not coordinate equality with parent.

---

## What NOT to add

| Field | Why rejected |
|---|---|
| `geo_approximate_ui` | UI_ONLY never in DB |
| `geo_fallback_index` | Spiral index is client-only |
| `is_exact` boolean | Redundant with geo_quality; risks drift |
| Separate `geo_lat`/`geo_lng` | Duplicate of lat/lng — one coordinate pair |

---

## Schema summary

```
listings
├── lat, lng                    (display point — materialized cache)
├── geo_source                  (provenance enum)
├── geo_quality                 (tier enum — Iter 17 contract)
├── geo_confidence              (0.000–1.000)
├── geo_resolved_at             (last materialization timestamp)
├── geo_entity_id               (inherit source PK)
├── geo_entity_kind             (BLOCK | BUILDING | LISTING)
└── geo_resolution_version      (algorithm version)

listing_geo_events (optional)
└── append-only audit trail
```

See `04-lineage-resolution-rfc.md` for resolver contract using these fields.
