# Iter 45 — Phase 4: Build Consolidation

## Actions taken

1. Removed stale `node_modules` from livegrid root and monorepo packages
2. Single `pnpm install` at `~/livegrid` root
3. `prisma generate` via `@lg/database`
4. `@lg/shared` build
5. TypeScript checks on web + api

## Results

```
pnpm install                          ✓ (992 packages, 2m 35s)
pnpm --filter @lg/database exec prisma generate  ✓
pnpm --filter @lg/shared build        ✓
pnpm --filter web exec tsc --noEmit   ✓
pnpm --filter api exec tsc --noEmit   ✓
```

## Single build graph

| Artifact | Location |
|----------|----------|
| pnpm-lock.yaml | `~/livegrid/pnpm-lock.yaml` |
| node_modules | `~/livegrid/node_modules` (workspace hoisted) |
| Prisma client | generated to pnpm store path |
| shared dist | `packages/shared/dist/` |
| turbo cache | `.turbo/` (gitignored) |

## Removed duplicate states

- `deployment/tmp-lg-work/node_modules` — archived with tmp-lg-work
- Separate lg clone node_modules — archived with ~/lg removal
- No duplicate pnpm-lock at nested paths

## Production note

Server `/var/www/lg` still deploys from `lg.git`. After committing consolidated work to `livegrid.git`, align deploy remote or mirror push strategy with ops.

## Deterministic install command

```bash
cd ~/livegrid && pnpm install --frozen-lockfile
```
