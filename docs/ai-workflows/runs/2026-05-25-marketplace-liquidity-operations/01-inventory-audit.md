# 01 — Inventory Health Audit

**Iteration:** 80 · **Date:** 2026-05-25

## Bottleneck

Platform engagement is mature (iter 79). **Primary gap:** marketplace liquidity and inventory freshness at 65k+ scale.

## Audit dimensions

| Signal | Detection | API field |
|--------|-----------|-----------|
| Stale manual inventory | `lastActivityAt` > 30/60/90d | `freshness.staleManual*` |
| Stale FEED rows | `updatedAt` > 90d | `freshness.staleFeedUpdated90` |
| Hidden-but-active | `visibility=HIDDEN`, status ACTIVE | `inventory.hiddenActive` |
| Orphan manual | MANUAL without owner | `inventory.orphanManual` |
| Duplicate FEED external_id | groupBy count > 1 | `inventory.duplicateFeedExternal` |
| Dead-end catalog zones | districts with <5 listings | `liquidity.thinDistricts`, `lowSupplyDistricts` |
| Inactive ЖК | blocks with no public listings | `liquidity.inactiveBlocks` |
| Stale favorites impact | favorites → sold/unpublished | `supplySide.staleFavoriteListings` |
| Inactive agents | no MANUAL activity 60d | `supplySide.inactiveAgents60d` |

## Unified endpoint

`GET /admin/listings/marketplace-health?region_id=N`

Implemented in `InventoryHealthService.getMarketplaceHealth()` — bounded parallel counts, no full-table scans.

## Files

- `inventory-health.service.ts`
- `listings-admin.controller.ts` — `marketplace-health`
- `AdminSystemPage.tsx` — operational panel

## Not in scope

Auto-archive stale listings, AI quality scoring on FEED bulk.
