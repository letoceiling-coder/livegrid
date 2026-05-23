# Iteration 2 — Implementation Plan

## Mode

`@gstack/plan-eng-review` · minimal safe diff

---

## Goal

Improve marker readability and UX **without** changing map architecture, queries, or backend.

---

## Approach

### 1. Extract shared layout helper

**New file:** `apps/web/src/redesign/lib/map-marker-layout.ts`

| Export | Purpose |
|---|---|
| `zoomToMarkerMode(z)` | Bucket zoom → `dot` \| `price` \| `name` |
| `formatMarkerPriceFromRub()` | "от 6.8 млн" / "Цена по запросу" |
| `buildMarkerLayoutHtml()` | Yandex HTML template |
| `markerIconShape()` | Hit area per mode |
| `MARKER_BLUE` | `#2563EB` |

### 2. Zoom rules (TZ)

| Zoom | Mode | Visual |
|---|---|---|
| < 12 | `dot` | 12px blue circle, no label |
| ≥ 12, ≤ 14 | `price` | 20px blue dot + white badge with price |
| > 14 | `name` | 20px blue dot + white badge with complex name |

Active marker: `#1D4ED8` (darker blue), +2px dot — no red.

### 3. Reduce rebuilds

Replace `zoom` state with `markerMode` state:

```typescript
setMarkerMode(prev => prev === nextMode ? prev : nextMode);
```

Effect deps: `[..., markerMode]` — rebuilds at most 3 times per zoom session.

### 4. Popup improvements

- Separate image from link wrapper
- Explicit `<Button>Подробнее</Button>`
- Consistent price line with "Цена по запросу"
- `aria-label` on close button

### 5. Out of scope (explicit)

- No Clusterer rewrite
- No bbox/viewport
- No React Query changes
- No RedesignMap changes
- No new API calls

---

## Files Changed

| File | Change |
|---|---|
| `lib/map-marker-layout.ts` | **NEW** shared helpers |
| `components/MapSearch.tsx` | Markers + popup |
| `components/ListingsMapSearch.tsx` | Markers + popup |

---

## Risk Mitigation

| Risk | Mitigation |
|---|---|
| Marker flicker | Threshold bucketing reduces rebuilds |
| XSS in name labels | `escapeMarkerHtml()` |
| Long names overflow | `truncateMarkerLabel(22)` + ellipsis CSS |
| Mobile popup | Unchanged positioning, full-width bottom |

---

## Verification Plan

1. `pnpm --filter web exec tsc --noEmit`
2. Visual: zoom 11 → dot only
3. Visual: zoom 12 → price badge
4. Visual: zoom 15 → name badge
5. Click marker → popup with Button
6. Zero price → "Цена по запросу"
