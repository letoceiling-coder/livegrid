# 07 — Build Consistency

**Iteration:** 82 · **Date:** 2026-05-25

## Observed drift pattern

Production frontend bundle **ahead** of API:

- Web deploy included governance pages and Ops Center polling
- API `app.module.ts` on server lacked governance module imports
- Result: SPA renders UI, API returns 404

## Canonical deploy flow

`deploy/deploy-full.sh` (also via `deploy/deploy-from-git.sh`):

1. `pnpm install --frozen-lockfile`
2. Prisma generate + `migrate deploy`
3. **Build API** — `pnpm --filter @lg/api build`
4. **Build web** — clean stale chunks, `pnpm build:web`
5. **PM2 reload** — `pm2 reload deploy/ecosystem.config.js --update-env`
6. Nginx reload
7. `deploy/verify-on-server.sh runtime`

Order matters: **API before web** is not strictly required for this fix, but **both must deploy from same git revision**.

## Stale bundle mitigation

`deploy-full.sh` explicitly removes:

```
apps/web/dist
apps/web/public/assets
apps/web/public/catalog
apps/web/public/complex
apps/web/public/index.html
```

Prevents Vite copying old hashed chunks into production static root.

## Env drift

- API: `deploy/load-api-env.sh` + `deploy/ecosystem.config.js`
- Web build: `VITE_PUBLIC_SITE_URL` / `PUBLIC_SITE_URL` → `https://livegrid.ru`
- Single `.env` at monorepo root referenced by API `ConfigModule`

## Version alignment

| Artifact | Package | Build command |
|----------|---------|---------------|
| API | `@lg/api` | `pnpm build:api` |
| Web SPA | `@lg/web` | `pnpm build:web` |
| Shared types | `@lg/shared` | transpiled with consumers |

Run `pnpm typecheck` before deploy — passed in Iter 82.

## Smoke after deploy

```bash
bash deploy/verify-on-server.sh runtime
API_BASE=https://livegrid.ru/api JWT=$JWT node scripts/verify-admin-routes.mjs
```

## Git state note

Large local diff vs `origin` (governance modules untracked). Iter 82 code fixes are local until committed and pushed to `https://github.com/letoceiling-coder/livegrid.git`.
