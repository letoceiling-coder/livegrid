# Iter 35 — Funnel Intelligence

## Scope

Real CRM funnel visibility from **current status distribution** — not cohort-based conversion analytics.

---

## Funnel Stages

| Order | Status | Label (RU) |
|---|---|---|
| 1 | `NEW` | Новые |
| 2 | `IN_PROGRESS` | В работе |
| 3 | `CONTACTED` | Связались |
| 4 | `VIEWING_SCHEDULED` | Просмотр |
| 5 | `NEGOTIATION` | Переговоры |
| 6 | `SUCCESS` | Успех |
| 7 | `CLOSED` | Закрыты |
| 8 | `SPAM` | Спам |

Legacy `COMPLETED` / `CANCELLED` excluded from funnel order but counted in terminal completions for manager KPIs.

---

## Derived Fields Per Stage

```typescript
{
  stage: RequestStatus;
  count: number;                    // groupBy status, all time
  dropoffPct: number | null;        // vs previous stage in funnel order
  shareOfPipelinePct: number | null // share of stages 1–5 only
}
```

### Dropoff formula

```
dropoffPct = round((1 - count[i] / count[i-1]) × 100)
```

First stage has `dropoffPct: null`. Zero previous count → null.

### Pipeline share

Only stages 1–5 (open pipeline). Terminal stages show count only.

---

## UI Surface

`CrmAnalyticsPanel` — horizontal bar per stage, count + share %, bottleneck callout from `health.bottlenecks[0]`.

Mobile: single column, bars scale to container width at 360px+.

---

## Limitations (Documented)

| Limitation | Impact | Mitigation |
|---|---|---|
| Snapshot not cohort | Dropoff is cross-sectional, not "of leads that entered NEW" | Accept for v1; event replay is future work |
| No time-in-stage | Cannot show aging per stage in funnel view | `aging[]` array provides avg inactivity by status separately |
| No revenue | No deal value in schema | By design — no fake metrics |
| SPAM/CLOSED mixed outcomes | Both terminal, different semantics | Shown separately; outcomes chart uses SUCCESS/CLOSED/COMPLETED events |

---

## Outcome Trend (Companion)

`outcomes.byDay` — daily count of `STATUS_CHANGED` → `SUCCESS | CLOSED | COMPLETED` in window.

Serves as **recovery proxy** (`slaTrend.recoveryProxy`) — closures per period, not true SLA recovery rate.

---

## Manual QA Checklist

- [ ] Funnel counts match admin requests filter totals per status
- [ ] Pipeline share sums to ~100% across stages 1–5
- [ ] Bottleneck label matches highest-count pipeline stage
- [ ] Empty pipeline shows zeros, no divide-by-zero errors
- [ ] Labels render correctly on 360px viewport
