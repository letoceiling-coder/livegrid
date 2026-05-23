# Iter 46 — Phase 3: Remote Strategy

## Decision: livegrid.git canonical, /var/www/lg deploy path unchanged

```
LOCAL DEV          GIT CANONICAL         PRODUCTION FS
~/livegrid    →    livegrid.git     →    /var/www/lg
  origin              main branch          pm2 lg-api
  legacy-lg           (protected)          nginx
  (mirror only)
```

## Why not rename /var/www/lg?

- nginx, pm2, cron, uploads, monitoring all reference `/var/www/lg`
- Renaming filesystem path = high-risk downtime
- Git remote name ≠ directory name

## Why not keep lg.git as canonical?

- Iter 45 established `~/livegrid` as single local workspace
- livegrid.git is the intended org repo
- lg.git stuck at 43b5026 without Iter 42–44 work

## Transition strategy (3 phases)

### Phase A — Local (DONE Iter 46)

```bash
bash deploy/setup-git-remotes.sh
# origin → livegrid.git
# legacy-lg → lg.git
```

Deploy script defaults updated to `livegrid.git` via `deploy/config.sh`.

### Phase B — Push consolidated code

```bash
git add apps packages deploy scripts ...
git commit -m "feat: consolidate monorepo Iter 15-44"
git push origin main
```

Optional mirror during transition:

```bash
git push legacy-lg main
```

### Phase C — Production switch (ONE TIME)

```bash
bash deploy/switch-production-remote.sh
bash deploy/remote-git-deploy.sh
```

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production deploy branch (ff-only pull) |
| feature/* | Dev work → PR → main |

**Recommendation:** protect `main` on GitHub (require PR, no force push).

## Rollback remote

```bash
LG_REPO_URL=https://github.com/letoceiling-coder/lg.git bash deploy/remote-git-deploy.sh
```

## Files added

- `deploy/config.sh` — single config source
- `deploy/setup-git-remotes.sh`
- `deploy/switch-production-remote.sh`
- `deploy/RELEASE.md`
