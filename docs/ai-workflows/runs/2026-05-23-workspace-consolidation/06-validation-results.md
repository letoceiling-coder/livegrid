# Iter 45 — Phase 6–7: Validation Results

**Date:** 2026-05-23

## Structural validation

| Check | Status |
|-------|--------|
| `~/lg` does not exist | ✓ |
| Monorepo at `~/livegrid/apps` | ✓ |
| 39 migrations | ✓ |
| Iter 44 ownership files | ✓ |
| Git root = livegrid | ✓ |
| Backups in `livegrid-archives/` | ✓ |

## Build validation

```
pnpm install                          ✓
pnpm --filter @lg/shared build        ✓
pnpm --filter web exec tsc --noEmit   ✓
pnpm --filter api exec tsc --noEmit   ✓
pnpm --filter @lg/database exec prisma generate  ✓
```

## Manual verification (required before prod deploy)

| Area | Command / URL | Expected |
|------|---------------|----------|
| Auth | `/login`, admin JWT | Login works |
| Admin | `/admin` | Dashboard loads |
| CRM | `/admin/requests`, `/admin/ops` | No 404 on meta endpoints |
| Map | `/map` | Markers render |
| Listings | `/admin/listings`, `/admin/my-listings` | Governance filters |
| Ops Center | `/admin/ops` | Queues + analytics |
| Snapshots | CRM snapshot jobs | Bull queue registered |
| Viewport | shadow endpoints | Unchanged |
| Geo | geo resolver | Unchanged |
| Ownership | lifecycle/assign | MANUAL only |

## Not run in this iteration (environment-dependent)

- Full runtime smoke with PostgreSQL + Redis up
- `prisma migrate deploy` against populated DB
- Production `/var/www/lg` sync

## Stale symlink / import check

- No broken workspace symlinks detected
- tsc clean pass confirms no missing module imports in web/api

## Recommended next commands

```bash
cd ~/livegrid
pnpm --filter @lg/database exec prisma migrate deploy
pnpm build:api && node apps/api/dist/main.js
pnpm dev:web
```
