# Iteration 15.8 — Final Recommendation

## Verdict

### **VIEWPORT API CONTRACT HARDENED — NO ROLLOUT APPROVAL**

Iteration 15 stabilizes the `_prototype` viewport response contract with measured meta semantics, keyset pagination, and extended contract-check probes.

**Production map rendering, sidebar source, and legacy APIs remain unchanged.**

---

## Deliverables

### Backend code

| Item | Status |
|---|---|
| `viewport-contract.types.ts` | ✓ |
| `viewport-contract.utils.ts` | ✓ |
| Extended `meta` on blocks/listings viewport | ✓ |
| Parallel COUNT queries (`total`, `visible`) | ✓ |
| Keyset `cursor` pagination | ✓ |
| `sort=name_desc` support | ✓ |
| Invalid bbox full meta shape | ✓ |
| Contract-check meta + cursor probes | ✓ **8/8 pass** |
| `pnpm --filter api exec tsc --noEmit` | ✓ |

### Documentation

Eight files in `docs/ai-workflows/runs/2026-05-22-viewport-api-hardening/`

### Frontend

**No changes** — shadow hook compatible (`data.data` unchanged)

---

## Measured evidence (live)

| Metric | Value |
|---|---|
| total / visible / returned | **359 / 181 / 181** |
| Geo 5 km | **33 / 33 / 33** |
| Payload vs legacy | **47 KB vs 900 KB** |
| Latency | **212 ms** (incl. counts) |
| Cursor overlap | **0** |
| Contract-check | **8/8 OK** |

---

## Canonical response contract

```typescript
{
  data: ViewportBlockMarkerDto[],
  meta: {
    prototype: true,
    total: number,       // catalog filters, no bbox
    visible: number,     // catalog ∩ bbox
    returned: number,
    hasMore: boolean,
    cursor: string | null,
    bbox: { sw_lat, sw_lng, ne_lat, ne_lng },
    zoom: number | null,
    density: number,
    catalogParity: 'shared-where' | 'id-fallback',
    filtersApplied: boolean,
    sortApplied: string,
    geoComposition: 'catalog_and_bbox',
    visibleExact: boolean,
    reason?: 'invalid_bbox',
  }
}
```

---

## Honest blockers (remaining)

| # | Blocker | Blocks rollout? |
|---|---|---|
| 1 | Listings coords sparse | Listings viewport blocked |
| 2 | Listings id-fallback at scale | High risk at 14k |
| 3 | `sort=price_*` unsupported | UX mismatch if sort used |
| 4 | No Redis (prototype) | Acceptable for shadow |
| 5 | Frontend still legacy render | By design |
| 6 | Hybrid sidebar not built | Iter 12+ RFC |

---

## Explicit non-approvals

| Action | Status |
|---|---|
| Enable viewport rendering | **NOT APPROVED** |
| Replace `/blocks` API | **NOT APPROVED** |
| Switch sidebar source | **NOT APPROVED** |
| Remove 200-cap | **NOT APPROVED** |
| Production `/blocks/viewport` route | **NOT APPROVED** |

---

## Readiness progression

| Iteration | Capability |
|---|---|
| Iter 10 | Filter SQL parity |
| Iter 13–14 | Sidebar perf + observability |
| **Iter 15** | **API contract + meta + cursor** |
| Iter 16+ | Hybrid sidebar tab, sort parity, listings SQL |

---

## Next steps (optional)

1. Wire shadow hook to log `meta.visible` / `meta.total` in DEV overlay (optional)
2. Listings catalog SQL translator + coord backfill
3. `sort=price_*` viewport support
4. Redis cache when staging load justifies
5. Hybrid sidebar «В области» tab (Iter 12 phase 15)

---

## Conclusion

The viewport prototype now exposes **production-grade response semantics** with **measured performance** and **honest unsupported cases documented**. Safe for continued shadow validation and hybrid sidebar RFC implementation — **not** for production viewport rollout.

**Overall: CONTRACT READY FOR STAGING EXPERIMENTS — ROLLOUT NOT APPROVED**
