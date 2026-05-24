# 01 — Hotpatch Canonicalization

**Iteration:** 72 · **Date:** 2026-05-24

## Hotpatches merged to git (governance slice)

| File | Change |
|------|--------|
| `feed-processor.service.ts` | Upsert sets `isPublished`, `visibility`, `publishedAt` |
| `listings.service.ts` | `LISTINGS_EXPIRE` excludes `dataSource: FEED` (patch file for prod schema lag) |
| `production-visibility-restore.sql` | HIDDEN + INACTIVE FEED reactivation |
| `deploy/ecosystem.config.js` | `LISTINGS_EXPIRE_DISABLE`, `SITEMAP_*` env passthrough |
| `deploy/patches/iter72-listings-expire-feed-exclusion.patch` | Reproducible prod patch |
| `deploy/governance-deploy.sh` | Canonical deploy script |

## Git commit scope

Committed to `main` (governance only — no billing/discovery/AI modules):

- `apps/api/src/modules/feed-import/*` (+ `feed-recovery.service.ts`)
- `apps/api/src/modules/sitemap/*`
- `apps/api/src/app.module.ts` (+ `SitemapModule` only vs iter 47)
- `scripts/reliability/*`
- `deploy/ecosystem.config.js`, `governance-deploy.sh`, patches

## Production note

Full `listings.service.ts` from workspace requires schema migrations (promotions). Production applies **patch-only** expire exclusion via `deploy/patches/iter72-listings-expire-feed-exclusion.patch` until schema aligned.

## Verdict

**Git is source of truth** for iter 65–71 governance code. No server-only feed/sitemap logic remains outside repo.
