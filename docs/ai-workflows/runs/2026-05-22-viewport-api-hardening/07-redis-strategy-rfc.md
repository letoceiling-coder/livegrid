# Iteration 15.7 — Redis Strategy RFC

## Scope

Architecture recommendation only — **NOT implemented in Iter 15**.

---

## Current caching (legacy catalog)

| Path | Cache |
|---|---|
| `GET /blocks` | Redis `api:catalog:blocks:*` TTL **45 s** |
| Viewport prototype | **None** |
| Geo block IDs | Cached inside geo resolution (query-keyed) |

---

## Is viewport cacheable?

**Yes, with strict key design** — but defer until staging load test.

| Factor | Assessment |
|---|---|
| Bbox drift on pan | High key cardinality |
| Filter changes | Must bust cache |
| Geo filters | Compound key complexity |
| Prototype status | Shadow traffic only — low ROI now |

---

## Proposed cache key (future)

```
vp:blocks:{region_id}:{filterHash}:{bboxBucket}:{cursor}:{limit}
```

### Bbox bucketing

Round corners to **3 decimal degrees** (~111 m) to improve hit rate:

```
sw_lat=55.6123 → 55.612
```

Align with client `bboxSignature` (4 decimals) — choose **consistent bucket** server-side.

### Zoom buckets (optional)

Include `floor(zoom)` in key when limit strategy becomes zoom-aware.

---

## TTL recommendation

| Layer | TTL | Rationale |
|---|---|---|
| Viewport markers | **15–30 s** | Shorter than catalog 45 s — spatial freshness |
| COUNT only | **30 s** | Cheaper to recompute |
| Geo ID sets | Existing | Reuse |

---

## Invalidation complexity

| Event | Invalidation |
|---|---|
| Filter param change | New key — automatic |
| Pan 100 m | New bucket — automatic |
| Listing publish | **Hard** — region-wide bust or short TTL |
| Feed import | Flush region viewport prefix |

**Verdict:** Prefer **short TTL** over active invalidation for v1.

---

## Geo filter interaction

Geo pre-filter IDs cached separately today.

Viewport cache key must include:

```
hash(geo_lat, geo_lng, geo_radius_m, geo_polygon, geo_preset)
```

Or hash full filter string — simpler:

```
filterHash = sha256(sortedQueryParams excluding bbox)
```

---

## COUNT query caching

`meta.total` + `meta.visible` expensive on large bbox.

Option: cache counts separately from marker payload:

```
vp:count:blocks:{region}:{filterHash}:{bboxBucket} → { total, visible }
```

Marker fetch can skip COUNT on cache hit — **stale counts acceptable for 15 s** in map UI.

---

## When NOT to cache

| Case | Reason |
|---|---|
| `cursor` pages 2+ | Low repeat probability |
| `limit` experimentation | DEV only |
| Listings id-fallback | Fix path before caching broken queries |

---

## Redis memory estimate

Moscow bbox ~47 KB JSON × N buckets:

| Active buckets (staging) | Memory |
|---|---|
| 10 concurrent users × 5 buckets | ~2.3 MB |
| 100 users | ~23 MB |

Acceptable.

---

## Recommendation

| Phase | Action |
|---|---|
| **Now (Iter 15)** | No Redis — prototype shadow only |
| **Pre-staging rollout** | Add viewport cache with 20 s TTL + bbox bucket |
| **Post-launch** | COUNT/marker split cache; monitor hit rate |

**Do not** cache before listings SQL path fixed.

---

## Conclusion

Viewport responses are **cacheable but not yet worth implementing**. Short-TTL bbox-bucketed Redis is the recommended v1 strategy when shadow traffic becomes production traffic.
