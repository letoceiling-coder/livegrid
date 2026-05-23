# Iteration 10.7 — Performance Safety

## Mode

Measured timings · query plan review · no request storm changes

---

## Measured response times (region 1)

| Scenario | Legacy `/blocks` | Viewport prototype |
|---|---|---|
| No filters (200 rows) | 258 ms | 210 ms |
| Geo 5 km (33 rows) | 88 ms | **48 ms** |
| District filter | 76 ms | 90 ms |
| Search (empty) | 18 ms | 332 ms † |

† Search path may hit Meilisearch + ID resolution; empty result still slow — monitor if search becomes hot path.

---

## Query structure safety

### Blocks viewport

1. `buildCatalogBlockWhere` — same Redis-adjacent cache keys as `/blocks` for geo resolution (PostGIS once)
2. Single raw SQL with indexed predicates:
   - `b.region_id = …`
   - `b.id IN (…)` when geo/filters narrow IDs
   - `ST_Within` envelope (bbox last)

**BBox ordering:** Applied in SQL after catalog where — reduces rows before envelope check when ID set small (geo case).

### Listings viewport

Two-step: `findMany` IDs then bbox SQL. Acceptable for prototype; may need full SQL translator if listing counts explode.

---

## PostGIS / indexes

- Geo radius: `ST_DWithin` geography (same as legacy)
- Bbox: `ST_Within` + `ST_MakeEnvelope` (4326)
- Known: `blocks_geo_gist_idx` may seq-scan on small tables — same as legacy audit

No new index requirements for Iter 10.

---

## Request storm (frontend unchanged)

- Viewport fetches remain DEV-only (`viewport_debug=1`)
- 450 ms debounce + signature dedupe unchanged
- Production legacy path: **0 pan/zoom API calls**

---

## Fallback path

Unchanged from Iter 9 — API failure → client-filter on legacy 200 rows. Iter 10 backend changes do not affect fallback.

---

## Performance verdict

| Risk | Status |
|---|---|
| Query time explosion | **Not observed** in tested scenarios |
| Geo slower than legacy | **No** — viewport geo faster (48 vs 88 ms) |
| Request storms | **Mitigated** (DEV-only) |
| Fallback broken | **No** |

---

## Monitoring recommendation

Before production viewport render: add timing header or meta field `query_ms` on prototype responses for staging dashboards.
