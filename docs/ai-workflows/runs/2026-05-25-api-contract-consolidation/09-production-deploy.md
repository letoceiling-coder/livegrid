# 09 — Production Deploy

**Iteration:** 82 · **Date:** 2026-05-25

## Pre-deploy (local)

```bash
cd ~/livegrid
pnpm typecheck
pnpm --filter @lg/api build
pnpm build:web
```

## Commit scope (Iter 82 minimum)

API contract recovery:

- `apps/api/src/app.module.ts`
- `apps/api/src/modules/listings/listings-moderation.controller.ts`
- `apps/api/src/modules/system-diagnostics/*` (route contract)
- `apps/web/src/admin/lib/crm-api.ts`
- `apps/web/src/admin/pages/AdminOpsCenter.tsx`
- `apps/web/src/admin/lib/crm-api-contract.ts`
- `scripts/verify-admin-routes.mjs`
- `docs/ai-workflows/runs/2026-05-25-api-contract-consolidation/*`

Plus untracked governance modules (`crm-automation`, `trust`, `billing`, `ecosystem`, …) if not yet on remote.

## Server deploy

```bash
ssh root@<host> 'bash /var/www/lg/deploy/deploy-from-git.sh'
```

Or manual on server:

```bash
cd /var/www/lg
git pull origin main   # after push
bash deploy/deploy-full.sh
```

## PM2

```bash
pm2 reload deploy/ecosystem.config.js --update-env
pm2 save
pm2 status lg-api
```

## Post-deploy verification

```bash
curl -s http://localhost:3000/api/v1/health | jq .
curl -s -H "Authorization: Bearer $JWT" http://localhost:3000/api/admin/system/route-contract | jq .missingRouteReport

API_BASE=https://livegrid.ru/api JWT=$JWT node scripts/verify-admin-routes.mjs
```

## SPA checks

| URL | Expected |
|-----|----------|
| https://livegrid.ru/admin/tasks | Summary + task list loads |
| https://livegrid.ru/admin/moderation/listings | Queue loads for admin |
| https://livegrid.ru/admin/ops | No repeated 404 in network tab |
| https://livegrid.ru/admin/trust | Trust panels load |
| https://livegrid.ru/admin/billing | Billing metrics load |

## Git sync status (Iter 82 session)

Local workspace has extensive uncommitted governance work. **Single source of truth** target: `https://github.com/letoceiling-coder/livegrid.git`

Action required: commit + push full governance slice, then deploy from git — eliminates local ↔ production drift.

## Rollback

If regression: revert `app.module.ts` imports and redeploy previous API build via PM2. Frontend optional wrappers prevent user-visible crash even during partial rollback.
