# Iteration 3 — Map Alignment

## Surfaces Aligned

| Surface | Formatter |
|---|---|
| Map marker badge (price mode) | `formatMarkerPriceFrom()` via `map-marker-layout` |
| Map popup (blocks) | `formatPriceFrom()` |
| Map popup (listings) | `formatDisplayPrice()` |
| RedesignMap sidebar (blocks) | `formatPriceFrom()` |
| RedesignMap sidebar (listings) | `formatDisplayPrice()` |

---

## Iteration 2 + 3 Integration

`map-marker-layout.ts` now imports from `display-price.ts`:

```typescript
import { formatMarkerPriceFrom, normalizePriceValue, PRICE_ON_REQUEST } from './display-price';
```

Marker, popup, and sidebar use same threshold (`MIN_REASONABLE_PRICE_RUB = 100_000`).

---

## MapSearch Popup

```typescript
function complexPopupPrice(c) {
  return formatPriceFrom(c.priceFrom);
}
// aria-label when isPriceHidden(c.priceFrom)
```

---

## ListingsMapSearch Popup

```typescript
function listingPopupPrice(price) {
  return formatDisplayPrice(price);
}
```

---

## RedesignMap Sidebar

**Before:**
```typescript
c.priceFrom > 0 ? `от ${formatPrice(c.priceFrom)}` : 'Цена по запросу'
```

**After:**
```typescript
formatPriceFrom(c.priceFrom)
formatDisplayPrice(l.price)  // listings
```

Muted styling when `isPriceFallbackText(...)`.

---

## Unchanged

- Marker zoom modes (Iter 2)
- Clusterer behavior
- activeSlug / selection flow
- React Query / data fetching
