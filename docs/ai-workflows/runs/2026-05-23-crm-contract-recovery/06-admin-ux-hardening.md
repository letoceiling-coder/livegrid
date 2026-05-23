# Iter 42 — Admin UX Hardening

## Localized Error States

| Component | Message |
|---|---|
| `CrmNotificationBell` | Не удалось загрузить уведомления |
| `CrmWorkloadStrip` | Ошибка загрузки нагрузки менеджеров |
| `AdminOpsCenter` summary | CRM временно недоступен |
| `AdminOpsCenter` analytics | Ошибка загрузки аналитики |

## Partial Rendering

- Ops Center queues render even if analytics fails
- Workload strip shows amber banner instead of silent null + retry loop
- Notification bell remains usable; list panel shows error inline

## Component

`CrmInlineError` — subtle amber banner, no raw JSON.
