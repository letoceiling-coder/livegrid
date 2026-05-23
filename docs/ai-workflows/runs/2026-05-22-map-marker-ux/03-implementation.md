# Iteration 2 — Implementation

## Summary

Marker UX stabilization via shared layout module + zoom mode bucketing.

---

## New Module: `map-marker-layout.ts`

```typescript
export const MARKER_BLUE = '#2563EB';
export const MARKER_ACTIVE_BLUE = '#1D4ED8';

export function zoomToMarkerMode(zoom: number): MarkerZoomMode {
  if (zoom > 14) return 'name';
  if (zoom >= 12) return 'price';
  return 'dot';
}

export function formatMarkerPriceFromRub(price): string {
  // >= 1M → "от 6.8 млн"
  // < MIN_REASONABLE_PRICE_RUB → "Цена по запросу"
}
```

### Marker HTML structure (price/name modes)

```
[ 20px blue dot ]
[ white badge: "от 6.8 млн" ]
```

Dot mode: 12px circle, `transform: translate(-50%, -50%)`.

---

## MapSearch.tsx Changes

| Before | After |
|---|---|
| Red active `#ef4444` | Blue active `#1D4ED8` |
| `zoom` in effect deps | `markerMode` in deps |
| Apt count when no price | "Цена по запросу" |
| Colored price pill | White badge below dot |
| zoom > 14: N/A | Complex name in badge |
| Link-wrapped popup | Structured card + Button |

```typescript
function complexMarkerLabel(c, mode) {
  if (mode === 'dot') return null;
  if (mode === 'name') return c.name;
  if (c.priceFrom >= MIN_REASONABLE_PRICE_RUB) return formatMarkerPriceFromRub(c.priceFrom);
  return 'Цена по запросу';
}
```

---

## ListingsMapSearch.tsx Changes

Same marker modes applied to listings:

| Mode | Label source |
|---|---|
| `price` | `formatMarkerPriceFromRub(parseListingPriceRub(l.price))` |
| `name` | `l.title ?? l.address ?? #id` |

Popup: Button "Подробнее", consistent layout with MapSearch.

---

## Unchanged

- Yandex Clusterer configuration
- `onSelect` / `activeSlug` / `activeId` contract
- RedesignMap data flow
- React Query
- Map init / regionCenter effects
- Center-on-active behavior (zoom 14/15)

---

## Diff Stats

```
apps/web/src/redesign/lib/map-marker-layout.ts   NEW
apps/web/src/redesign/components/MapSearch.tsx   modified
apps/web/src/redesign/components/ListingsMapSearch.tsx   modified
```

Typecheck: `pnpm --filter web exec tsc --noEmit` → exit 0

---

## TZ Compliance Matrix

| Requirement | Status |
|---|---|
| Blue markers #2563EB | ✓ |
| zoom < 12: 12px dot, no label | ✓ |
| zoom ≥ 12: 20px + white price badge | ✓ |
| zoom > 14: complex name | ✓ |
| "Цена по запросу" fallback | ✓ |
| Popup: image, name, price, Подробнее | ✓ |
| No cluster rewrite | ✓ |
| No API changes | ✓ |
