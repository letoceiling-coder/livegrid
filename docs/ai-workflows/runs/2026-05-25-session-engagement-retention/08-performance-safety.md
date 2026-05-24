# 08 — Performance Safety

**Iteration:** 79 · **Date:** 2026-05-25

## localStorage budgets

| Key | Cap / TTL |
|-----|-----------|
| `lg_session_v1` | Single JSON object, 7d expiry |
| `lg_browse_history_v1` | Max 20 rows, dedupe by entity |
| `lg_compare` | Max 3 IDs |
| `lg_favorites_guest_v2` | Max 20 items (existing) |

All writers use try/catch for quota errors.

## Rendering

- `ContinueBrowsingSection` — max 8 cards, no images (text cards)
- `SessionDiscoverySection` — 60s query staleTime, enabled only when ≥1 history ID
- Favorites grid — unchanged card components; status badges lightweight
- Compare chip — null render when count 0

## API bounds

- `getSessionDiscovery` — max 6 input IDs, max 8 output cards
- Engagement metrics — 8 parallel count/groupBy queries, no full table scans

## Map restore

- `mapHref` string only (no viewport geometry blob)
- Patched on filter URL change, not on every pan/zoom

## Long-session stability

No new websocket listeners; no unbounded in-memory caches.

## Files

- `session-continuity.ts`, `browse-history-local.ts`
- `discovery-graph.service.ts`, `engagement-metrics.service.ts`
