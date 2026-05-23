# Iter 32 — Manager Workload

## Endpoint

```
GET /admin/requests/workload
Roles: admin, editor, manager
```

---

## Response shape

```typescript
{
  totals: { open, overdue, stale },
  unassigned: { assigned, overdue, stale, active, ... },
  managers: [{
    assigneeId, assigneeName, role,
    assigned, overdue, stale, active
  }]
}
```

Open = statuses: `NEW`, `IN_PROGRESS`, `CONTACTED`, `VIEWING_SCHEDULED`, `NEGOTIATION`

---

## UI surfaces

### Requests page (`CrmWorkloadStrip`)

Summary cards + manager scroll chips.

### Dashboard (`AdminDashboard`)

Three link cards: Open | Overdue | Stale → `/admin/requests` with SLA filter.

Existing bar chart workload retained (legacy open count).

---

## Sorting

Managers sorted by: `overdue DESC`, `stale DESC`, `assigned DESC`

---

## Limits

- Lightweight aggregation — single DB fetch + in-memory SLA compute
- No historical workload trends
- No per-manager SLA configuration
- Not an analytics platform

---

## Future (Phase 7 stub)

`RequestSlaService.scanOpenRequests()` — dry-run scan for future BullMQ scheduler; logs counts only, no mutations.
