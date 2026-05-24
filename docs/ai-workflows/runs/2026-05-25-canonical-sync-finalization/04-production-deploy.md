# 04 — Production Deploy

**Iteration:** 83 · **Date:** 2026-05-25

## Method

```bash
bash deploy/remote-git-deploy.sh
```

Equivalent on server:

```bash
cd /var/www/lg
git pull --ff-only origin main
bash deploy/deploy-full.sh
```

## Deploy order (deploy-full.sh)

1. `pnpm install --frozen-lockfile`
2. Prisma generate
3. `prisma migrate deploy`
4. Build API
5. Clean stale web artifacts → `pnpm build:web`
6. `pm2 reload deploy/ecosystem.config.js --update-env`
7. Nginx config copy + reload
8. Monitoring stack (optional docker)
9. `verify-on-server.sh runtime`

## Server

- Host: `root@85.198.64.93`
- Path: `/var/www/lg`
- Branch: `main`

## No partial deploys

Governance, feed, sitemap, and web ship together in one full deploy.
