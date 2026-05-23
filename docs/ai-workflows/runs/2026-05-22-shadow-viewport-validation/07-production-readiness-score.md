# Iteration 9.7 — Production Readiness Score

## Mode

Honest assessment · evidence-based · no optimistic rollout approval

**Date:** 2026-05-22

---

## Scoring Rubric

| Score | Meaning |
|---|---|
| **NOT READY** | Critical gaps; shadow parity fails; unsafe to experiment beyond DEV |
| **PARTIALLY READY** | Infrastructure exists; known gaps documented; DEV validation only |
| **READY FOR LIMITED EXPERIMENT** | Filter/geo parity acceptable in staging; shadow render trial possible |
| **READY FOR STAGED ROLLOUT** | Production viewport default with fallback — **not claimed** |

---

## Category Scores

| Category | Score | Evidence |
|---|---|---|
| **Shadow infrastructure** | PARTIALLY READY | Parity math, overlay, hooks, filter wiring ✓ |
| **BBox serialization** | PARTIALLY READY | Debounce, dedupe, zoom floor ✓ |
| **Prototype API** | NOT READY | 404 on live server; filters not in SQL |
| **Filter parity** | NOT READY | Prototype ignores all catalog filters |
| **Geo + bbox** | NOT READY | Measured drift: 33 legacy vs ~101+ viewport in same bbox |
| **Payload reduction** | PARTIALLY READY | 96% slim DTO (Iter 8); not live on wire |
| **Fallback safety** | READY FOR LIMITED EXPERIMENT | Stress modes pass; legacy isolated |
| **Render path** | NOT READY | Viewport not validated as render source |
| **Sidebar sync** | NOT READY | No viewport sidebar strategy |
| **200-cap removal** | NOT READY | Explicitly out of scope |
| **Observability** | PARTIALLY READY | DEV overlay complete; no prod telemetry |
| **API contract** | PARTIALLY READY | contract-check written; not executed live |

---

## Measured Evidence Summary

| Measurement | Value |
|---|---|
| Legacy blocks wire | 900 KB / 200 rows |
| Legacy geo 5 km | 33 rows / 171 KB |
| Legacy in bbox (no geo) | 101 / 200 (50.5%) |
| Legacy in bbox (geo) | 33 / 33 (100%) |
| Simulated parity (filter drift) | 37.5% |
| Simulated parity (fallback) | 100% |
| Prototype API live | **No** (404) |
| Production behavior changed | **No** |

---

## Blockers (Must Fix Before Limited Experiment)

1. **Prototype filter composition** — apply same where-clause as `blocks.service.findAll`
2. **Geo ∩ bbox SQL** — integrate `GeoSpatialService` block IDs
3. **Live prototype validation** — restart API, run contract-check, measure real parity
4. **Listing geo/synthetic coords** — exclude or flag synthetic coords in shadow
5. **`listingPriceMin` in prototype** — currently null

---

## Non-Blockers (Acceptable for DEV Shadow)

- Viewport not rendered on map
- Sidebar uses legacy only
- 200 cap unchanged
- No URL bbox sync

---

## Overall Verdict

### **PARTIALLY READY**

Viewport architecture is **correctly instrumented for shadow validation** but **NOT correct for data parity** with filtered legacy queries.

| Ready for | Status |
|---|---|
| DEV shadow QA | **Yes** |
| Staging shadow render trial | **No** — filter/geo gaps |
| Production viewport default | **No** |
| Staged rollout | **No** |

---

## Readiness Progress (Iter 8 → 9)

| Iteration | Capability |
|---|---|
| Iter 8 | RFC, prototype, bbox, metrics |
| Iter 9 | ID-level parity, filter warnings, stress fallback, density metrics |

**Gap closed:** Visibility into mismatches  
**Gap remaining:** Mismatch **resolution** in prototype SQL

---

## What Would Change Score to LIMITED EXPERIMENT

1. Prototype returns matching ID set with **no filters** at parity ≥ 90%
2. Geo + bbox composition with parity ≥ 85% on 5 km test
3. District filter with parity ≥ 90%
4. contract-check all probes pass live
5. Optional: shadow **render** layer in DEV (second invisible cluster) — still not Iter 9

---

## What Would NOT Change Score

- Higher parity via fallback mode only
- Removing 200 cap without filter parity
- Production feature flag without staging proof
