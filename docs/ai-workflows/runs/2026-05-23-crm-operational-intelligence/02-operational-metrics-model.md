# Iter 35 — Operational Metrics Domain Model

## Design Principle

**Derived aggregates at read time** — no denormalized BI warehouse, no materialized views, no nightly ETL.

Single service: `CrmAnalyticsService` (`apps/api/src/modules/requests/crm-analytics.service.ts`)  
Endpoint: `GET /admin/ops/analytics?days=14`

---

## Metric Definitions

### Inflow

| Metric | Definition | Source |
|---|---|---|
| `inflow.byDay[]` | Count of requests where `createdAt` falls on calendar day | `requests` |
| `inflow.thisWeek` | Sum of last 7 days in window | Derived |
| `inflow.prevWeek` | Sum of prior days in window | Derived |
| `inflow.deltaPct` | `(thisWeek - prevWeek) / prevWeek × 100` | Derived |

### SLA snapshot

| Metric | Definition | Source |
|---|---|---|
| `sla.openCount` | Open pipeline rows scanned | `status IN OPEN_STATUSES`, cap 2000 |
| `sla.overdue` | Rows where `computeSlaState → OVERDUE` | Derived |
| `sla.stale` | Rows where `computeSlaState → STALE` | Derived |
| `sla.avgInactivityHours` | Mean inactive ms / open count | Derived |
| `sla.unassignedPressurePct` | Open without `assignedTo` / open × 100 | Derived |
| `sla.scannedCap` | `openCount >= MAX_OPEN_SCAN` | Governance flag |

### Latency

| Metric | Definition | Source |
|---|---|---|
| `latency.assignmentLatencyMinutes` | Median minutes from first CREATED to first ASSIGNED per request | `request_events` |
| `latency.firstContactLatencyMinutes` | Median minutes from CREATED to CONTACTED | `request_events` |
| `latency.sampleSize` | Distinct request IDs in latency window | Derived |

### Manager KPIs

| Metric | Definition | Source |
|---|---|---|
| `managers[].assigned` | Open requests with `assignedTo = manager` | Open scan |
| `managers[].overdue` | Subset in OVERDUE SLA state | Derived |
| `managers[].overduePct` | `overdue / assigned × 100` | Derived |
| `managers[].completedInPeriod` | Terminal status + `updatedAt >= window start` | `groupBy assignedTo` |

Sorted by `overduePct DESC`, then `assigned DESC`. Top 15 returned, UI shows 8.

### Health

| Metric | Definition | Source |
|---|---|---|
| `health.reopenCount` | STATUS_CHANGED where `fromStatus IN (CLOSED, CANCELLED)` | Events in window |
| `health.queuePressure` | `overdue + stale` | Derived |
| `health.conversionToSuccess` | Current count of SUCCESS status | `groupBy status` |
| `health.bottlenecks[]` | Top 3 pipeline stages by count + avg inactivity | Derived |
| `health.hotspot` | Rule engine (see below) | Derived |

### Hotspot rules

```
overdue > 5           → overdue_elevated
unassignedPct > 30    → unassigned_pressure
inflowDeltaPct > 25   → inflow_spike
else                  → stable
```

---

## Constants & Governance

| Constant | Value | Purpose |
|---|---|---|
| `CACHE_MS` | 60,000 | In-memory cache per API instance |
| `MAX_OPEN_SCAN` | 2,000 | Bound SLA scan cost |
| `MAX_LATENCY_SAMPLE` | 150 | Bound event join work |
| `MAX_DAYS` | 30 | Query param clamp |
| Min days | 7 | Query param clamp |
| Created rows take | 5,000 | Inflow bucket cap |
| Outcome events take | 3,000 | Outcome bucket cap |

---

## Response Shape

TypeScript mirror: `apps/web/src/admin/lib/crm-analytics.ts` → `CrmAnalyticsResponse`

Metadata fields:
- `refreshedAt` — ISO timestamp
- `periodDays` — effective window
- `cached` — served from memory cache
- `computeMs` — server-side compute duration (DEV visibility)
- `limits` — `{ maxOpenScan, cacheMs }`

---

## What We Explicitly Do NOT Store

- Daily SLA snapshots
- Manager scorecards
- Funnel cohort tables
- Precomputed conversion rates in DB

Future evolution: optional nightly BullMQ job writing to a `crm_analytics_snapshots` table — not implemented in Iter 35.
