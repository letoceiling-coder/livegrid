# R3 — Regression Checklist

## Pre-flight

```bash
curl -s -o /dev/null -w "api:%{http_code}\n" http://localhost:3000/api/v1/health
curl -s -o /dev/null -w "web:%{http_code}\n" http://localhost:5173/map
pnpm --filter web exec tsc --noEmit
```

---

## Functional Regression

### Apartments mode (blocks)

| # | Test | Pass criteria |
|---|---|---|
| 1 | Load `/map?region_id=1` | 200 markers, subtitle "Показано 200 из 359" |
| 2 | FilterSidebar count | Shows 359 (meta.total) |
| 3 | Sidebar header | Amber pagination notice |
| 4 | Click sidebar row | Marker highlights |
| 5 | Change room filter | No sidebar flash; "обновление…" in subtitle |
| 6 | Search suggestion | Still works within loaded 200 |
| 7 | Region switch | Refetch, no JS errors |

### Listings mode

| # | Test | Pass criteria |
|---|---|---|
| 8 | Switch to Дома | ListingsMapSearch renders |
| 9 | Subtitle | Uses listings meta.total |
| 10 | Secondary apartments | Listings mode, coords fallback unchanged |

### Geo filters

| # | Test | Pass criteria |
|---|---|---|
| 11 | Add `geo_lat/lng/radius` to URL (blocks) | Filtered results, correct count |
| 12 | Secondary + geo params | New fetch (queryKey includes geo) |
| 13 | Clear geo from URL | Results restore |

### objectType switching

| # | Test | Pass criteria |
|---|---|---|
| 14 | apartments → houses → apartments | No stale data stuck |
| 15 | rooms / dachas tabs | Empty state unchanged |

### URL sync

| # | Test | Pass criteria |
|---|---|---|
| 16 | Change filter | URL updates |
| 17 | Browser back | Filters restore from URL |
| 18 | Share URL | Same catalog state |

---

## Error / Edge Cases

| # | Test | Pass criteria |
|---|---|---|
| 19 | API down on load | Retry UI, not "Нет объектов" |
| 20 | Click Retry after API up | Data loads |
| 21 | Zero results filter | "Нет объектов по фильтрам." (no error) |

---

## Performance Regression

| # | Check | Pass criteria |
|---|---|---|
| 22 | Blocks cold fetch | Still ~200-300ms (no backend change) |
| 23 | Blocks warm fetch | Still ~30-40ms (Redis unchanged) |
| 24 | Marker count on map | Still max 200 (no pagination added) |
| 25 | No extra API calls on pan/zoom | Unchanged |

---

## Code Regression

| # | Check | Pass criteria |
|---|---|---|
| 26 | Single file diff | Only `RedesignMap.tsx` |
| 27 | MapSearch untouched | No cluster changes |
| 28 | buildBlocksSearchParams untouched | Same API contract |
| 29 | buildListingsSearchParams untouched | Same API contract |

---

## Sign-off

| Area | Status |
|---|---|
| R3.1 totalCount | ✓ |
| R3.2 pagination UX | ✓ |
| R3.3 geo queryKey | ✓ |
| R3.4 loading sync | ✓ |
| R3.5 error states | ✓ |
| R3.6 lazy images | ✓ |
| Typecheck | ✓ |
| Backend unchanged | ✓ |
