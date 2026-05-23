# Iter 44 — Final Verdict: Manual Listings Foundation + Agent Ownership

**Date:** 2026-05-23  
**Verdict:** **GO_WITH_HOLD**

## Summary

Shipped the foundational marketplace ownership layer: DB-level owner FK, visibility lifecycle, agent cabinet, admin governance filters, truth-safe public contacts, and DEV observability — without touching viewport, geo architecture, CRM, map, WebSockets, or full Avangard wizard.

## Shipped

### Schema + migration
- `ListingVisibility` enum (PUBLIC, HIDDEN, ARCHIVED, DRAFT)
- `owner_user_id`, `archived_at`, `last_activity_at` on listings
- Additive backfill migration

### Shared contract
- `listing-lifecycle.ts` — transitions, stale detection
- `listing-contact.ts` — FEED agency / MANUAL agent rules

### API
- `ListingsGovernanceService` — lifecycle, assign, observability, ownership asserts
- Admin endpoints: lifecycle, assign, observability
- `buildWhere` admin_view fix, owner/visibility/stale filters
- `findOne` publicContact enrichment
- `isStale` on admin list rows

### Web
- `/admin/my-listings` — agent cabinet with tabs + cards + lifecycle actions
- `/admin/listings` — governance filters, visibility column, lifecycle + assign
- Public listing detail — responsible agent / agency card
- `?listing_debug=1` overlay

## Verification

```
pnpm --filter @lg/shared build        ✓
pnpm --filter web exec tsc --noEmit   ✓
pnpm --filter api exec tsc --noEmit   ✓
```

**Migration:** run `pnpm --filter @lg/database exec prisma migrate deploy` against target DB before prod.

## Manual QA (required)

| Test | Expected |
|------|----------|
| Agent login | Redirect to `/admin/my-listings`, sees only own MANUAL |
| Manager login | Sees all listings, assign dropdown works |
| FEED public page | Agency contact, no agent UUID |
| MANUAL public page | Agent card + phone CTA |
| Archive/hide/republish | Lifecycle transitions, catalog reflects visibility |
| Stale 30+ d | Badge in cabinet + admin filter |
| Mobile 360px | Cabinet cards usable, 44px tab targets |
| Catalog/map/CRM | No regression |
| `?listing_debug=1` | Overlay shows source/visibility/mismatch counts |

## HOLD (explicit deferrals)

| Item | Rationale |
|------|-----------|
| Full Avangard multi-step wizard | Iter 44 foundation only — wizard route exists as stub link |
| Moderation queue | Future iteration |
| Agency phone in site settings | FEED uses seller phone fallback; builder has no phone column |
| Auto-inactivate stale listings | Recommendation only per charter |
| Playwright listing ownership E2E | Manual QA protocol documented |
| tsx dev FeedImport DI | Use compiled API (`pnpm build && node dist/main.js`) |

## Phase 10 — Wizard readiness

### Ready now
- Owner FK + visibility lifecycle
- Manual CRUD per kind (5 flows)
- Media entity attachment pattern
- Geo fields on listing row (lat/lng — do not extend geo architecture)
- Agent cabinet as publication workspace
- Assign/transfer ownership paths

### Missing for full wizard
- Multi-step form state machine
- Geo autocomplete integration (existing geo services — wire only)
- Dynamic schema per region/kind
- Moderation approval workflow
- Bulk media upload UX in wizard context
- Draft autosave / step validation

## Strategic outcome

LiveGrid now has a **production-grade manual listing ownership layer** separating FEED catalog immutability from agent-operated MANUAL inventory — ready for regional agent scaling, future wizard, and moderation workflows.
