# Iter 47 — Phase 7: Rollback Playbook

## When to rollback

- migrate deploy failed mid-chain
- API health not OK after 5 min
- Critical user-facing regression (auth, catalog, payments)
- verify-on-server.sh fails

## Code rollback (fast — ~10 min)

```bash
ssh root@85.198.64.93
cd /var/www/lg

# Option A: known good SHA
git fetch origin
git checkout 43b5026
bash deploy/deploy-full.sh

# Option B: switch remote back to lg.git temporarily
git remote set-url origin https://github.com/letoceiling-coder/lg.git
git pull --ff-only origin main
bash deploy/deploy-full.sh
```

## PM2 rollback

deploy-full uses `pm2 reload` — previous process replaced.  
Code rollback + `deploy-full.sh` rebuilds dist from checked-out SHA.

## DB rollback (emergency only)

**Migrations are forward-only.** Prisma has no auto-down.

| Situation | Action |
|-----------|--------|
| migrate failed before commit | Fix migration, redeploy — no DB change |
| migrate succeeded, app broken | Code rollback sufficient if schema compatible |
| Data corruption | Restore from `pg_dump` backup |

```bash
# DESTRUCTIVE — drops/recreates objects per dump flags
pg_restore -c -d lg_production /var/backups/lg-pre-cutover-*/lg_production_*.dump
```

## Migration caveats after partial apply

If migrate stopped at migration N:

1. Check `_prisma_migrations` table
2. Fix failing SQL manually or adjust migration
3. Never run `migrate reset` on production

## Uploads rollback

```bash
cd /var/www/lg
tar xzf /var/backups/lg-pre-cutover-*/uploads_*.tar.gz
```

## Communication

- Note rollback time + SHA restored
- File incident in ai-workflows runs folder
