# Iteration 7 — Memoization Review

## Mode

Measured stabilization only · no blind useMemo

**Date:** 2026-05-22

---

## Added Memoization

| Location | What | Why |
|---|---|---|
| `MapSearch` | `buildDescriptors` useCallback | Stable hook input; rebuild when complexes change |
| `MapSearch` | `activeComplex` useMemo | Popup isolated from cluster lifecycle |
| `MapSearch` | `clusterExtra` useMemo | Prevent cluster effect churn from object identity |
| `ListingsMapSearch` | Same pattern | Parity |
| `ListingsMapSearch` | `onSelectSlug` useCallback | Adapt number id ↔ string id without inline fn |
| `useMapClusterLayer` | `descriptors` useMemo | Recompute only when mode/builder changes |
| `useMapClusterLayer` | `layerSignature` useMemo | Signature compare before rebuild |
| `useMapClusterLayer` | `onSelectRef` / `clickModeRef` | Remove unstable deps from cluster effect |

---

## Intentionally NOT memoized

| Item | Reason |
|---|---|
| Every sidebar row onClick | `setActiveBlock` stable; inline lambda OK |
| `complexes` / `listings` arrays | Come from React Query — signature guard handles identity churn |
| Popup subcomponents | Cheap React tree; active item only |
| `buildMarkerLayoutHtml` | Pure function; called only on cache miss |

---

## Hook Extraction

`useMapClusterLayer` consolidates duplicate map init + cluster logic from MapSearch and ListingsMapSearch.

**Not** a clusterer replacement — same Yandex API calls, shared lifecycle discipline.

---

## RedesignMap (unchanged)

- `listingItems` already `useMemo`
- `blocks` already `useMemo` from query data
- `handleFiltersChange` already `useCallback` (Iter 5)

No additional wrapping — no measured benefit.

---

## Anti-patterns avoided

- ❌ useMemo on every popup field
- ❌ React.memo on MapSearch entire component
- ❌ Custom comparison on complexes deep equality (signature string sufficient)
