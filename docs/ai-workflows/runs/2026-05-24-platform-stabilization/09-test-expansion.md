# 09 — Test Expansion

**Date:** 2026-05-24 · **Iter:** 61

## New tests

### @lg/shared (17 new)

- `api-contracts.test.ts` — 7
- `db-safety.test.ts` — 3
- `workspace-integrity.test.ts` — 2

Total shared: **34 passed**

### @lg/web (5 new)

- `route-registry.test.ts`
- `lazy-route.test.ts`

Total web: **35 passed**

## Scripts (integration-level)

- `pnpm check:workspace`
- `pnpm check:migration-drift`
- `pnpm check:stabilization` — workspace + migrations + shared tests + drift

## Hold

- Playwright route render E2E (existing e2e iter 58 hold)
- Live API boot integration test against staging
