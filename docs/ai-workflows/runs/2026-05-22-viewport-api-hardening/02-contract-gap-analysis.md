# Iteration 15.2 — Contract Gap Analysis

## Iter 15 closure matrix

| Requirement | Pre-15 | Post-15 | Notes |
|---|---|---|---|
| `meta.total` | ✗ | ✓ | Catalog filters, no bbox |
| `meta.visible` | ✗ | ✓ | bbox ∩ filters |
| `meta.returned` | partial (`count`) | ✓ | Renamed semantically |
| `meta.hasMore` | ✗ | ✓ | `visible > returned` |
| `meta.cursor` | ✗ | ✓ | Keyset slug/id |
| `meta.bbox` | ✗ | ✓ | Echo corners |
| `meta.zoom` | ✗ | ✓ | Optional echo |
| `meta.density` | ✗ | ✓ | visible / deg² |
| `meta.sortApplied` | ✗ | ✓ | Actual SQL sort |
| `meta.geoComposition` | ✗ | ✓ | `catalog_and_bbox` |
| `meta.visibleExact` | ✗ | ✓ | Listings honesty flag |
| Invalid bbox meta | partial | ✓ | Full shape + `reason` |
| Cursor query param | ✗ | ✓ | `?cursor=` |
| Contract-check meta validation | ✗ | ✓ | 8/8 probes |

---

## Remaining gaps (honest)

| Gap | Severity | Target phase |
|---|---|---|
| `sort=price_*` unsupported in viewport | Medium | Iter 16+ |
| Listings SQL path (id-fallback) | **High** at 14k scale | Listings coords + SQL |
| `meta.catalogParity` not in user spec | Low | Documented |
| Separate `HEAD` count endpoint | Low | Optional optimization |
| Redis cache | Not implemented | RFC only (doc 07) |
| Production route `/blocks/viewport` | Not created | Post-staging |
| Zoom-based density buckets | Not implemented | Pagination RFC |

---

## Semantic definitions (canonical)

| Field | Definition | Evidence |
|---|---|---|
| **total** | Rows matching catalog filters + region (no bbox) | COUNT without bboxSql |
| **visible** | Rows matching catalog filters **AND** bbox | COUNT with bboxSql |
| **returned** | `data.length` after LIMIT | Always ≤ visible |
| **hasMore** | `visible > returned` | Validated in contract-check |
| **cursor** | Last row key for keyset next page | slug (blocks), id (listings) |
| **density** | `visible / ((ne_lat-sw_lat)×(ne_lng-sw_lng))` | Measured 1206.7 Moscow |

**Invariant:** `total ≥ visible ≥ returned`

Validated live: `359 ≥ 181 ≥ 181` ✓

---

## Invalid bbox

Controller returns HTTP 200:

```json
{
  "data": [],
  "meta": {
    "prototype": true,
    "reason": "invalid_bbox",
    "total": 0,
    "visible": 0,
    "returned": 0,
    "hasMore": false,
    "cursor": null,
    ...
  }
}
```

Does not throw — safe for shadow fallback.

---

## Backward compatibility

| Consumer | Impact |
|---|---|
| Shadow hook (`data.data`) | **None** |
| Old meta `count` | **Removed** — use `returned` |
| Contract-check scripts | Updated expectations |

---

## Conclusion

Iter 15 closes **all specified meta fields** for blocks path. Listings path has meta shape but **id-fallback scalability** remains the primary open gap.
