# Iteration 7 — Marker Identity Plan

## Implemented

**Module:** `redesign/lib/map-marker-cache.ts`

---

## MapMarkerDescriptor

Minimal stable payload per placemark:

```typescript
type MapMarkerDescriptor = {
  id: string;           // slug or listing id
  coords: [number, number];
  label: string | null; // pre-formatted for current zoom mode
};
```

Built by:
- `buildComplexMarkerDescriptors(complexes, mode)`
- `buildListingMarkerDescriptors(listings, mode)`

Label formatting (`complexMarkerLabel`, `listingMarkerLabel`) runs at descriptor build time — not inside cluster loop closures.

---

## Layer Signature

```typescript
markerLayerSignature(mode, descriptors): string
// e.g. "price|200|slug1:55.75,37.62:от 5.2 млн;slug2:..."
```

Cluster **full rebuild** skipped when signature unchanged (same mode bucket + same ids/coords/labels).

---

## Placemark Registry

**Hook:** `useMapClusterLayer`

- `placemarksRef: Map<string, Placemark>` — O(1) lookup by id
- `descriptorsByIdRef` — label source for selection updates

---

## Selection Isolation

When only `activeId` changes:

1. `applyPlacemarkActive(prevId, false)` — swap cached layout class
2. `applyPlacemarkActive(nextId, true)`
3. **No** clusterer remove/add

Uses `pm.options.set('iconLayout', getCachedMarkerLayoutClass(...))`.

---

## onSelect Stability

`onSelectRef.current` in click handlers — `onSelect` removed from cluster rebuild deps.

RedesignMap passes `setActiveBlock` / `setActiveListing` (stable useState setters).

---

## clickMode

| Map | Mode | Behavior preserved |
|---|---|---|
| Blocks | `select` | Always pass slug on marker click |
| Listings | `toggle` | Deselect if already active |

---

## Expected Rebuild Reduction

| Action | Before | After |
|---|---|---|
| Sidebar select row | Full cluster rebuild (~200 markers) | 2 layout swaps |
| Same data refetch | Full rebuild | Skip if signature match |
| Zoom bucket change | Full rebuild | Full rebuild (required) |
| Filter change | Full rebuild | Full rebuild (required) |
