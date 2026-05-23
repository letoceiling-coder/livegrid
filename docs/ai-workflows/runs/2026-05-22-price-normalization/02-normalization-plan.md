# Iteration 3 — Normalization Plan

## Goal

Single source of truth for price display + fallbacks across LiveGrid frontend.

---

## Architecture

```
display-price.ts          ← NEW canonical module
    ↑
mock-data.ts              ← thin re-exports (backward compat)
map-marker-layout.ts      ← uses formatMarkerPriceFrom
home-blocks-map.ts        ← uses formatPriceFrom
PriceLabel.tsx            ← uses PRICE_ON_REQUEST + aria
    ↑
Cards / Map / Sidebar / Tables / Catalog
```

---

## Standard Rules

| State | UI text |
|---|---|
| valid price ≥ 100k ₽ | «от 6.8 млн ₽» (cards) / «от 6.8 млн» (markers) |
| null / undefined / 0 / NaN / < 100k | **Цена по запросу** |
| hidden mortgage | **Ипотека недоступна** |

**Forbidden:** `0 ₽`, `undefined ₽`, `NaN ₽`, bare `—` for prices.

---

## API (display-price.ts)

| Export | Purpose |
|---|---|
| `normalizePriceValue()` | Parse → valid rubles or null |
| `isPriceHidden()` | Boolean guard |
| `formatDisplayPrice()` | Core formatter |
| `formatPriceFrom()` | «от X млн ₽» |
| `formatMarkerPriceFrom()` | «от X млн» (no ₽) |
| `formatPriceRangeDisplay()` | min–max |
| `formatMortgageLabel()` | mortgage fallback |
| `priceAriaLabel()` | a11y |
| `PRICE_ON_REQUEST` | constant |
| `MORTGAGE_UNAVAILABLE` | constant |

---

## Files Updated

| File | Change |
|---|---|
| `lib/display-price.ts` | **NEW** |
| `data/mock-data.ts` | delegate to display-price |
| `lib/map-marker-layout.ts` | import formatMarkerPriceFrom |
| `lib/home-blocks-map.ts` | formatPriceFrom, no «—» |
| `components/PriceLabel.tsx` | fallback + aria |
| `MapSearch`, `ListingsMapSearch` | popup + marker via shared |
| `RedesignMap.tsx` | sidebar |
| `ComplexCard`, `ListingCard`, `LayoutGrid`, `ComplexHero` | cards |
| `ApartmentTable`, `Chessboard` | tables |
| `RedesignComplex.tsx` | detail page |
| `catalog/CatalogList.tsx` | mortgage |

---

## Out of Scope

- Backend / API / Prisma
- Admin wizard formatters
- Legacy pages (`Presentation.tsx`, `ZhkDetail.tsx`) — minimal touch only on CatalogList
- Currency localization

---

## Verification

```bash
pnpm --filter web exec tsc --noEmit
grep -r "0 ₽" apps/web/src/redesign  # expect none in price formatters
```
