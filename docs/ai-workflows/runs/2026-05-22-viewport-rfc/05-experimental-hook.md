# Iteration 8.4 — Experimental Feature Flag & Hooks

## Mode

Isolated · opt-in · DEV-only · **no production default**

---

## Feature Flag

**File:** `apps/web/src/redesign/lib/viewport-feature-flag.ts`

```typescript
isViewportExperimentalEnabled(): boolean
```

| Gate | Behavior |
|---|---|
| `import.meta.env.DEV` | **false in production builds** — tree-shaken |
| `?viewport_debug=1` | Enable via URL |
| `localStorage lg_viewport_experimental=1` | Persist across reloads (DEV only) |

**Console helpers (manual):**

```javascript
// In browser devtools
enableViewportExperimentalLocal()
disableViewportExperimentalLocal()
```

### Combined debug overlay

`?map_debug=1&viewport_debug=1` — shows Iter 7 cluster metrics **and** Iter 8 viewport comparison in `MapDevOverlay`.

`isMapDebugEnabled()` also returns true when `viewport_debug=1` is set.

---

## Experimental Hooks

### `useViewportBlocksExperimental`

**File:** `apps/web/src/redesign/hooks/useViewportBlocksExperimental.ts`

| Option | Type | Purpose |
|---|---|---|
| `enabled` | boolean | Default `isViewportExperimentalEnabled()` |
| `regionId` | number | Required for fetch |
| `bbox` | `MapBbox \| null` | From `useMapBbox` |
| `legacyComplexes` | `ResidentialComplex[]` | Comparison + fallback source |
| `filterSearchParams` | `URLSearchParams` | Forward filters to prototype (future) |

**Returns:** `{ status, result, legacyMarkerCount }`

**Status values:** `disabled` | `idle` | `loading` | `ready` | `fallback`

### `useViewportListingsExperimental`

**File:** `apps/web/src/redesign/hooks/useViewportListingsExperimental.ts`

Same pattern for listings / `ListingMapItem[]`.

---

## Bbox Listener Hook

**File:** `apps/web/src/redesign/hooks/useMapBbox.ts`

```typescript
useMapBbox(mapInstance: RefObject, ready: boolean): MapBbox | null
```

Attached inside map components only when experimental flag is evaluated — listener is registered regardless but experimental fetch gated on `enabled`.

---

## Integration Points (Parallel, Non-Destructive)

### MapSearch.tsx

```typescript
const viewportExperimental = isViewportExperimentalEnabled();
const mapBbox = useMapBbox(mapInstance, ready);
useViewportBlocksExperimental({
  enabled: viewportExperimental,
  regionId: regionId ?? undefined,
  bbox: mapBbox,
  legacyComplexes: complexes,
});
```

- **Legacy render:** `useMapClusterLayer` + `complexes` prop — unchanged
- **Experimental:** parallel fetch + metrics only

### ListingsMapSearch.tsx

Same with `useViewportListingsExperimental`.

### RedesignMap.tsx

Already passes `regionId={regionId}` to both map components. No changes to `blocksQuery` / `listingsQuery`.

---

## Backend Prototype Gating

**Controller:** `viewport-prototype.controller.ts`

```typescript
VIEWPORT_PROTOTYPE_ENABLED === '1' || NODE_ENV !== 'production'
```

Returns `503 Service Unavailable` when disabled in production without env flag.

**Routes:**

- `GET /api/v1/_prototype/blocks/viewport`
- `GET /api/v1/_prototype/listings/viewport`

---

## Fallback Safety (Automatic)

```
try prototype API
  → success: status=ready, source=prototype-api
catch (404, network, 503)
  → filter legacy points by bbox client-side
  → status=fallback, source=client-filter-fallback
  → recordViewportComparison with fallback source
```

**Legacy map markers:** Always from `complexes` / `listings` props — experimental result **never** passed to `useMapClusterLayer`.

**Measured (2026-05-22):** Live API without restart returns 404 on `_prototype/*` — frontend correctly enters fallback path.

---

## Rollback Procedure

1. Remove `?viewport_debug=1` from URL
2. `disableViewportExperimentalLocal()` or clear localStorage
3. No code deploy required — flag off = zero experimental fetches
4. To remove prototype entirely: delete `viewport-prototype` module + hook wiring (legacy unaffected)

---

## What Experimental Hooks Do NOT Do

| Excluded | Reason |
|---|---|
| Replace cluster data source | Production stability |
| Update sidebar list | Separate data contract |
| Modify React Query keys | No catalog rewrite |
| Sync bbox to URL | Out of scope |
| Remove 200 cap | Explicitly forbidden |

---

## DEV Verification URL

```
http://localhost:5173/map?region_id=1&viewport_debug=1&map_debug=1
```

**Expected:**

- Map renders identically to production path (200 markers)
- Overlay shows viewport section when flag on
- Pan map → viewport requests increment (after debounce)
- With API down → `source: client-filter-fallback`

---

## Files Added (Iter 8)

| Path | Role |
|---|---|
| `redesign/lib/viewport-feature-flag.ts` | DEV flag |
| `redesign/lib/bbox-serialization.ts` | Bbox types + debounce |
| `redesign/lib/viewport-map-types.ts` | Slim DTO types |
| `redesign/hooks/useMapBbox.ts` | Bounds listener |
| `redesign/hooks/useViewportBlocksExperimental.ts` | Blocks prototype |
| `redesign/hooks/useViewportListingsExperimental.ts` | Listings prototype |
| `api/.../viewport-prototype/*` | Backend prototype module |
