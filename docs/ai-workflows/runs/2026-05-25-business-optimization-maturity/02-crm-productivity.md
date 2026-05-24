# 02 — CRM Productivity

**Iteration:** 77 · **Date:** 2026-05-25

## Scope

Manager workflow speed, request detail ergonomics, task UX, overdue visibility, follow-up, notification prioritization, mobile CRM.

## Maturity assessment

| Area | Status | Notes |
|------|--------|-------|
| Workload strip + SLA badges | ✅ mature | AdminRequests, Dashboard |
| Deep-link filters | ✅ enhanced | `?sla=`, `?assigned_to=`, **`?status=`** (iter 77) |
| Task center swipe-complete | ✅ mature | AdminTasksPage mobile |
| Request detail panels | ✅ mature | comms, automation, timeline |
| Smart polling | ✅ mature | `useSmartPollInterval` |

## Iter 77 change

**AdminRequests** — URL param `status` now hydrates status filter on load (e.g. `/admin/requests?status=NEGOTIATION`), matching existing SLA deep-link pattern from Ops Center.

## Productivity wins (existing, validated)

- Ops Center queues link directly to filtered request lists
- Task summary chips with overdue counts
- CRM cache policy reduces redundant assignee fetches

## Remaining P2

- Request detail mobile action bar (sticky status + call)
- Batch assign from overdue queue
- Duplicate merge UI (API hint only in iter 77)

## Files

- `AdminRequests.tsx`
