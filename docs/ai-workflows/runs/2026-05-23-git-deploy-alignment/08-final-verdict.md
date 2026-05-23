# Iter 46 — Final Verdict: Git Remote + Deploy Alignment

**Date:** 2026-05-23  
**Verdict:** **GO_WITH_HOLD**

## Summary

Mapped production deploy topology (verified: **lg.git @ 43b5026**), established **livegrid.git** as canonical remote, centralized deploy config, hardened secrets + pm2 reload, and documented single release chain to `/var/www/lg`.

## Shipped

| Item | Status |
|------|--------|
| `deploy/config.sh` — canonical repo URL | ✓ |
| Default repo → livegrid.git in deploy scripts | ✓ |
| `legacy-lg` remote + `setup-git-remotes.sh` | ✓ |
| `switch-production-remote.sh` (dry-run tested) | ✓ |
| ecosystem.config.js — secrets from .env | ✓ |
| pm2 reload (zero-downtime-ish) | ✓ |
| `deploy/RELEASE.md` + docs 01–07 | ✓ |

## Production truth (verified, not guessed)

```
/var/www/lg → origin = lg.git → 43b5026 → pm2 lg-api online
```

## Target chain

```
~/livegrid → livegrid.git/main → /var/www/lg → pm2 reload
```

## Validation

```
git remote -v                    ✓ origin=livegrid, legacy-lg=lg
deploy scripts → livegrid.git    ✓ (config.sh)
switch-production-remote dry-run ✓
~/lg references in deploy/       ✓ none (legacy in config only)
ecosystem hardcoded secrets      ✓ removed
```

## HOLD — required before prod deploy

| Step | Owner | Risk if skipped |
|------|-------|-----------------|
| **Commit + push** consolidated monorepo to livegrid.git | Dev | Prod gets no new code |
| **pg_dump** before first migrate deploy | Ops | No DB rollback |
| **switch-production-remote.sh** on server | Ops | Prod keeps pulling lg.git |
| **remote-git-deploy.sh** | Ops | Code not deployed |
| Smoke QA checklist | QA | Silent regressions |
| JWT rotation (recommended) | Ops | Old secrets in git history |

## Strategic outcome

Single trustworthy deployment chain is **designed and scripted**. Production remote switch is **intentionally manual** — prevents breaking live site before consolidated code is pushed to livegrid.git.

**Next command when ready:**

```bash
cd ~/livegrid
git add apps packages deploy scripts package.json pnpm-lock.yaml pnpm-workspace.yaml docker-compose.yml tsconfig.base.json
git commit -m "feat: consolidate monorepo and align deploy to livegrid.git"
git push origin main
bash deploy/switch-production-remote.sh
bash deploy/remote-git-deploy.sh
```
