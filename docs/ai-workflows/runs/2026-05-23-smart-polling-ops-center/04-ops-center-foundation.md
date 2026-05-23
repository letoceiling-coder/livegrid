# Iter 34 — Ops Center Foundation

## Route

`/admin/ops` — **AdminOpsCenter**

## API

`GET /admin/ops/summary`

Returns:
- `totals` — open / overdue / stale
- `escalation` — overdue, stale, unassigned risk, overload managers
- `queues` — top 8 overdue, stale, unassigned
- `managers` — workload top 10
- `notifications.unread` — pressure indicator
- `refreshedAt`

## UI sections

1. Summary cards (open, overdue, stale, notifications)
2. Three queue panels with deep links
3. Manager workload grid with overload highlighting

## Polling

Uses `opsCenter` policy + focus refresh on restore.

NOT a full realtime command center — lightweight coordination surface.
