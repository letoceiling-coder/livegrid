# Iter 35 — Final Verdict

## Question

> Can LiveGrid CRM explain *why* queues grow and *where* leads stall — without BI complexity or destabilizing ops layers?

## Answer

# GO_WITH_HOLD

**Risk:** **LOW-MEDIUM** — read-only aggregates with caps; main hold is historical SLA trends and manager role scoping

---

## Delivered

| Phase | Status |
|---|---|
| 1 — Analytics audit | ✓ |
| 2 — Operational metrics model | ✓ |
| 3 — Funnel intelligence | ✓ |
| 4 — SLA trend analytics | ✓ (proxy trends) |
| 5 — Manager intelligence | ✓ |
| 6 — Ops health surface | ✓ |
| 7 — Mobile analytics UX | ✓ |
| 8 — DEV observability | ✓ |
| 9 — Performance + governance | ✓ |
| 10 — AI readiness audit | ✓ doc only |

---

## Code Deliverables

| Area | Path |
|---|---|
| Analytics service | `apps/api/src/modules/requests/crm-analytics.service.ts` |
| API endpoint | `GET /admin/ops/analytics?days=14` |
| Types + labels | `apps/web/src/admin/lib/crm-analytics.ts` |
| UI panel | `apps/web/src/admin/components/CrmAnalyticsPanel.tsx` |
| Ops Center wiring | `apps/web/src/admin/pages/AdminOpsCenter.tsx` |
| DEV metrics | `apps/web/src/admin/lib/crm-observability.ts` |

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |

---

## Hold Items

1. **Historical SLA trends** — snapshot table or nightly job not built; use inflow/outcome proxies
2. **Cohort funnel** — current-state counts only; event replay deferred
3. **Manager role scoping** — managers currently see all manager KPIs
4. **Migrations deploy** — Iter 31–33 migrations still pending on production
5. **Multi-instance cache** — in-memory only; Redis cache optional later

---

## Manual QA

- [ ] Funnel counts match status filters
- [ ] Overdue trend cards update after SLA state changes
- [ ] Manager metrics visible in analytics table
- [ ] Mobile readability at 360px
- [ ] Queue hotspot indicators (stable / overdue / unassigned / inflow)
- [ ] No heavy render lag on analytics mount
- [ ] No aggregate storm (analytics polls 2× slower than summary)
- [ ] Role restrictions — non-admin roles blocked from `/admin/ops`
- [ ] reduced-motion — charts usable without animation

---

## Phase 10 — AI Readiness Audit (Document Only)

### What exists ✓

| Asset | AI utility |
|---|---|
| Append-only `RequestEvent` timeline | Feature source for sequence models |
| Derived SLA states | Risk labels for escalation models |
| Attention routing + notifications | Action feedback loop |
| Workload + manager KPIs | Capacity planning features |
| Funnel + latency aggregates | Baseline benchmarks |
| Hotspot rule engine | Template for anomaly alerts |

### What is missing ✗

| Capability | Notes |
|---|---|
| Lead scoring | No score field or model |
| Recommendation engine | No next-action suggestions |
| Predictive escalation | Rules only, no ML |
| Manager coaching | No per-manager latency breakdown |
| Anomaly detection | Static thresholds, not statistical |
| Historical feature store | No SLA snapshots |
| Labeled outcome dataset | Events exist but not exported for training |

### Evolution path (recommended order)

1. Nightly `crm_analytics_snapshots` — unlock true SLA trends
2. Per-manager latency + reopen rate — coaching without AI
3. Export pipeline for events → data warehouse
4. Rule → statistical anomaly (z-score on inflow, overdue)
5. Lead scoring v0 — heuristic weights from latency + stage aging
6. LLM assist on timeline summarization (optional, isolated service)

**Do not implement AI in CRM core until snapshots + export exist.**

---

## Verdict

**GO_WITH_HOLD** — LiveGrid CRM upgraded from **operational coordination** to **operational intelligence** with derived funnel, SLA snapshot, manager KPIs, and queue health in Ops Center. Lightweight by design: no BI warehouse, no chart library dependency, no map/geo/viewport/realtime changes.

Ship after manual QA + migration deploy. Address historical SLA gap in Iter 36+ if trend accuracy becomes blocking.
