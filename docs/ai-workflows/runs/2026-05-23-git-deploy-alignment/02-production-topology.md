# Iter 46 — Phase 2: Production Topology

## Verified deploy truth (SSH 2026-05-23)

Production **pulls from `lg.git`**, not livegrid.git.

```
85.198.64.93:/var/www/lg
  └── .git → origin = github.com/letoceiling-coder/lg.git
  └── HEAD = 43b5026
  └── .env exists (secrets not in repo)
  └── pm2 lg-api online
```

## Deploy paths (not guessing)

| Method | Evidence | Active? |
|--------|----------|---------|
| **git pull** | `deploy-from-git.sh` default workflow; prod remote = lg.git | **YES** |
| rsync | `sync-to-server.sh`, `sync-from-windows.ps1` | Fallback / Windows |
| Beget hook | Not found | NO |
| CI auto-deploy | Not found | NO |

## Request flow

```
Browser → nginx (livegrid.ru:443)
       → static: /var/www/lg/apps/web/dist
       → /api/v1/* proxy → localhost:3000 (pm2 lg-api)
       → PostgreSQL lg_production (localhost:5432)
       → Redis 127.0.0.1:6379
```

## Path naming

| Name | Meaning |
|------|---------|
| `/var/www/lg` | Production filesystem path (unchanged) |
| `lg.git` | **Current** production git remote |
| `livegrid.git` | **Target** canonical git remote |
| `~/livegrid` | Local dev workspace |

The directory name `/var/www/lg` does NOT imply lg.git is canonical — it is historical naming only.

## Gap

Production is **12+ migrations and all Iter 42–44 code behind** local consolidated tree until:
1. Code committed + pushed to livegrid.git
2. Production remote switched
3. `deploy-from-git.sh` run
