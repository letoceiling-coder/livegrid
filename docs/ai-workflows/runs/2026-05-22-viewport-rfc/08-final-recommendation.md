# Iteration 8.7 — Final Recommendation

## Verdict

**Proceed with viewport architecture as a phased, opt-in experiment — do NOT migrate production map in Iter 8.**

Iteration 8 delivers:

- Evidence-based audit of current map query architecture
- RFC for future `/blocks/viewport` and `/listings/viewport` endpoints
- Measured payload reduction analysis (96% JSON shrink on slim DTO)
- Bbox serialization with debounce and storm prevention
- DEV-only feature flag and isolated experimental hooks
- Backend prototype module under `/_prototype/` (not production)
- Extended observability for legacy vs viewport comparison
- Automatic fallback when prototype API unavailable

**Production behavior is unchanged.** Legacy `/blocks` + `/listings` at `per_page=200` remains the sole map data source.

---

## Evidence Summary

| Finding | Measurement |
|---|---|
| Blocks wire payload (200 rows) | 900 142 bytes |
| Listings wire payload (200 rows) | 370 342 bytes |
| Catalog totals vs loaded | 359 / 14 917 totals — only 200 loaded |
| Slim DTO JSON reduction | 96.2% blocks, 96.0% listings (same 200 rows) |
| Pan/zoom API calls (legacy) | 0 |
| Prototype API (pre-restart) | 404 → fallback verified |

---

## Architecture Recommendation

### Adopt (future production)

1. **Separate viewport routes** with slim DTO — not bbox params on existing catalog endpoints
2. **PostGIS bbox filter** via `ST_Within` + `ST_MakeEnvelope` — prototype SQL validated structurally
3. **Compose bbox ∩ catalog filters ∩ geo** before production rollout
4. **Client clustering unchanged** — Yandex Clusterer + Iter 7 selection optimizations
5. **Debounced bbox** — 450 ms, zoom ≥ 10, 4-decimal signature (implemented)

### Defer (post-RFC)

1. Viewport-driven marker rendering (dual-source flicker risk)
2. Sidebar pagination decoupled from map bbox
3. URL bbox sync
4. Removing 200 cap globally
5. Server-side clustering or WebSocket sync

---

## Iter 8 Deliverables Checklist

| Deliverable | Status |
|---|---|
| `01-current-architecture-audit.md` | ✓ |
| `02-viewport-rfc.md` | ✓ |
| `03-payload-analysis.md` | ✓ |
| `04-bbox-serialization.md` | ✓ |
| `05-experimental-hook.md` | ✓ |
| `06-render-comparison.md` | ✓ |
| `07-risk-analysis.md` | ✓ |
| `08-final-recommendation.md` | ✓ |
| `viewport-feature-flag.ts` | ✓ |
| `bbox-serialization.ts` | ✓ |
| `useMapBbox.ts` | ✓ |
| `useViewportBlocksExperimental.ts` | ✓ |
| `useViewportListingsExperimental.ts` | ✓ |
| `viewport-prototype` API module | ✓ |
| MapSearch / ListingsMapSearch wiring | ✓ (parallel, flag-gated) |
| MapDevOverlay viewport fields | ✓ |
| `tsc --noEmit` web + api | ✓ |

---

## Next Steps (Iteration 9+ — NOT Iter 8)

1. **Restart API** — register `_prototype` routes; measure live prototype payload and timing
2. **Add `listingPriceMin` + listing `photoUrl`** to prototype SQL
3. **Forward catalog filters** to prototype service (Prisma where + bbox raw SQL)
4. **DEV render shadow mode** — optional second cluster layer comparing counts (still not production default)
5. **Geo ∩ bbox integration tests** with known fixtures
6. **Production endpoint RFC review** — promote `_prototype` → `/blocks/viewport` after contract sign-off

---

## Verification Status

| Check | Result |
|---|---|
| Apartments mode legacy path | Unchanged — `blocksQuery` + MapSearch |
| Listings mode legacy path | Unchanged — `listingsQuery` + ListingsMapSearch |
| Geo filters | Legacy path only; prototype ignores filters (documented gap) |
| Region switching | `regionId` passed to experimental hooks |
| Zoom movement | Bbox updates debounced; legacy 0 API calls |
| Bbox throttling | 450 ms + epsilon + signature dedupe |
| Fallback on API fail | client-filter-fallback |
| Mobile map | No production change |
| Production regressions | None — DEV-only gates |
| Request storms | Mitigated by design; prod path unaffected |

---

## Honest Limitations

- Prototype endpoints not live until API restart — no live prototype wire measurements yet
- Experimental viewport data is **not rendered** on map — metrics comparison only
- Client-filter fallback cannot exceed 200-row legacy cap
- Slim DTO lacks subway field for block popup — detail fetch needed in production v2
- No fake scalability claims: viewport solves payload-per-view and completeness **when fully wired**, not automatically at current Iter 8 scope

---

## Conclusion

LiveGrid map architecture is stable. The 200-row cap and full-catalog payload are the documented scalability ceiling. Iter 8 provides a **rollback-safe, measured foundation** for viewport queries without destabilizing production.

**Recommendation to team:** Merge Iter 8 as RFC + isolated prototype. Schedule Iter 9 for prototype API validation and filter composition before any conversation about production viewport default.
