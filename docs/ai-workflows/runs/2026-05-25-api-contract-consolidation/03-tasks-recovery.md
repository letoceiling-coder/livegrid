# 03 — Tasks Module Recovery

**Iteration:** 82 · **Date:** 2026-05-25

## Symptom

`/admin/tasks` and `/admin/tasks/summary` returned **404** in production.

## Root cause

`CrmAutomationModule` implemented `CrmAutomationTasksController` but was absent from `AppModule.imports`.

## API surface (restored)

| Method | Path | Handler |
|--------|------|---------|
| GET | `/admin/tasks/summary` | Per-manager counts (today, overdue, follow-up, …) |
| GET | `/admin/tasks?filter=&page=&per_page=` | Paginated task queue |
| POST | `/admin/tasks/:id/complete` | Complete follow-up |
| POST | `/admin/tasks/:id/dismiss` | Dismiss task |
| GET | `/admin/requests/:id/automation` | Request detail automation context |
| GET | `/admin/automation/metrics` | Ops center automation metrics |

Controller: `apps/api/src/modules/crm-automation/crm-automation.controller.ts`  
Module: `apps/api/src/modules/crm-automation/crm-automation.module.ts`

## Frontend alignment

`AdminTasksPage.tsx`:

- Summary query → `crmApiGet('/admin/tasks/summary', 'tasks_summary')`
- List query → `crmApiGet('/admin/tasks?…', 'tasks_list')` with filters: `today`, `overdue`, `followup`, `callbacks`, `escalations`, `completed`
- Pagination via `page` / `per_page` query params

`AdminDashboard.tsx` — lightweight tasks totals from same summary endpoint.

## Roles

All task routes: `@Roles('admin', 'editor', 'manager')` at controller level.

## Verification

```bash
API_BASE=https://livegrid.ru/api JWT=<admin_token> node scripts/verify-admin-routes.mjs
```

Expected: `200 GET /admin/tasks/summary`, `200 GET /admin/tasks?filter=today&page=1`

SPA: https://livegrid.ru/admin/tasks — loads summary strip + filter tabs after API deploy.

## Files

- `apps/api/src/app.module.ts` — register `CrmAutomationModule`
- `apps/web/src/admin/pages/AdminTasksPage.tsx` — consumer (unchanged paths)
- `apps/web/src/admin/lib/crm-api-contract.ts` — contract entries `tasks_*`
