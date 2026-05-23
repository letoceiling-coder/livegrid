# Iteration 20.3 — Prisma Alignment

## Mode

SCHEMA GOVERNANCE · 2026-05-22

---

## Schema changes

Added to `packages/database/prisma/schema.prisma`:

- Enums: `GeoSource`, `GeoQuality`, `GeoEntityKind`
- Listing fields (all optional)
- Indexes on geo fields

---

## Listing model (excerpt)

```prisma
model Listing {
  lat                    Decimal?       @db.Decimal(10, 8)
  lng                    Decimal?       @db.Decimal(11, 8)
  geoSource              GeoSource?     @map("geo_source")
  geoQuality             GeoQuality?    @map("geo_quality")
  geoConfidence          Decimal?       @map("geo_confidence") @db.Decimal(4, 3)
  geoResolvedAt          DateTime?      @map("geo_resolved_at") @db.Timestamptz(3)
  geoEntityId            Int?           @map("geo_entity_id")
  geoEntityKind          GeoEntityKind? @map("geo_entity_kind")
  geoResolutionVersion   Int?           @map("geo_resolution_version")

  @@index([geoQuality, regionId])
  @@index([geoSource])
  @@index([geoEntityKind, geoEntityId])
}
```

---

## Resolver vs Prisma GeoEntityKind

| Layer | LISTING value |
|---|---|
| Resolver TS (`geo-resolver.types.ts`) | ✓ for EXACT shadow suggestions |
| Prisma DB enum | ✗ BUILDING \| BLOCK only |

EXACT rows will use `geo_entity_kind = NULL` when materialized (future).

---

## Client generation

```bash
cd packages/database && npx prisma generate
```

Prisma Client v6.19.3 regenerated — `@prisma/client` includes new enums.

---

## Compile integrity

```bash
pnpm --filter api exec tsc --noEmit
# exit 0
```

`GeoShadowLineageService` uses Prisma-generated types for read-only queries.

---

## No application writes

No service code sets `geoSource` / `geoQuality` on listing rows in Iter 20.
