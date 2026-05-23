# Iteration 13.6 — Selection Sync Verification

## Requirements

| Requirement | Status |
|---|---|
| Sidebar click → map highlight | ✓ preserved |
| Map click → sidebar highlight | ✓ preserved |
| Toggle deselect | ✓ preserved |
| Map popup | ✓ unchanged (`MapSearch` / `ListingsMapSearch`) |
| Pan on select | ✓ unchanged |
| Scroll active into view | ✓ **new** (Iter 13 improvement) |

---

## State flow (unchanged)

```
RedesignMap
  activeBlock / activeListing  (local useState)
       ↓                    ↓
MapSidebarVirtualList    MapSearch / ListingsMapSearch
  isActive prop            activeSlug / activeId prop
```

No new global store. No URL param.

---

## Sidebar → map

```tsx
onClick={() => onSelect(isActive ? null : c.slug)}
// → setActiveBlock in RedesignMap
// → MapSearch activeSlug prop
// → useMapClusterLayer selection effect
```

Cluster: `applyPlacemarkActive` only — **no full rebuild**.

---

## Map → sidebar

```tsx
onSelect={setActiveBlock}  // marker click
```

Virtual list:
- `isActive={activeSlug === blocks[item.index].slug}`
- Memo row re-renders only when `isActive` flips

**New:** `virtualizer.scrollToIndex(index, { align: 'auto', behavior: 'smooth' })`

Fixes pre-Iter 13 gap: marker tap could leave active row off-screen in 40vh panel.

---

## Toggle semantics

| Mode | Click active row | Click inactive row |
|---|---|---|
| Blocks | Deselect (`null`) | Select slug |
| Listings | Deselect | Select id |

Matches legacy `c.slug === activeBlock ? null : c.slug`.

---

## Keyboard navigation (new)

Focus scroll container (`tabIndex={0}`):

| Key | Action |
|---|---|
| ArrowDown | Next row + select |
| ArrowUp | Previous row + select |
| Home | First row |
| End | Last row |

Triggers same `onSelect` callbacks → map syncs.

---

## Detail link

`Link` to `/complex/{slug}` / `/listing/{id}`:

- `tabIndex={-1}` — not in tab order during row navigation
- Click navigates away — unchanged

---

## Filter change + active selection

When filters change (`listResetKey`):

- Scroll resets to top
- **Active selection not auto-cleared** — same as legacy (active slug may not exist in new list)

If active item absent from new data:
- Map: no matching marker highlight
- Sidebar: no `aria-current` row

Legacy behavior preserved. Future Iter could clear stale selection — out of scope.

---

## DEV checklist

| # | Test | Expected |
|---|---|---|
| 1 | Click sidebar row | Map marker active + popup |
| 2 | Click map marker | Sidebar row highlighted + scrolled into view |
| 3 | Click active row again | Deselect, popup closes |
| 4 | Arrow keys on list | Selection moves, map follows |
| 5 | Select row 150, then filter | Scroll top; selection state per legacy |
| 6 | `map_debug=1` cluster rebuilds | Unchanged on sidebar click |

---

## Conclusion

Selection semantics **identical** to legacy. Iter 13 adds **scroll-into-view** and **keyboard navigation** without changing map popup or cluster behavior.
