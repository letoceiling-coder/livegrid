# Iteration 13.1 — Sidebar Render Audit

## Mode

Pre-implementation audit · `RedesignMap.tsx` · 2026-05-22

---

## Location

| Element | File | Lines (pre-Iter 13) |
|---|---|---|
| Sidebar shell | `RedesignMap.tsx` | 578–719 |
| Block rows | inline `blocks.map()` | 617–660 |
| Listing rows | inline `listingItems.map()` | 665–716 |
| Row styling | `card-visual.ts` | `sidebarRow`, `sidebarThumb`, etc. |
| Images | `StableMediaFrame.tsx` | lazy default |

---

## Render pattern (before)

```tsx
<div className="overflow-y-auto flex-1 p-1.5 space-y-1 min-h-0">
  {blocks.map((c) => (
    <div key={c.id} className="flex gap-0.5 min-w-0">
      <button className={cardVisual.sidebarRow}>...</button>
      <Link to={`/complex/${c.slug}`}>→</Link>
    </div>
  ))}
</div>
```

| Property | Value |
|---|---|
| Max rows | 200 (`PER_PAGE`) |
| Virtualization | **None** |
| Row keys | `c.id` / `l.id` |
| List container | `overflow-y-auto flex-1` |
| Mobile height | `max-h-[40vh]` on `<aside>` |

---

## Row DOM structure

Each row:

```
div.flex.gap-0.5                    (wrapper)
├── button.sidebarRow               (select + highlight)
│   ├── StableMediaFrame w-12 4/3   (48×36px thumb)
│   └── div (price, title, meta?)
└── Link →                          (detail navigation)
```

**Estimated row height:** 72px fixed content + 4px gap (`space-y-1`) = **76px stride**

---

## Data coupling (unchanged in Iter 13)

| Source | Same as map? |
|---|---|
| `blocks` / `listingItems` | ✓ identical arrays |
| Selection | `activeBlock` / `activeListing` local state |
| Refetch | `keepPreviousData` on React Query |
| Counts | `catalogTotal`, `loadedCount`, `hasPaginationGap` |

---

## Image loading (before)

- `StableMediaFrame` default `loading="lazy"` — but **200 `<img>` nodes exist in DOM**
- Browser may still schedule decode/layout for off-screen images
- Map perf audit: **200 concurrent image requests** on full catalog load

---

## Selection sync (before)

| Action | Sidebar | Map |
|---|---|---|
| Row click | `setActiveBlock` | highlight via prop |
| Marker click | highlight via shared state | `onSelect` |
| Scroll to active | **Not implemented** | pan to coords |

---

## Mobile panel

```
aside.max-h-[40vh]  → ~280–360px typical
200 rows × 76px     → ~15 200px scroll height
```

User scrolls through entire 200-row DOM tree in 40vh window.

---

## Iter 13 change scope

| Changed | Unchanged |
|---|---|
| List body → `MapSidebarVirtualList` | Data fetch, counts, header |
| DOM: virtual window only | Row visual design |
| scroll-into-view on select | Map popup, API |

---

## Files touched

| File | Role |
|---|---|
| `MapSidebarVirtualList.tsx` | **New** — virtual list + memo rows |
| `map-sidebar-layout.ts` | **New** — row height constants |
| `RedesignMap.tsx` | Wire virtual list |
| `package.json` | `@tanstack/react-virtual` |

---

## Conclusion

Sidebar was a **flat 200-row DOM list** sharing catalog page-1 data with the map. Iter 13 replaces only the list body with windowed rendering; semantics and data path unchanged.
