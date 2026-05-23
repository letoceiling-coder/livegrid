# Iteration 28.3 — Price + Trust UX

## Mode

APARTMENT PAGE PRODUCT PARITY · pricing · 2026-05-22

---

## Single source of truth

All apartment page prices use **`display-price.ts`**:

- `formatDisplayPrice()` — primary display
- `isPriceHidden()` — mortgage gating
- `isPriceFallbackText()` — muted styling for «Цена по запросу»
- `priceAriaLabel()` — screen reader

Removed: legacy `formatPrice` from mock-data on this page.

---

## Visual hierarchy

| Element | Treatment |
|---|---|
| Main price | `text-3xl sm:text-4xl font-bold text-primary` |
| Hidden price | Same size, `text-muted-foreground` |
| Price per m² | `text-sm text-muted-foreground` or «Цена по запросу» |
| Status badge | Green / amber / muted pill (Свободна / Бронь / Продана) |
| JK + corpus | Link to complex + building name |

---

## Mortgage block

**`mortgage-estimate.ts`** — indicative only:

- Input: normalized price via `normalizePriceValue`
- Defaults: 20% down, 20 years, 5.9% rate
- Output: «Ипотека от {N} ₽/мес»
- Disclaimer: not an offer
- Hidden price → dashed placeholder: «Ипотечный расчёт доступен после указания цены»

---

## Anti-patterns eliminated

| Before | After |
|---|---|
| `0 ₽` | «Цена по запросу» |
| `undefined ₽` | «Цена по запросу» |
| Sidebar price jump on mobile | Fixed hierarchy in scroll flow |
| Inconsistent catalog vs detail | Shared `formatDisplayPrice` |

---

## Trust indicators present

- Availability status badge
- Floor / building in meta + characteristics
- JK link + address with MapPin
- Mortgage disclaimer (legal transparency)

---

## Trust indicators missing (backend)

| Item | Blocker |
|---|---|
| Developer phone | Site telephony settings |
| Verified listing badge | CRM / moderation API |
| Price history | Not in scope |
| Booking deposit info | Business rules TBD |
