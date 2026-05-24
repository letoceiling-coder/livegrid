# DRIFT_REPORT — Iteration 83

**Date:** 2026-05-25 · **Canonical repo:** https://github.com/letoceiling-coder/livegrid.git

## Summary

| Layer | Local | Git (origin/main) | Production server |
|-------|-------|-------------------|-------------------|
| HEAD | `f8db807` (pre-commit) | `f8db807` Iter 47 | `f8db807` + hotpatches |
| Changed files | ~271 | 0 | ~15 modified + untracked |
| Governance modules | Present (untracked) | **Missing** | Partial (untracked sitemap, system-diagnostics) |
| Admin route 404s | Fixed locally | Not deployed | **Active** |

**Verdict:** Local ≡ intended canonical state. Git ≡ production base commit. Production ≡ hotpatched fork of Iter 47.

## Local drift (pre-commit)

- **271** paths changed vs `origin/main`
- **148** untracked paths (governance modules, migrations 20260524*, admin pages, e2e, docs)
- Iter 82 fixes: `app.module.ts` imports, moderation RBAC, route contract, `crmApiGetOptional`

## Production hotpatches (server `/var/www/lg`)

Modified without commit:

- `app.module.ts` (partial — missing full governance imports)
- Feed import services (recovery, parity)
- `listings.service.ts`, `search.service.ts`, `blocks.service.ts`
- `ecosystem.config.js`
- Content modules

Untracked on server:

- `apps/api/src/modules/sitemap/`
- `apps/api/src/modules/system-diagnostics/`
- `apps/api/src/modules/feed-import/feed-recovery.service.ts`
- `deploy/governance-deploy.sh`
- `apps/api/sitemaps/` (generated output)

## PM2 / env (production)

| Setting | Value | Status |
|---------|-------|--------|
| Process | `lg-api` online | OK |
| Remote | `origin` → livegrid.git | OK (canonical) |
| `LISTINGS_EXPIRE_DISABLE` | `true` | OK |
| Crontab | `0 4 * * 1` weekly feed only | OK |
| Legacy 6h cron | absent | OK |

## Migrations pending deploy

Nine migrations not on production DB until `prisma migrate deploy`:

- `20260524100000` listing wizard drafts
- `20260524200000` retention saved searches
- `20260524300000` listing promotions
- `20260524400000` CRM communication
- `20260524500000` discovery notifications
- `20260524600000` CRM automation
- `20260524700000` trust quality
- `20260524800000` billing commerce
- `20260524900000` agency ecosystem

## Resolution (Iter 83)

1. Single commit: local full state → `origin/main`
2. `git pull` on server → `deploy-full.sh`
3. Discard server hotpatch drift (replaced by git tree)
4. `pnpm verify:admin-routes` post-deploy

## Target state

```
local == git == production == f8db807 + canonical commit (Iter 83)
```
