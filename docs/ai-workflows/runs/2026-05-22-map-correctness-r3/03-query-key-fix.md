# R3 — Query Key Fix

## Problem (audit finding)

`listingsQuery` passed geo params to API via `buildListingsSearchParams` but **geo was absent from queryKey**.

**Impact:** React Query could serve stale listings when geo URL params changed (especially secondary apartments + geo filter).

---

## Fix

### Listings queryKey — added

```typescript
geoPreset, geoPolygon, geoLat, geoLng, geoRadius,
```

Full key now mirrors blocks query geo segment:

| Param | URL key | In blocks key | In listings key (after R3) |
|---|---|---|---|
| preset | `geo_preset` | ✓ | ✓ |
| polygon | `geo_polygon` | ✓ | ✓ |
| lat | `geo_lat` | ✓ | ✓ |
| lng | `geo_lng` | ✓ | ✓ |
| radius | `geo_radius_m` | ✓ | ✓ |

---

## Secondary fix — duplicate marketType removed

Blocks key had `filters.marketType` twice (audit §7). Removed duplicate — functionally equivalent keys, cleaner cache identity.

---

## Verification

### Manual (React Query Devtools)

1. Open `/map?region_id=1` in secondary mode: add `market=secondary` or switch market type
2. Add geo params: `&geo_lat=55.7558&geo_lng=37.6173&geo_radius_m=5000`
3. Confirm new query key triggers fetch (not cached pre-geo result)

### Code inspection

```bash
grep -n "geoPreset, geoPolygon" ~/livegrid/apps/web/src/redesign/pages/RedesignMap.tsx
# Should appear in BOTH blocksQuery and listingsQuery queryKey arrays
```

---

## Cache behavior preserved

- No changes to API URLs or Redis keys
- Blocks still cached server-side 45s
- Listings still uncached server-side
- Client cache keyed correctly per filter + geo combination

---

## Regression risk

**Low.** Adding key segments only invalidates cache when geo changes — correct behavior.
