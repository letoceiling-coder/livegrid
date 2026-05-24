# 04 — Task Center

## Route

`/admin/tasks` — `AdminTasksPage.tsx`

## Filters

| Filter | Query | Description |
|--------|-------|-------------|
| today | `?filter=today` | Due today, open |
| overdue | `?filter=overdue` | Past due, open |
| followup | `?filter=followup` | All open tasks |
| callbacks | `?filter=callbacks` | CALL_CLIENT tasks |
| escalations | `?filter=escalations` | ESCALATE / RESCUE tasks |
| completed | `?filter=completed` | Completed today |

## API Endpoints

- `GET /admin/tasks/summary`
- `GET /admin/tasks?filter=&page=`
- `POST /admin/tasks/:id/complete`
- `POST /admin/tasks/:id/dismiss`

## Mobile UX (360px)

- Swipe-left to complete (touch)
- Compact task cards with priority badges
- Sticky bottom action bar (overdue requests / callbacks links)
- Callback quick action: tel: link on CALL_CLIENT tasks

## Nav

Added to AdminLayout between Заявки and Переписки.
