# Iteration 29.4 — Tooltip + Quick Preview UX

## Mode

CHESSBOARD PRODUCT PARITY · preview · 2026-05-22

Component: `ChessboardPreview.tsx`

---

## Desktop hover preview

Single fixed-position overlay (not per-cell Popover):

- Triggered via event delegation `onMouseOver` on grid
- Positioned to right of cell; flips left if viewport edge
- `pointer-events-none` — does not block grid interaction
- Latency tracked in `chessboard-observability.ts`

### Preview content

| Field | Source |
|---|---|
| Mini plan | `StableMediaFrame` + `apartment.planImage` |
| Rooms + area | `roomLabel`, `area` |
| Price | `formatDisplayPrice()` |
| Floor | `apartment.floor` |
| Number | `apartment.number \|\| id` |
| Status badge | `CHESS_STATUS_LABEL` |
| Corpus + section | `buildingName`, section number |
| Finishing | if not «без отделки» |
| CTA | Link «Открыть» → `/apartment/:id` |

Sold apartments: no hover preview.

Hidden/filtered: no hover preview.

---

## Mobile tap sheet

`Sheet` bottom drawer with full preview (including plan) + CTA + close button.

Replaces hover — no fake tooltip on touch devices.

---

## Inline selection summary (mobile)

After tap, compact bar above hint text:

- Thumbnail plan via `StableMediaFrame`
- Room + area + price one-liner
- Building · section · floor

Inline (not fixed) — avoids conflict with complex page sticky CTA.

---

## Performance

- One preview instance in DOM
- Preview state updates only when hovered cell changes
- No Radix Popover per cell — avoids mount storm on large ЖК

---

## No fake data

- Missing plan → `StableMediaFrame` branded fallback
- Hidden price → «Цена по запросу» via `formatDisplayPrice`
- Sold → disabled CTA, no navigation link

---

## Responsiveness target

Hover open latency measured via `chessObsHoverEnd` — target ≤16ms (green), ≤50ms (yellow) in debug overlay.
