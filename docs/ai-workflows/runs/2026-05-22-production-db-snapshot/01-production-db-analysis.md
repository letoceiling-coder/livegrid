# 01 — Production database analysis (map scope)

**Date:** 2026-05-22  
**Source:** `~/livegrid/packages/database/prisma/schema.prisma`, deploy scripts, production discovery  
**Mode:** READ-ONLY analysis — **no production DB connection performed**

---

## Production database (reference only)

| Item | Value (from deploy scripts) |
|------|----------------------------|
| Database name | `lg_production` |
| DB user | `lg_admin` |
| Host (on server) | `localhost:5432` |
| App path | `/var/www/lg` |
| ORM | Prisma 6 |

**Never use production `DATABASE_URL` in local `.env`.**

---

## Map-related tables (Prisma → PostgreSQL)

### Tier 0 — Region & reference (filters)

| Prisma model | Table | Map role |
|--------------|-------|----------|
| `FeedRegion` | `feed_regions` | Region selector, map center lat/lng |
| `District` | `districts` | District filter, block/listing FK |
| `Subway` | `subways` | Metro filter, block_subways |
| `Builder` | `builders` | Builder filter |
| `RoomType` | `room_types` | Rooms filter on apartments |
| `Finishing` | `finishings` | Finishing filter |
| `BuildingType` | `building_types` | Building tech filter |

### Tier 1 — Blocks (apartment map primary)

| Prisma model | Table | Geo |
|--------------|-------|-----|
| `Block` | `blocks` | `latitude`, `longitude` |
| `BlockAddress` | `block_addresses` | — |
| `BlockImage` | `block_images` | CDN URLs |
| `BlockSubway` | `block_subways` | distance to metro |

**PostGIS index:** `blocks_geo_gist_idx` on `ST_MakePoint(longitude, latitude)` (migration `20260414130000`).

### Tier 2 — Buildings (deadlines, structure)

| Prisma model | Table |
|--------------|-------|
| `Building` | `buildings` |
| `BuildingAddress` | `building_addresses` |

### Tier 3 — Listings (fallback map + all object types)

| Prisma model | Table | Geo |
|--------------|-------|-----|
| `Listing` | `listings` | `lat`, `lng` (nullable) |
| `ListingApartment` | `listing_apartments` | — |
| `ListingHouse` | `listing_houses` | — |
| `ListingLand` | `listing_lands` | — |
| `ListingCommercial` | `listing_commercials` | — |
| `ListingParking` | `listing_parkings` | — |
| `ListingApartmentBank` | `listing_apartment_banks` | optional |
| `ListingApartmentContract` | `listing_apartment_contracts` | optional |

### Tier 4 — Catalog performance (not in Prisma models)

| Object | Type | Purpose |
|--------|------|---------|
| `catalog_apartment_active_mv` | MATERIALIZED VIEW | Block catalog counts, price sorts |

Defined in migrations `20260413091500`, `20260417100000`.

### Tier 5 — CMS (optional for map chrome)

| Table | Include? |
|-------|----------|
| `site_settings` | **Partial** — map/Yandex key, office coords; exclude secrets |
| `navigation_menus`, `navigation_items` | Optional (header/footer on /map) |

---

## Tables to EXCLUDE from map snapshot

| Table | Reason |
|-------|--------|
| `users`, `sessions` | Auth, passwords, refresh tokens |
| `telegram_auth_codes` | OTP codes |
| `audit_events` | Operational logs |
| `requests` | CRM leads / PII |
| `telegram_notify_*` | Integrations |
| `favorites`, `user_collections*` | User data |
| `import_batches` | BullMQ operational history |
| `media_folders`, `media_files` | Large blobs; map uses CDN URLs |
| `news`, `news_telegram_channels` | Not map |
| `content_blocks*` | Not map |
| `mortgage_banks` | Not map |
| `field_overrides` | Admin overrides; optional |
| `sellers` | **Optional** — PII; null `listings.seller_id` if excluded |

---

## Production scale (HTTP-verified, not DB dump)

| Metric | Value (livegrid.ru, 2026-05-22) |
|--------|----------------------------------|
| Active apartments (region 1) | ~14 917 (`/stats/listing-kind-counts`) |
| Blocks with offers (catalog) | Hundreds (catalog-counts) |
| MSK blocks in feed docs | ~1 308 (`PROJECT_PLAN.md`) |

Full snapshot of all listings is **large but feasible** for local dev SSD; recommend **tiered** exports (see doc 02).

---

## Map API dependencies (must work after restore)

| Endpoint | DB dependency |
|----------|---------------|
| `GET /blocks` | blocks + listings (active published apartments) + MV |
| `GET /listings` | listings + kind tables + geo |
| `GET /districts`, `/subways` | reference + region |
| `GET /blocks/deadlines` | buildings / listing_apartments deadlines |
| `GET /reference/room-types`, `/finishings` | reference tables |
| Geo filters | PostGIS + block coordinates |

Public blocks query uses `require_active_listings=true` by default — snapshot **must** include matching listing rows or blocks appear empty.

---

## Deploy inventory script (server-side read-only)

`~/livegrid/deploy/check-counts.sh` — safe row counts on production (operator runs on server):

```bash
# ON PRODUCTION SERVER ONLY — read-only SELECTs
bash /var/www/lg/deploy/check-counts.sh
```

→ [02-safe-export-scope.md](./02-safe-export-scope.md)
