# Iteration 8.2 — Payload Reduction Analysis

## Mode

Measured comparison · slim DTO proposal · **no changes to production APIs**

**Date:** 2026-05-22 · local API `:3000`, region 1

---

## Current Payload Measurements

### Blocks — GET `/blocks?region_id=1&per_page=200&require_active_listings=true`

| Metric | Value |
|---|---|
| Wire download | **900 142 bytes** (~878 KB) |
| Uncompressed JSON (200 rows) | **2 060 605 bytes** (~2.0 MB) |
| Response time | 327 ms |
| Rows / total | 200 / 359 |

### Listings — GET `/listings?region_id=1&kind=APARTMENT&per_page=200`

| Metric | Value |
|---|---|
| Wire download | **370 342 bytes** (~362 KB) |
| Uncompressed JSON (200 rows) | **467 544 bytes** (~457 KB) |
| Response time | 277 ms |
| Rows / total | 200 / 14 917 |

---

## Field Usage Matrix

### Blocks

| Consumer | Fields actually read |
|---|---|
| **Map marker** | `slug`, `latitude`, `longitude`, `name`, `listingPriceMin` |
| **Map popup** | + `images[0]`, `district.name`, `subways[0]`, `_count.listings` |
| **Sidebar card** | + `builder.name`, `description`, `status`, `subways[]`, `addresses[0]`, price range |
| **Mapper (`blocks-from-api`)** | All 27 top-level keys transformed into `ResidentialComplex` |

**Map marker minimum:** 5 fields (~200 bytes/row estimated)  
**API delivers:** 27 keys + nested objects (~10 KB/row average uncompressed)

### Listings

| Consumer | Fields actually read |
|---|---|
| **Map marker** | `id`, `lat`, `lng`, `price`, `title`, `address` |
| **Map popup** | + `photoUrl` (from mapper) |
| **Sidebar card** | + `kind`, `apartment.*`, `block`, `builder`, … |

**Map marker minimum:** 6 fields  
**API delivers:** 36 top-level keys with deep `apartment` / `house` / `block` trees

---

## Slim DTO Proposal

Defined in `apps/web/src/redesign/lib/viewport-map-types.ts`:

```typescript
type ViewportBlockMarker = {
  id: number;
  slug: string;
  name: string;
  lat: number;
  lng: number;
  priceFrom: number | null;
  district: string | null;
  imageUrl: string | null;
};

type ViewportListingMarker = {
  id: number;
  lat: number;
  lng: number;
  price: string | number | null;
  title: string | null;
  photoUrl: string | null;
};
```

### Measured Slim vs Legacy (same 200 rows, derived from live API response)

| Dataset | Legacy JSON | Slim JSON | Reduction |
|---|---|---|---|
| 200 blocks | 2 060 605 B | **78 096 B** | **96.2%** |
| 200 listings | 467 544 B | **18 722 B** | **96.0%** |

Per-row averages (slim):

| Entity | ~bytes/row (JSON) |
|---|---|
| Block marker | ~390 B |
| Listing marker | ~94 B |

### Projected viewport fetch (typical Moscow zoom-11 bbox)

Assuming ~80 blocks visible (estimated from 359 total in default region view):

| Path | Estimated payload |
|---|---|
| Legacy (always 200) | ~878 KB wire |
| Slim viewport (~80 rows) | ~31 KB wire (extrapolated from slim per-row) |

**Caveat:** Wire size depends on gzip ratio and image URL lengths. Image URLs dominate slim block rows.

---

## Fields Explicitly Excluded from Slim DTO (and why)

| Excluded | Reason |
|---|---|
| `description`, `infrastructure` | Not shown on map; detail page only |
| `subways[]`, `addresses[]` | Popup uses 1 subway; sidebar needs full card from separate fetch |
| `builder`, `region`, `buildings` | Sidebar card only |
| `apartment.*` nested tree | Listing map never reads floor/plan on marker |
| `_count`, CRM fields | Internal / card-only |

**Popup gap:** Slim DTO lacks `subway` for blocks popup. Options for production v2:

1. Lazy fetch `/blocks/:slug` on popup open (preferred — 1 row)
2. Add optional `subwayName` to slim DTO (+~30 B/row)

---

## Sidebar Implication

Viewport slim DTO is **map-only**. Sidebar continues using legacy `/blocks` paginated fetch until a separate sidebar strategy is designed.

**Iter 8 rule:** Experimental viewport hook does **not** feed sidebar — zero sidebar regression risk.

---

## Production API Preservation

| API | Change in Iter 8 |
|---|---|
| `GET /blocks` | **None** |
| `GET /listings` | **None** |
| `GET /_prototype/*/viewport` | New isolated routes only |

Future optional `?fields=map` on catalog API is **not proposed** — separate viewport route keeps contracts clean.

---

## Recommendations

1. **Adopt slim DTO** for any viewport endpoint — measured 96% JSON reduction on same row count.
2. **Do not slim legacy `/blocks`** in Iter 8 — catalog and sidebar depend on full shape.
3. **Add `listingPriceMin` to prototype blocks query** when productionizing (currently null in prototype SQL).
4. **Add `photoUrl` subquery for listings prototype** when productionizing (currently null).
