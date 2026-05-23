# Iteration 10.6 — Contract Check Results (Live)

## Endpoint

```
GET /api/v1/_prototype/viewport/contract-check
```

**Requires:** API rebuilt with Iter 10 · `@Public()` on prototype controller

**Run date:** 2026-05-22

---

## Results (all probes passed)

```json
{
  "prototype": true,
  "checks": [
    { "name": "invalid_bbox_controller_guard", "ok": true, "detail": "count=0" },
    { "name": "empty_world_bbox", "ok": true, "detail": "count=0" },
    { "name": "moscow_bbox_blocks_no_extra_filters", "ok": true, "detail": "count=181" },
    { "name": "geo_radius_5km_blocks", "ok": true, "detail": "count=33" },
    { "name": "high_zoom_tiny_bbox", "ok": true, "detail": "count=0" },
    { "name": "listings_moscow_bbox", "ok": true, "detail": "count=0" },
    { "name": "wrong_region_empty", "ok": true, "detail": "count=0" }
  ]
}
```

---

## Probe semantics

| Probe | Validates |
|---|---|
| invalid_bbox_controller_guard | Controller returns empty, no throw |
| empty_world_bbox | SQL handles off-region envelope |
| moscow_bbox_blocks | Shared where + bbox returns data |
| geo_radius_5km_blocks | Geo ∩ bbox = 33 (matches legacy) |
| high_zoom_tiny_bbox | Small envelope, no crash |
| listings_moscow_bbox | Listings path executes (0 = sparse coords) |
| wrong_region_empty | region_id=999999 → empty |

---

## Invalid bbox (controller)

```
sw_lat >= ne_lat OR sw_lng >= ne_lng
→ { data: [], meta: { reason: 'invalid_bbox' } }
```

No SQL executed. No 500 errors.

---

## Fixes applied for live run

1. `@Public()` on `ViewportPrototypeController` (was 401 Unauthorized)
2. API restart with `nest build` + `node dist/main.js`

---

## Verdict

All contract probes **pass**. No SQL crashes. Empty sets handled safely.
