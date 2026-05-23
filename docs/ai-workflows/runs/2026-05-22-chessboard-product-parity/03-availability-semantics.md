# Iteration 29.3 — Availability Semantics

## Mode

CHESSBOARD PRODUCT PARITY · status colors · 2026-05-22

Source of truth: `apps/web/src/redesign/lib/chessboard-status.ts`

---

## Visual states

| State | Meaning | Cell treatment |
|---|---|---|
| **AVAILABLE** | Active listing, purchasable | White surface, border, hover primary |
| **RESERVED** | Booking hold | Amber wash `bg-amber-500/10` |
| **SOLD** | Not for sale | Near-black `bg-neutral-900`, white text |
| **HIDDEN** | Filtered by legend or room filter | `opacity-30`, no pointer events |
| **SELECTED** | User focus (non-sold) | Primary ring + tint |

---

## Palette rationale

Aligned with TrendAgent / Domclick / Cian new-build conventions:

1. **Available = light/neutral** — maximum contrast for conversion targets; dark text on white reads as "open inventory"
2. **Reserved = amber** — matches `ApartmentPriceTrust` and `ApartmentTable` amber semantics; distinct from available without implying sold
3. **Sold = dark** — universal portal pattern for non-actionable inventory; WCAG contrast for white-on-dark labels
4. **Selected = primary brand ring** — consistent with site CTA and apartment page focus states
5. **Hidden = opacity only** — not a listing status; avoids inventing a sixth API status

---

## Label consistency

| Surface | Available | Reserved | Sold |
|---|---|---|---|
| Chessboard cell | Свободна | Бронь | Продана |
| ApartmentPriceTrust | Свободна | Бронь | Продана |
| ApartmentTable | Свободна | Бронь | Продана |

---

## API mapping (unchanged)

`blocks-from-api.ts`:
- `ACTIVE` → `available`
- `RESERVED` → `reserved`
- `SOLD` → `sold`

No HIDDEN status in API — HIDDEN is purely UI filter state.

---

## Accessibility

- Cells: `aria-label` with rooms, area, price, status
- Legend: `aria-pressed` on toggle buttons
- Grid: `role="grid"` / `role="gridcell"`
- Sold cells: no `tabIndex`, not in keyboard interactive set

---

## Swatch legend

Legend buttons show color swatches from `CHESS_SWATCH_CLASS` — matches cell backgrounds without ring/selection overlay.
