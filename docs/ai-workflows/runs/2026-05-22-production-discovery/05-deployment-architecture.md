# 05 — Deployment Architecture

**Production root:** `/var/www/lg`  
**Domain:** `https://livegrid.ru`  
**Git remote (documented):** `https://github.com/letoceiling-coder/lg.git`

SSH verification: **not performed** (access denied). Flow below from deploy scripts + live HTTP.

---

## nginx Topology

File: `deploy/livegrid.ru.ssl.conf`

| Location | Handler |
|----------|---------|
| `/.well-known/acme-challenge/` | certbot webroot |
| `/api/` | `proxy_pass http://127.0.0.1:3000` |
| `/uploads/` | proxy → Nest (media static) |
| `/docs` | proxy → Nest Swagger |
| `/assets/` | `root /var/www/lg/apps/web/dist` (immutable 30d) |
| `/index.html` | dist root, no-cache |
| `/` | SPA fallback → `index.html` |

**No PHP-FPM. No Laravel.**

Config install: `deploy-full.sh` copies to `/etc/nginx/sites-available/livegrid.ru.conf` and reloads nginx.

---

## PM2 Configuration

File: `deploy/ecosystem.config.js`

| Setting | Value |
|---------|-------|
| App name | `lg-api` |
| Script | `apps/api/dist/main.js` |
| CWD | `/var/www/lg/apps/api` |
| Port | 3000 |
| Prefix | `/api/v1` |
| DB | PostgreSQL via `DATABASE_URL` |
| Redis | `redis://127.0.0.1:6379` |
| Logs | `/var/log/lg/api-error.log`, `api-out.log` |
| Memory | restart at 1G |

Deploy: `pm2 delete lg-api || true` → `pm2 start deploy/ecosystem.config.js` → `pm2 save`

---

## Deploy Flow

### Standard: `deploy/deploy-from-git.sh`

```
1. cd /var/www/lg
2. git fetch + checkout + pull (ff-only preferred)
3. exec deploy/deploy-full.sh
```

### Full: `deploy/deploy-full.sh`

```
1. source deploy/load-api-env.sh (DATABASE_URL, secrets)
2. pnpm install --frozen-lockfile
3. prisma generate (packages/database)
4. prisma migrate deploy
5. pnpm --filter @lg/api build
6. rm -rf apps/web/dist + stale public assets
7. pnpm build:web (VITE_PUBLIC_SITE_URL=https://livegrid.ru)
8. pm2 restart lg-api
9. cp deploy/livegrid.ru.ssl.conf → nginx sites-available
10. nginx -t && nginx -s reload
11. docker compose monitoring profile (optional)
12. verify-on-server.sh runtime
```

### Partial scripts

| Script | Purpose |
|--------|---------|
| `deploy-api.sh` | API-only rebuild |
| `sync-to-server.sh` | rsync/scp helper |
| `remote-git-deploy.sh` | SSH wrapper for git deploy |
| `verify-on-server.sh` | PM2 + health + smoke tests |

---

## Build Flow

| Artifact | Command | Output |
|----------|---------|--------|
| API | `pnpm --filter @lg/api build` | `apps/api/dist/` |
| Web | `pnpm build:web` | `apps/web/dist/` |
| Prisma client | `pnpm exec prisma generate` | node_modules client |

Web build includes SEO prerender script.

---

## Environment Structure

- Root `.env` (not in git) — loaded by `load-api-env.sh`
- `ecosystem.config.js` embeds defaults + overrides from env
- Key vars: `DATABASE_URL`, `REDIS_URL`, `JWT_*`, `CORS_ORIGINS`, `MEDIA_ROOT`, `MEILI_*`, `SENTRY_*`, `METRICS_BEARER_TOKEN`

**Security note:** ecosystem.config.js in repo contains example DB credentials — production should override via env (audit only, do not expose in commits going forward).

---

## Rollback Flow

| Layer | Rollback |
|-------|----------|
| Code | `git checkout <prev>` + re-run `deploy-full.sh` |
| API only | PM2 restart previous dist if backed up |
| nginx | Restore previous `livegrid.ru.conf` + `nginx -s reload` |
| Frontend | Previous `apps/web/dist` tarball |
| DB | `prisma migrate` is forward-only — rollback requires DB restore |

Fastest safe rollback: git revert + deploy-from-git (no manual file edits).

---

## Caching Layers

| Layer | Policy |
|-------|--------|
| nginx `/assets/` | `Cache-Control: public, max-age=2592000, immutable` |
| nginx `/index.html` | no-cache |
| Redis API cache | 45–60s TTL on catalog endpoints |
| Browser | SPA chunk reload on deploy (lazyWithReload pattern) |

---

## CI/CD

**No GitHub Actions observed** in monorepo audit.  
Deployment is **manual/SSH script driven**: `deploy-from-git.sh` on server.

---

## Runtime Separation

| Concern | Process |
|---------|---------|
| HTTP API | PM2 `lg-api` :3000 |
| Static SPA | nginx file serve |
| Feed import worker | BullMQ in same Nest process |
| Monitoring | Docker prometheus/grafana (optional) |
| Telegram bot | Part of Nest modules |

---

## Production vs Documented Laravel Deploy

| | Nest `/var/www/lg` | Laravel `/var/www/livegrid.ru` |
|--|-------------------|-------------------------------|
| Active on livegrid.ru | ✅ | ❌ |
| Deploy command | `bash deploy/deploy-from-git.sh` | `php artisan deploy` |
| nginx | Nest ssl conf | PHP-FPM conf (dev template exists) |

These are **separate deployment pipelines** for separate apps.
