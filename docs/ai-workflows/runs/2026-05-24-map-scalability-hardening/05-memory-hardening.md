# Phase 5 — Memory + Long Session Hardening

**Iteration:** 64

## Implemented

- `map-session-diagnostics.ts` — `window.__LG_MAP_SESSION__` (DEV + `?map_debug=1`)
- Tracks viewport requests, fallbacks, cluster rebuilds, heap, bbox cancel/dedupe
- 15s interval snapshot for 60+ min soak analysis
- Production viewport reduces React marker array size vs global 200 cap overflow

## React Query

- Sidebar still uses legacy paginated queries (unchanged keys)
- Viewport fetch bypasses React Query cache growth for markers
