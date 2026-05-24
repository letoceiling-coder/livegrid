# 04 — Migration Drift Detection

**Date:** 2026-05-24 · **Iter:** 61

## Tooling

| Script | Purpose |
|--------|---------|
| `scripts/reliability/migration-check.sh` | Folder integrity (existing iter 58) |
| `scripts/reliability/migration-drift.sh` | Wraps `prisma migrate status` |
| `PlatformStabilityService` | Runtime pending migration detection |

## API boot behavior

On startup, compares `packages/database/prisma/migrations/*` vs `_prisma_migrations` table.

Emits Russian warnings when pending:

> Не применено миграций: N. Выполните: cd packages/database && npx prisma migrate deploy

## Local incident (2026-05-24)

12 migrations pending → `listings.visibility` missing → `/listings` 500. Fixed with `migrate deploy` + orphan `owner_user_id` cleanup.

## CI

Root script: `pnpm check:migration-drift`
