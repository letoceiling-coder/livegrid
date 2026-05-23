# Iteration 25.4 — Selection + Sidebar Sync

## Mode

Selection sync under hybrid viewport map + legacy sidebar · 2026-05-22

---

## Sync paths

### Marker click → sidebar

| Step | Behavior |
|---|---|
| User clicks viewport marker | `onSelect(id)` → `activeListing` state |
| Sidebar highlight | Looks up `listingItems` (legacy 200) |
| **Gap** | Viewport-only markers (not in 200-row page) **won't highlight sidebar row** |

This is an **expected Stage 1 limitation** — sidebar is intentionally legacy.

Popup still works via merged lookup:

```typescript
listings.find(id) ?? effectiveMapListings.find(id)
```

Viewport-only markers show popup with title/price/photo from viewport DTO (address may be null).

### Sidebar click → marker

| Step | Behavior |
|---|---|
| User clicks sidebar row | `setActiveListing(id)` |
| Map active state | Cluster layer `applyPlacemarkActive` |
| Pan | `panMapToCoords` from `effectiveMapListings` or `listings` |
| **Condition** | Marker must exist in current map source |

Sidebar items are subset of catalog; if item has coords and is in viewport bbox, viewport API includes it → marker exists.

Items outside current bbox: pan may move map but marker not visible until bbox includes coords.

### Scroll-to-row

`MapSidebarVirtualList` scrolls to `activeIndex` on selection — works when active ID is in sidebar list.

Viewport-only selection: no sidebar scroll (no row exists).

---

## activeBlock consistency

N/A for listings mode — `activeBlock` is blocks/JK path only.

---

## Validation checklist

| Check | Status | Notes |
|---|---|---|
| Marker click → popup | **PASS** (design) | Merged lookup |
| Marker click → sidebar highlight | **PARTIAL** | Only if ID in 200-row page |
| Sidebar click → marker active | **PASS** (design) | Existing cluster selection path |
| Scroll-to-row | **PARTIAL** | Viewport-only IDs skip scroll |
| Popup open/close | **PASS** (design) | Toggle click mode unchanged |
| Pan on sidebar select | **PASS** (design) | Uses effectiveMapListings first |

---

## Stage 2 recommendation

Unify sidebar data source or add "not in sidebar list" indicator when viewport marker selected outside catalog page.
