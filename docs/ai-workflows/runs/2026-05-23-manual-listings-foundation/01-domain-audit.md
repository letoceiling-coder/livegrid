# Iter 44 — Phase 1: Listings Domain Audit

**Date:** 2026-05-23  
**Scope:** Manual listings foundation + agent ownership (no viewport/geo/CRM/map rewrites)

## Schema (pre-Iter 44)

| Field | Purpose | Notes |
|-------|---------|-------|
| `data_source` | FEED vs MANUAL | Primary source separation |
| `external_id` | Feed key / manual prefix | Legacy ownership encoded as `manual-{userUuid}-…` |
| `status` | Operational state | ACTIVE, INACTIVE, DRAFT, SOLD, RESERVED |
| `is_published` | Catalog gate | Public catalog required `true` |
| `published_at` | Publication timestamp | Used by 30-day auto-expire job |
| `seller_id` | Seller contact | Optional FK for manual listings |

**Missing before Iter 44:** canonical `owner_user_id`, `visibility` enum, `archived_at`, `last_activity_at`.

## Source separation

| Source | Ownership | Editable by | Public contact |
|--------|-----------|-------------|----------------|
| FEED | Immutable (builder/feed) | Admin/editor only (status/publish) | Agency (builder name + seller phone fallback) |
| MANUAL | Agent/manager via `owner_user_id` + legacy `external_id` | Owner, admin, editor, manager | Responsible agent card |

## Admin UI (pre-Iter 44)

- `/admin/listings` — unified table for all kinds/sources
- **Bug:** `buildWhere` defaulted `isPublished: true` even for admin queries → drafts invisible
- Agents redirected to `/admin/listings` (same as managers) — no dedicated cabinet
- Transfer via `PATCH /admin/listings/:id/transfer` (agent-to-agent)
- No visibility lifecycle, no owner filter, no stale detection

## Public catalog

- Filter: `visibility=PUBLIC` + `isPublished=true` + status ACTIVE/RESERVED (anonymous)
- `admin_view=true` bypasses publication filter for governance queries
- LeadForm/consultation CTA existed; responsible agent/agency card **missing**

## CRUD paths (manual)

Five create flows: apartment, house, land, commercial, parking — all set `dataSource=MANUAL`.

## Media

- `media_files` entity_type=`listing` for gallery
- Kind-specific photo fields on house/land/commercial sub-records

## Filters (API)

Existing: region, kind, status/statuses, data_source, price, geo, search, pagination (max 30/page admin).

## Gaps identified

1. No DB-level owner FK — ownership only in `external_id` prefix
2. No visibility state machine — status + isPublished conflated
3. No agent cabinet (`/admin/my-listings`)
4. No admin governance filters (owner, visibility, stale)
5. No public contact truth layer (FEED vs MANUAL)
6. No listing observability (`?listing_debug=1`)
7. Auto-expire job sets INACTIVE but did not set visibility ARCHIVED (addressed in Iter 44 publication patch)

## What already worked

- Feed import pipeline untouched
- Manual CRUD + transfer for agents
- RBAC via `@Roles('agent')` hierarchy (agent ≤ manager ≤ editor ≤ admin)
- Pagination integrity (30/page admin, 20/page cabinet)
- Region/kind/source tab UX in AdminListings
