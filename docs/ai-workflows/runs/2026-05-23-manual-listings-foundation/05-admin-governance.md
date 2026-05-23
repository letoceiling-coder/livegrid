# Iter 44 — Phase 5: Admin Governance

## Route

`/admin/listings` — enhanced `AdminListings.tsx`

## New filters (manager/admin/editor)

| Filter | Query param |
|--------|-------------|
| Visibility | `visibility=PUBLIC|HIDDEN|ARCHIVED|DRAFT` |
| Owner (agent) | `owner_user_id={uuid}` |
| Stale 30+ days | `stale_only=true` |
| Source | existing `data_source=FEED|MANUAL` |
| Region | existing `region_id` |

All admin queries include `admin_view=true` (skips default isPublished filter).

## Table enhancements

- Visibility column with badge + stale indicator
- Owner column (governance roles only)
- Lifecycle dropdown per MANUAL row: publish / hide / archive / republish

## Assignment

| Role | Mechanism | Endpoint |
|------|-----------|----------|
| Agent | Peer transfer | `PATCH /admin/listings/:id/transfer` |
| Manager+ | Governance assign | `PATCH /admin/listings/:id/assign` |

Assign syncs `owner_user_id` + rewrites `external_id` prefix.

## RBAC summary

| Capability | agent | manager | editor | admin |
|------------|-------|---------|--------|-------|
| List all listings | own MANUAL | all | all | all |
| Create manual | ✓ | ✓ | ✓ | ✓ |
| Lifecycle own | ✓ | ✓ | ✓ | ✓ |
| Lifecycle any MANUAL | — | ✓ | ✓ | ✓ |
| Assign owner | — | ✓ | ✓ | ✓ |
| Publish checkbox (feed) | — | — | ✓ | ✓ |
| Delete manual | own | own* | own* | own* |

*Agents delete own; elevated roles via `@Roles('agent')` hierarchy.

## Pagination

- 30 rows/page — unchanged
- Total count + page navigation preserved
