# 06 — Operational Dashboards

**Iteration:** 80 · **Date:** 2026-05-25

## Admin System (`/admin/system`)

New section: **Marketplace inventory & liquidity**

| Metric | Source |
|--------|--------|
| Freshness score | Computed 0–100 |
| Liquidity score | Computed 0–100 |
| Public / FEED / MANUAL | Inventory counts |
| Stale manual 30d | Freshness bucket |
| Thin districts, inactive ЖК | Liquidity |
| Promoted % | Promotion imbalance |
| Stale favorites | Supply-side impact |
| Low supply districts | Named list (top 8) |

Poll interval: 60s (same as engagement metrics).

## Agent dashboard (`/admin/my-listings`)

Inventory health strip with nudges + bulk refresh CTA.

## Module wiring (iter 80)

`app.module.ts` now imports:

- `SystemDiagnosticsGovernanceModule`
- `DiscoveryModule`
- `RetentionModule`

Ensures System, engagement, and discovery endpoints are live on Nest bootstrap.

## Files

- `AdminSystemPage.tsx`
- `AdminMyListings.tsx`
- `app.module.ts`
