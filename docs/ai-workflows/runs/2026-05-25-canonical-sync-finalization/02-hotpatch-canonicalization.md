# 02 — Hotpatch Canonicalization

**Iteration:** 83 · **Date:** 2026-05-25

## Policy

**No server-only patches.** Every production hotfix must exist in git before deploy.

## Hotfixes verified in local tree

| Fix | Location |
|-----|----------|
| Feed visibility restore | `feed-recovery.service.ts`, `scripts/reliability/production-visibility-restore.sql` |
| LISTINGS_EXPIRE FEED exclusion | `listings.service.ts` — `dataSource: { not: 'FEED' }` when expiring |
| LISTINGS_EXPIRE_DISABLE default | `deploy/ecosystem.config.js` → `'true'` |
| Sitemap module | `apps/api/src/modules/sitemap/*` |
| Route contract diagnostics | `apps/api/src/modules/system-diagnostics/*` |
| Moderation RBAC | `listings-moderation.controller.ts` — admin/editor/manager |
| Governance module imports | `app.module.ts` — CrmAutomation, Trust, Billing, Ecosystem |
| Runtime safety | `crm-api.ts` — `crmApiGetOptional` |
| Admin route smoke | `scripts/verify-admin-routes.mjs` |

## Deprecated partial deploy scripts

`deploy/governance-deploy.sh` and `deploy/web-governance-deploy.sh` remain for reference but **full deploy** via `deploy-full.sh` is canonical. No selective governance deploys after Iter 83.

## Server artifacts not in git

- `apps/api/sitemaps/` — generated at runtime; gitignored or regenerated on deploy
- PM2 logs — `/var/log/lg/*`

## Patch file preserved

`deploy/patches/iter72-listings-expire-feed-exclusion.patch` — historical reference; logic is in source.
