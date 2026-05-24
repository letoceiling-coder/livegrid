# 06 — Mobile Engagement

**Iteration:** 79 · **Date:** 2026-05-25

## Audit (360px)

| Area | Finding | Fix |
|------|---------|-----|
| Thumb-zone CTA | Bottom nav at h-14; sticky inquiry bars stack | Compare chip at `bottom-[4.5rem]` clears nav |
| Sticky action fatigue | Resume banner dismissible; chip only when compare > 0 | Reduced persistent chrome |
| Card density | Continue browsing 200px cards, horizontal snap | `snap-x snap-mandatory`, `scrollbar-hide` |
| Scroll continuity | Discovery + continue blocks horizontal | Same snap pattern as iter 78 carousels |
| Return UX | Session resume on catalog/map/home | One row, wraps on narrow screens |
| Bottom nav | 4-col: Home / Catalog / Map / Favorites | Unchanged; favorites badge retained |

## Safe areas

- `safe-area-pb` on compare chip and conversion bars
- Map page: resume banner in shrink-0 header strip (no map overlap)

## Not changed

Full bottom-nav redesign, 5th compare tab (chip preferred to avoid nav clutter).

## Files

- `CompareSessionChip.tsx`
- `SessionResumeBanner.tsx`, `ContinueBrowsingSection.tsx`
- `RedesignHeader.tsx` (existing bottom nav)
- Page-level sticky bars unchanged from iter 77 conversion work
