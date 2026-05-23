# Iteration 28.7 — Risk Analysis

## Mode

APARTMENT PAGE PRODUCT PARITY · risks · 2026-05-22

---

## Scope containment ✓

| Risk area | Mitigation |
|---|---|
| Map architecture | Lazy init only; no viewport/geo changes |
| Cluster / backend | No API changes |
| Complex page regression | Shared `ComplexAnchorNav` — tested on complex page |
| Price normalization | Reuses Iter 3 `display-price.ts` |

---

## Product risks

| Risk | Severity | Mitigation |
|---|---|---|
| Mortgage shown as offer | Medium | Disclaimer + «ориентировочный» copy |
| Phone CTA user frustration | Medium | Toast explains missing telephony; not fake number |
| Empty gallery on many listings | Low | Branded StableMediaFrame fallback |
| Description auto-generated feels thin | Low | JK description appended when available |
| Similar query returns 0 | Low | Section hidden when empty |

---

## Technical risks

| Risk | Severity | Mitigation |
|---|---|---|
| Map double-init | Low | `mapInstanceRef` + destroy on coords change |
| Hook order with redirect | Low | Redirect after hooks via early return pattern avoided — Navigate component |
| mediaFiles type drift | Low | Optional chaining + type assertion |
| CLS on gallery | Low | Fixed aspect StableMediaFrame |

---

## Regression surface

| Page | Impact |
|---|---|
| `/complex/:slug` | None — no shared file edits except ComplexAnchorNav (unchanged) |
| `/catalog` | None |
| `/map` | None |
| `/listing/:id` | Redirect path unchanged |

---

## Missing integrations (documented, not faked)

1. **Telephony** — site settings / developer phone API
2. **Mortgage partner** — bank rate API or calculator URL
3. **Ceiling / balcony fields** — listing schema extension
4. **Media type metadata** — render vs photo classification

---

## Rollback

Revert `RedesignApartment.tsx` + remove 4 new component/lib files. No migrations, no env flags.
