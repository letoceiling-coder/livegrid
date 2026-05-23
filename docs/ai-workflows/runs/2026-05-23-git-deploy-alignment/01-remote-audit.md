# Iter 46 — Phase 1: Remote Audit

**Date:** 2026-05-23

## Local (`~/livegrid`)

```
origin     → https://github.com/letoceiling-coder/livegrid.git
legacy-lg  → https://github.com/letoceiling-coder/lg.git  (added Iter 46)
branch     → main @ a3db8f7 (pre-consolidation commit; monorepo uncommitted)
tracking   → origin/main
```

## Production (`/var/www/lg`) — verified via SSH

```
origin → https://github.com/letoceiling-coder/lg.git
HEAD   → 43b5026 fix(house-catalog): фильтры район/направление...
branch → main [origin/main]
pm2    → lg-api online
.env   → present (not in git)
```

## Deploy scripts audit

| Script | Method | Default repo |
|--------|--------|--------------|
| `deploy-from-git.sh` | git pull + deploy-full | livegrid.git (updated Iter 46) |
| `remote-git-deploy.sh` | SSH + deploy-from-git | livegrid.git |
| `remote-git-deploy.ps1` | PowerShell SSH | livegrid.git |
| `bootstrap-server.sh` | git clone | livegrid.git |
| `sync-to-server.sh` | rsync (no git) | N/A |
| `sync-from-windows.ps1` | tar+scp (no git) | N/A |
| `deploy-full.sh` | build+migrate+pm2 | uses local checkout |
| `switch-production-remote.sh` | one-time remote URL | lg.git → livegrid.git |

## Infrastructure references

| Component | Path / target |
|-----------|---------------|
| PM2 app | `lg-api` → `apps/api/dist/main.js` |
| Nginx static | `/var/www/lg/apps/web/dist` |
| Nginx config | `/etc/nginx/sites-available/livegrid.ru.conf` |
| Media uploads | `/var/www/lg/uploads` |
| Logs | `/var/log/lg/api-*.log` |
| Monitoring | docker compose profile `monitoring` |

## CI

No GitHub Actions in monorepo root. Deploy is manual/script-driven.

## Beget / hooks

No Beget auto-deploy hooks found. Production uses manual `deploy-from-git.sh` or rsync scripts.

## Divergence summary

| | Local livegrid | Production |
|---|----------------|------------|
| Remote | livegrid.git | **lg.git** |
| Commit | a3db8f7 + uncommitted monorepo | 43b5026 |
| Iter 15–44 work | in working tree | **missing on prod** |
