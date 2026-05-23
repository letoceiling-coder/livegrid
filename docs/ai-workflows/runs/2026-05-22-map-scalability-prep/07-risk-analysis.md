# Iteration 7 — Risk Analysis

## Change class

**Frontend-only · map lifecycle preparation · DEV observability**

---

## Risk matrix

| Area | Risk | Mitigation |
|---|---|---|
| Selection layout swap | LOW-MED | Uses Yandex `options.set`; fallback full rebuild on signature change |
| Layout cache | LOW | Bounded keys; same HTML as before |
| Hook extraction | LOW-MED | Same cluster presets/options preserved |
| clickMode select vs toggle | LOW | Explicit per map type |
| map_debug overlay | LOW | DEV + query param gated |
| Signature false skip | LOW | Includes id+coords+label — conservative |

---

## Regression vectors

| Vector | Likelihood | Notes |
|---|---|---|
| Marker flicker on select | Low | Layout swap only, no remove/add |
| Missing markers after filter | Low | Signature changes on real data change |
| Broken toggle on listings map | Low | `clickMode: 'toggle'` preserved |
| Blocks map always selects | Low | `clickMode: 'select'` preserved |
| Stale active highlight | Med | Full rebuild sets initial active; selection effect syncs |

---

## NOT introduced

- Viewport API
- Different clusterer
- Fewer API requests
- Marker count above 200

---

## Rollback

Revert/delete:

```
redesign/lib/map-marker-cache.ts
redesign/lib/map-render-observability.ts
redesign/hooks/useMapClusterLayer.ts
redesign/components/MapDevOverlay.tsx
MapSearch.tsx, ListingsMapSearch.tsx (restore inline cluster effects)
```

---

## Deploy recommendation

**LOW-MED risk** — behavioral change on selection path (optimization). Recommend smoke with sidebar + marker clicks before prod.

Bundle with Iterations 2–6.

**Debug:** use `?map_debug=1` in staging dev builds only.
