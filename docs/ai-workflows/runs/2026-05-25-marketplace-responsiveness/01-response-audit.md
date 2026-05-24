# 01 — Response Time Audit

**Iteration:** 81 · **Date:** 2026-05-25

## Bottleneck

CRM, inventory, and engagement are mature. **Primary gap:** lead response velocity and agent responsiveness visibility.

## Audit dimensions

| Signal | Existing source | Iter 81 surfacing |
|--------|-----------------|-------------------|
| First-response latency | `RequestEvent` CREATED→CONTACTED | `latency.avgFirstContactMinutes` |
| Assignment delay | CREATED→ASSIGNED events | `latency.avgAssignmentMinutes` |
| Stale negotiations | NEGOTIATION + old `lastActivityAt` | `pipeline.abandonedNegotiation` |
| Unread inquiry duration | CRM thread participants | `communication.unreadConversations` |
| Inactive threads | `isStaleConversation()` | `communication.staleConversations` |
| Agent inactivity | Workload SLA per assignee | `agents.topPressure` |
| Callback misses | CALLBACK_SCHEDULED meta | `communication.callbackOverdueCount` |
| Moderation delay | REVIEW listings >48h | Included in bottlenecks |

## SLA model (unchanged)

`computeSlaState()` — FRESH / ACTIVE / STALE / OVERDUE by status + thresholds in `@lg/shared/crm/request-sla.ts`.

## Files

- `response-velocity.service.ts`
- `request-sla.ts`, `crm-communication.service.ts`
