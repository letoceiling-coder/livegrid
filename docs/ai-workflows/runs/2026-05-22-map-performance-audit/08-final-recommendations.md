# Final Recommendations

## Mode

READ-ONLY AUDIT CONCLUSIONS · measured bottlenecks only · pre-refactor baseline

**Audit date:** 2026-05-22  
**Platform:** `~/livegrid` Nest monorepo (production livegrid.ru)  
**Data:** production snapshot — 1336 blocks, 23044 published listings, region 1 catalog 359 active blocks

---

## gstack Workflow Summary

| Skill | Applied to |
|---|---|
| `@gstack/benchmark` | API cold/warm timings, payload sizes, EXPLAIN ANALYZE |
| `@gstack/careful` | findings tied to code paths + reproducible commands |
| `@gstack/cso` | cache key integrity, data completeness |
| `@gstack/design-review` | UX flows, loading states, mobile |
| `@gstack/devex-review` | React Query keys, URL sync |
| `@gstack/agents` | 7-phase audit structure |

---

## Top 5 Real Bottlenecks (Evidence-Based)

### 1. Map data cap — 200 of 359 blocks (P0)

**Evidence:**

```
GET /blocks?region_id=1&per_page=200&page=1 → data:200, meta.total:359
GET /blocks?…&page=2 → data:159
```

**Impact:** 44% of catalog invisible. Search suggestions, subtitle, and mobile CTA all use `blocks.length` — not `meta.total`.

**Before refactor:** decide product requirement — full catalog vs viewport-based loading. Current architecture is neither.

---

### 2. Blocks payload weight — ~900 KB / 200 rows (P0)

**Evidence:** curl `size_download:899558`, python raw JSON 2.06 MB.

**Cause:** 27 fields × nested includes (addresses, images×3, subways×3, _count) + price bounds query.

**Impact:** 238 ms cold API + JSON parse + 200× mapper + 200 marker DOM on every uncached filter change.

**Before refactor:** measure slim DTO endpoint vs include trimming — must re-benchmark after any change.

---

### 3. Map marker full rebuild on zoom/selection/filter (P1)

**Evidence:** `MapSearch.tsx` effect deps `[complexes, activeSlug, zoom, ready]` — destroys Clusterer entirely.

**Impact:** O(N) Yandex placemark + HTML layout creation. Dominates interactive perf at N=200; critical if N grows.

**Before refactor:** profile with Chrome Performance tab on zoom 11→13 and selection click — establish baseline ms.

---

### 4. Listings endpoint uncached + read-path mutation (P1)

**Evidence:**

- No Redis in `listings.service.findAll`
- `expireOldPublishedListings()` on every call
- 222 ms cold, 150 ms repeat, 370 KB / 200 rows

**Impact:** all non-blocks map modes (houses, land, commercial, secondary apartments) pay full DB cost every interaction.

---

### 5. PostGIS seq scan for radius filter (P2 — latent)

**Evidence:** EXPLAIN `Seq Scan on blocks`, 29.7 ms at 1336 rows. `blocks_geo_gist_idx` unused due to geography cast.

**Impact:** acceptable now; scales linearly. Geo API cold 276 ms total (includes catalog query).

---

## Recommended Investigation Order (NOT implementation)

These are **next steps before any refactor PR** — each requires re-measurement:

| Step | Action | Success metric |
|---|---|---|
| 1 | Browser Performance profile: zoom 11→13, filter change, sidebar click | baseline long tasks (ms) |
| 2 | Fix measurement of completeness: log `meta.total` vs rendered count | confirm 359 vs 200 gap in UI |
| 3 | Repro listings+geo cache bug: secondary mode + geo URL params | document stale cache |
| 4 | EXPLAIN geo query with geometry rewrite (dev only) | index scan vs seq scan |
| 5 | Load test listings endpoint 50 concurrent | p95 latency without cache |

---

## Do NOT Optimize (Low ROI — confirmed)

| Idea | Why skip |
|---|---|
| Memoize `formatPrice` | not on hot path |
| React.memo on FilterSidebar | not a measured bottleneck |
| Districts/subways query caching | 40-70 ms, small payload |
| kind-counts optimization | 40 ms, 53 bytes |
| Replace Yandex Maps | massive scope, not measured as root cause |

---

## Architecture Constraints for Future Refactors

Any map refactor should preserve until explicitly replaced:

1. **URL-synced filters** — shareable catalog links work today
2. **Blocks Redis cache (45s)** — production relies on warm 33 ms responses
3. **`catalog_apartment_active_mv`** — price bounds fast path
4. **`require_active_listings` default** — catalog correctness

---

## Quick Wins vs Structural Fixes

### Quick wins (small diff, measurable)

| Fix | Expected gain | Verify by |
|---|---|---|
| Add geo to listings queryKey | correctness | React Query devtools |
| Use `meta.total` in subtitle | UX trust | UI inspection |
| `keepPreviousData` on blocks query | sidebar no flash | visual + network |
| Debounce search URL writes (300ms) | fewer cold cache misses during typing | network waterfall |
| `loading="lazy"` on sidebar images | faster initial paint | Lighthouse |

### Structural fixes (require design decision)

| Fix | Tradeoff |
|---|---|
| Viewport bbox API | backend + frontend contract change |
| Slim `/blocks/map` DTO | API versioning |
| Pagination / infinite scroll on sidebar | UX design |
| Incremental marker updates | Yandex API learning curve |
| Listings cache | invalidation complexity |
| PostGIS index migration | DBA + deploy |
| Real geocoding for secondary | data pipeline |

---

## Production Bottleneck Summary Table

| Layer | Bottleneck | Cold ms | Size | Scales with |
|---|---|---|---|---|
| API blocks | heavy include + count | 238 | 900 KB | blocks × fields |
| API blocks warm | — | 33 | 900 KB | — |
| API listings | no cache + include | 222 | 370 KB | listings |
| API geo | seq scan + catalog | 276 | 167 KB | block count |
| DB | require_active_listings semi-join | 17 | — | blocks |
| Frontend | marker rebuild | unmeasured | — | N × events |
| Frontend | 200 sidebar DOM + images | unmeasured | — | N |
| UX | 200/359 completeness | — | — | catalog growth |

---

## Audit Artifacts

| Document | Contents |
|---|---|
| [01-map-flow-analysis.md](./01-map-flow-analysis.md) | End-to-end runtime architecture |
| [02-frontend-performance.md](./02-frontend-performance.md) | React Query, rerenders, MapSearch |
| [03-backend-performance.md](./03-backend-performance.md) | API timings, Prisma, cache |
| [04-geo-performance.md](./04-geo-performance.md) | PostGIS, clustering, viewport gaps |
| [05-ux-audit.md](./05-ux-audit.md) | Loading, mobile, empty states |
| [06-stress-analysis.md](./06-stress-analysis.md) | Filter spam, zoom, concurrency |
| [07-technical-debt.md](./07-technical-debt.md) | Debt inventory |

---

## Reproducibility Checklist

```bash
# 1. Services up
curl -s -o /dev/null -w "api:%{http_code}\n" http://localhost:3000/api/v1/health
curl -s -o /dev/null -w "web:%{http_code}\n" http://localhost:5173/map

# 2. Data sanity
curl -s "http://localhost:3000/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('loaded',len(d['data']),'total',d['meta']['total'])"

# 3. Cold/warm blocks
redis-cli FLUSHDB
curl -s -o /dev/null -w "cold:%{time_total}s\n" \
  "http://localhost:3000/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true"
curl -s -o /dev/null -w "warm:%{time_total}s\n" \
  "http://localhost:3000/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true"

# 4. Geo EXPLAIN
psql -U lg_admin -d lg_development -c "EXPLAIN ANALYZE SELECT b.id FROM blocks b WHERE b.region_id=1 AND b.latitude IS NOT NULL AND ST_DWithin(geography(ST_SetSRID(ST_MakePoint(b.longitude::double precision,b.latitude::double precision),4326)),geography(ST_SetSRID(ST_MakePoint(37.6173,55.7558),4326)),5000::double precision);"
```

---

## Conclusion

The current map architecture is **functional for ~200 objects per view** with **Redis-cached blocks API** performing adequately (33 ms warm). The dominant production risks are:

1. **Data completeness** — not performance — due to page-1 cap
2. **Payload size** — 900 KB blocks response drives load and parse cost
3. **Frontend marker lifecycle** — full rebuild pattern will not scale if pagination is fixed without viewport culling
4. **Listings mode** — no backend cache, unsuitable for full 14K listing corpus

**No refactor should proceed without addressing the 200/359 completeness gap and establishing browser-side Performance baselines.**

This audit is read-only. All recommendations require separate implementation tickets with before/after measurements.
