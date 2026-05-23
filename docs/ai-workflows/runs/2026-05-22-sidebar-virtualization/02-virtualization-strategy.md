# Iteration 13.2 — Virtualization Strategy

## Library

**`@tanstack/react-virtual`** — added to `@lg/web` dependencies.

---

## Component design

**`MapSidebarVirtualList.tsx`** — isolated rollback unit.

### Props

| Prop | Purpose |
|---|---|
| `mode: 'blocks' \| 'listings'` | Row renderer switch |
| `blocks` / `listings` | Same arrays as before |
| `activeSlug` / `activeId` | Selection state |
| `onSelectBlock` / `onSelectListing` | Same callbacks |
| `listResetKey` | `mapUrlSig` — scroll reset on filter URL change only |

### Constants (`map-sidebar-layout.ts`)

| Constant | Value | Rationale |
|---|---|---|
| `MAP_SIDEBAR_ROW_HEIGHT` | **72px** | Fixed row box — thumb + 2-line title + optional meta |
| `MAP_SIDEBAR_ROW_GAP` | **4px** | Matches former `space-y-1` |
| `MAP_SIDEBAR_OVERSCAN` | **8** | Smooth fast scroll on mobile |

```typescript
useVirtualizer({
  count,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => mapSidebarRowStride(), // 76
  overscan: MAP_SIDEBAR_OVERSCAN,
  gap: MAP_SIDEBAR_ROW_GAP,
});
```

---

## Fixed vs dynamic sizing

**Decision: fixed estimate size** (per Iter 13 requirements).

| Approach | Choice | Reason |
|---|---|---|
| Fixed 72px rows | ✓ | Uniform layout; `line-clamp-2` caps title |
| Dynamic measureElement | ✗ | Layout jump risk on image load |
| Variable meta line | Absorbed | `overflow-hidden` on text column |

Rows use explicit `height: 72px` on wrapper — images cannot expand row.

---

## Scroll container

```tsx
<div
  ref={scrollRef}
  className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5"
  role="list"
  tabIndex={0}
>
  <div style={{ height: virtualizer.getTotalSize() }}>
    {virtualItems.map(... absolute translateY ...)}
  </div>
</div>
```

- Parent `<aside>` remains `flex flex-col overflow-hidden`
- Virtual list owns `flex-1` scroll region (same as before)

---

## Scroll reset policy

| Event | Scroll behavior |
|---|---|
| Filter URL change (`listResetKey`) | Reset to top |
| Same-filter refetch (`keepPreviousData`) | **Preserve** scroll position |
| Selection change | `scrollToIndex` smooth, align auto |

---

## Memoization

| Component | Memo |
|---|---|
| `MapSidebarBlockRow` | `React.memo` |
| `MapSidebarListingRow` | `React.memo` |

Selection change re-renders:
- Virtual list container (active prop)
- **2 rows max** (prev active + new active) — not all 200

Map cluster selection remains isolated (unchanged from Iter 2).

---

## Accessibility

| Feature | Implementation |
|---|---|
| `role="list"` | Scroll container |
| `role="listitem"` | Each row wrapper |
| `aria-setsize` / `aria-posinset` | Row index |
| `aria-current="true"` | Active row button |
| Keyboard | ↑↓ Home End on focused list |
| Detail link | `tabIndex={-1}` — row button primary |

---

## Explicit non-changes

- No viewport fetch
- No tabs / infinite scroll
- No card redesign
- No React Query key changes
- No map cluster changes

---

## Rollback

Revert `RedesignMap.tsx` to inline `blocks.map()` and delete:
- `MapSidebarVirtualList.tsx`
- `map-sidebar-layout.ts`

Optional: remove `@tanstack/react-virtual` dependency.

---

## Conclusion

Windowed rendering with **fixed 72px rows**, **8-row overscan**, and **filter-key-gated scroll reset** — minimal surface area, isolated component.
