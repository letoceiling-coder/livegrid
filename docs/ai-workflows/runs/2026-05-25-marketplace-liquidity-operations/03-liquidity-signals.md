# 03 — Liquidity Signals

**Iteration:** 80 · **Date:** 2026-05-25

## Diagnostics (rule-based)

| Signal | Logic |
|--------|-------|
| Low-supply districts | Top districts with <5 public listings |
| Over-saturated districts | Top 5 districts by listing count |
| Low-freshness zones | Aggregated via stale manual + stale FEED counts |
| Inactive ЖК | Blocks with zero public listings |
| Promotion imbalance | `promotionRatioPct` = active promoted / public total |
| Stale favorites impact | Favorites pointing to sold/unpublished/hidden |

## Scores

- **Freshness score** (0–100): penalizes stale ratio, hidden-active, orphans
- **Liquidity score** (0–100): penalizes thin districts, inactive blocks, low-supply clusters

Both surfaced on Admin System with ok/warn badges (threshold 80).

## Reuses iter 78

Thin district concept aligns with `getLandingCoverageMetrics` — inventory health uses live groupBy for operator view.

## Files

- `inventory-health.service.ts`
- `AdminSystemPage.tsx`

## Not in scope

Buyer/listing ratio, days-on-market ML, vector similarity.
