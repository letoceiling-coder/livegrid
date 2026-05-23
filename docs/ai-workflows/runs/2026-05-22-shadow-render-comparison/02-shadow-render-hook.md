# Iteration 11.2 — Shadow Render Hook

## Implementation

**File:** `apps/web/src/redesign/hooks/useShadowViewportRender.ts`

---

## Architecture

```
useMapClusterLayer          → legacy cluster (UNCHANGED, interactive)
useViewport*Experimental    → viewport fetch + parity metrics
useShadowViewportRender     → optional second cluster (silent, DEV-only)
```

**Single Yandex Map instance** — shadow cluster is a separate `ymaps.Clusterer` on `map.geoObjects`.

---

## Hook API

```typescript
useShadowViewportRender({
  enabled: shadowRender && viewportExperimental && viewportResult != null,
  mapInstance,
  ready,
  layerKind: 'blocks' | 'listings',
  viewportPoints: [{ id, coords }],
  legacyInBboxIds: string[],
});
```

---

## Marker classification

For each viewport point:

| Condition | Shadow kind | Color |
|---|---|---|
| `id ∈ legacyInBboxIds` | `overlap` | Green `#22c55e` |
| `id ∉ legacyInBboxIds` | `viewport-only` | Orange `#f97316` |

**Legacy-only markers:** rendered **only** on main legacy cluster (blue). Not duplicated on shadow layer.

---

## Cluster configuration

```typescript
new ymaps.Clusterer({
  preset: 'islands#invisible',
  clusterDisableClickZoom: true,
  hasBalloon: false,
  hasHint: false,
  openBalloonOnClick: false,
  interactivityModel: 'default#silent',
  pointer-events: none (via HTML layout),
});
```

No click handlers on shadow placemarks — **cannot intercept** legacy selection.

---

## Rebuild strategy

- Signature: sorted `{kind}:{id}` list via `shadowLayerSignature()`
- Rebuild when viewport data changes (after fetch), not on legacy selection
- Does **not** subscribe to `markerMode` / zoom label changes
- Cleanup removes shadow cluster on disable/unmount

---

## Wiring

| Component | Data source |
|---|---|
| `MapSearch` | `viewportResult.data` → slug + coords |
| `ListingsMapSearch` | `viewportResult.data` → id + coords |
| Legacy in bbox | `filterByBbox()` on legacy props |

---

## Non-goals

- Does not replace `useMapClusterLayer` data source
- Does not modify legacy descriptors
- Does not sync selection to shadow markers
