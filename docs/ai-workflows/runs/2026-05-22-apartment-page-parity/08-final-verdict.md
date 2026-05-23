# Iteration 28.8 — Final Verdict

## Mode

APARTMENT PAGE PRODUCT PARITY · Iteration 28 · 2026-05-22

---

## Verdict

**GO_WITH_HOLD** — `/apartment/:id` now matches FINAL_TZ sequential scroll IA with portal-grade gallery, price trust, and conversion structure. Hold items: telephony CTA, manual QA on real listing IDs, lightbox swipe gesture.

---

## Readiness matrix

| Area | Status |
|---|---|
| Information hierarchy | **GO** |
| Gallery-first layout | **GO** |
| Price + trust (`display-price.ts`) | **GO** |
| Mortgage indicative block | **GO** |
| Sequential scroll (no content tabs) | **GO** |
| Characteristics grouping | **GO** |
| Building context | **GO** |
| Lazy map | **GO** |
| Similar apartments | **GO** |
| Lead form in flow | **GO** |
| Mobile sticky CTA | **GO** (design) |
| Empty / sold states | **GO** |
| Phone CTA | **HOLD** — placeholder only |
| Manual browser QA | **HOLD** |

---

## Delivered

| Item | ✓ |
|---|---|
| Removed 2-column sidebar layout | ✓ |
| 11-section scroll order | ✓ |
| `ApartmentMediaGallery` | ✓ |
| `ApartmentPriceTrust` | ✓ |
| `ApartmentCharacteristics` | ✓ |
| `mortgage-estimate.ts` + tests | ✓ |
| `ComplexAnchorNav` reuse | ✓ |
| Mobile sticky CTA | ✓ |
| Lazy map init | ✓ |
| Sold/reserved banners | ✓ |
| Documentation 01–08 | ✓ |

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ |
| Web tests | ✓ 18/18 |

---

## Manual checklist

- [ ] Apartment with images — gallery tabs + lightbox
- [ ] Apartment without images — branded fallback
- [ ] Hidden price — «Цена по запросу», no mortgage amount
- [ ] Sold apartment — banner, disabled CTAs, lead for similar
- [ ] Long description — wraps at 360px
- [ ] Mobile 360px — sticky CTA + safe area
- [ ] Fullscreen gallery — Escape closes
- [ ] No CLS on gallery load
- [ ] Anchor nav highlights correct section

Test URL: `/apartment/{numeric_id}` from catalog or chessboard

---

## Explicit non-deliverables (correct)

- No viewport/geo/cluster changes
- No backend rewrite
- No CRM implementation
- No production rollout
- No fake phone numbers or bank offers

---

## Next steps (optional)

1. Wire phone CTA to site settings telephony
2. Add swipe gestures to gallery lightbox
3. Extend API model for ceiling / balcony when available
4. Deep-link mortgage to partner calculator

---

## Overall

Apartment page is **production-quality structurally** aligned with FINAL_TZ portal expectations and mirrors Iter 27 complex page patterns. Remaining work is telephony integration and manual QA on live listings — not IA or layout.
