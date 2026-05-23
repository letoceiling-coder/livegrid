# Iter 42 — API Contract Audit

## Known Failures (pre-fix)

| Endpoint | Status | Root cause |
|---|---|---|
| `GET /admin/crm-notifications/unread-count` | 404 | Stale API process — CRM module routes not loaded |
| `GET /admin/requests/workload` | 400 | `:id` ParseIntPipe shadowing `workload` on stale build |
| `GET /admin/ops/summary` | 404 | Same stale API — OpsCenterController missing |

## Contract Matrix

| Frontend | Backend | Response | Roles |
|---|---|---|---|
| `CrmNotificationBell` → unread-count | `CrmNotificationsController.unreadCount` | `{ count }` | admin, editor, manager |
| `CrmNotificationBell` → list | `CrmNotificationsController.list` | `{ data, unreadCount, meta }` | admin, editor, manager |
| `CrmWorkloadStrip` → workload | `RequestsAdminMetaController.getWorkload` | `{ totals, unassigned, managers }` | admin, editor, manager |
| `AdminRequests` → assignees | `RequestsAdminMetaController.listAssignees` | `User[]` | admin, editor, manager |
| `AdminOpsCenter` → summary | `OpsCenterController.getSummary` | `OpsSummary` | admin, editor, manager |
| `AdminOpsCenter` → analytics | `OpsCenterController.getAnalytics` | `CrmAnalyticsResponse` | admin, editor, manager |

Single source: `apps/web/src/admin/lib/crm-api-contract.ts`

## Module Registration

| Module | Controllers |
|---|---|
| `CrmNotificationsModule` | `CrmNotificationsController` |
| `RequestsModule` | `RequestsAdminMetaController`, `RequestsAdminController`, `OpsCenterController` |

Both modules imported in `AppModule`.
