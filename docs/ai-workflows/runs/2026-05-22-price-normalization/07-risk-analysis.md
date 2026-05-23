# Iteration 3 — Risk Analysis

## Mode

`@gstack/careful` · `@gstack/cso`

---

## Risk Matrix

| Risk | Likelihood | Impact | Severity |
|---|---|---|---|
| Visual text change («—» → «Цена по запросу») | High | Low | **LOW** — intentional UX fix |
| Break existing formatPrice imports | Low | Medium | **LOW** — mock-data delegates |
| Marker label regression | Low | Low | **LOW** — same threshold |
| aria-label duplication | Low | Low | **LOW** — screen reader clarity |
| Home card price format change | Medium | Low | **LOW** — more honest |

---

## Deploy Surface

| Component | Deploy |
|---|---|
| `apps/web` only | Yes |
| API / DB | No |

**Files changed:** 15 (+1 new `display-price.ts`)

---

## Rollback

Revert `display-price.ts` + consumer imports. Restore mock-data inline formatters.

---

## Regression Checks

```bash
pnpm --filter web exec tsc --noEmit  # ✓ exit 0

# No forbidden patterns in redesign
rg "0 ₽|undefined ₽|NaN ₽" apps/web/src/redesign --glob '*.{ts,tsx}'
```

---

## Classification

### **LOW** risk

- Frontend-only display logic
- No API contract changes
- Stricter, more consistent fallbacks
- Backward-compatible exports via mock-data

---

## Known Remaining Gaps

| Area | Status |
|---|---|
| `pages/Presentation.tsx` | Local formatMoney — legacy |
| `pages/ZhkDetail.tsx` | Mock flat prices with « ₽» suffix |
| Admin listing wizard | Separate formatPrice — admin scope |
| Chessboard sold units | Shows PRICE_ON_REQUEST for price=0 apartments |

Acceptable for Iteration 3 scope (`apps/web/src/redesign` + shared PriceLabel + CatalogList).
