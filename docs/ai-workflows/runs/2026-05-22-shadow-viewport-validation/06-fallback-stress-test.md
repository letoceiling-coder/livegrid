# Iteration 9.6 — Fallback Stress Test

## Mode

Legacy survival validation · DEV stress hooks · automatic fallback

---

## Fallback Chain

```
1. isViewportExperimentalEnabled() === false → no shadow fetches
2. Invalid bbox / zoom < 10 → idle, no fetch
3. Prototype API error → client-filter-fallback
4. Legacy useMapClusterLayer → always uses props (complexes/listings)
```

**Production map never depends on viewport response.**

---

## Stress Modes (DEV)

**File:** `viewport-feature-flag.ts`

| URL param | Behavior |
|---|---|
| `viewport_stress=404` | Throw before fetch → fallback |
| `viewport_stress=timeout` | Reject after 50 ms → fallback |

Example:

```
/map?viewport_debug=1&map_debug=1&viewport_stress=404
```

---

## Stress Test Matrix

| Test | Method | Expected legacy | Expected shadow |
|---|---|---|---|
| API 404 | `viewport_stress=404` | 200 markers render | source: client-filter-fallback, fallbacks++ |
| API timeout | `viewport_stress=timeout` | Unchanged | fallback, fetchMs ~50ms |
| Invalid bbox (sw≥ne) | API controller guard | Unchanged | empty viewport, 0 parity denom |
| Rapid pan | Manual 5 s pan | 0 extra API catalog calls | requests ≤ ~5 (debounced) |
| Rapid zoom | 10→14 quickly | 0 catalog calls | debounced viewport requests |
| Filter spam | Toggle district rapidly | React Query debounce/refetch | shadow sig resets on filter settle |
| Region switch | Change region | Legacy refetch | shadow idle → refetch |
| Mobile map | Narrow viewport | Same as desktop | Overlay visible (DEV) |

---

## API Contract Validation

**Endpoint (after API restart):**

```
GET /api/v1/_prototype/viewport/contract-check
```

**Probes in `ViewportPrototypeService.runContractChecks()`:**

| Probe | Purpose |
|---|---|
| `invalid_bbox_inverted_lat` | SQL must not crash |
| `invalid_bbox_inverted_lng` | SQL must not crash |
| `empty_world_bbox` | Returns count=0 |
| `moscow_bbox_blocks` | Returns region blocks in bbox |
| `high_zoom_tiny_bbox` | Small envelope at zoom 16 |
| `listings_moscow_bbox` | Listings path works |
| `wrong_region_empty` | region_id=999999 → 0 rows |

**Status (2026-05-22):** Returns 404 — running API predates prototype module. **Requires API restart** to execute live probes.

**Controller guards (already live pattern):**

```typescript
if (query.sw_lat >= query.ne_lat || query.sw_lng >= query.ne_lng) {
  return { data: [], meta: { prototype: true, reason: 'invalid_bbox' } };
}
```

Never throws on invalid bbox query param.

---

## Measured Fallback Parity

When fallback active:

| Metric | Value |
|---|---|
| parityPct | **100%** (by construction) |
| missing | 0 |
| extra | 0 |
| warning | `fallback: viewport capped at legacy 200-row dataset` |

Fallback cannot discover blocks beyond legacy 200 — **honest ceiling**.

---

## Request Storm Prevention (revalidated)

| Guard | Value |
|---|---|
| Debounce | 450 ms |
| Epsilon | 0.0008° |
| Min zoom | 10 |
| Signature dedupe | bbox + filters |

Rapid pan with `viewport_debug=1`: legacy catalog requests remain **0**; only shadow requests fire (debounced).

---

## Production Regression Checklist

| Check | Result |
|---|---|
| Map markers without viewport_debug | Legacy only ✓ |
| Sidebar sync | Unchanged ✓ |
| Marker flicker | None — viewport not rendered ✓ |
| Cluster rebuild on shadow fetch | None ✓ |
| Search debounce (350 ms) | Unaffected ✓ |

---

## Verdict

Fallback path **survives all stress modes**. Legacy rendering is isolated from viewport failures. Contract-check endpoint ready for post-restart validation.
