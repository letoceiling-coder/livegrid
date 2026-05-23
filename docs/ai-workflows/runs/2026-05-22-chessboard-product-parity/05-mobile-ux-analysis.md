# Iteration 29.5 — Mobile UX Analysis

## Mode

CHESSBOARD PRODUCT PARITY · mobile · 2026-05-22

Target: **360px** width

---

## Layout

| Element | Behavior |
|---|---|
| Grid columns | `min(118px, 28vw)` — fits ~3 columns at 360px with floor column |
| Horizontal scroll | `overflow-x-auto` on grid wrapper |
| Floor labels | Sticky left column during horizontal scroll |
| Section tabs | Wrap `flex-wrap gap-2` |
| Legend | Wrap below building summary |

---

## Touch interactions

| Action | Result |
|---|---|
| Tap available/reserved cell | Bottom sheet with full preview |
| Tap sold cell | No action |
| Tap filtered (hidden) cell | No action — pointer-events none |

No hover on mobile — `useIsMobileChess()` at `max-width: 639px`.

---

## Tap precision

- Cell height: 86px — meets 44px minimum touch target
- Cell width: min 28vw (~100px at 360px) — acceptable with horizontal scroll

---

## Sticky summary

Inline selection bar within chessboard component (not viewport-fixed):

- Appears after first tap selection
- Shows thumbnail + key facts
- Does not overlap complex page bottom CTA bar

---

## Sheet UX

- `side="bottom"`, `max-h-[85vh]`, scrollable
- Close button + swipe-down dismiss (Radix Sheet default)
- Full plan preview + CTA

---

## Hint copy

Mobile: «Нажмите на квартиру для просмотра. Доступные — белые, бронь — жёлтые, продано — tёмные.»

---

## Manual QA checklist

- [ ] 360px — horizontal scroll smooth
- [ ] Floor numbers stay visible while scrolling columns
- [ ] Section tab switch updates grid
- [ ] Tap opens sheet with plan
- [ ] Sold cell no sheet
- [ ] No overlap with complex sticky CTA
- [ ] Legend toggle hides/shows status groups

---

## Not implemented

- Pinch-to-zoom on grid
- Swipe between apartments in sheet carousel
