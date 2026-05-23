# Iter 34 — Refresh Audit

## Pre-Iter 34 Baseline

| Surface | Polling | Visibility |
|---|---|---|
| Notification bell | Fixed 30s | None |
| AdminRequests | Manual only | None |
| CrmWorkloadStrip | Manual only | None |
| AdminDashboard | Manual | None |
| Page Visibility API | ✗ Not used | — |
| Focus restore refresh | ✗ None | — |
| Ops coordination UI | ✗ None | — |

## Post-Iter 34

| Surface | Policy key | Adaptive |
|---|---|---|
| CrmNotificationBell unread | `unreadCount` | ✓ |
| AdminRequests list | `requestQueue` | ✓ |
| CrmWorkloadStrip | `workload` | ✓ |
| AdminOpsCenter | `opsCenter` | ✓ |
| Request detail | `passive` | No poll |

## Central modules

- `crm-polling-policy.ts` — profile matrix
- `CrmRefreshContext` — visibility, focus, idle, online
- `useSmartPollInterval` — React Query integration
- `useCrmFocusRefresh` — debounced invalidate on restore

## Verification

| Check | Result |
|---|---|
| web tsc | ✓ PASS |
| api tsc | ✓ PASS |
