# Iteration 7 — Render Observability

## DEV Overlay

**Component:** `MapDevOverlay.tsx`  
**Visibility:** `import.meta.env.DEV && ?map_debug=1`

---

## Display Fields

```
map_debug
layer: blocks | listings
mode: dot | price | name
markers: N
cluster rebuilds: N
selection updates: N
mode transitions: N
last rebuild: X.Xms
reason: signature | empty
last selection: X.Xms
```

Position: top-left, semi-transparent, non-interactive.

---

## Enable Instructions

Local development:

```
http://localhost:5173/map?map_debug=1&region_id=1
```

Toggle listings tab — `layer` switches to `listings`, stats reset via `resetMapRenderStats`.

---

## Production Safety

| Guard | Effect |
|---|---|
| `import.meta.env.DEV` | Tree-shaken / dead in prod build |
| `map_debug=1` required | No accidental overlay in dev |
| `isMapDebugEnabled()` wraps all `record*` calls | Zero timing overhead in prod |
| Overlay `pointer-events-none` | No UX interference when enabled |

---

## Interpreting Counters

| Pattern | Healthy post-Iter-7 |
|---|---|
| Load map | 1 cluster rebuild |
| 20 sidebar clicks | 20 selection updates, 0 extra rebuilds |
| Zoom across 3 buckets | 2 mode transitions, 2 rebuilds |
| Search debounce (Iter 5) | 1 rebuild after settle (if results change) |
| Same refetch, same data | 0 rebuilds (signature match) |

---

## Future

Counters can feed a Canvas dashboard or export button for viewport RFC — not implemented (preparation only).
