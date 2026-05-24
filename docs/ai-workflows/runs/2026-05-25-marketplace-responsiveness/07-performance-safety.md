# 07 — Performance Safety

**Iteration:** 81 · **Date:** 2026-05-25

## Bounds

| Operation | Limit |
|-----------|-------|
| Responsiveness metrics cache | 60s TTL |
| SLA scan | 500 open requests |
| Latency events | 400 rows / 7d |
| Workload | Full open set (existing CRM path) |
| Comm metrics | 500 threads sample (existing) |

## Polling

- Admin System + CRM strip: 60s refetchInterval
- Smart poll on request queue unchanged

## Client

- Public hint: 5min staleTime
- No websocket; no per-thread polling on catalog

## Files

- `response-velocity.service.ts`
