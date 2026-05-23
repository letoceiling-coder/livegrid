# Iteration 3 — Price Audit

## Mode

READ-ONLY audit before normalization · `@gstack/cso`

**Date:** 2026-05-22 · **Workspace:** `~/livegrid/apps/web/src`

---

## Existing Formatters (pre-Iteration 3)

| Location | Function | Invalid fallback | Issue |
|---|---|---|---|
| `mock-data.ts` | `formatPrice()` | «Цена по запросу» | Source of truth but duplicated logic elsewhere |
| `mock-data.ts` | `formatListingPriceFromApi()` | via formatPrice | OK |
| `home-blocks-map.ts` | `formatListingPriceMinRub()` | **«—»** | Inconsistent with catalog |
| `map-marker-layout.ts` | `formatMarkerPriceFromRub()` | «Цена по запросу» | Duplicate threshold logic |
| `Chessboard.tsx` | `formatChessPrice()` | **«0 ₽»** for zero | Broken UX |
| `catalog-mock.ts` | inline | «млн ₽» | Legacy mock only |
| `PriceLabel.tsx` | display | **«—»** | Inconsistent |
| `ComplexCard.tsx` | inline | `priceFrom > 0` checks | Double formatPrice calls |
| `RedesignMap.tsx` sidebar | inline | `priceFrom > 0 ? …` | Inconsistent with cards |
| `MapSearch.tsx` | inline | apt count when no price | Wrong fallback (Iter 2 fixed partially) |
| `ApartmentTable.tsx` | `formatPriceRange()` | manual | Ad-hoc |
| `RedesignComplex.tsx` | inline | `priceFrom > 0` | Multiple patterns |

---

## Hardcoded / Inline Patterns Found

```typescript
// RedesignMap — before
c.priceFrom > 0 ? `от ${formatPrice(c.priceFrom)}` : 'Цена по запросу'

// Chessboard — before
`${Math.max(0, Math.round(value || 0)).toLocaleString('ru-RU')} ₽`  // → "0 ₽"

// home-blocks-map — before
rub < MIN → return '—'

// ComplexCard — before
formatPrice(x) === 'Цена по запросу' ? ... : `от ${formatPrice(x)}`
```

---

## MIN_REASONABLE_PRICE_RUB

Single constant: **100_000 ₽** — prices below treated as invalid/missing.

Used in: `mock-data`, `blocks-from-api`, `map-marker-layout`, `RedesignApartment`.

---

## Mortgage Labels

| Location | Pattern |
|---|---|
| `CatalogList.tsx` | Raw `data.mortgage` string |
| `PropertyCard` / `Catalog.tsx` | Mock strings «Ипотека от 4.5%» |
| No unified unavailable state | Missing |

---

## Map vs Card Inconsistency

| Surface | Valid price | Invalid |
|---|---|---|
| Map marker (Iter 2) | «от 6.8 млн» | «Цена по запросу» |
| Map popup | mixed formatPrice + prefix | OK-ish |
| Sidebar (R3) | `priceFrom > 0` gate | Different from meta.total path |
| ComplexCard | double formatPrice | Redundant |
| Home cards | «—» | Wrong |

---

## Impossible States Observed

- **0 ₽** — Chessboard `formatChessPrice(0)`
- **—** — home hot cards, PriceLabel empty
- **«12 кв.»** — MapSearch when no price (fixed Iter 2)
- **NaN ₽** — prevented by formatListingPriceFromApi but not all paths

---

## Audit Conclusion

Need **one module** (`display-price.ts`) consumed by all redesign surfaces + shared `PriceLabel`.
