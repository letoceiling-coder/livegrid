# 02 — Backend Architecture

**Platform:** NestJS monorepo `@lg/api`  
**API prefix:** `/api/v1` (configurable via `API_PREFIX`)  
**Entry:** `apps/api/src/main.ts`

---

## Bootstrap (`main.ts`)

- NestExpressApplication
- Static uploads: `MEDIA_ROOT` → `/uploads/`
- Global prefix: `/api/v1`
- Global `ValidationPipe`: whitelist, forbidNonWhitelisted, transform
- CORS from `CORS_ORIGINS` env
- Swagger at `/docs` (proxied by nginx on production)
- Default port: `3000` (`API_PORT`)

---

## AppModule Structure

`apps/api/src/app.module.ts` imports:

| Module | Purpose |
|--------|---------|
| ConfigModule | Global env from `../../.env` |
| SentryModule | Error tracking |
| MonitoringModule | Prometheus metrics |
| CacheModule | Redis JSON cache |
| PrismaModule | DB client |
| HealthModule | `/health` |
| AuthModule | JWT + global guards |
| RegionsModule | Feed regions |
| DistrictsModule | Districts by region/kind |
| SubwaysModule | Metro stations |
| BuildersModule | Developers |
| ReferenceModule | Finishings, room types, etc. |
| **BlocksModule** | **ЖК catalog + map pins** |
| BuildingsModule | Building corps |
| **ListingsModule** | **Individual listings** |
| RequestsModule | Lead forms + Telegram |
| ContentModule | CMS settings, mortgage |
| UsersModule | Admin users |
| AuditModule | Audit log |
| **FeedImportModule** | **TrendAgent feed + BullMQ** |
| StatsModule | Counters, kind counts |
| NewsModule | News + RSS/Telegram parser |
| FavoritesModule | User favorites |
| CollectionsModule | User selections |
| **SearchModule** | Catalog hints only |
| MediaModule | Media library |
| PresentationsModule | PDF presentations |
| SellersModule | Seller entities |

**No MapModule.** Map data is served via **Blocks** + **Listings**, not `/map/complexes`.

---

## Blocks Module (Map Primary Backend)

### Controller (`blocks.controller.ts`)

| Route | Method | Notes |
|-------|--------|-------|
| `/blocks` | GET | Paginated ЖК list with filters |
| `/blocks/catalog-counts` | GET | Block + apartment counts |
| `/blocks/deadlines` | GET | Deadline facet tokens |
| `/blocks/:id` | GET | By numeric id or slug |

Default public behavior: `require_active_listings=true` unless overridden.

### DTO (`query-blocks.dto.ts`)

Snake_case query params (Nest convention):

- Pagination: `page`, `per_page` (map uses 200)
- Region: `region_id`
- Filters: `search`, `status`, `rooms`, `price_min/max`, `area_min/max`, `floor_min/max`
- Names: `district_names`, `subway_names`, `builder_names` (CSV)
- Deadline: `deadline` (CSV, rich token parsing)
- Finishing: `finishing` (CSV IDs)
- Geo: `geo_lat`, `geo_lng`, `geo_radius_m`, `geo_polygon`, `geo_preset`
- Flags: `require_active_listings`, `include_empty_blocks`, `is_promoted`
- Sort: `name_asc`, `price_asc`, `price_desc`, etc.

### Service (`blocks.service.ts`)

Pipeline for `findAll`:

1. **Redis cache** key `api:catalog:blocks:{query hash}` TTL 45s
2. **`buildCatalogBlockWhere`** — Prisma where + geo pre-filter
3. **GeoSpatialService.resolveGeoBlockIds** — PostGIS block id intersection
4. **Prisma count + findMany** with rich includes (images, subways, addresses, listing counts)
5. **Price sort** — raw SQL join on listings aggregate when sort is price_*
6. **roomsBreakdown** per block from listings
7. Response: `{ data: BlockRow[], meta: { page, per_page, total, total_pages } }`

Also uses:
- `CatalogMeilisearchService` (search acceleration)
- `catalogBlockWhereToSql` for complex sorts
- Cache invalidation prefix `api:catalog:` on catalog changes

---

## Listings Module

### Controller

| Route | Method |
|-------|--------|
| `/listings` | GET — filtered paginated listings |
| `/listings/:id` | GET — detail |

### Query patterns (from frontend `catalog-api-params.ts`)

- `kind`: APARTMENT | HOUSE | LAND | COMMERCIAL
- `statuses`: ACTIVE,RESERVED
- `is_published`: true
- Apartment: `apartment_market` = new_building | secondary
- House: land area, directions, location filters
- Geo params same as blocks

Listings store `lat`, `lng` on `Listing` model — often null for feed apartments.

---

## Stats Module

| Route | Purpose |
|-------|---------|
| `/stats/counters` | Homepage KPIs |
| `/stats/listing-kind-counts?region_id=` | Map/catalog object type tabs |

Verified live: MSK region → 14917 APARTMENT.

---

## Geo Module

`GeoSpatialService`:
- Resolves geo preset polygons (`GeoPresetsService`, e.g. belgorod)
- Parses `geo_polygon` GeoJSON
- PostGIS `ST_DWithin` for radius search on `blocks.latitude/longitude`
- PostGIS `ST_Within` for polygon search
- Returns block id list intersected with Prisma catalog where

Used by **blocks** and **listings** catalog paths.

---

## Search Module

**Limited scope on production:**

| Route | Purpose |
|-------|---------|
| `/search/catalog-hints` | Autocomplete: ЖК, metro, districts, addresses |

No `/search/complexes` — that is Laravel-only (404 on prod).

---

## Feed Import Module

- **BullMQ** queue `FEED_IMPORT_QUEUE`
- Redis connection from `REDIS_URL`
- `FeedFetcherService` — TrendAgent HTTP feeds
- `FeedProcessorService` — upsert blocks, buildings, listings
- `FeedImportProcessor` — worker
- `FeedImportService` — orchestration, repeatable cron, manual trigger
- Admin API + `/admin/feed-import` UI

Import updates PostgreSQL directly via Prisma; invalidates catalog cache.

---

## Auth Module

- Global `JwtAuthGuard` + `RolesGuard`
- `@Public()` decorator on catalog endpoints
- JWT access + refresh tokens
- `@Roles('manager')` etc. for admin routes
- Frontend stores `lg_access_token` in localStorage

---

## Caching Architecture

`CacheService` (Redis):
- Block list responses: ~45s TTL
- Catalog counts: ~60s TTL
- Prefix invalidation on import/catalog mutations

---

## Validation & DTO Patterns

- `class-validator` + `class-transformer` on all query DTOs
- Global pipe strips unknown fields (`forbidNonWhitelisted: true`)
- Swagger decorators on controllers
- Snake_case API params ↔ camelCase TS internally via DTO property names

---

## API Prefix Summary

All routes live under `/api/v1` (global prefix).  
nginx strips nothing — Nest receives full path after proxy.

**Verified:** Production does not expose Laravel v1 routes (`map/complexes`, `filters`, `complexes`).
