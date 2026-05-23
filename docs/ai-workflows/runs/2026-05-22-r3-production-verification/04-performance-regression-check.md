# R3.1 — Performance Regression Check

## Mode

READ-ONLY · `@gstack/review`

---

## Render Analysis

### New derived state (per render)

```typescript
catalogTotal, loadedCount, hasPaginationGap,
catalogInitialLoading, isCatalogRefetching, catalogFetchError, retryCatalog
```

All computed from existing query state — **no new hooks, no new useEffects**.

| Change | Render impact |
|---|---|
| Removed `\|\| isFetching` from loading | **Fewer** sidebar unmount/remount cycles |
| `formatMapSubtitle` string | 1 string compare per render — negligible |
| Amber pagination notice | Conditional DOM — +1 `<p>` when gap exists |
| Error UI | Only on error path |
| `loading="lazy"` on images | **Reduces** initial layout/paint cost |

**Net render impact: neutral to positive.**

---

## Fetch Analysis

| Trigger | Before R3 | After R3 |
|---|---|---|
| Map mount (apartments) | 7 parallel queries | Same 7 |
| Filter change | 1 blocks refetch | Same 1 |
| Geo change (blocks mode) | 1 blocks refetch | Same 1 |
| Geo change (listings mode) | 0 (stale cache bug) | 1 listings refetch — **correct** |
| Pan/zoom map | 0 API calls | 0 |
| Window focus | default refetch | Same |

**No accidental double fetches on happy path.**

### Query key normalization

Removing duplicate `filters.marketType` from blocks key:
- One-time cache miss for browsers with in-memory React Query cache from pre-R3 session
- Negligible in production deploy (fresh page load)

---

## Map Rebuild Triggers

MapSearch rebuilds on `[complexes, activeSlug, zoom, ready]` — **unchanged**.

| Event | Map rebuild | Changed by R3? |
|---|---|---|
| Filter refetch completes | Yes — new `blocks` array | No — same as before |
| During refetch (in-flight) | No — keepPreviousData holds old complexes | **Improved** — fewer intermediate rebuilds |
| Selection click | Yes | No |
| Zoom change | Yes | No |

**R3 reduces** map rebuilds during refetch (data stable until response arrives). Previously sidebar cleared but map kept old data — now both stable.

---

## Network / Backend Load

```bash
# Production baseline (unchanged)
curl -s -o /dev/null -w "prod:%{time_total}s\n" \
  "https://livegrid.ru/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true"
# ~1.5s cold CDN, Redis warm ~30ms server-side
```

| Metric | Impact |
|---|---|
| Payload size | Unchanged (~900KB blocks) |
| Redis hit rate | Unchanged — same URLs |
| Listings geo fix | +1 fetch when geo changes in listings mode only |

**No production backend load increase** for primary apartments flow (95%+ traffic).

---

## Memory

keepPreviousData retains one previous response per query in memory — ~900KB blocks JSON max. Same order as pre-R3 (data was already in memory during refetch; sidebar just hid it).

---

## Lazy Loading Impact

```html
<img loading="lazy" ... />
```

Up to 200 sidebar images defer decode until scroll. **Positive** for initial mobile paint.

Browsers above fold may still load first visible cards eagerly — expected.

---

## Performance Regression Verdict

| Criterion | Status |
|---|---|
| No extra renders on happy path | ✓ PASS |
| No accidental double fetches | ✓ PASS |
| No new map rebuild triggers | ✓ PASS (fewer during refetch) |
| Backend load unchanged | ✓ PASS |
| Image lazy load benefit | ✓ Positive |

**Performance regression risk: NONE identified.**
