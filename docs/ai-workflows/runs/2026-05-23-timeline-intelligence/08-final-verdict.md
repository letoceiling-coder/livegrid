# Iter 36 — Final Verdict

## Question

> Can LiveGrid turn the CRM event timeline into operational behavior intelligence without AI or heavy BI?

## Answer

# GO_WITH_HOLD

**Risk:** **LOW** — derived rules on bounded event sample; hold on manager role scoping + TG event granularity

---

## Delivered

| Phase | Status |
|---|---|
| 1 — Timeline audit | ✓ |
| 2 — Behavior metrics model | ✓ |
| 3 — Manager performance layer | ✓ |
| 4 — Lead aging intelligence | ✓ |
| 5 — Timeline quality signals | ✓ |
| 6 — Ops Center integration | ✓ |
| 7 — Request detail hints | ✓ |
| 8 — Mobile + density UX | ✓ |
| 9 — DEV observability | ✓ |
| 10 — AI readiness audit | ✓ doc only |

---

## Code Deliverables

| Area | Path |
|---|---|
| Shared logic | `packages/shared/src/crm/timeline-intelligence.ts` |
| Analytics integration | `apps/api/src/modules/requests/crm-analytics.service.ts` |
| Detail hints | `apps/api/src/modules/requests/requests.service.ts` |
| Analytics UI | `apps/web/src/admin/components/CrmAnalyticsPanel.tsx` |
| Detail UI | `apps/web/src/admin/pages/AdminRequestDetail.tsx` |
| Types | `apps/web/src/admin/lib/crm-analytics.ts` |
| Observability | `apps/web/src/admin/lib/crm-observability.ts` |

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @lg/shared build` | ✓ PASS |
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |

---

## Hold Items

1. **Manager role scoping** — all managers see team discipline table
2. **TG claim** — no dedicated event type; inferred from ASSIGNED note
3. **Sample bias** — timeline sample may miss oldest open leads for event-heavy checks
4. **Historical behavior trends** — no daily behavior snapshots

---

## Manual QA

- [ ] Timeline hints match lead state on detail page
- [ ] Reopen indicators on multi-reopen leads
- [ ] Aging hotspots visible in Ops Center
- [ ] Manager metrics consistent with assigned queue
- [ ] No heavy lag on analytics panel mount
- [ ] 360px readability
- [ ] reduced-motion — static pills/charts OK
- [ ] No analytics storm (still 2× poll)
- [ ] Role restrictions on `/admin/ops`

---

## Phase 10 — AI Readiness (Document Only)

### What now exists ✓

| Asset | Future use |
|---|---|
| Structured event timelines | Sequence features |
| Behavior metrics | Baseline benchmarks |
| Aging signals | Anomaly thresholds |
| Reopen intelligence | Outcome quality labels |
| Manager discipline metrics | Coaching features |
| Per-lead hint codes | Labeled training examples |
| GREEN/YELLOW/RED taxonomy | Weak supervision |

### Still missing ✗

| Capability | Notes |
|---|---|
| Outcome labeling | Events exist, no export |
| Feature export pipeline | No warehouse |
| Anomaly learning | Static rules only |
| Recommendation engine | No next-action model |
| Predictive SLA breach | Reactive SLA only |
| Semantic note analysis | Notes are plain text |

### Path to operational copilots

1. Export `request_events` + hints to parquet/warehouse
2. Nightly behavior snapshots (extend Iter 35 snapshot idea)
3. Per-manager latency breakdown in API
4. Statistical anomaly on inactivity gaps
5. Hint → action suggestions (rules, not LLM)
6. Optional isolated LLM timeline summary service

**Do not embed LLM in CRM core until export + labeling exist.**

---

## Verdict

**GO_WITH_HOLD** — CRM upgraded from operational intelligence dashboard to **timeline-aware operational management** with behavior metrics, manager discipline, aging hotspots, and per-lead hints. No AI, no BI warehouse, no map/geo/viewport/polling changes.

Ship after manual QA. Address manager scoping and TG event type if team feedback requires it.
