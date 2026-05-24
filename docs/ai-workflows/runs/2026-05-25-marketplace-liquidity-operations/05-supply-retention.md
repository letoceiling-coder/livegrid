# 05 — Supply-Side Retention

**Iteration:** 80 · **Date:** 2026-05-25

## Agent retention loops

| Loop | Implementation |
|------|----------------|
| Return-to-edit | Stale nudges + «Обновить устаревшие» bulk refresh |
| Inactive listing reminders | `agent-health.nudges` |
| Draft recovery | Wizard draft resume banner on My Listings |
| Promotion renewal | 7-day expiry nudge (existing, surfaced in health strip) |
| Inventory completion | Draft count nudge |
| Profile completion | Out of scope — no new profile wizard |

## Bulk refresh semantics

Updates `lastActivityAt` + `updatedAt` for owned MANUAL listings stale 30+ days — max 50 per request. Does not auto-publish hidden/archived items.

## Supply metrics

- `inactiveAgents60d` — agents with no MANUAL listing activity in 60d
- Agent visibility breakdown on health strip

## Files

- `inventory-health.service.ts` — `getAgentHealth`, `bulkRefreshActivity`
- `AdminMyListings.tsx`
