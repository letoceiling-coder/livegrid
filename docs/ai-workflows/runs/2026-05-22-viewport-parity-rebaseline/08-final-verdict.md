# Iteration 24.8 — Final Verdict

## Mode

VIEWPORT VALIDATION · parity re-baseline complete · 2026-05-22

---

## Verdict

**GO_WITH_HOLD** — Viewport listings API is behaviorally compatible with legacy catalog semantics post-materialization. Frontend activation remains **HOLD** until 200-row cap is addressed.

---

## Key measurements (Moscow wide, no filters)

| Metric | Legacy | Viewport |
|---|---:|---:|
| geoTotal / total | **14,888** | **14,888** |
| visible in bbox | **6,533** | **6,533** |
| ID overlap | 6,533/6,533 | **100%** |
| Query latency | 1,526 ms | **214 ms** |
| Legacy cap in bbox | 125 | — |

---

## Before/after Iter 23

| Metric | Iter 23 pre | Iter 24 post |
|---|---:|---:|
| Viewport operational | No (total=0) | **Yes** |
| Count parity measurable | N/A | **16/16 pass** |
| Shadow parity meaningful | No | **100% (full set)** |
| Frontend enabled | No | **No** (correct) |

---

## Delivered

| Area | Status |
|---|---|
| `ViewportListingsParityService` | ✓ |
| 16-scenario rebaseline report | ✓ |
| DEV endpoint + CLI | ✓ |
| Contract-check probe update | ✓ |
| Documentation (01–08) | ✓ |

---

## Verification proof

| Check | Result |
|---|---|
| api tsc | ✓ |
| web tsc | ✓ |
| Geo + parity tests | ✓ 45/45 |
| allTotalMatch | **16/16** |
| allVisibleMatch | **16/16** |
| moscow_wide parityPct | **100%** |
| fallbackCoords removed | **No** (correct) |
| Frontend viewport switch | **No** (correct) |

---

## Explicit non-deliverables (correct)

- No viewport frontend enablement
- No legacy API replacement
- No cluster rewrite
- No fallbackCoords removal
- No production deploy

---

## Production readiness statement

The viewport listings **API path** is production-ready for MSK after geo materialization. Filter semantics, geo bbox intersection, and count metadata match legacy catalog exactly.

The **frontend map layer** is not ready — the 200-row legacy fetch creates a false shadow parity gap. Stage 1 enablement should use viewport as the map data source while keeping catalog for sidebar.

---

## Recommended next step

**Iteration 25** — DEV frontend Stage 1: enable experimental viewport as map source + Belgorod EXACT materialization (56 rows).

---

## Final statement

Iteration 24 proves that post-materialization viewport listings are **semantically identical** to legacy catalog for all measured scenarios — with **7× better query latency** and **6,533 markers** now available in the Moscow bbox. The path to frontend activation is clear; the gate is UX integration, not API correctness.
