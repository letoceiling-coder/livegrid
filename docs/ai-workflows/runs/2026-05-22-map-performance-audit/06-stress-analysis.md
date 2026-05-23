# Stress Analysis

## Mode

READ-ONLY · real dataset · API + architectural stress scenarios

**Dataset:** region 1 — 359 active blocks, 14917 apartment listings, 181 districts

---

## Test Environment

| Component | Version / config |
|---|---|
| API | `node apps/api/dist/main.js`, port 3000 |
| DB | PostgreSQL 16 + PostGIS, `lg_development` |
| Redis | local, flushed between cold tests |
| Hardware | WSL2 dev machine (relative numbers, not prod SLA) |

---

## Scenario 1: Zoom Stress

### Setup

359 blocks loaded (max 200 on map), Yandex Maps zoom 11 → 14.

### Code behavior

```typescript
// MapSearch.tsx
const PRICE_LABEL_ZOOM = 12;
useEffect(() => { /* rebuild all markers */ }, [complexes, activeSlug, zoom, ready]);
```

### Stress points

| Zoom action | Markers | Layout type | Rebuild |
|---|---|---|---|
| 11 → 11.9 | 200 | dots | none |
| 11.9 → 12.1 | 200 | price pills | **full rebuild** |
| 12 → 13 | 200 | pills | **full rebuild each step** |

**Risk:** rapid zoom causes repeated O(N) marker recreation. At N=200, user-triggered zoom is acceptable; at N=1000+ (if pagination fixed without viewport culling) → main thread blocking.

**Not measured with browser Performance API in this audit** — architectural bound is O(N × zoom events).

---

## Scenario 2: Dense Regions

### Unfiltered region 1

- 200 markers in Moscow metro area
- Yandex Clusterer handles visual overlap
- All 200 placemarks still instantiated in memory

### Geo-filtered dense core (5 km Kremlin)

```
GET /blocks?…&geo_lat=55.7558&geo_lng=37.6173&geo_radius_m=5000
→ meta.total: 33
→ PostGIS: 29.7 ms seq scan
→ Payload: 167 KB
```

Dense filter **reduces** frontend stress — backend geo cost fixed per scan.

### Listings density (if pagination removed)

- 14917 apartments / 200 per page = 75 pages
- Loading all: 75 × 370 KB ≈ **27 MB** JSON — **not viable** without viewport API

---

## Scenario 3: Rapid Filter Changes

### Method

5 sequential room filter values, cold Redis between first request; then 5 parallel requests.

### Results

**Sequential (cold cache each unique key):**

```
filter rooms=1: 258 ms
filter rooms=2: 310 ms
filter rooms=3: 244 ms
filter rooms=4: 182 ms
filter rooms=5: 182 ms
```

**Parallel (same session, mixed cache):**

```
c1:195ms c2:41ms c3:73ms c4:106ms c5:146ms
```

### Frontend cascade per change

1. URL rewrite
2. blocks query refetch (~900 KB)
3. `mapApiBlockListRowToResidentialComplex` × 200
4. MapSearch full clusterer rebuild
5. Sidebar 200 DOM nodes rebuild

**Risk:** user dragging multiple filters quickly queues React Query requests — no debounce on filter changes. TanStack Query cancels in-flight by default (v5) — OK for network, but UI may flicker.

---

## Scenario 4: Rapid Map Movement

### Architecture

- Pan/drag: Yandex handles — **no API calls on bounds change**
- `boundschange` → `setZoom` only

### Implication

Map pan is cheap (no backend stress). Zoom triggers marker rebuild — moderate frontend cost.

**Missing viewport fetch:** panning to Saint Petersburg suburbs still shows Moscow-loaded 200 blocks — **functional gap**, not perf stress.

---

## Scenario 5: Listings-Heavy Scenarios

### Houses / land / commercial

Uses listings endpoint — no Redis cache.

```
GET /listings?region_id=1&kind=HOUSE&per_page=200&is_published=true
(cold ~160-220 ms, 370 KB scale)
```

### Apartments fallback (no blocks)

When blocks return empty → listings query activates — **double fetch penalty** on edge cases:

1. blocks query completes empty
2. listings query starts
3. User waits sum of both latencies

### Total listing corpus

| kind | published (region 1) | pages @200 |
|---|---|---|
| APARTMENT | 14917 | 75 |
| All listings in DB | 78543 | 393 |

Map architecture cannot scale to full listing corpus without bbox pagination.

---

## Scenario 6: Mobile Viewport

### Layout stress

- Viewport ~375×667
- Map: ~60% height after header/search/region
- Sidebar: 40vh ≈ 267px → ~4-5 cards visible
- 200 cards in DOM — scroll through all requires 40+ swipes

### Network

Same 900 KB payload as desktop — no responsive payload trimming.

### Touch selection

Marker tap → rebuild all markers — same as desktop stress.

---

## Scenario 7: Sidebar Load

### DOM nodes (blocks mode, N=200)

- 200 × (button + img + text + link) ≈ 1000+ DOM nodes
- 200 image HTTP requests (CDN/external URLs from feed)
- No lazy loading attribute on sidebar images

### Memory

- 200 `ResidentialComplex` objects in React state
- 200 Yandex placemark + layout objects
- Duplicated data: same array feeds map + sidebar

**Estimated duplicate memory:** acceptable at 200; scales linearly.

---

## Scenario 8: Cache Stampede (cold start)

Simulated: Redis flush + single blocks request → 238 ms.

If 100 concurrent users hit same cold key:

- 100 × heavy Prisma queries before first cache write
- No request coalescing observed in code (standard Nest per-request)

**Production mitigation already present:** 45s TTL + Redis — second user gets warm cache. Risk window: ~238 ms after TTL expiry under concurrent load.

Listings endpoint: **every request hits DB** — no stampede protection.

---

## Scenario 9: objectType Switch Stress

Switching apartments → houses:

1. blocks query disabled
2. listings query enabled (cold)
3. MapSearch unmount → ListingsMapSearch mount
4. New Yandex map instance? — **ListingsMapSearch creates separate map ref** — full map re-init

**Risk:** tab switching is expensive (full map teardown + new fetch + new map init).

---

## Scalability Risk Matrix

| Scenario | Current (1.3K blocks) | At 5K blocks / 50K listings |
|---|---|---|
| Blocks map load | 238 ms cold, 900 KB | 900 KB+ if per_page↑ |
| Geo radius | 30 ms DB | ~120 ms seq scan |
| Filter spam | 180-310 ms | worse without cache |
| Zoom markers | 200 rebuild | critical if N>500 |
| Listings map | 200 of 14K | unusable without viewport |
| Mobile sidebar | scroll OK at 200 | poor at 500+ |
| Tab switch | full remount | same |

---

## Reproducibility

```bash
API=http://localhost:3000/api/v1

# Rapid filter simulation
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "rooms=$i:%{time_total}s " \
    "$API/blocks?region_id=1&per_page=200&require_active_listings=true&rooms=$i"
done
echo

# Concurrent
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "c$i:%{time_total}s " \
    "$API/blocks?region_id=1&per_page=200&require_active_listings=true&rooms=$i" &
done
wait
echo

# Pagination stress (data volume if map loaded all pages)
curl -s "$API/listings?region_id=1&kind=APARTMENT&per_page=200&is_published=true" \
  | python3 -c "import sys,json; m=json.load(sys.stdin)['meta']; print('pages', m['total_pages'], 'total', m['total'])"
```

---

## Key Stress Findings

1. **Frontend marker rebuild** is the dominant interactive stress — not the API at N=200
2. **900 KB blocks payload** dominates initial load stress
3. **Listings mode** has no cache — repeated stress on every interaction
4. **Pagination cap** prevents worst-case listing load but creates completeness stress
5. **Geo seq scan** not yet stressed — headroom until ~5K blocks
