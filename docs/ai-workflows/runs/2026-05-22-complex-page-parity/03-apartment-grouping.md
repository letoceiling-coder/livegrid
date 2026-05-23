# Iteration 27.3 — Apartment Grouping

## Mode

Studios / 1k / 2k / 3k / 4k+ groups · 2026-05-22

---

## Implementation

`complex-room-groups.ts`:
- Category 0 = Студии
- 1–3 = room count
- 4+ = `rooms >= 4`

`ApartmentTypeGroups.tsx`:
- Hides empty categories
- Header: label, count, area range, min/max price
- Expand/collapse with CSS grid animation
- Respects reduced motion (no transition)

Expanded content: `ApartmentTable` filtered to category apartments (building sub-groups preserved).

---

## Data source

Real API listings via `mapApiBlockDetailToResidentialComplex` — no mock injection.

Filter: `status !== 'sold'` for availability groups.

---

## Mobile

Full-width accordion rows, touch-friendly 44px+ tap targets on headers.

Horizontal scroll not required — vertical stack.

---

## Tests

`complex-room-groups.test.ts` — bucket logic + price min/max aggregation.

---

## Future (not Iter 27)

- Sort controls at group level
- Direct link `?rooms=2` deep anchor
- Server-side room aggregates from block stats API
