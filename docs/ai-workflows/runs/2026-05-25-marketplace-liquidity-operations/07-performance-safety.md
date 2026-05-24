# 07 — Performance Safety

**Iteration:** 80 · **Date:** 2026-05-25

## Query bounds

| Operation | Limit |
|-----------|-------|
| Marketplace health | ~18 parallel count/groupBy; district names max 30 |
| District groups | take 50, ordered by count desc |
| Duplicate external scan | groupBy ordered, filter in memory |
| Agent stale list | take 20 |
| Bulk refresh | max 50 listing IDs |

## Dashboard polling

- Marketplace health: 60s staleTime + refetchInterval
- No websocket; no unbounded polling

## Client rendering

- Freshness badge: O(1) per card, no extra API
- Agent health strip: single query per page load

## Scale notes (100k+)

Counts use indexed fields (`visibility`, `dataSource`, `lastActivityAt`, `districtId`, `regionId`). No N+1 hydration on health endpoint.

## Files

- `inventory-health.service.ts`
