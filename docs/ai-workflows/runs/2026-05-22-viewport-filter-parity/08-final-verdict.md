# Iteration 10.8 — Final Verdict

## Verdict

### **FILTER PARITY ACHIEVED (prototype) — READY FOR LIMITED EXPERIMENT**

Iteration 10 closes the Iter 9 blocker: viewport prototype now uses **shared catalog filter composition** with **geo ∩ bbox AND logic**.

**Production map rendering unchanged.** Shadow-only path preserved.

---

## What was delivered

### Backend

| Item | Status |
|---|---|
| `buildCatalogBlockWhere` in viewport blocks | ✓ |
| `buildCatalogListingWhere` in viewport listings | ✓ |
| Extended `catalog-block-where-sql.ts` | ✓ |
| `viewport-bbox-sql.ts` shared envelopes | ✓ |
| Full catalog DTOs on prototype endpoints | ✓ |
| `@Public()` prototype controller | ✓ |
| Contract-check live validation | ✓ all probes pass |

### Frontend (shadow only)

| Item | Status |
|---|---|
| Truthful shadow warnings (missing-based) | ✓ |
| Cap artifact messaging | ✓ |
| No false «ignores filters» warnings | ✓ |

### Documentation

Eight files in `docs/ai-workflows/runs/2026-05-22-viewport-filter-parity/`

---

## Measured parity summary

| Scenario | Missing IDs | Filter correct? |
|---|---|---|
| Geo 5 km | 0 | **Yes** — 100% parity |
| District | 0 | **Yes** — 100% parity |
| Price 5–15M | 0 | **Yes** — 100% parity |
| Rooms=2 | 0 | **Yes** (43 cap extras) |
| No filters | 0 | **Yes** (80 cap extras) |

**Iter 9 geo failure (33 vs 100+ extras): RESOLVED.**

---

## Honest limitations

| Limitation | Impact |
|---|---|
| 200-row legacy cap | Parity % below 90% without filters despite correct filters |
| Listings lat/lng sparse | Listings viewport returns 0 in Moscow bbox test |
| Builder filter | Not validated (builder names sparse in snapshot) |
| Search with Meilisearch | Architecture shared; limited live test data |
| Viewport not rendered | Still shadow/metrics only |

---

## Readiness score (updated from Iter 9)

| Category | Iter 9 | Iter 10 |
|---|---|---|
| Filter parity | NOT READY | **READY** (missing=0 on tested filters) |
| Geo ∩ bbox | NOT READY | **READY** (100% measured) |
| Shadow infrastructure | PARTIAL | **READY** |
| Production viewport render | NOT READY | **NOT READY** (by design) |
| Staged rollout | NOT READY | **NOT READY** |

### Overall: **READY FOR LIMITED EXPERIMENT**

Allowed next steps:

- DEV shadow render trial (optional second cluster, opacity 0)
- Staging internal QA with `viewport_debug=1`
- Iter 11: address 200-cap parity metric separately (sidebar decoupling)

**NOT allowed yet:**

- Production default viewport rendering
- Removing legacy map source

---

## Verification checklist

| Check | Status |
|---|---|
| Apartments mode shadow | ✓ |
| Geo radius | ✓ 100% |
| District filter | ✓ 100% |
| Price filter | ✓ 100% |
| Legacy render unchanged | ✓ |
| Fallback modes | ✓ |
| Contract probes | ✓ |
| SQL crashes | ✓ none |
| Production regressions | ✓ none |

---

## Conclusion

Iteration 10 achieves **honest viewport filter parity** using shared where builders. The prototype is no longer «bbox-only» — it matches legacy catalog semantics including geo.

The remaining gap is **operational** (200-cap shadow metric, listings coords), not **filter correctness** on tested apartments/blocks paths.

**Do not switch production map to viewport.** Proceed to limited DEV/staging experiment with measured confidence.
