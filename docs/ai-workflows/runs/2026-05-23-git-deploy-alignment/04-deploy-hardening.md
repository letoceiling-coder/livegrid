# Iter 46 — Phase 4: Deploy Hardening

## Canonical deploy sequence (`deploy-full.sh`)

```
1. pnpm install --frozen-lockfile
2. prisma generate
3. prisma migrate deploy      ← before restart
4. pnpm build:api
5. pnpm build:web (clean dist)
6. pm2 reload lg-api          ← improved Iter 46 (was delete+start)
7. nginx config + reload
8. monitoring docker profile
9. verify-on-server.sh runtime
```

## Iter 46 improvements

| Area | Before | After |
|------|--------|-------|
| PM2 restart | `pm2 delete` + `start` (downtime) | `pm2 reload --update-env` with fallback start |
| Repo URL | hardcoded lg.git in 5 files | `deploy/config.sh` central config |
| Secrets in ecosystem | hardcoded DB password in git | load from `/var/www/lg/.env` |
| Clone docs | lg.git example | livegrid.git example |

## Env handling

- `deploy/load-api-env.sh` — sources `.env` first, ecosystem fallback for Prisma CLI
- `deploy-full.sh` — requires DATABASE_URL before migrate
- rsync/tar deploy — **excludes `.env`** (preserves server secrets)

## Zero-downtime

- `pm2 reload` — graceful worker restart (~seconds API blip)
- nginx reload — no connection drop for static
- **Not zero-downtime:** `prisma migrate deploy` with locking migrations (run during low traffic)

## Rollback safety

```bash
git checkout <prev-sha>
bash deploy/deploy-full.sh
```

- Does NOT auto-rollback DB migrations
- pm2 reload picks up previous build artifacts if not cleaned

## Reproducibility

```bash
pnpm install --frozen-lockfile   # lockfile enforced
DEPLOY_ROOT=/var/www/lg          # explicit path
bash deploy/deploy-from-git.sh   # ff-only pull preferred
```

## verify-on-server.sh modes

| Mode | Checks |
|------|--------|
| `runtime` | pm2 + health + POST /requests smoke |
| `full` | runtime + DB counts + feed audit |
