# Iter 42 — Workload API Recovery

## Investigation

```
GET /admin/requests/workload
→ 400 "Validation failed (numeric string is expected)"
```

**Cause:** Stale API build routed `workload` to `@Get(':id')` + `ParseIntPipe`.

`assignees` worked because static route existed; `workload` was added later.

## Fix

Extract static routes to dedicated controller registered **before** parametric routes:

`RequestsAdminMetaController`:
- `GET workload`
- `GET assignees`

Registered in `RequestsModule.controllers` **before** `RequestsAdminController`.

## Response Shape (unchanged)

```typescript
{
  totals: { open, overdue, stale },
  unassigned: { assigned, overdue, stale, ... },
  managers: [{ assigneeId, assigneeName, assigned, overdue, stale, active }]
}
```
