# Iter 47 — Phase 3: Deploy Simulation

## Local simulation (completed)

```bash
cd ~/livegrid
pnpm --filter @lg/shared build        ✓
pnpm --filter web exec tsc --noEmit   ✓
pnpm --filter api exec tsc --noEmit   ✓
```

## deploy-full.sh sequence (production)

| Step | Command | Risk |
|------|---------|------|
| 1 | `pnpm install --frozen-lockfile` | lockfile mismatch if push incomplete |
| 2 | `prisma generate` | low |
| 3 | **`prisma migrate deploy`** | **12 pending migrations** |
| 4 | `pnpm build:api` | ~4 min |
| 5 | `pnpm build:web` | ~2 min, cleans old dist |
| 6 | `pm2 reload ecosystem.config.js` | brief API blip |
| 7 | nginx reload | low |
| 8 | verify-on-server.sh runtime | smoke POST /requests |

## Env loading (Iter 46 hardening)

- `ecosystem.config.js` reads `/var/www/lg/.env` — no hardcoded DB password
- `load-api-env.sh` sources `.env` for Prisma CLI
- rsync deploy excludes `.env` — safe

## Hidden failure modes

| Failure | Detection | Mitigation |
|---------|-----------|------------|
| Push not done | prod pulls old code | verify `git log -1` after pull |
| migrate lock timeout | deploy-full exits 1 | low-traffic window; check pg locks |
| build OOM | nest build killed | 59G disk OK; monitor RAM during build |
| pm2 missing DATABASE_URL | API crash loop | verify `.env` has DATABASE_URL before reload |
| frozen-lockfile fail | pnpm install exit | deploy-full falls back to `pnpm install` |

## Staging simulation NOT run

No separate staging server. Simulation = local tsc + deploy script review + prod infra health check.
