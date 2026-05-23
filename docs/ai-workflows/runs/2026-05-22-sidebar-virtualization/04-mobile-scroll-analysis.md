# Iteration 13.4 — Mobile Scroll Analysis

## Layout (unchanged)

```tsx
<aside className="max-h-[40vh] lg:max-h-none lg:w-[360px] ...">
  <div className="shrink-0">header</div>
  <MapSidebarVirtualList />  // flex-1 overflow-y-auto
</aside>
```

Mobile: **same 40vh bottom panel** — no map/list toggle (per Iter 13 scope).

---

## Viewport math

| Device | 40vh ≈ | Visible rows (76px stride) |
|---|---|---|
| iPhone SE (667h) | ~267px | ~3.5 |
| Standard phone (844h) | ~338px | ~4.5 |
| Large phone (932h) | ~373px | ~4.9 |

With **overscan 8**: rendered rows ≈ visible + 16 ≈ **19–21 max**

vs **200** before.

---

## Scroll behavior changes

| Aspect | Before | After |
|---|---|---|
| DOM nodes in list | 200 | ~20 |
| Scroll container | Same element role | Same |
| Touch momentum | Heavy (200 nodes) | Lighter |
| `overscroll-contain` | Not set | **Added** — reduces scroll chaining to map |

---

## Mobile-specific guards

| Guard | Implementation |
|---|---|
| Fixed row height | No layout thrash during fling |
| Lazy images | Only ~20 `<img>` in DOM |
| Scroll reset | Only on filter URL change — not on background refetch |
| Selection scroll | `scrollToIndex` smooth — active row visible after map tap |

---

## Known remaining mobile limits (unchanged)

| Limit | Notes |
|---|---|
| 40vh cram | Iter 12 RFC — map/list toggle deferred |
| 200 catalog cap | Semantic unchanged |
| Popup vs sidebar overlap | Map bottom card unchanged |

---

## DEV verification (mobile)

Chrome DevTools → device toolbar:

1. `/map?region_id=1` — sidebar scrolls smoothly through 200 items
2. Tap map marker — sidebar scrolls active row into view
3. Change district filter — list resets to top
4. Same filter, wait refetch — scroll position preserved
5. No horizontal wobble while scrolling

---

## Conclusion

Mobile keeps **identical chrome** with **~10× fewer DOM nodes** in the scroll region. `overscroll-contain` added for touch isolation.
