# Iteration 6 — Sidebar Optimization

## File: `RedesignMap.tsx` (right list panel)

---

## Before → After

| Aspect | Before | After |
|---|---|---|
| Scan order | Title → district → price | **Price → title → district/address** |
| Row padding | `p-2` | `p-1.5` |
| List gap | `space-y-1.5` | `space-y-1` |
| Container padding | `p-2` | `p-1.5` |
| Thumb width | `w-14` (56px) | `w-12` (48px) |
| External link | Primary bold «→» | Muted, hover primary, `min-w-[28px]` touch column |
| Hover | `hover:bg-muted/60` | `hover:bg-muted/50` (subtler) |

---

## Row Structure

```
┌──────────────────────────────────────┐
│ [thumb 4:3]  PRICE (bold, primary)   │ →
│              Title (2 lines max)     │
│              district / address      │
└──────────────────────────────────────┘
```

Uses `cardVisual.sidebarRow`, `sidebarThumb`, `sidebarPrice`, `sidebarTitle`, `sidebarMeta`.

---

## Blocks vs Listings

| Tab | Meta line |
|---|---|
| Blocks | District only (name in title) |
| Listings | Address when distinct from title |

Price fallback (`Цена по запросу`) uses muted semibold — consistent with Iteration 3.

---

## Scroll Fatigue Estimate

- ~8px saved per row (padding + gap)
- 200 rows → ~1.6m less scroll distance (theoretical)
- Price-first reduces eye travel: one anchor column per row

---

## Unchanged

- Active state: `border-primary bg-primary/5`
- Pagination notice in header
- Separate link to detail page (not merged into row — preserves map select vs navigate)

---

## Mobile (`max-h-[40vh]`)

- Tighter rows fit more items above fold
- External link column maintains touch width
- `line-clamp-2` on titles prevents row height explosion
