# 10 — CI Safety

## Workflow

`.github/workflows/reliability.yml`

Gates:
1. `pnpm install --frozen-lockfile`
2. `@lg/shared` build
3. `pnpm typecheck`
4. `pnpm --filter @lg/shared test` (contracts)
5. `pnpm --filter @lg/web test` (unit)
6. `scripts/reliability/migration-check.sh`
7. Playwright smoke (API-only fallback when web not running)

## Root Scripts

```bash
pnpm test:reliability
pnpm test:e2e
pnpm check:migrations
```

Fast, deterministic — no full soak in CI.
