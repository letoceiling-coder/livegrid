# 06 — Map flow verification

**Date:** 2026-05-22  
**URL:** http://localhost:5173/map  
**Backend:** http://localhost:3000/api/v1

## API layer (verified via curl)

| Flow | Endpoint | Status | Data |
|------|----------|--------|------|
| Apartments / blocks | `GET /blocks?region_id=1&require_active_listings=true` | ✅ 200 | 11 blocks |
| Listings fallback | `GET /listings?region_id=1&kind=APARTMENT&statuses=ACTIVE,RESERVED&is_published=true` | ✅ 200 | 24 listings |
| Regions | `GET /regions` | ✅ 200 | MSK + others seeded |
| Districts filter | `GET /districts?region_id=1` | ✅ 200 | 40 |
| Subways filter | `GET /subways?region_id=1` | ✅ 200 | 50 |
| Deadlines filter | `GET /blocks/deadlines?region_id=1` | ✅ 200 | 1 token |
| Maps config | `GET /content/maps-config` | ✅ 200 | `apiKey: null` |
| Vite proxy | `GET localhost:5173/api/v1/blocks?...` | ✅ 200 | Same totals |

## Frontend logic (`RedesignMap.tsx`)

| Behavior | Expected with current data | Verified |
|----------|---------------------------|----------|
| `objectType=apartments`, primary market | Uses `/blocks` first | ✅ API returns 11 blocks |
| Blocks empty → listings | N/A (blocks non-empty) | — |
| `marketType=secondary` | Uses `/listings` directly | ✅ 3 secondary listings exist |
| `requireActiveListings: true` | Blocks need published apartments | ✅ 2 listings per mirrored block |
| URL sync | `catalogFiltersFromSearchParams` | Code present; manual browser test |
| React Query | `useQuery` for blocks/listings/deadlines | API data available |

## Geo / markers

| Item | Status |
|------|--------|
| Block coordinates | ✅ All 11 blocks have lat/lng |
| Listing coordinates | ✅ Secondary listings have lat/lng |
| PostGIS extension | ✅ Enabled in `lg_development` |
| Yandex Maps API key | ⚠️ `null` — tiles may not render |

**Browser visual check:** MCP browser unavailable in this session. Open http://localhost:5173/map manually:

- Expect sidebar list of ~11 ЖК names
- Markers depend on Yandex key (`site_settings.yandex_maps_api_key` or env)
- Block card images load from TrendAgent CDN URLs (external HTTPS)

## objectType switching

| Tab | API path | Local data |
|-----|----------|------------|
| Квартиры | `/blocks` → `/listings` fallback | 11 / 24 |
| Комнаты | `/listings` kind=APARTMENT | Yes |
| Дома | `/listings` kind=HOUSE | Empty (no house listings yet) |
| Участки | kind=LAND | Empty |
| Коммерция | kind=COMMERCIAL | Empty |

## Loading / empty states

- Initial load: React Query fetches blocks — should leave loading state when 11 rows return
- Houses/land tabs: expected empty state (no data seeded)

## Recommended manual browser QA

1. Open `/map` — confirm sidebar shows ЖК names
2. Toggle **Вторичка** — should show listings flow (3 secondary)
3. Open district filter — should list 40 districts
4. Change URL `?search=Донской` — block search should narrow results
5. If map blank: set Yandex key in admin → Site settings

→ [07-known-data-issues.md](./07-known-data-issues.md)
