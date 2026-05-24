# 07 — Build Strictness

**Date:** 2026-05-24 · **Iter:** 62

## Incremental strict config

`apps/web/tsconfig.runtime-integrity.json` — isolated from full app graph:

- `strict: true`
- `noImplicitAny: true`
- `noUncheckedIndexedAccess: true`
- `isolatedModules: true`

**Includes only:** auth hooks, lazy-route, route-registry, runtime-integrity-entry.

Full-app strict left for future (978 errors if App.tsx included — out of scope).

## Script

```bash
pnpm --filter @lg/web typecheck:runtime
```

## Rationale

Catch auth/runtime symbol errors early without blocking on legacy strict debt.
