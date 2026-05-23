# Iteration 15.6 — Performance Analysis

## Method

Live measurements · region 1 · API restarted with Iter 15 build · 2026-05-22

---

## Response payload

| Endpoint | Time | Size | Rows |
|---|---|---|---|
| `/_prototype/blocks/viewport` (limit 500) | **212 ms** | **47 KB** | 181 |
| `/blocks?per_page=200` (legacy) | 221 ms | **900 KB** | 200 |

Viewport marker payload **~19× smaller** than legacy catalog page for comparable map use.

---

## Query structure (blocks)

Iter 15 runs **parallel**:

1. `COUNT(*)` catalog only
2. `COUNT(*)` catalog + bbox
3. `SELECT … LIMIT` markers

**Total wall time ~212 ms** — counts + data combined (cold-ish, no Redis on prototype).

### Estimated breakdown (inferred)

| Phase | Est. cost |
|---|---|
| buildCatalogBlockWhere + geo | 10–80 ms (geo warm ~10 ms) |
| COUNT ×2 + SELECT | 100–150 ms |
| JSON serialize | < 10 ms |

---

## Scenario timings (from Iter 10 + Iter 15)

| Scenario | Viewport ms | Legacy ms |
|---|---|---|
| No filters Moscow bbox | **212** | 258 |
| Geo 5 km | ~48–90 | 88 |
| District filter | ~76–90 | 76 |

Prototype **comparable or faster** than legacy for filtered queries.

---

## Count query cost

Adding two COUNT queries did **not** double latency vs Iter 10 single SELECT — parallel execution absorbs cost.

| Query | Purpose |
|---|---|
| COUNT no bbox | `meta.total` |
| COUNT with bbox | `meta.visible` |

---

## PostGIS / indexes

From map perf audit (Iter map-performance):

- Geo radius: seq scan ~30 ms on 1336 blocks — acceptable
- Bbox `ST_Within` on blocks: uses point-in-envelope — index `blocks_geo_gist_idx` underutilized due to cast patterns

**Recommendation:** EXPLAIN on production snapshot before rollout — not blocking prototype.

---

## Listings path (honest)

Current: `findMany` **all** matching IDs → IN clause.

| Listings with coords | Risk |
|---|---|
| ~0 in Moscow snapshot | **0 ms extra** |
| 14k with coords | **Critical** — must move to SQL catalog path |

`meta.visibleExact: true` when count query runs on ID set.

---

## Cursor scalability

Keyset `(name, id) > cursor` — **O(log n)** with index on `(name, id)`.

Live: 10+10 rows, zero overlap — stable.

---

## Client request storm

Unchanged from Iter 8–14:

- 450 ms bbox debounce
- Epsilon drift threshold
- Prototype only in shadow path

Count meta does not increase client fetch frequency.

---

## Production gating

| Concern | Status |
|---|---|
| Payload explosion | ✓ 47 KB vs 900 KB |
| COUNT on every pan | Acceptable ~200 ms — cache candidate (doc 07) |
| 500 cap | visible may exceed returned when hasMore |

---

## Reproduce

```bash
curl -s -o /dev/null -w "time:%{time_total}s size:%{size_download}\n" \
  "http://localhost:3000/api/v1/_prototype/blocks/viewport?region_id=1&sw_lat=55.6&sw_lng=37.4&ne_lat=55.9&ne_lng=37.9&require_active_listings=true&limit=500"

curl -s "…/viewport/contract-check" | jq '.checks[] | select(.ok|not)'
```

---

## Conclusion

Iter 15 meta fields add **acceptable latency** (~212 ms measured) while **reducing payload 19×** vs legacy. Listings ID-scan path remains the **scale blocker** for large coord-complete datasets.
