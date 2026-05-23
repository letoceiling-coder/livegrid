# Iter 42 — Module Registration Audit

## AppModule imports (CRM-related)

| Module | Status |
|---|---|
| `CrmNotificationsModule` | ✓ |
| `RequestsModule` | ✓ (includes Ops Center, snapshots, analytics) |

## RequestsModule controllers (order matters)

1. `RequestsController` — public `/requests`
2. **`RequestsAdminMetaController`** — static `/admin/requests/workload|assignees`
3. `RequestsAdminController` — list + `:id` parametric
4. `OpsCenterController` — `/admin/ops/*`
5. Telegram controllers

## CrmNotificationsModule

- `CrmNotificationsController` at `/admin/crm-notifications`
- Static routes before parametric POST `:id/read`

## Action Required

**Restart `pnpm dev:api`** after pulling — Nest watch may not reload module graph from pre-CRM builds.
