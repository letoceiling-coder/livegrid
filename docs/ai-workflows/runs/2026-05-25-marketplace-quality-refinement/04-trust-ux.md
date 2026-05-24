# 04 — Marketplace Trust UX

**Iteration:** 74 · **Date:** 2026-05-25

## Improvements

| Signal | Implementation |
|--------|----------------|
| Feed freshness | `ListingCard` — "Актуально" badge for `dataSource: FEED` |
| Platform trust | `PublicTrustStrip` on homepage — 65k count, weekly sync |
| Trust badges | `TrustBadgeRow` on cards when API provides badges |
| ЖК confidence | Complex cards show listing counts from feed |
| Promotion clarity | `PromotionBadge` — existing, unchanged |

## Data sources

FEED listings = TrendAgent weekly sync (governance iter 72). Badge communicates buyer confidence without payment/AI features.

## Verdict

**Higher buyer confidence** via visible feed freshness on listing cards.
