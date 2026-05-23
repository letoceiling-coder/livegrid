# Iteration 3 — Card Alignment

## Updated Components

| Component | Before | After |
|---|---|---|
| `ComplexCard` | `formatPrice` + manual «от» | `formatPriceFrom()` |
| `ListingCard` | `formatListingPriceFromApi` | `formatDisplayPrice()` |
| `LayoutGrid` | ternary on formatPrice | `formatPriceFrom()` |
| `ComplexHero` | `formatPrice` only | `formatPriceFrom()` + aria |
| `PriceLabel` | empty → «—» | empty → `PRICE_ON_REQUEST` |
| `home-blocks-map` | invalid → «—» | `formatPriceFrom(rub, false)` |
| `ApartmentTable` | local range + formatPrice | `formatPriceRangeDisplay` + `formatDisplayPrice` |
| `RedesignComplex` | `priceFrom > 0` gates | `formatPriceFrom` / range |

---

## Visual Consistency

All catalog cards now show:

- **Valid:** `от 6.8 млн ₽` (primary color)
- **Invalid:** `Цена по запросу` (muted foreground)

ListingCard and ComplexCard grid/list variants aligned.

---

## PriceLabel Component

```tsx
const text = value?.trim() || PRICE_ON_REQUEST;
const fallback = isPriceFallbackText(text) || text === '—';
// muted style + aria-label on fallback
```

Used by: `PropertyCard`, home page hot/start cards.

---

## Home Page Cards

`mapApiBlockToHomeHotCard` / `mapApiBlockToHomeStartCard`:

```typescript
price: formatPriceFrom(b.listingPriceMin ?? null, false)
// → "от 6.8 млн" or "Цена по запросу"
```

No more «—» on main page property tiles.

---

## Not Rewritten

- Card layout / structure unchanged
- Image / badge logic unchanged
- Link targets unchanged
