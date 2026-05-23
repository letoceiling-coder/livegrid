# Iteration 7 — Cluster Instrumentation

## Module: `map-render-observability.ts`

**DEV ONLY** — gated by:

```typescript
import.meta.env.DEV && URLSearchParams.get('map_debug') === '1'
```

No production logging. No Sentry/console spam in prod builds.

---

## Recorded Metrics

| Metric | Trigger |
|---|---|
| `clusterRebuilds` | Full clusterer recreate (signature change) |
| `selectionUpdates` | Active marker layout swap only |
| `modeTransitions` | Zoom bucket change (dot→price→name) |
| `markerCount` | Last rebuild placemark count |
| `lastClusterRebuildMs` | `performance.now()` delta |
| `lastSelectionMs` | Selection update duration |
| `lastClusterReason` | `'signature'` \| `'empty'` |
| `markerMode` | Current zoom bucket |
| `layerKind` | `'blocks'` \| `'listings'` |

---

## API

```typescript
recordClusterRebuild(layerKind, markerCount, durationMs, reason)
recordSelectionUpdate(durationMs)
setMapRenderMode(mode, from?)
resetMapRenderStats(layerKind)
subscribeMapRenderStats(listener) → unsubscribe
isMapDebugEnabled()
```

---

## Usage

Enable overlay on local dev:

```
/map?map_debug=1
```

**Component:** `MapDevOverlay.tsx` — top-left monospace panel, `pointer-events-none`, `z-[100]`.

---

## Evidence Collection Workflow

1. Open `/map?map_debug=1` with production-like snapshot
2. Baseline: note `clusterRebuilds` after load
3. Click 10 sidebar rows → expect `selectionUpdates` += 10, **not** `clusterRebuilds` += 10
4. Zoom 11→13→15 → expect `modeTransitions` and 1 rebuild per bucket change
5. Type search (debounced) → rebuild only after query settles

Store numbers in future viewport RFC — not fake scalability claims.

---

## NOT instrumented

- Network payload bytes (API layer)
- React component render counts (React Profiler — manual)
- Yandex internal cluster paint time
