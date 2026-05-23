# Release flow — ~/livegrid → /var/www/lg

## Canonical chain (target state)

```
~/livegrid  →  git push origin main  →  livegrid.git  →  /var/www/lg  →  pm2 lg-api
```

| Layer | Value |
|-------|-------|
| Local workspace | `~/livegrid` |
| Git remote (canonical) | `origin` → `livegrid.git` |
| Git remote (legacy mirror) | `legacy-lg` → `lg.git` (transition only) |
| Deploy path (production) | `/var/www/lg` |
| Deploy branch | `main` |
| Server | `root@85.198.64.93` |

## One-time setup (local)

```bash
cd ~/livegrid
bash deploy/setup-git-remotes.sh
```

## Standard release

### 1. Dev verification

```bash
cd ~/livegrid
pnpm --filter @lg/shared build
pnpm --filter web exec tsc --noEmit
pnpm --filter api exec tsc --noEmit
```

### 2. Commit + push (canonical)

```bash
git add apps packages deploy scripts package.json pnpm-lock.yaml ...
git commit -m "feat: ..."
git push origin main
```

Optional during transition:

```bash
git push legacy-lg main   # mirror to lg.git
```

### 3. Production remote switch (ONE TIME)

**Only after** `livegrid.git/main` contains consolidated monorepo:

```bash
bash deploy/switch-production-remote.sh --dry-run
bash deploy/switch-production-remote.sh
```

### 4. Deploy

```bash
bash deploy/remote-git-deploy.sh
```

Or on server directly:

```bash
ssh root@85.198.64.93 'cd /var/www/lg && bash deploy/deploy-from-git.sh'
```

### 5. Smoke QA

```bash
curl -sS https://livegrid.ru/api/v1/health
ssh root@85.198.64.93 'cd /var/www/lg && bash deploy/verify-on-server.sh runtime'
```

Manual: auth, admin, CRM, map, listings, ops center.

## Alternative: rsync deploy (legacy)

`deploy/sync-to-server.sh` / `sync-from-windows.ps1` — bypasses git, uses tarball + `deploy-full.sh`.  
Use only for hotfix when git deploy blocked. **Not canonical.**

## Rollback

```bash
ssh root@85.198.64.93
cd /var/www/lg
git log -5 --oneline
git checkout <previous-sha>
bash deploy/deploy-full.sh
```

DB rollback: migrations are additive — no automatic down. See `05-migration-safety.md`.

## Environment override

```bash
LG_REPO_URL=https://github.com/letoceiling-coder/lg.git bash deploy/remote-git-deploy.sh
```

For emergency deploy from legacy remote before switch completes.
