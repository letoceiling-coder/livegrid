# Iter 39 — Final Verdict

## Question

> Can LiveGrid explain HOW leads move through lifecycle stages without AI or enterprise BI?

## Answer

# GO_WITH_HOLD

**Risk:** **LOW** — bounded event derivation; hold on cross-cohort accuracy and skipped stages

---

## Delivered

| Phase | Status |
|---|---|
| 1 — Lifecycle audit | ✓ |
| 2 — Pipeline domain model | ✓ |
| 3 — Stage velocity | ✓ |
| 4 — Friction intelligence | ✓ |
| 5 — Success path | ✓ |
| 6 — Ops Center layer | ✓ |
| 7 — Detail lifecycle hints | ✓ |
| 8 — Snapshot integration | ✓ |
| 9 — Observability | ✓ |
| 10 — Forecast readiness | ✓ doc only |

---

## Code Deliverables

| Area | Path |
|---|---|
| Shared lifecycle | `packages/shared/src/crm/pipeline-lifecycle.ts` |
| Lifecycle service | `apps/api/src/modules/requests/crm-lifecycle.service.ts` |
| Snapshots | `PIPELINE_VELOCITY`, `LIFECYCLE_FRICTION` |
| Trends | `history.lifecycleTrends` |
| UI | `CrmAnalyticsPanel`, `AdminRequestDetail` |

---

## Hold Items

1. **Skipped stages** — NEW→CONTACTED may skip IN_PROGRESS; pairs computed only when both stages present
2. **Historical accuracy** — snapshots capture point-in-time velocity, not cohort replay
3. **Re-run snapshot** with `force=true` to populate new kinds on existing deployments

---

## Phase 10 — Forecast Readiness (Document Only)

### What exists ✓

- Lifecycle history snapshots
- Stage timing metrics
- Friction datasets
- Reopen lifecycle analytics
- Conversion velocity trends

### Still missing ✗

- Predictive conversion scoring
- Churn prediction
- Success probability
- Manager recommendation engine
- Pipeline forecasting
- Automated intervention

### Evolution path

1. 90d+ velocity snapshots
2. Export lifecycle transitions to parquet
3. Cohort-based stage survival curves (SQL, not ML)
4. Simple moving-average latency forecasts
5. Isolated forecast microservice

---

## Verdict

**GO_WITH_HOLD** — CRM upgraded to **pipeline lifecycle intelligence platform** with stage velocity, friction detection, success path visibility, and historical trends. No AI, no map/geo/viewport changes.

Regenerate snapshot after deploy: `POST /admin/ops/snapshots/generate?force=true`
