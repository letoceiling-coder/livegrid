# 01 — Drift Audit

**Iteration:** 83 · **Date:** 2026-05-25

See also: [DRIFT_REPORT.md](./DRIFT_REPORT.md)

## Three-way comparison

Production server and local dev share base commit `f8db807` but diverged via uncommitted work. GitHub `origin/main` has no governance modules — frontend bundle on CDN/nginx may be newer than API.

## Root drift vectors

1. **Selective deploys** — web/governance UI deployed without API module registration
2. **Server hotpatches** — sitemap, feed recovery, partial `app.module.ts` edits never pushed
3. **Missing migrations** — 9 Prisma migrations local only

## Canonical source

`https://github.com/letoceiling-coder/livegrid.git` branch `main`

Production remote already points to canonical URL (verified via SSH).

## Files at risk of server-only state

| Hotpatch | Local | Server |
|----------|-------|--------|
| Feed recovery | ✓ | ✓ (untracked) |
| Sitemap module | ✓ | ✓ (untracked) |
| LISTINGS_EXPIRE FEED exclusion | ✓ | partial |
| Governance imports | ✓ full | partial |
| Route contract | ✓ | untracked |
| Moderation RBAC | ✓ | unknown |

All consolidated into single commit in Phase 3.
