# Iteration 6 — Badge Normalization

## Module: `cardBadgeClass(variant, accent?)`

---

## Hierarchy

| Variant | Visual | Card usage |
|---|---|---|
| **primary** | Solid fill + white text | Reserved — not used on list surfaces |
| **secondary** | Subtle tinted background | Active/positive status |
| **outline** | Border + muted text | Inactive, sold, planned, technical |

**Size (all):** `text-[10px] px-1.5 py-px rounded font-medium`

Down from ListingCard `text-[11px] px-2 py-0.5 rounded-full`.

---

## ListingCard Status Mapping

| Status | Variant | Accent |
|---|---|---|
| ACTIVE (Свободно) | secondary | emerald |
| RESERVED (Бронь) | secondary | amber |
| SOLD (Продано) | outline | muted |
| DRAFT | outline | muted |
| INACTIVE | outline | red |

Label shortened: «Снято с публикации» → «Снято» (less badge width).

---

## ComplexCard Status Mapping

| Status | Variant | Accent |
|---|---|---|
| building (Строится) | secondary | blue |
| completed (Сдан) | secondary | green |
| planned (Планируется) | outline | orange |

Previously all used solid `bg-[#...]` blocks at `text-[11px] font-semibold`.

---

## Positioning

- **ListingCard:** `absolute top-1.5 left-1.5` on image
- **ComplexCard grid:** `absolute top-2 left-2` wrapper (unchanged position, new style)
- **ComplexCard list:** `absolute top-1.5 left-1.5` (fixed — was missing absolute wrapper)

---

## Reduced Visual Noise

- No full-width pill badges
- Inactive states use outline — less color competition with price (primary blue)
- Consistent badge language across card types

---

## NOT badges (unchanged)

- FilterSidebar active tags
- Map marker price badges (Iter 2)
- Pagination amber notice
