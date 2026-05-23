# Iteration 8.3 — BBox Serialization Strategy

## Implementation

**File:** `apps/web/src/redesign/lib/bbox-serialization.ts`  
**Hook:** `apps/web/src/redesign/hooks/useMapBbox.ts`

---

## Coordinate Convention

| Corner | Params | Source (Yandex Maps) |
|---|---|---|
| South-west | `sw_lat`, `sw_lng` | `bounds[0]` from `map.getBounds()` |
| North-east | `ne_lat`, `ne_lng` | `bounds[1]` |

WGS84 decimal degrees. Matches PostGIS `ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)` argument order.

```typescript
type MapBbox = {
  swLat: number;
  swLng: number;
  neLat: number;
  neLng: number;
  zoom: number;
};
```

---

## Validation Rules

| Rule | Constant / function |
|---|---|
| All coords finite | `isValidBbox()` |
| `swLat < neLat`, `swLng < neLng` | `isValidBbox()` |
| Minimum zoom | `VIEWPORT_MIN_ZOOM = 10` — no fetch below city scale |
| Invalid bbox | Hook stays idle; API returns empty with meta reason |

**Rationale for zoom ≥ 10:** At world/country zoom, bbox spans thousands of km → request storm + useless marker density. Moscow default zoom is 11.

---

## Precision & Signature

**Signature function:** 4 decimal places on coords + rounded zoom:

```typescript
// Example: 55.7512,37.6184,55.8234,37.8921|z11
bboxSignature(b: MapBbox): string
```

| Setting | Value | Effect |
|---|---|---|
| Coordinate precision | 4 decimals (~11 m) | Dedupes micro-jitter from float bounds |
| Zoom in signature | Integer rounded | Refetch on zoom bucket change |

---

## Drift Threshold (Pre-Debounce)

`bboxChangedMeaningfully(a, b)` returns true when:

- `|zoom_a - zoom_b| >= 1`, OR
- Any corner delta > `VIEWPORT_BBOX_EPSILON` (**0.0008°** ≈ 89 m latitude)

Sub-threshold pans are ignored **before** debounce scheduling — reduces event noise from Yandex `boundschange`.

---

## Throttling & Debounce

| Stage | Delay | Purpose |
|---|---|---|
| `boundschange` handler | Immediate | Parse bounds, check epsilon |
| Debouncer | **450 ms** (`VIEWPORT_BBOX_DEBOUNCE_MS`) | Collapse pan/zoom burst into one fetch |
| Signature dedupe | In debouncer + hook | Skip identical signature |

**Hook flow:**

```
map.events.add('boundschange')
  → parseBboxFromYandexBounds(bounds, zoom)
  → if !bboxChangedMeaningfully → return
  → debouncer.schedule(450ms)
  → setBbox → triggers experimental hook
```

**Cleanup:** `debouncer.cancel()` on unmount / map teardown.

---

## Request Storm Prevention

| Guard | Location |
|---|---|
| DEV-only experimental flag | `isViewportExperimentalEnabled()` — zero prod requests |
| Zoom floor | `VIEWPORT_MIN_ZOOM = 10` |
| Epsilon filter | `bboxChangedMeaningfully` |
| 450 ms debounce | `createBboxDebouncer` |
| Signature dedupe | `lastSigRef` in experimental hooks |
| No production wiring | Legacy React Query unaffected |

**Expected request rate (active panning):** ≤ ~2 req/s worst case without dedupe; with debounce+epsilon typically **≤ 1 req per settled viewport**.

Production map today: **0 requests on pan/zoom** — experimental path must not alter this.

---

## URL Sync Implications

**Iter 8 decision: bbox NOT synced to URL.**

| Approach | Pros | Cons |
|---|---|---|
| **No URL sync (chosen)** | No history churn; no share-link bbox coupling | Cannot deep-link map viewport |
| URL sync (`?bbox=…`) | Shareable map state | Filter URL already complex; risk of URL ↔ fetch loops |

If production viewport ships later, optional `?map_bbox=` should be:

- Opt-in (separate from filter params)
- Written debounced (same 450 ms)
- Validated on read with `isValidBbox`

---

## API Serialization

```typescript
bboxToSearchParams(b: MapBbox): URLSearchParams
// sw_lat, sw_lng, ne_lat, ne_lng, zoom
```

Experimental hooks forward catalog filter params except bbox keys — future production should use same allowlist.

---

## Client-Side Fallback Filter

When prototype API fails:

```typescript
filterByBbox(items, bbox) // lat/lng within sw/ne corners
```

Uses legacy-loaded coordinates only — **cannot exceed 200-row cap** but proves bbox math without backend.

---

## Verification Checklist

| Scenario | Expected |
|---|---|
| Load map without `viewport_debug` | No bbox listener side effects on production path |
| Pan slowly | ≤ 1 experimental fetch per 450 ms settled window |
| Zoom 9 → 10 | Fetch enabled at 10+ |
| Zoom 10 → 11 | Signature change → one fetch |
| Micro-pan < 89 m | Ignored |
| Invalid bounds | Hook returns null; status `idle` |
| API 404 / error | `client-filter-fallback`; legacy map unchanged |

---

## Constants Summary

| Constant | Value |
|---|---|
| `VIEWPORT_MIN_ZOOM` | 10 |
| `VIEWPORT_BBOX_DEBOUNCE_MS` | 450 |
| `VIEWPORT_BBOX_EPSILON` | 0.0008° |
| Signature precision | 4 decimal degrees |
