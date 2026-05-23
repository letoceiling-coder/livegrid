# Iteration 3 — Shared Formatters

## Module

`apps/web/src/redesign/lib/display-price.ts`

---

## Core Logic

```typescript
export const MIN_REASONABLE_PRICE_RUB = 100_000;
export const PRICE_ON_REQUEST = 'Цена по запросу';
export const MORTGAGE_UNAVAILABLE = 'Ипотека недоступна';

export function normalizePriceValue(value): number | null {
  // null, '', NaN, < 100_000 → null
}

export function isPriceHidden(value): boolean {
  return normalizePriceValue(value) === null;
}
```

---

## formatDisplayPrice

```typescript
formatDisplayPrice(6_800_000)                    → "6.8 млн ₽"
formatDisplayPrice(6_800_000, { prefix: 'от' })  → "от 6.8 млн ₽"
formatDisplayPrice(350_000)                      → "350 тыс ₽"
formatDisplayPrice(0)                            → "Цена по запросу"
formatDisplayPrice(null)                         → "Цена по запросу"
```

---

## formatPriceFrom

Default for cards, popup, sidebar:

```typescript
formatPriceFrom(6_800_000)              → "от 6.8 млн ₽"
formatPriceFrom(null)                   → "Цена по запросу"
formatPriceFrom(6_800_000, false)     → "от 6.8 млн"  // home cards
```

---

## formatMarkerPriceFrom

Map badges (Iteration 2 alignment):

```typescript
formatMarkerPriceFrom(6_800_000) → "от 6.8 млн"
formatMarkerPriceFrom(0)         → "Цена по запросу"
```

---

## formatPriceRangeDisplay

```typescript
formatPriceRangeDisplay(5e6, 12e6) → "от 5 млн ₽ — до 12 млн ₽"
formatPriceRangeDisplay(0, 0)      → "Цена по запросу"
```

---

## Backward Compatibility

`mock-data.ts` re-exports:

```typescript
export function formatPrice(n) { return formatDisplayPrice(n); }
export function formatListingPriceFromApi(v) { return formatDisplayPrice(v); }
```

Existing imports from `@/redesign/data/mock-data` continue to work with normalized behavior.

---

## Accessibility

```typescript
priceAriaLabel("Цена по запросу") → "Цена по запросу"  // for aria-label
priceAriaLabel("от 6.8 млн ₽")    → undefined
```

Applied on: MapSearch popup, ListingsMapSearch popup, RedesignMap sidebar, ComplexCard, ListingCard, ComplexHero, PriceLabel.
