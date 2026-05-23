# Iter 47 — Phase 5: Cutover Plan

## Prerequisites

- [ ] `git push origin main` succeeded (livegrid.git has `df26fc5+`)
- [ ] Operator has SSH access to `root@85.198.64.93`
- [ ] Backups created (see `02-backup-strategy.md`)

## Timed checklist

| # | Step | Command | Est. |
|---|------|---------|------|
| 0 | Maintenance decision | Low-traffic window | — |
| 1 | **Backup** | pg_dump + uploads tar + sha | 5 min |
| 2 | Switch remote | `bash deploy/switch-production-remote.sh` | 1 min |
| 3 | Deploy | `bash deploy/remote-git-deploy.sh` | 10–15 min |
| 4 | Verify SHA | `ssh root@85.198.64.93 'cd /var/www/lg && git log -1'` | 10 sec |
| 5 | Smoke QA | See `06-runtime-qa.md` | 10 min |

## Alternative: manual on server

```bash
ssh root@85.198.64.93

# After backup:
cd /var/www/lg
git remote set-url origin https://github.com/letoceiling-coder/livegrid.git
git fetch origin main
git pull --ff-only origin main
bash deploy/deploy-full.sh
```

## deploy-full.sh internal order

```
install → prisma generate → migrate deploy → build api → build web → pm2 reload → nginx → verify
```

## Abort conditions

Stop and rollback if:

- `migrate deploy` fails
- `pnpm build:api` fails
- health check not `status:ok` after 60s
- verify-on-server.sh runtime fails

## Post-cutover

- Monitor `pm2 logs lg-api --lines 100`
- Check Sentry if configured
- Run full QA matrix (`06-runtime-qa.md`)
