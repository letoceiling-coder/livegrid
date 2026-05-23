# Iteration 3 — Final Verdict

## PRICE FALLBACK NORMALIZATION

**Date:** 2026-05-22  
**Workspace:** `~/livegrid/apps/web/src`  
**Mode:** Safe frontend iteration

---

## Delivered

| ID | Requirement | Status |
|---|---|---|
| 3.1 | Shared formatter module | ✓ `display-price.ts` |
| 3.2 | Standard fallbacks | ✓ PRICE_ON_REQUEST everywhere |
| 3.3 | Card normalization | ✓ ComplexCard, ListingCard, etc. |
| 3.4 | Map alignment | ✓ marker + popup + sidebar |
| 3.5 | Mortgage cleanup | ✓ CatalogList |
| 3.6 | Accessibility | ✓ aria-label on fallback prices |

---

## Single Source of Truth

```
apps/web/src/redesign/lib/display-price.ts
```

All redesign price display flows through this module or mock-data delegates.

---

## Forbidden States Eliminated (redesign path)

| State | Before | After |
|---|---|---|
| 0 ₽ | Chessboard | Цена по запросу |
| — (price) | home cards, PriceLabel | Цена по запросу |
| apt count as price | MapSearch (Iter 2 fixed) | Цена по запросу |
| Inconsistent «от» prefix | ComplexCard ternaries | formatPriceFrom |

---

## Quality Gates

| Gate | Result |
|---|---|
| TypeScript | ✓ exit 0 |
| No backend changes | ✓ |
| No React Query changes | ✓ |
| No map architecture rewrite | ✓ |
| mock-data backward compat | ✓ |

---

## Files Summary

**New:** `redesign/lib/display-price.ts`

**Updated:** 14 files across redesign components, pages, shared PriceLabel, CatalogList, mock-data, home-blocks-map, map-marker-layout

---

## Risk

**LOW** — display-only normalization, production-safe.

---

## Recommendation

**APPROVE** for web deploy with R3 + Iteration 2 bundle.

Manual smoke:
1. `/map` — sidebar prices match popup
2. `/catalog` — listing cards with missing price → «Цена по запросу»
3. `/complex/:slug` — price range in sidebar
4. Home page — no «—» on block cards

---

## Document Index

| File | Contents |
|---|---|
| [01-price-audit.md](./01-price-audit.md) | Pre-change inventory |
| [02-normalization-plan.md](./02-normalization-plan.md) | Architecture |
| [03-shared-formatters.md](./03-shared-formatters.md) | API reference |
| [04-card-alignment.md](./04-card-alignment.md) | Cards |
| [05-map-alignment.md](./05-map-alignment.md) | Map surfaces |
| [06-mortgage-cleanup.md](./06-mortgage-cleanup.md) | Mortgage |
| [07-risk-analysis.md](./07-risk-analysis.md) | Risk |

---

## Not Started

CRM, roles, auth, dashboard, Telegram, regions — per instructions.
