# Iteration 5 — Mobile Filter Check

## Mode

Mobile UX verification · `@gstack-ui-product-audit`

**Date:** 2026-05-22

---

## Overlay Structure (unchanged)

Both `/map` and `/catalog`:

```
fixed inset-0 z-[60]
  sticky header + close (X)
  scrollable FilterSidebar body (pb-24)
  fixed bottom CTA — close overlay
```

Filters apply **live** on change (same `handleFiltersChange` as desktop sidebar) — bottom button only closes overlay, does not batch-apply.

---

## Iteration 5 Fix: Body Scroll Lock

**Hook:** `redesign/hooks/useBodyScrollLock.ts`

```typescript
useBodyScrollLock(showFilters);        // RedesignMap
useBodyScrollLock(showMobileFilters);  // RedesignCatalog
```

Sets `document.body.style.overflow = 'hidden'` while overlay open — prevents background scroll bleed.

---

## Apply / Close Flow

| Step | Behavior |
|---|---|
| Open overlay | Tap «Фильтры» → overlay slides in, body locked |
| Toggle filter | Immediate state + URL + query (with debounced search exception) |
| Close (X or bottom CTA) | `setShowFilters(false)` — overlay unmounts, scroll restored |
| Filter persistence | State in URL — survives close/reopen ✓ |

---

## Object Type Switch in Overlay

`FilterSidebar` object type buttons reset type-specific fields but preserve:

- `search`, `priceMin`, `priceMax`

Immediate `onChange` → full URL write — no accidental full reset.

---

## Stability Improvements from Debounce

Mobile users typing in **map search bar** (outside overlay) no longer trigger URL churn — overlay list behind it stays stable during typing pauses.

Inside overlay, `SearchableCheckboxList` local search (district/metro filter) remains instant — client-side only, no API.

---

## Remaining Mobile Gaps (deferred)

- No separate «Применить» batch mode for filters (product decision)
- Overlay re-mounts FilterSidebar from scratch — collapsible section state resets (pre-existing)
- Catalog mobile bottom CTA shows `totalShown` not `totalRemote` when paginated

---

## Smoke Checklist

- [ ] Open filters on mobile → background does not scroll
- [ ] Toggle district → list updates, no full-screen flash
- [ ] Close overlay → filters preserved in URL
- [ ] Switch object type in overlay → price/search kept, rooms reset
- [ ] Type in map search with overlay closed → debounced refetch, no sidebar empty flash
