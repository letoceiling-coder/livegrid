# Iteration 6 — Typography Hierarchy

## Module: `card-visual.ts`

---

## Price (highest)

```typescript
cardVisual.price          // text-sm font-bold tabular-nums text-primary
cardVisual.priceFallback  // text-sm font-semibold text-muted-foreground
cardVisual.priceGrid      // text-[15px] font-bold (ComplexCard grid)
cardVisual.sidebarPrice   // text-xs font-bold (map sidebar)
```

**Change:** Price moved to **first content row** on ListingCard, ComplexCard, LayoutGrid, map sidebar.

Previously title-first or title-left/price-right split.

---

## Title (high)

```typescript
cardVisual.title       // text-sm font-semibold
cardVisual.titleGrid   // text-[15px] font-semibold line-clamp-2
cardVisual.sidebarTitle // text-[11px] font-medium line-clamp-2
```

---

## Location / district (medium)

```typescript
cardVisual.meta     // text-[11px] text-muted-foreground truncate
cardVisual.metaDot  // text-[11px] line-clamp-1 — dot-joined lines
```

**ComplexCard location line example:**
`Раменки · м. Мичуринский проспект · 5 мин`

---

## Technical / counts (lowest)

```typescript
cardVisual.metaMuted  // text-[10px] text-muted-foreground/75
```

**ComplexCard detail line example:**
`142 кв. · сдача 2026к1 · ПИК`

**LayoutGrid area + stock:** same tier, stock uses `font-medium text-foreground/70` not primary.

---

## Rhythm

| Surface | Body padding | Vertical gap |
|---|---|---|
| ListingCard | `p-2.5` | `gap-1` |
| ComplexCard grid | `p-3` | `gap-1.5` |
| Sidebar row | `p-1.5` | `gap-0.5` internal |

Font sizes span 3 steps: **15/14px → 11px → 10px** — clear weight separation via size + opacity, not extra bold everywhere.
