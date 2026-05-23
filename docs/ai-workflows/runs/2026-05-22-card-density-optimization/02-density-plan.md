# Iteration 6 — Density Plan

## Mode

Implementation plan · `@gstack-plan-eng-review` · `@gstack-careful`

**Date:** 2026-05-22

---

## Strategy

Single shared token module + class-only changes in existing components.

**No** new card types, **no** DOM restructure, **no** data/logic changes.

```
redesign/lib/card-visual.ts
  ├── cardVisual.*     typography + spacing tokens
  ├── cardBadgeClass()  primary / secondary / outline
  └── metaDotLine()     join metadata with ·
```

---

## Hierarchy Rules Applied

| Priority | Element | Treatment |
|---|---|---|
| 1 | Price | First row, `font-bold`, `tabular-nums`, primary color |
| 2 | Title | Second row, `font-semibold`, `line-clamp-2` |
| 3 | Location | Single dot-line, no icon |
| 4 | Technical | `text-[10px]`, `muted-foreground/75` |

---

## Per-Surface Changes

| Surface | Key change |
|---|---|
| ListingCard | Price → title → meta; remove MapPin + «Подробнее»; smaller badges |
| ComplexCard grid | Consolidate 4+ lines → 2 meta lines + inline price bands |
| ComplexCard list | Same hierarchy as grid content |
| Map sidebar | Price first; `w-12` thumb; `p-1.5`; muted external link |
| LayoutGrid | Price first; tighter `p-2.5` |

---

## Badge Normalization

| Type | Use | Style |
|---|---|---|
| Primary | — | Reserved (not used on cards — status uses secondary/outline) |
| Secondary | Active status (Свободно, Строится, Сдан) | Subtle tinted bg |
| Outline | Inactive/sold/planned | Border + muted text |

Size: `text-[10px] px-1.5 py-px` (down from `text-[11px] px-2`)

---

## Spacing Scale

| Token | Value |
|---|---|
| Card body compact | `p-2.5 gap-1` |
| Card body grid | `p-3 gap-1.5` |
| Sidebar row | `p-1.5 gap-2` |
| Sidebar list gap | `space-y-1` |

---

## Removed Noise

- MapPin icons on card meta rows
- «Подробнее» / «Подробнее →» inside linked cards
- Label/value table rows in ComplexCard stats block
- `hover:-translate-y-px` on ComplexCard / LayoutGrid

---

## Verification Matrix

| Check | Pass criteria |
|---|---|
| Long titles | `line-clamp-2`, no overflow |
| No price | Muted fallback styling preserved |
| Many badges | Smaller, hierarchy consistent |
| Mobile sidebar | Rows fit `max-h-[40vh]`, touch targets ≥44px row height |
| Desktop catalog | Grid cards shorter content block |
