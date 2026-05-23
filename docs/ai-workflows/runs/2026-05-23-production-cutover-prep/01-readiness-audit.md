# Iter 47 — Phase 1: Readiness Audit

**Date:** 2026-05-23  
**Target:** livegrid.ru → `/var/www/lg`

## Local (`~/livegrid`)

| Check | Status |
|-------|--------|
| Git commit | ✓ `df26fc5` feat: consolidate monorepo Iter 15-46 |
| Git push origin main | **BLOCKED** — HTTPS auth unavailable in WSL |
| Working tree clean | ✓ after commit |
| tsc web + api | ✓ |
| @lg/shared build | ✓ |
| Migrations count | 39 |

## GitHub (livegrid.git)

| Check | Status |
|-------|--------|
| origin/main contains Iter 15–46 | **NO** — push pending |
| Commit ahead of origin | 1 commit (1177 files) |

## Production (SSH verified 2026-05-23)

| Check | Status |
|-------|--------|
| Path | `/var/www/lg` |
| Git remote | `lg.git` (not yet switched) |
| HEAD | `43b5026` |
| Disk | 59G free (24% used on 77G) |
| PM2 lg-api | online, 32h uptime, 657MB |
| API health | `{"status":"ok","services":{"database":"up"}}` |
| PostgreSQL | accepting connections :5432 |
| Redis | PONG |
| Nginx | config test OK |
| .env | present (253 bytes path entry) |
| uploads | 484M |

## Pending migrations on production

**12 migrations** not yet applied (see `04-migration-impact.md`).

## Blockers before cutover

1. `git push origin main` (requires GitHub credentials)
2. `bash deploy/switch-production-remote.sh`
3. Pre-deploy `pg_dump` backup
4. `bash deploy/remote-git-deploy.sh`
