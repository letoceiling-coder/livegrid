# Iter 34 — WebSocket Readiness (Audit Only)

## NOT implemented

WebSockets, Socket.io, Redis pub/sub — explicitly out of scope.

## What exists today ✓

| Capability | Status |
|---|---|
| Append-only RequestEvent | ✓ |
| CrmNotification dedupe | ✓ |
| SLA derived read model | ✓ |
| Smart polling + focus refresh | ✓ |
| Ops summary API | ✓ |

## Still missing for realtime ✗

| Gap | Notes |
|---|---|
| Event replay stream | No SSE/WS feed of events |
| Reconnect reconciliation | Polling invalidates on focus only |
| Socket auth sync | N/A |
| Multi-tab coordination | Each tab polls independently |
| Delivery ACKs | Notifications use readAt only |
| Server push latency | 8–180s depending on profile |

## Migration path (future)

1. Add `GET /admin/crm/events/stream` SSE (lighter than WS)
2. On reconnect: `sinceEventId` replay + invalidate queries
3. Keep dedupe keys — same notification model
4. Optional: BullMQ → in-app emit only first

Honest assessment: **~60% ready** for SSE; **~30% ready** for full WebSocket multi-tab sync.
