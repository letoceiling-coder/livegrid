# Iteration 26.8 — Final Verdict

## Mode

FRONTEND STRESS + CLUSTER SCALING VALIDATION · 2026-05-22

---

## Verdict

**GO_WITH_HOLD** — Instrumentation and safe micro-optimizations delivered. Staging discussion remains **HOLD** until browser stress scenarios produce recorded numbers in the overlay.

---

## Delivered

| Item | Status |
|---|---|
| Stress metrics module | ✓ |
| Extended MapDevOverlay (26 fields) | ✓ |
| FPS tracker (rAF) | ✓ |
| Cluster rebuild avg/p95/max | ✓ |
| Network storm counters | ✓ |
| Stale viewport abort | ✓ |
| Unit tests (12/12 web) | ✓ |
| Documentation (01–08) | ✓ |

---

## Verification proof

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ |
| `pnpm --filter api exec tsc --noEmit` | ✓ |
| Web tests | ✓ 12/12 |

---

## Readiness matrix

| Area | Status | Notes |
|---|---|---|
| Cluster rebuild at 6533 | **HOLD** | Measure p95 via overlay |
| FPS pan/zoom/selection | **HOLD** | Measure via overlay |
| Memory / heap | **HOLD** | Chrome `performance.memory` |
| Network storm | **GO** | Dedupe + abort instrumented |
| Mobile density | **HOLD** | Manual 375×667 |
| Popup stability | **GO** (design) | Latency instrumented |
| Sidebar virtualization | **GO** | 200-row decoupled |
| Rollback | **GO** | Unchanged from Iter 25 |
| Production readiness | **BLOCKED** | DEV-only by design |

---

## DEV validation URL

```
/map?region_id=1&viewport_debug=1&viewport_listings=1&map_debug=1
```

Console: import and call `logStressSnapshot()` from devtools after each scenario.

---

## Stress scenario checklist

| Scenario | Procedure | Key metrics |
|---|---|---|
| A Moscow wide | Load MSK, wait 6533 markers | rebuild p95, heap |
| B Pan storm | 30s rapid pan | fps min pan, deduped, req/min |
| C Selection spam | 50 marker clicks | fps min sel, icon swaps |
| D Mobile | 375×667 emulate A+B | fps mins |
| E Filter spam | Rapid filter changes | stale dropped, sig churn |
| F Popup stress | 100 open/close | heap trend, popup ms |

---

## Threshold summary

| Metric | GREEN | YELLOW | RED |
|---|---:|---:|---:|
| Rebuild p95 (ms) | ≤500 | ≤2000 | >2000 |
| FPS | ≥50 | ≥30 | <30 |
| Popup latency (ms) | ≤16 | ≤50 | >50 |
| Bbox req/min | ≤20 | ≤60 | >60 |
| Heap (MB) | ≤150 | ≤350 | >350 |

---

## Explicit non-deliverables (correct)

- No production rollout
- No staging rollout
- No cluster architecture rewrite
- No server-side clustering
- No viewport sidebar rewrite
- No legacy API removal

---

## Next step

Run scenarios A–F in browser, paste overlay numbers into this run folder or Iter 27 brief. **Do not proceed to staging without measured p95 rebuild and FPS mins.**

---

## Overall

**GO_WITH_HOLD** — Framework for hard evidence is in place. The primary scalability unknown (6533-marker Yandex cluster rebuild) is instrumented but **not yet numerically validated** in browser.
