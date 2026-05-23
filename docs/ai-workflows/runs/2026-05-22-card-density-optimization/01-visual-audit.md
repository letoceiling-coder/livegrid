# Iteration 6 — Visual Hierarchy Audit

## Mode

READ-ONLY audit · `@gstack-ui-product-audit` · `@gstack-design-review`

**Date:** 2026-05-22 · **Workspace:** `~/livegrid/apps/web/src`

---

## Surfaces Inventoried

| Surface | File | Density context |
|---|---|---|
| Listing catalog card | `ListingCard.tsx` | Grid + list variants |
| Complex catalog card | `ComplexCard.tsx` | Grid + list variants |
| Map sidebar rows | `RedesignMap.tsx` (inline) | Compact list, 200 items max |
| Layout plans | `LayoutGrid.tsx` | Complex page grid |

---

## Findings by Surface

### ListingCard (pre-change)

| Issue | Detail |
|---|---|
| Flat hierarchy | Title + price same row, same `text-sm`, competing weight |
| Price not dominant | Price right-aligned but not visually first |
| MapPin icon noise | Icon + subtitle row for block/region — low value per pixel |
| Redundant CTA | «Подробнее» on fully clickable card link |
| Badge overload | Full rounded pills `px-2 py-0.5 text-[11px]` on every card |
| Padding | `p-3` + `gap-0.5` — adequate but metadata feels cramped vs title |

### ComplexCard grid (pre-change)

| Issue | Detail |
|---|---|
| Title/price row conflict | `text-[16px]` title vs `text-sm` price side-by-side |
| Metadata sprawl | 4–6 separate lines: address, metro, builder, stats table, price bands, CTA |
| Label/value rows | «Квартир» / «Сдача» two-column rows — high scan cost |
| Repeated location | MapPin + address, then separate metro line |
| Badge inconsistency | Solid colored rectangles, different from ListingCard pills |
| Motion noise | `hover:-translate-y-px` on card shell |

### ComplexCard list

| Issue | Detail |
|---|---|
| Price below title | Wrong priority order |
| MapPin + long address | Single noisy row |
| «Подробнее →» | Redundant on link card |

### Map sidebar (pre-change)

| Issue | Detail |
|---|---|
| Wrong scan order | Title → district → price (price should lead) |
| Loose spacing | `p-2 gap-2.5 space-y-1.5` — ~52px row height overhead |
| Large thumb | `w-14` (56px) vs narrow 360px sidebar |
| External link | Bright primary «→» competes with row content |

### LayoutGrid (pre-change)

| Issue | Detail |
|---|---|
| Price buried | Below title and area |
| Heavy padding | `p-4` on small plan cards |
| Primary count badge | `text-primary` for stock count — false emphasis |

---

## Cross-Cutting Patterns

1. **Same-weight everything** — titles, prices, metadata often `font-semibold`/`font-medium` at similar sizes
2. **One fact per line** — no dot-grouped metadata
3. **Icon-per-row** — MapPin on every card despite truncate doing the work
4. **Badge styles differ** — ListingCard pills vs ComplexCard solid blocks vs status on image
5. **Low-value CTAs** — «Подробнее» repeated inside linked cards

---

## Real Bottlenecks (priority)

1. Map sidebar scan order (price last) — highest daily-use fatigue
2. ComplexCard metadata line count — catalog grid noise
3. ListingCard title/price competition — catalog list/grid
4. Badge visual weight — both card types

---

## Out of scope (confirmed)

- New card components
- Virtualization / infinite scroll
- Map popup redesign
- Page layout rewrite
