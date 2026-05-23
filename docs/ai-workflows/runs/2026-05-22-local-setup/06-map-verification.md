# 06 — Map flow verification

**Date:** 2026-05-22  
**Frontend:** `~/livegrid/apps/web/src/redesign/pages/RedesignMap.tsx`  
**Production map APIs:** `/api/v1/blocks`, `/api/v1/listings` (not Laravel `/map/complexes`)

## Page access

| Check | Result |
|-------|--------|
| `http://localhost:5173/map` | **200** — React SPA loads |
| Title | `LiveGrid — Недвижимость в России \| Более 100 000 объектов` |
| Vite HMR | Active on `:5173` |

## API endpoints used by map (from RedesignMap.tsx)

| Endpoint | When | Local result |
|----------|------|--------------|
| `GET /regions` | Region selector | **200** — MSK, BELGOROD seeded |
| `GET /blocks/deadlines?region_id=` | Apartment filters | **200** — `[]` |
| `GET /blocks?{filters}` | `objectType=apartments` && not secondary | **200** — empty `data[]` |
| `GET /listings?{filters}` | Fallback when no blocks, or non-apartment types | **200** — empty after `db push` |
| `GET /content/maps-config` | Yandex Maps API key | **200** — `{"apiKey":null}` |

## Map logic (production Nest code)

From `RedesignMap.tsx`:

```typescript
const useBlocksForApartments = objectType === 'apartments' && filters.marketType !== 'secondary';
// ...
const needListings = !useBlocksForApartments || (blocksQuery.isFetched && blocks.length === 0);
const useBlocksMap = useBlocksForApartments && blocks.length > 0;
```

Flow:

1. **Apartments (primary market):** fetch `/blocks` first
2. If blocks empty → fetch `/listings` as fallback
3. **Secondary / houses / land / etc.:** `/listings` directly
4. Markers: `MapSearch` (blocks) or `ListingsMapSearch` (listings)

## React Query

- `useQuery` for blocks, listings, deadlines
- `enabled` gates tied to `regionId` and object type
- URL sync via `catalogFiltersFromSearchParams` / `catalogFiltersIntoSearchParams`

## Local limitations (expected)

| Feature | Status | Reason |
|---------|--------|--------|
| Block markers on map | Empty | No TrendAgent feed import locally |
| Listing markers | Empty | No listings in DB |
| Yandex map tiles | May not render | `maps-config.apiKey` is null (set in admin site_settings) |
| Filters UI | Loads | API returns empty arrays |
| URL filter sync | Code present | Test with `?region=1&...` params manually |
| Sidebar list | Empty state | No data |

## Populating map data locally (optional, safe)

### Option 1 — TrendAgent feed import

Requires feed JSON in `FEED_LOCAL_DIR` or network access to `dataout.trendagent.ru`:

```bash
# In .env:
# FEED_LOCAL_DIR=/path/to/TrendAgent/data
# FEED_IMPORT_DISABLE_REPEAT=false   # only if you want cron

# Trigger via admin API (needs JWT):
# POST /api/v1/admin/feed-import/run
```

### Option 2 — Manual listing via admin

Login `admin@livegrid.ru` / `admin123!` → create manual apartment/house listing with coordinates.

### Option 3 — Yandex Maps key

Admin → Site settings → `yandex_maps_api_key`, or:

```env
YANDEX_MAPS_API_KEY=your-dev-key
```

Restart API after change.

## curl verification script

```bash
BASE=http://localhost:3000/api/v1
R=1

echo "=== regions ==="
curl -s "$BASE/regions" | head -c 200; echo

echo "=== blocks ==="
curl -s "$BASE/blocks?region_id=$R&per_page=5"; echo

echo "=== listings ==="
curl -s "$BASE/listings?region_id=$R&kind=APARTMENT&per_page=5"; echo

echo "=== maps-config ==="
curl -s "$BASE/content/maps-config"; echo

echo "=== via vite proxy ==="
curl -s "http://localhost:5173/api/v1/blocks?region_id=$R&per_page=1"; echo
```

## Comparison with livegrid.ru

| Aspect | Production | Local (this setup) |
|--------|------------|-------------------|
| Platform | Nest monorepo | Same repo HEAD |
| Blocks API | `/api/v1/blocks` | Same path, empty data |
| Map page route | `/map` | `/map` |
| Data volume | Full feed | Seed only |

## Ready for map development?

**Infrastructure:** Yes — API, web, DB, Redis, proxy all work.  
**Data:** No — import feed or add test listings before marker/UI work.  
**Yandex key:** Optional but recommended for visual map testing.

→ [07-workspace-strategy.md](./07-workspace-strategy.md)
