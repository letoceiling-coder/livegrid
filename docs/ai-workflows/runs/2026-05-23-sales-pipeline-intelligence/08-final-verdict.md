# Iter 38 — Final Verdict

## Question

> Can LiveGrid connect CRM operations to business causality without marketing-platform bloat?

## Answer

# GO_WITH_HOLD

**Risk:** **LOW** — derived URL classification + aggregates; hold on UTM gap and manager scoping edge cases

---

## Delivered

| Phase | Status |
|---|---|
| 1 — Attribution audit | ✓ |
| 2 — Domain model | ✓ |
| 3 — Request source intelligence | ✓ |
| 4 — Object intelligence | ✓ |
| 5 — Pipeline bottlenecks | ✓ |
| 6 — Ops Center business layer | ✓ |
| 7 — Request detail attribution | ✓ |
| 8 — Snapshot integration | ✓ |
| 9 — Observability + governance | ✓ |
| 10 — Recommendation readiness | ✓ doc only |

---

## Code Deliverables

| Area | Path |
|---|---|
| Shared attribution | `packages/shared/src/crm/request-attribution.ts` |
| Attribution service | `apps/api/src/modules/requests/crm-attribution.service.ts` |
| Snapshot kinds | `SOURCE_ATTRIBUTION`, `OBJECT_PRESSURE` |
| Trend extension | `crm-trend.service.ts` → `sourceTrends` |
| UI | `CrmAnalyticsPanel.tsx`, `AdminRequestDetail.tsx` |

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @lg/shared build` | ✓ PASS |
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |

---

## Hold Items

1. **No UTM storage** — pathname-only classification
2. **LeadForm `source` tag** in comment not parsed for classification
3. **Manager scope** — assigned leads only; not event-level actor attribution
4. **Snapshot backfill** — new kinds only on future generates (re-run force for history)

---

## Phase 10 — Recommendation Readiness (Document Only)

### What exists after Iter 38 ✓

| Asset | Future use |
|---|---|
| Attribution history snapshots | Channel trend models |
| Object pressure history | Capacity routing features |
| Source quality signals | Heuristic lead scoring |
| Bottleneck rules | Recommendation templates |
| Per-lead attribution hints | Labeled examples |

### Still missing ✗

| Capability | Notes |
|---|---|
| Lead scoring | Not implemented |
| Recommendation engine | Not implemented |
| Predictive attribution | Not implemented |
| Auto routing optimization | Not implemented |
| Dynamic SLA tuning | Not implemented |
| Conversion forecasting | Not implemented |

### Evolution path

1. Persist UTM params on request create (optional columns)
2. Parse LeadForm source tag into structured field
3. 90d attribution snapshots → export
4. Heuristic quality score per source (rules)
5. Suggest manager assignment by object pressure
6. Isolated recommendation service — not in CRM core

---

## Verdict

**GO_WITH_HOLD** — CRM upgraded from historical operational intelligence to **business-aware operational intelligence** with source attribution, object pressure, and pipeline bottleneck warnings. No AI, no external analytics, no map/geo/viewport changes.

Regenerate snapshot after deploy to populate `SOURCE_ATTRIBUTION` + `OBJECT_PRESSURE` kinds.
