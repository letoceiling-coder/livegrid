# Iter 45 — Phase 1: Repository Diff Audit

**Date:** 2026-05-23  
**Operation:** HIGH-RISK workspace consolidation

## Pre-consolidation state

| Path | Remote | Role | HEAD |
|------|--------|------|------|
| `~/lg` | `github.com/letoceiling-coder/lg.git` | Accidental active workspace | `43b5026` + **206 uncommitted files** |
| `~/livegrid` | `github.com/letoceiling-coder/livegrid.git` | Intended canonical repo | `a3db8f7` (Laravel-era) |
| `~/livegrid/deployment/tmp-lg-work` | nested lg clone | Stale snapshot | `43b5026`, **27 migrations only** |
| Production | `/var/www/lg` | Deploy target | lg.git monorepo |

## Truth determination

**`~/lg` was the source of truth** for all Iter 15–44 monorepo work:

- 39 Prisma migrations (vs 27 in tmp-lg-work, 0 at livegrid root)
- CRM intelligence, geo, viewport, snapshots, ownership (Iter 42–44)
- 153 files only in lg vs tmp-lg-work; 97 content diffs; 0 files newer in tmp-lg-work

**`~/livegrid` was source of truth** for:

- `.cursor/` rules and gstack workflow
- `PROJECT_FULL_CONTEXT.md`, legacy Laravel tree
- 50 historical `docs/ai-workflows/runs/` entries (Iterations 8–22)
- Production deployment wrappers under `deployment/`

## File matrix (lg vs livegrid pre-merge)

| Category | ~/lg | ~/livegrid (root) | Winner |
|----------|------|-------------------|--------|
| `apps/` | Full Nest+React | Missing | **lg** |
| `packages/` | Full Prisma+shared | Missing | **lg** |
| `deploy/` | Production scripts | Missing at root | **lg** |
| `docs/ai-workflows/` | 2 runs (Iter 43–44) | 50 runs (Iter 8–22) | **merge** |
| `.env` | PostgreSQL monorepo dev | Laravel MySQL | **lg** (monorepo active) |
| `pnpm-lock.yaml` | 403858 bytes, May 23 | N/A at root | **lg** |
| `node_modules` | Present | Legacy npm at root | **reinstall** |
| `.git` | lg.git | livegrid.git | **keep livegrid.git** |

## Deleted / archived (not lost)

- `deployment/tmp-lg-work/` → `livegrid-archives/tmp-lg-work-stale-20260523/`
- `~/lg/` → `livegrid-archives/lg-removed-20260523/` (after validation)

## Backups created

```
livegrid-archives/lg-pre-consolidation-20260523.tar.gz      (210M)
livegrid-archives/livegrid-pre-consolidation-20260523.tar.gz (12M)
```
