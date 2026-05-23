# Iter 46 — Phase 6: Env + Secret Audit

## Local (`~/livegrid/.env`)

| Check | Result |
|-------|--------|
| PostgreSQL dev DB | `lg_development@localhost` ✓ |
| JWT secrets | local-only placeholders ✓ |
| No production DB URL | ✓ |
| Consolidation pollution | **None** — lg dev .env copied, not prod |

Laravel env preserved as `.env.laravel.legacy` (MySQL, unrelated).

## Production (`/var/www/lg/.env`)

| Check | Result |
|-------|--------|
| File exists on server | ✓ (SSH verified) |
| In git | ✗ (gitignored) |
| rsync/tar deploy | excludes `.env` ✓ |

## Iter 46 security fix: ecosystem.config.js

**Before:** hardcoded production DATABASE_URL + JWT secrets in git  
**After:** reads from `$DEPLOY_ROOT/.env` via parseDotEnv()

Production pm2 will use server `.env` — verified file exists.

## .env.example

- Placeholder passwords only (`PASSWORD`, `change-me-*`)
- Safe to commit

## Risk items

| Item | Severity | Mitigation |
|------|----------|------------|
| Legacy ecosystem secrets in git history | Medium | Rotated via .env on server; old commits may contain password — consider JWT rotation post-deploy |
| sync-to-server.sh bypasses git | Low | Document as emergency-only |
| local .env in git status | None | gitignored |

## Consolidation did NOT

- Copy production secrets to local `.env`
- Modify server `.env`
- Expose TG tokens in committed files

## Recommended post-alignment

1. Rotate JWT secrets on production after ecosystem hardening deploy
2. Verify `.env` on server has all keys pm2 needs
3. Add `METRICS_BEARER_TOKEN` to server `.env` if monitoring used
