# Iteration 28.1 — Current Gap Audit

## Mode

APARTMENT PAGE PRODUCT PARITY · gap analysis · 2026-05-22

Reference: PROJECT_PLAN `/apartment/:id`, FINAL_TZ portal quality target, TrendAgent / Cian / Domclick patterns.

---

## Before (pre-Iter 28)

| Area | State | Gap |
|---|---|---|
| Layout | 2-column grid — plan left, price sidebar right | Sidebar hides on mobile; weak hierarchy |
| IA | Single viewport split | No sequential scroll; critical info in sidebar |
| Gallery | Inline lightbox on plan only | No plan/photo/finishing tabs; no StableMediaFrame |
| Price | `formatPrice` from mock-data | Risk of `0 ₽`, inconsistent with catalog |
| Mortgage | None | Missing conversion signal |
| Characteristics | Flat list in sidebar | Not grouped; hard to scan |
| Building context | Buried in meta | No dedicated corpus block |
| Description | Short inline text | No scroll section |
| Map | Eager init on mount | Performance cost |
| Similar | Basic grid | OK structure, wrong price formatter |
| CTA | Sidebar + partial mobile sticky | Phone placeholder only |
| Anchor nav | None | Long page disorienting |
| Sold/reserved | Label only | No banner + CTA adjustment |
| Tabs | N/A | — |

---

## After (Iter 28)

| # | Section | Status |
|---|---|---|
| 1 | Gallery / plans | ✓ `ApartmentMediaGallery` — tabs plan/photos/finishing, lightbox |
| 2 | Header meta | ✓ Inside `ApartmentPriceTrust` — title, JK link, address |
| 3 | Price + mortgage | ✓ `display-price.ts` + `mortgage-estimate.ts` |
| 4 | Main CTA | ✓ `#cta` — phone + lead scroll |
| 5 | Characteristics | ✓ `ApartmentCharacteristics` — cards + tables |
| 6 | Floor/building context | ✓ `#building-context` |
| 7 | Layout / plans | ✓ Gallery tab (plan) — no duplicate block |
| 8 | Description | ✓ `#description` — generated + JK excerpt |
| 9 | Infrastructure / map | ✓ `#map` — lazy Yandex init |
| 10 | Similar apartments | ✓ `#similar` — StableMediaFrame cards |
| 11 | Contact / lead | ✓ `#lead` — inline LeadForm |

---

## Gap matrix (remaining)

| Item | Severity | Notes |
|---|---|---|
| Phone CTA | Medium | Toast placeholder — no telephony backend |
| Mortgage calculator deep-link | Low | Indicative only; no bank integration |
| Ceiling height | Low | Not in API model |
| Renders vs photos distinction | Low | Tab labels only; no EXIF/type metadata |
| Share native API | Low | Uses `shareCurrentPage` helper |
| Presentation in anchor nav | Low | Available via header icon row |
| Full TrendAgent plan viewer | Medium | Lightbox sufficient for MVP |

---

## Files touched

| File | Change |
|---|---|
| `RedesignApartment.tsx` | Sequential scroll, anchor nav, lazy map |
| `ApartmentMediaGallery.tsx` | New — media tabs + lightbox |
| `ApartmentPriceTrust.tsx` | New — price hierarchy + mortgage |
| `ApartmentCharacteristics.tsx` | New — grouped specs |
| `mortgage-estimate.ts` | New — indicative payment |
| `mortgage-estimate.test.ts` | New — unit tests |

---

## Comparison vs major portals

| Portal pattern | LiveGrid Iter 28 |
|---|---|
| Gallery-first hero | ✓ |
| Large price + ₽/m² | ✓ |
| Mortgage teaser | ✓ (indicative) |
| Sticky mobile CTA | ✓ |
| Spec cards | ✓ |
| Similar listings | ✓ |
| Breadcrumbs | ✓ |
| No hidden tabs for content | ✓ (media tabs only) |
