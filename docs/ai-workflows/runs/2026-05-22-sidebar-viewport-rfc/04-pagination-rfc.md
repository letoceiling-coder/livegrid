# Iteration 12.4 — Pagination RFC

## Scope

Pagination strategy for map sidebar in a viewport-aware future — **RFC only**, no implementation.

---

## Current pagination state

| Surface | Model | Page size |
|---|---|---|
| `RedesignMap` sidebar | **None** — page 1 only | 200 hard cap |
| `RedesignCatalog` grid/list | `useInfiniteQuery` | 20 per page |
| Viewport prototype | Single fetch, `LIMIT` | 300 default, 500 max |
| Blocks API | Offset (`page`, `per_page`) | configurable |
| Listings API | Offset | default 20 |

Map page **does not** use catalog's infinite scroll despite sharing APIs.

---

## Strategies evaluated

### 1. Infinite scroll (catalog offset)

**Pattern:** `useInfiniteQuery` with `page` increment on scroll sentinel — already in `RedesignCatalog.tsx`.

| Pros | Cons |
|---|---|
| Proven in codebase | Offset drift if data changes during scroll |
| Full catalog reachable | 14k listings = 750 pages — heavy meta.count each time |
| Same as list catalog | Decoupled from bbox — doesn't solve map coherence |
| | 200-row map still needed separately for markers |

**Verdict:** Required for hybrid «Все» tab; **insufficient alone** for viewport map.

---

### 2. Viewport pagination (bbox-keyed pages)

**Pattern:** Each settled bbox is a «page key». Fetch `limit=50` with cursor = last id or offset within bbox result set.

```
GET /viewport?bbox=…&cursor=slug:xyz&limit=50
```

| Pros | Cons |
|---|---|
| Spatially coherent | Bbox change resets cursor — list resets on pan |
| Natural chunk sizes | Needs new API contract |
| Matches marker set | Sort order must be defined |
| | Rapid pan = request churn (mitigate: debounce 450ms ✓) |

**Verdict:** **Primary strategy** for viewport-first / hybrid «В области» tab.

---

### 3. Cursor pagination (stable catalog)

**Pattern:** Keyset on `(sort_key, id)` instead of offset — e.g. `cursor=price:5000000:id:1234`.

| Pros | Cons |
|---|---|
| Stable under inserts | Requires indexed sort columns |
| No offset skip cost | Complex with geo pre-filter |
| Good for infinite scroll | Not bbox-native |

**Verdict:** Recommend for catalog «Все» tab at scale; optional for viewport if sort fixed.

---

### 4. Virtualized list

**Pattern:** `@tanstack/react-virtual` or similar — render ~15 DOM nodes for any dataset length.

| Pros | Cons |
|---|---|
| Required for 200+ rows | Doesn't reduce API payload alone |
| Fixes mobile 40vh scroll jank | Selection scroll-into-view needs work |
| Map perf audit flagged 200 images | Pair with lazy image loading |

**Measured pressure (map perf audit):**

- 200 sidebar rows × image load = **200 concurrent requests**
- No virtualization today

**Verdict:** **Required** when sidebar exceeds ~50 visible rows — independent of pagination strategy.

---

### 5. Grouped viewport chunks

**Pattern:** Cluster sidebar by district/subway; expand groups lazily.

| Pros | Cons |
|---|---|
| Scales downtown density | Extra UI complexity |
| Reduces perceived churn | Group headers need counts from API |
| Works at zoom 11 | Overkill for < 50 items |

**Verdict:** Phase 2 enhancement when bbox count routinely > 100.

---

## Production-safe recommendation

### Hybrid sidebar (Option C from 03)

| Tab | Pagination | Virtualization |
|---|---|---|
| **В области карты** | Viewport bbox-keyed, limit 50–100, cursor within bbox | Yes when > 30 rows |
| **Все результаты** | Infinite scroll, per_page 20, keyset cursor | Yes always |

### Map markers (future viewport render)

| Zoom | Marker strategy | Sidebar sync |
|---|---|---|
| z10–12 | Viewport fetch limit 300–500 | «В области» tab |
| z13+ | Same + cluster aggregation | Same list, map clusters |
| Filter active + total < 200 | May skip viewport — catalog sufficient | Catalog tab OK |

**Do not remove 200-cap from legacy path** until viewport render proven in staging.

---

## API requirements (future, not now)

### Viewport list endpoint extensions

```
GET /_prototype/blocks/viewport
  ?bbox… & filters…
  &limit=50
  &cursor={slug}
  &sort=price_asc|name_asc|distance_asc

Response:
{
  data: [...],
  meta: {
    count: 58,          // in bbox total (COUNT query)
    limit: 50,
    next_cursor: "…",
    catalog_total: 359  // optional cross-reference
  }
}
```

Separate **`HEAD` or `?count_only=1`** for cheap total without marker payload.

### Debounce / storm control

Existing guards (keep):

| Guard | Value |
|---|---|
| Bbox debounce | 450 ms |
| Bbox epsilon | 0.0008° |
| Min zoom | 10 |
| AbortController | Cancel in-flight on bbox superseded |

Add for sidebar:

| Guard | Proposal |
|---|---|
| Min interval between viewport list fetches | 600 ms |
| Stale-while-revalidate | Show previous bbox rows until new fetch settles |
| Rapid pan coalesce | Only latest bbox wins |

---

## Migration phases (RFC)

| Phase | Sidebar | Map markers | Risk |
|---|---|---|---|
| **0 (now)** | Page-1 catalog 200 | Legacy 200 | Known gap |
| **1** | Add virtualization to current 200 | Legacy | Low |
| **2** | Hybrid tabs behind flag | Legacy + shadow | Medium |
| **3** | «В области» default | Viewport render opt-in | High |
| **4** | Full hybrid production | Viewport default | Requires cap strategy |

---

## Honest blockers

| Blocker | Impact |
|---|---|
| No viewport `meta.count` | Can't show «58 in area» without full fetch |
| No cursor/sort on prototype | Can't paginate within bbox |
| 200-cap legacy still drives production | Pagination RFC doesn't apply until decoupled |
| Listings coords sparse | Viewport pagination useless for listings mode |

---

## Conclusion

**Recommended:** Viewport pagination for spatial tab + infinite scroll for catalog tab + mandatory virtualization.

**Not recommended:** Offset pagination alone at 14k scale; pure viewport without catalog escape hatch.

No pagination change in Iter 12 — this document defines target contracts only.
