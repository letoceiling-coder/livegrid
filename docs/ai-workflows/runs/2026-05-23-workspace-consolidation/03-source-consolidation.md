# Iter 45 — Phase 3: Source Consolidation

## Strategy

**Selective rsync** from `~/lg` → `~/livegrid` — monorepo paths only, no blind root overwrite.

### Synced directories

```
apps/       → ~/livegrid/apps/
packages/   → ~/livegrid/packages/
deploy/     → ~/livegrid/deploy/
scripts/    → ~/livegrid/scripts/
docs/ai-workflows/ → merged (no delete of livegrid runs)
.local/     → copied (infra helpers)
```

### Synced root files

```
package.json, pnpm-lock.yaml, pnpm-workspace.yaml
docker-compose.yml, tsconfig.base.json, PROJECT_PLAN.md
.env.example, .gitattributes
```

### Preserved from livegrid (NOT overwritten)

```
app/, routes/, config/     — Laravel legacy
gstack/, .cursor/          — workflow + skills
PROJECT_FULL_CONTEXT.md    — project context
deployment/                — deploy wrappers (tmp-lg-work archived)
frontend/                  — legacy frontend experiments
```

### Environment handling

| File | Action |
|------|--------|
| `.env` | Replaced with lg monorepo PostgreSQL dev config |
| `.env.laravel.legacy` | Saved previous Laravel `.env` |
| `.env.example` | Updated from lg |

## Conflict report

| Conflict | Resolution |
|----------|------------|
| livegrid root had no monorepo | lg monorepo added at root |
| tmp-lg-work stale nested clone | Archived to `livegrid-archives/` |
| docs/ai-workflows split across repos | Merged (lg Iter 43–44 added to livegrid's 50 runs) |
| .gitignore Laravel vs monorepo | Merged unified `.gitignore` |
| Two git remotes (lg.git vs livegrid.git) | **livegrid.git retained** as local canonical remote |

## Exclusions (not copied)

- `node_modules/`, `dist/`, `.git/`, `*.tsbuildinfo`

## Post-sync verification

- 39 migrations present
- `listings-governance.service.ts` present
- `AdminMyListings.tsx` present
- `~/lg` removed after validation
