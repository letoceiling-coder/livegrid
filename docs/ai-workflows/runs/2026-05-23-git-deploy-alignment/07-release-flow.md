# Iter 46 — Phase 7: Release Flow

See also: [`deploy/RELEASE.md`](../../../../deploy/RELEASE.md)

## Human-safe procedure

### Developer (local)

1. Work in `~/livegrid` only
2. `pnpm typecheck` / tsc
3. `git commit` → `git push origin main`
4. Optional: `git push legacy-lg main` during transition

### Release engineer

5. `bash deploy/switch-production-remote.sh --dry-run` (first time only)
6. `bash deploy/remote-git-deploy.sh`
7. Watch deploy output for migration + build errors
8. `curl https://livegrid.ru/api/v1/health`
9. `ssh root@85.198.64.93 'bash /var/www/lg/deploy/verify-on-server.sh runtime'`
10. Manual smoke: auth, admin, CRM, map, listings

### On failure

- Do NOT re-run migrate if partial failure — check logs first
- Rollback code: checkout previous SHA + `deploy-full.sh`
- DB: restore from pre-deploy dump if migration corrupted data

## Current blocker

**Consolidated monorepo not yet committed to livegrid.git.**

Until pushed:
- Production cannot receive Iter 42–44 work via git
- `switch-production-remote.sh` will fetch empty/stale livegrid main

## Timeline

```
NOW     → commit + push origin main
THEN    → switch-production-remote.sh
THEN    → remote-git-deploy.sh
VERIFY  → smoke QA checklist
```

## Config reference

All deploy scripts source `deploy/config.sh`:

```bash
CANONICAL_REPO_URL=livegrid.git
LEGACY_REPO_URL=lg.git
DEPLOY_ROOT=/var/www/lg
DEPLOY_BRANCH=main
LG_SSH=root@85.198.64.93
```
