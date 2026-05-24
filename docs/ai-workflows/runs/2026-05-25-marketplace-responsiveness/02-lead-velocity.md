# 02 — Lead Velocity Diagnostics

**Iteration:** 81 · **Date:** 2026-05-25

## API

`GET /admin/requests/responsiveness-metrics` (admin/editor/manager)

`ResponseVelocityService` aggregates:

| Metric | Description |
|--------|-------------|
| `responseSlaScore` | 0–100 composite (overdue, stale, callbacks, threads, moderation) |
| `latency.avgFirstContactMinutes` | Median CREATED→CONTACTED (7d sample) |
| `latency.avgAssignmentMinutes` | Median CREATED→ASSIGNED |
| `agents.fast` / `agents.slow` | `agentResponseTier()` on workload buckets |
| `agents.topPressure` | Top 5 assignees by overdue/stale |
| `communication.*` | Threads, unread, stale, callback overdue, avg reply |
| `bottlenecks` | Human-readable operator hints |

60s in-memory cache; bounded queries (500 SLA scan, 400 latency events).

## Agent tiers (internal only)

- **fast:** ≤15% overdue+stale on assigned load
- **attention:** ≥40% pressure
- Never exposed on public UI

## Files

- `response-velocity.service.ts`
- `response-responsiveness.ts`
