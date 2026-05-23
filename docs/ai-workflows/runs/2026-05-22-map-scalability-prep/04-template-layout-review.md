# Iteration 7 — Template Layout Review

## Problem (pre-change)

```typescript
// Per marker, per rebuild:
window.ymaps.templateLayoutFactory.createClass(
  buildMarkerLayoutHtml({ mode, label, isActive })
);
```

`createClass` allocates a Yandex layout class + parses HTML string. With 200 markers and frequent rebuilds (especially on selection), this creates GC pressure.

---

## Solution: Layout Class Cache

**Function:** `getCachedMarkerLayoutClass(ymaps, mode, label, isActive)`

**Cache key:** `` `${mode}\0${isActive}\0${label}` ``

Same tuple → same class instance reused across rebuilds and selection updates.

---

## Cache Cardinality (estimated)

| Mode | Labels | Active ×2 | Approx entries |
|---|---|---|---|
| dot | 1 (null) | 2 | 2 |
| price | ~50–200 unique prices | 2 | 100–400 |
| name | ~200 names | 2 | 400 |

Bounded by unique labels in current viewport dataset — not N×rebuilds.

---

## HTML Generation

Still uses `buildMarkerLayoutHtml()` from `map-marker-layout.ts` — **unchanged UX**.

Cache sits between HTML string and `createClass`.

---

## Selection Update Path

```typescript
pm.options.set('iconLayout', getCachedMarkerLayoutClass(..., isActive: true|false));
```

No new `createClass` on selection if both active/inactive layouts already cached.

---

## Cache Lifecycle

- Module-level `Map` — persists for SPA session
- `clearMarkerLayoutCache()` exported for tests
- Mode bucket change may add new keys; old entries harmless (small memory)

---

## NOT changed

- Marker HTML/CSS design
- `markerIconShape()` per mode
- `escapeMarkerHtml` / `truncateMarkerLabel`

---

## Future (viewport RFC)

When viewport loads subset of markers, cache warms only for visible label set — compatible without rewrite.
