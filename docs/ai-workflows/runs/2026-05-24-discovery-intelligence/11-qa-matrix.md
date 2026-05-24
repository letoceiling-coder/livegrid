# 11 — QA Matrix

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | Listing detail related carousel | Shows similar public listings | Manual |
| 2 | Complex related carousel | Same block + district | Manual |
| 3 | Favorites-based feed | reason=favorite items | Manual |
| 4 | Saved search recommendations | reason=saved_search | Manual |
| 5 | Region safety | No cross-region results | Manual |
| 6 | Exclude current listing | Not in related list | Manual |
| 7 | Notification dedupe | Same dedupeKey skipped | Manual |
| 8 | Pagination stability | Same page returns same order (cached) | Manual |
| 9 | Cold-start anon feed | Trending only | Manual |
| 10 | Mobile 360px carousel | Swipe scroll works | Manual |
| 11 | Console errors | Zero on catalog/detail/account | Manual |
| 12 | `pnpm typecheck` | Pass | **PASS** |

Migration: `20260524500000_discovery_notifications`
