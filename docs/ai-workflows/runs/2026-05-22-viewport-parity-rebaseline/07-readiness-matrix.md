# Iteration 24.7 — Readiness Matrix

## Mode

VIEWPORT VALIDATION · 2026-05-22

---

## Readiness matrix

| Area | Status | Evidence |
|---|---|---|
| Geo correctness | **GO** | 100% ID overlap, resolver 200/200 |
| Filter parity | **GO** | 16/16 totalDelta=0, visibleDelta=0 |
| Count parity | **GO** | geoTotal === viewport.total all scenarios |
| Cluster parity | **HOLD** | Not measured; same IDs expected |
| UX parity | **HOLD** | 200-row cap; frontend disabled |
| Mobile | **HOLD** | Not tested |
| Performance | **GO** | Viewport 7× faster moscow_wide |
| Rollback readiness | **GO** | Iter 23 proven 76k rollback |
| Production safety | **GO_WITH_RUNBOOK** | Staging validated; no prod deploy |

---

## Overall readiness score

**GO_WITH_HOLD** — API/viewport path production-ready for MSK; frontend activation blocked on cap removal and UX validation.

---

## Scenario pass rate

| Metric | Value |
|---|---:|
| Scenarios run | 16 |
| totalMatch | 16/16 |
| visibleMatch | 16/16 |
| ID overlap (non-empty bbox) | 100% |
| avgParityPct | 43.8%* |

*Average depressed by empty_world zero-ID scenarios (0/0). Meaningful bboxes: **100%**.

---

## GO / HOLD / BLOCKED summary

| Component | Verdict |
|---|---|
| Viewport API (listings) | **GO** |
| Shared catalog filters | **GO** |
| Geo materialization prerequisite | **GO** (complete) |
| Belgorod review | **GO** (complete) |
| Frontend viewport switch | **HOLD** |
| Production deploy | **BLOCKED** (this iteration) |
| Legacy API replacement | **BLOCKED** |

---

## Staged enablement proposal

### Stage 1 — DEV-only viewport listings
- Enable `VIEWPORT_EXPERIMENTAL=1` in DEV
- Map layer uses viewport API; sidebar stays catalog
- Monitor MapDevOverlay parity (expect 100% with full fetch)
- **Rollback trigger:** parity < 95% on full-set comparison

### Stage 2 — Internal/staging users
- Enable on staging with materialized DB
- QA pass on marker count, selection, popup
- **Rollback trigger:** user-reported missing markers

### Stage 3 — Feature flag %
- `viewport_listings_enabled` flag, 5% → 25% → 50%
- A/B monitor: load time, error rate, bounce
- **Rollback trigger:** error rate > 1% or latency p95 regression > 2×

### Stage 4 — Full rollout
- Remove experimental flag
- Deprecate client bbox filter on 200-row cap
- Keep fallbackCoords for non-MSK regions

---

## Rollback triggers (global)

1. parity < 98% on server-side rebaseline
2. Materialization rollback required (geo_source corruption)
3. Cluster rendering regression
4. Mobile breakage on target devices

---

## Next iteration recommendation

**Iter 25** — DEV frontend switch (Stage 1) with full-fetch legacy comparison + Belgorod EXACT materialization.
