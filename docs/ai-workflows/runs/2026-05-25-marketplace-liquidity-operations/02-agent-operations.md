# 02 — Agent Operations UX

**Iteration:** 80 · **Date:** 2026-05-25

## Improvements

| Area | Change |
|------|--------|
| Inventory health strip | `AdminMyListings` — nudges + visibility breakdown |
| Stale listing nudges | API `agent-health` → count + messages |
| Bulk refresh | `POST /admin/listings/bulk-refresh` — touch up to 50 stale owned listings |
| Draft recovery | Resume banner for in-progress wizard draft |
| Lifecycle clarity | Existing visibility tabs + moderation notes preserved |
| Promotion health | Expiring-within-7d nudge (iter 77 extended) |
| FEED vs MANUAL | Agent cabinet remains MANUAL-only; FEED governed via Feed Import |

## Agent API

- `GET /admin/listings/agent-health` — scoped to owned MANUAL listings
- `POST /admin/listings/bulk-refresh` — `{ listingIds?: number[] }` optional

## Nudge examples

- «N объектов без активности 30+ дней»
- «N черновиков — завершите публикацию»
- «N на модерации — проверьте комментарии»
- «N продвижений истекают в течение 7 дней»

## Files

- `AdminMyListings.tsx`
- `inventory-health.service.ts` — `getAgentHealth`, `bulkRefreshActivity`

## Deferred (explicit)

Multi-select bulk hide/archive/publish — out of scope to avoid RBAC complexity this iteration.
