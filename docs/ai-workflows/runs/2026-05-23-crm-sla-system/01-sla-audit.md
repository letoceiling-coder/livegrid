# Iter 32 — SLA Capability Audit

## Mode

POST-CONVERSION OPERATIONS — Phase 1 audit  
**Scope:** CRM activity + SLA only

---

## Pre-Iter 32 Baseline

| Capability | State | Gap |
|---|---|---|
| `lastActivityAt` | ✗ Missing | Used `updatedAt` / event scan |
| SLA states | ✗ None | No stale/overdue logic |
| Queue prioritization | createdAt desc | No operational sort |
| Manager workload | Basic open count (dashboard) | No overdue/stale split |
| Timeline | Append-only events | No inactivity markers |
| Cron / BullMQ for CRM | Feed import only | No SLA jobs (by design) |
| Redis infra | Present (BullMQ) | Not used for CRM |

---

## Post-Iter 32 Inventory

### Data

- `requests.last_activity_at` — persisted canonical activity timestamp
- Backfill from `MAX(request_events.created_at)` → `updated_at` → `created_at`
- Index: `requests_last_activity_at_idx`

### Shared logic

- `packages/shared/src/crm/request-sla.ts` — `computeSlaState`, thresholds, priority

### API

| Endpoint | Change |
|---|---|
| `GET /admin/requests` | + `sort=priority\|created\|activity`, `sla=overdue\|stale`, SLA fields on rows |
| `GET /admin/requests/workload` | Per-manager + unassigned SLA counts |
| `GET /admin/requests/:id` | + `lastActivityAt`, derived SLA |
| Event append | Bumps `lastActivityAt` transactionally |

### Frontend

- `CrmWorkloadStrip` — operational summary cards
- `AdminRequests` — SLA badges, priority sort, activity column
- `AdminRequestDetail` — SLA banner, enriched timeline markers
- `AdminDashboard` — open / overdue / stale quick links
- DEV: `crmObsListFetch` + `slaRecomputeMs`, `crmObsTimelineRender`

---

## SLA Capability Matrix

| Requirement | Status | Notes |
|---|---|---|
| lastActivityAt canonical | ✓ DONE | Persisted + event bump |
| Backfill strategy | ✓ DONE | Migration SQL |
| Derived SLA states | ✓ DONE | Never stored |
| Stale detection | ✓ DONE | Status-specific thresholds |
| Overdue detection | ✓ DONE | Stricter thresholds |
| Priority queue sort | ✓ DONE | In-memory for priority mode |
| Workload metrics | ✓ DONE | `/workload` endpoint |
| Visual urgency | ✓ DONE | Badges, border glow |
| Timeline enrichment | ✓ DONE | UI-derived markers |
| BullMQ SLA job | ◐ STUB | `RequestSlaService.scanOpenRequests` only |
| Auto-notify / auto-status | ✗ BY DESIGN | Not implemented |
| Realtime sockets | ✗ OUT OF SCOPE | Manual refresh |

---

## Performance Notes

- Priority sort loads all matching rows into memory — acceptable for <2k open leads
- SLA compute is O(n) per list/workload request — no DB writes
- Future: BullMQ nightly scan via `RequestSlaService` without changing contracts

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
| Migration deploy | **PENDING** |
