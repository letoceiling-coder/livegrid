# 06 — Build Graph Hardening

**Date:** 2026-05-24 · **Iter:** 61

## Shared package exports

Extended `packages/shared/src/index.ts`:

- `reliability/api-contracts`
- `reliability/db-safety`
- `reliability/workspace-integrity`

Build order: `@lg/shared` before `@lg/web` dev/build.

## Vite

- Resolves `@lg/shared` via workspace link (requires `package.json` dep + `dist/`)
- No new aliases required when workspace dep present

## Dynamic imports

- Critical paths use `lazyWithReload` with route IDs
- Chunk reload session flag: `sessionStorage.chunk_reload`

## Verification

```bash
pnpm --filter @lg/shared build
pnpm check:workspace
pnpm --filter @lg/web test
```
