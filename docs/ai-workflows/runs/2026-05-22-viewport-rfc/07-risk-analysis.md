# Iteration 8.6 — Risk Analysis

## Mode

Rollback-safe RFC · explicit out-of-scope enforcement

---

## Risk Matrix

| Risk | Severity | Likelihood | Mitigation (Iter 8) |
|---|---|---|---|
| Production map switches to viewport | Critical | Low | DEV-only flag; experimental data not wired to clusterer |
| Legacy API contract break | Critical | Low | No changes to `/blocks`, `/listings` |
| Request storm on pan/zoom | High | Medium | 450 ms debounce, epsilon filter, zoom ≥ 10, signature dedupe |
| 200-cap removed prematurely | High | Low | Explicitly out of scope; documented |
| Sidebar desync | High | Medium | Viewport hook does not feed sidebar |
| Marker flicker | Medium | Low | No dual render in Iter 8 — metrics only |
| Prototype SQL perf regression | Medium | Medium | Isolated module; not on catalog path; LIMIT 300 |
| Geo + bbox interaction bugs | Medium | High | Prototype ignores catalog filters today — documented gap |
| Listings geo cache drift | Medium | Existing | Pre-existing Iter 5 issue; viewport must not worsen |
| Prototype exposed in prod | Medium | Low | 503 unless `VIEWPORT_PROTOTYPE_ENABLED=1` |
| Invalid bbox crashes | Low | Low | Validation returns empty array |
| API 404 breaks map | Low | Medium | Automatic client-filter fallback |
| localStorage flag left on in DEV | Low | Low | Manual disable helper; no prod impact |

---

## Production Stability Guarantees

| Guarantee | Mechanism |
|---|---|
| Default UX unchanged | `isViewportExperimentalEnabled()` false without flag |
| Zero prod bundle cost | `import.meta.env.DEV` guard |
| Zero prod API surface | `_prototype` prefix + env gate |
| Cluster path untouched | `useMapClusterLayer` inputs unchanged |
| React Query untouched | No new catalog query keys |
| Rollback in seconds | Remove URL param / localStorage |

---

## Fallback Safety Chain

```
1. isViewportExperimentalEnabled() === false
   → hooks no-op, status=disabled

2. regionId == null || !isValidBbox(bbox)
   → status=idle, no fetch

3. prototype API throws / 404 / 503
   → filterByBbox(legacyPoints, bbox)
   → status=fallback
   → legacy map continues with full 200 dataset

4. invalid bbox at API
   → { data: [], meta: { reason: 'invalid_bbox' } }
   → viewport markers: 0, legacy unchanged
```

**Production path survival:** Steps 3–4 never throw into cluster layer; errors caught in hook try/catch.

---

## Request Storm Analysis

| Event | Legacy API calls | Experimental (flag on) |
|---|---|---|
| Page load | 7–8 (reference + catalog) | +1 after map bounds ready |
| Continuous pan 5 s | 0 | ~2–5 (debounced) |
| Rapid zoom 10→14 | 0 | ~4 (zoom in signature) |
| Filter change | 1 catalog refetch | Legacy refetch + bbox refetch after settle |

**Worst case:** Filter change during pan — bounded by debounce; no overlap with legacy query cancellation needed because experimental uses separate fetch.

---

## Data Completeness Risks

| Scenario | Risk | Notes |
|---|---|---|
| Viewport only, no legacy | High | Not implemented — would orphan sidebar |
| Client-filter fallback | Medium | Capped at 200 legacy rows — undercounts vs true bbox |
| Prototype without catalog filters | Medium | Over-counts vs filtered map |
| `limit=300` truncation | Medium | Dense bbox may clip markers — needs meta.truncated |

---

## Schema / SQL Risks (Prototype)

| Item | Risk | Status |
|---|---|---|
| `block_catalog_mv` join | Broken SQL | **Removed** — simplified query |
| `listingPriceMin` null in prototype | Low | Acceptable for prototype; add before production |
| `photoUrl` null listings | Low | Popup not using prototype data |
| PostGIS envelope order | Low | Verified `ST_MakeEnvelope(sw_lng, sw_lat, ne_lng, ne_lat, 4326)` |
| Missing API restart | Ops | 404 until restart — fallback works |

---

## UX Regression Checklist

| Scenario | Expected | Risk if viewport wired to render |
|---|---|---|
| Apartments mode | 200 block markers | Marker swap flicker |
| Listings mode | 200 listing markers | Same |
| Geo filter active | Geo-filtered set | Bbox may ignore geo in prototype |
| Region switch | Refetch + re-center | Stale bbox signature — mitigated by regionId in hook deps |
| Mobile map open | Full-width map | Extra network on cellular if flag on |
| Selection sync | Sidebar ↔ map | Broken if dual data sources render |

**Iter 8 mitigation:** Metrics-only experimental path avoids UX regression class entirely.

---

## Explicit Out-of-Scope (Reconfirmed)

- Remove 200 cap
- Switch production to viewport
- Rewrite map engine / clusterer
- React Query rewrite
- WebSocket sync
- Web workers
- Delete existing APIs
- Forced bbox migration

---

## Rollback Plan

| Level | Action | Time |
|---|---|---|
| L1 — Disable experiment | Remove `viewport_debug=1` | Immediate |
| L2 — Remove hook wiring | Revert MapSearch/ListingsMapSearch imports | 1 commit |
| L3 — Remove prototype module | Delete `viewport-prototype/` + app.module import | 1 commit |
| L4 — Full revert | Git revert Iter 8 branch | Standard |

No database migrations required — prototype is read-only SQL.

---

## Open Risks for Production v2 (Future)

1. **Dual data source rendering** — highest risk when viewport feeds markers
2. **Sidebar pagination vs map bbox** — UX design required
3. **Geo ∩ bbox correctness** — needs integration tests with PostGIS fixtures
4. **Secondary listing synthetic coords** — bbox filter meaningless for fake coords
5. **Cache strategy** — viewport responses need short TTL + bbox-keyed Redis

None of these are introduced to production in Iter 8.
