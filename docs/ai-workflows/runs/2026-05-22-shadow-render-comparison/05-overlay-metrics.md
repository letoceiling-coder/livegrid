# Iteration 11.5 — Overlay Metrics (Shadow Layer)

## Extended fields (Iter 11)

**Store:** `map-render-observability.ts`

| Field | Description |
|---|---|
| `shadowRenderEnabled` | Shadow flag active |
| `shadowLayerMarkerCount` | Total shadow placemarks |
| `shadowOverlapRendered` | Green (overlap) count |
| `shadowViewportOnlyRendered` | Orange (viewport-only) count |
| `shadowLayerRebuilds` | Shadow cluster rebuilds |
| `lastShadowLayerRebuildMs` | Last shadow rebuild timing |

---

## Overlay section (MapDevOverlay)

When `shadowRenderEnabled`:

```
shadow layer
render: ON
shadow markers: N
green overlap: N
orange viewport-only: N
shadow rebuilds: N
last shadow rebuild: X.Xms
```

Existing **shadow parity** section (Iter 9) remains — numeric ID comparison independent of visual layer.

---

## Consistency check

| Metric | Parity section | Shadow layer |
|---|---|---|
| Overlap count | `shadowOverlap` | `shadowOverlapRendered` |
| Extra count | `shadowExtra` | `shadowViewportOnlyRendered` |

Counts should **match** after viewport fetch settles (same ID sets).

---

## API

```typescript
setShadowRenderEnabled(enabled: boolean)
recordShadowLayerRebuild({ markerCount, overlapRendered, viewportOnlyRendered, durationMs })
```

Recorded only when `isMapDebugEnabled()` for timing — counters always update.
