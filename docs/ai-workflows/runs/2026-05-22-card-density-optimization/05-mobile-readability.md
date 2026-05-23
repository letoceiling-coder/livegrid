# Iteration 6 — Mobile Readability

## Mode

Mobile card/sidebar check · `@gstack-ui-product-audit`

**Date:** 2026-05-22

---

## Map Sidebar (mobile bottom panel)

**Viewport:** `max-h-[40vh]` on `< lg`

| Fix | Benefit |
|---|---|
| Price-first hierarchy | Thumb-scan without reading full title |
| `line-clamp-2` titles | Long ЖК names don't expand row height |
| `truncate` on meta | Address overflow contained |
| `min-w-0` on flex children | Prevents horizontal overflow |
| External link `min-w-[28px]` | Separate tap target from row select |

Row min-height ~48px thumb + `p-1.5` ≈ comfortable touch row.

---

## Catalog Cards (mobile)

### ListingCard

- Full-width 16:9 image (Iter 4) — stable, no CLS
- Content `p-2.5 gap-1` — compact but readable at 320px
- Price on own line — no squeeze against title on narrow screens
- Status badge `text-[10px]` top-left — less overlap with image

### ComplexCard grid

- `line-clamp-2` on title
- Dot-joined meta — wraps naturally on narrow cards vs 4 stacked lines
- Price bands as inline wrap row — avoids tall column

### ComplexCard list (`sm:flex`)

- Horizontal layout unchanged; content hierarchy matches grid

---

## LayoutGrid (complex page)

- 2-column grid on mobile (`grid-cols-2`)
- Reduced body padding — more plan visible per row
- Price first — key decision data above fold in card

---

## Overflow Guards

| Element | Guard |
|---|---|
| Titles | `line-clamp-2` or `truncate` |
| Meta | `truncate` / `line-clamp-1` |
| Price | `tabular-nums` — no wrap mid-number |
| Badges | Smaller, top-left absolute |

---

## NOT changed

- Catalog grid column counts
- Filter overlay
- Map popup dimensions

---

## Smoke Checklist

- [ ] iPhone 375px — sidebar rows, no horizontal scroll
- [ ] Long Cyrillic title — 2 lines max, no layout jump
- [ ] «Цена по запросу» — readable, muted
- [ ] Listing card list variant on `sm+` — image + content align
