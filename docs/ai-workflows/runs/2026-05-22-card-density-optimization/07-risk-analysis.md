# Iteration 6 — Risk Analysis

## Change class

**Frontend-only · CSS/class changes · no data/API impact**

---

## Risk matrix

| Area | Risk | Mitigation |
|---|---|---|
| Typography reorder | LOW | Content preserved, order only |
| Remove «Подробнее» | LOW | Whole card is `<Link>` |
| Remove MapPin icons | LOW | Text retained in meta lines |
| Smaller badges | LOW | Still visible on image overlay |
| Sidebar thumb w-12 | LOW | 4:3 ratio preserved |
| ComplexCard stats consolidation | LOW-MED | Same data in dot-lines + inline bands |
| Shared token module | LOW | Additive, imported where needed |

---

## Regression vectors

| Vector | Likelihood | Notes |
|---|---|---|
| Price-first confuses users | Low | Standard real-estate pattern |
| Lost builder visibility | Low | Still in detailLine on ComplexCard |
| CLS | None | No dimension changes to images |
| a11y | Low | `aria-label` on prices preserved |
| List variant layout break | Low | tsc pass |

---

## Rollback

Revert/delete:

```
redesign/lib/card-visual.ts
ListingCard.tsx, ComplexCard.tsx, LayoutGrid.tsx
RedesignMap.tsx (sidebar section only)
```

---

## Deploy recommendation

**LOW risk** — visual-only, bundle with Iterations 2–5.

Smoke: `/catalog` grid + list, `/map` sidebar both tabs, one complex page layouts grid.
