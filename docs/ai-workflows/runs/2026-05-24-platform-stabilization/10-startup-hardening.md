# 10 — Startup Hardening

**Date:** 2026-05-24 · **Iter:** 61

## Recommended local startup order

```bash
~/livegrid/scripts/local-infra-start.sh
cd packages/database && npx prisma migrate deploy
pnpm --filter @lg/shared build
~/livegrid/scripts/local-dev-api.sh   # or pnpm dev:api
pnpm dev:web
```

## API graceful degradation

| Condition | HTTP | User-visible |
|-----------|------|--------------|
| DB offline | 500 on data routes | Health: `database: down`, Russian warning |
| Schema drift | 500 on affected Prisma queries | Health: `schema: drift`, warningsRu |
| Redis offline | Cache miss fallback | Existing cache service behavior |

## Russian diagnostics (examples)

- База данных недоступна → run `local-infra-start.sh`
- Не применено миграций → `prisma migrate deploy`
- Отсутствует колонка → migrate deploy

No silent crash loops — boot warnings logged via Nest `Logger.warn`.
