# Iteration 29.2 — Information Hierarchy

## Mode

CHESSBOARD PRODUCT PARITY · IA · 2026-05-22

---

## Hierarchy model

```
ЖК (complex page)
  └─ Корпус (building pills — RedesignComplex #buildings)
       └─ Секция (Chessboard section tabs)
            └─ Этаж (sticky left column, descending)
                 └─ Квартира (grid cell)
```

User always knows:
- **Where:** building name header + section tab + floor number
- **What is available:** white cells + green-adjacent legend count
- **What is selected:** primary ring on cell + inline summary (mobile)
- **What is sold:** dark cells, non-interactive
- **What is clickable:** `data-interactive="true"` cells only

---

## Header block

```
{buildingName}
{N} свободных · {N} в брони · {N} продано
[legend toggles: Свободна | Бронь | Продана]
```

Legend toggles filter visibility (HIDDEN state) — minimum one status always active.

---

## Section tabs

Shown when `sectionBoards.length > 1`:

```
[ Секция 1 · 12 св. ] [ Секция 2 · 8 св. ] ...
```

Single section → no tabs, optional section subtitle in card header.

---

## Grid structure

| Column 0 | Columns 1…N |
|---|---|
| Floor (sticky) | Apartment cells |

Column headers: slot index (1, 2, 3…) — apartments sorted by number within floor.

---

## Interaction model

| Device | Hover | Click | Double-click |
|---|---|---|---|
| Desktop | Floating preview | Select + ring | Navigate to `/apartment/:id` |
| Mobile | — | Open bottom sheet | — |

Keyboard: focus cell → Enter opens apartment page; arrows move focus.

---

## Integration point

Chessboard rendered in `RedesignComplex` `#chess` section after building selection. One board per active building — building switch replaces apartment set.
