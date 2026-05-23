# Iter 35 — Analytics Capability Audit

## Mode

OPERATIONAL INTELLIGENCE + SALES VISIBILITY — Phase 1 audit  
**Scope:** CRM analytics only — no BI warehouse, no AI, no map/geo/viewport

---

## Pre-Iter 35 Baseline

| Capability | State | Gap |
|---|---|---|
| Funnel visibility | ✗ None | Status counts only in raw list filters |
| SLA trend charts | ✗ None | Point-in-time SLA on list/detail only |
| Manager KPIs | ◐ Partial | Workload strip + ops summary cards |
| Queue health metrics | ◐ Partial | Ops Center queues, no trend |
| Conversion ratios | ✗ None | No dropoff / stage share |
| Latency metrics | ✗ None | Timeline exists but not aggregated |
| Inflow / outcome trends | ✗ None | No daily buckets |
| Operational alerts | ◐ Partial | Escalation counts, no hotspot labels |
| Analytics API | ✗ None | Only `/admin/ops/summary` |
| DEV observability | ◐ Partial | Polling metrics only |

---

## Data Source Inventory

### RequestEvent timeline (append-only)

| Event type | Analytics use |
|---|---|
| `CREATED` | Inflow proxy, assignment latency anchor |
| `ASSIGNED` | Assignment latency, manager history |
| `CONTACTED` | First-response latency |
| `STATUS_CHANGED` | Outcome buckets, reopen detection |
| `NOTE`, `TG_CLAIM`, etc. | Not scanned in aggregates (by design) |

### Request statuses

Pipeline: `NEW` → `IN_PROGRESS` → `CONTACTED` → `VIEWING_SCHEDULED` → `NEGOTIATION`  
Terminal: `SUCCESS`, `CLOSED`, `SPAM`, legacy `COMPLETED`, `CANCELLED`

### SLA derived states

- Computed at read time via `@lg/shared` `computeSlaState`
- Inputs: `status`, `lastActivityAt`, `createdAt`
- States: `OK`, `STALE`, `OVERDUE` — never persisted

### Manager assignment

- `requests.assigned_to` + `assignedUser` relation
- Open workload from live open rows
- Completions from terminal status + `updatedAt` in period

### Notification metrics

- `crm_notifications` unread count in ops summary
- Not included in analytics aggregates (coordination layer, not funnel)

### Current dashboard surfaces

| Surface | What it shows |
|---|---|
| `AdminDashboard` | Quick links, basic counts |
| `CrmWorkloadStrip` | Open / overdue / stale totals |
| `AdminOpsCenter` (Iter 34) | Queues, escalation, manager load cards |
| `AdminRequests` | Filterable list with SLA badges |

---

## Analytics Capability Matrix (Post-Iter 35)

| Requirement | Status | Implementation |
|---|---|---|
| Lead inflow/day | ✓ DONE | `createdAt` bucketed, 7–30d window |
| Overdue trend | ◐ PROXY | Snapshot + week-over-week inflow delta |
| Stale trend | ◐ PROXY | Current snapshot only |
| Assignment latency | ✓ DONE | Median CREATED→ASSIGNED from events |
| First-response latency | ✓ DONE | Median CREATED→CONTACTED |
| Manager load | ✓ DONE | Open assigned + overdue % + completions |
| Status conversion ratios | ✓ DONE | Funnel dropoff + pipeline share % |
| Reopen frequency | ✓ DONE | STATUS_CHANGED from CLOSED/CANCELLED |
| Unassigned pressure | ✓ DONE | % open without assignee |
| Queue health / hotspots | ✓ DONE | Rule-based hotspot label |
| Bottleneck detection | ✓ DONE | Top 3 stages by count + aging |
| Historical SLA warehouse | ✗ BY DESIGN | Documented gap |
| Revenue / fake BI metrics | ✗ BY DESIGN | Not implemented |
| External BI export | ✗ OUT OF SCOPE | — |
| AI recommendations | ✗ OUT OF SCOPE | Phase 10 doc only |

---

## Gaps Accepted (Honest)

1. **No day-over-day overdue history** — would require nightly SLA snapshots or event replay
2. **Funnel counts are current-state**, not cohort-through-time
3. **Latency sample capped** at 150 requests × 4 events
4. **Open scan capped** at 2,000 rows — large queues may undercount SLA totals
5. **Legacy statuses** (`COMPLETED`, `CANCELLED`) in terminal set but not in funnel UI order

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
