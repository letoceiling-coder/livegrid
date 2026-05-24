# 04 — Freshness Trust UX

**Iteration:** 80 · **Date:** 2026-05-25

## Public policy

**Positive freshness only** — no stale warnings on buyer-facing cards (suppresses trust erosion).

## Shared helper

`packages/shared/src/listings/listing-freshness.ts`

| Source | Badge |
|--------|-------|
| FEED | «Актуально» |
| MANUAL, updated ≤7d | «Недавно обновлено» (emerald) |
| MANUAL, older | No badge (neutral) |

Uses `lastActivityAt` then `updatedAt` as fallback timestamp.

## UI

- `ListingCard.tsx` — replaces binary FEED-only badge with `listingFreshnessBadge()`

## Agent-side (not public)

Stale hints remain on `AdminMyListings` («рекомендуется обновить 30+ дн.»).

## Files

- `listing-freshness.ts`
- `ListingCard.tsx`
