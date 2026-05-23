# 07 — Cursor workspace and git strategy

**Date:** 2026-05-22

## Primary workspace

| Repo | Path | Role |
|------|------|------|
| **Production Nest (truth)** | `~/livegrid` | Map, API, web — **open this in Cursor** |
| Laravel monolith | `/home/dsc-2/livegrid` | Legacy/alternate stack — **not production** |

### Recommended Cursor setup

1. **File → Open Folder →** `/home/dsc-2/livegrid`
2. Add Laravel as secondary root only if needed: **File → Add Folder to Workspace**
3. Do not treat `livegrid/frontend/` as production map target

## `.cursor/rules` alignment

Create in `~/livegrid/.cursor/rules/production-platform.mdc` (recommended content):

```markdown
---
description: LiveGrid production platform (Nest monorepo)
globs: ["**/*"]
---

- Production site https://livegrid.ru runs from this repo (Nest + React), not Laravel.
- Map page: apps/web/src/redesign/pages/RedesignMap.tsx
- Map APIs: GET /api/v1/blocks, GET /api/v1/listings
- Local dev: pnpm build:api + node dist/main.js (dev:api broken at HEAD)
- Never use production DATABASE_URL or deploy scripts against prod without explicit request.
```

Keep Laravel-specific rules in `/home/dsc-2/livegrid/.cursor/rules/` separate.

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Matches production deploy source |
| `feature/map-*` | Map improvements on Nest web + API |
| `fix/api-*` | Nest backend fixes |

Workflow:

```bash
cd ~/livegrid
git checkout main && git pull origin main
git checkout -b feature/map-local-filters
# work, commit, push, PR to main
```

**Do not** merge Laravel R2.x map work expecting it to affect livegrid.ru.

## Git remotes

```bash
cd ~/livegrid
git remote -v
# origin  https://github.com/letoceiling-coder/lg.git
```

## Local daily workflow

```bash
# 1. Infra
~/livegrid/scripts/local-infra-start.sh

# 2. API (build mode)
~/livegrid/scripts/local-dev-api.sh &

# 3. Web
cd ~/livegrid && nvm use 22 && pnpm dev:web

# 4. Browser
# http://localhost:5173/map
```

## Deployment workflow (production — read-only reference)

Production server: `/var/www/lg` (from prior discovery audit).

Typical flow (from `deploy/`):

1. SSH to server (requires key — not available in this setup session)
2. `git pull` in `/var/www/lg`
3. `pnpm install && pnpm build:api && pnpm build:web`
4. `prisma migrate deploy` against **production** DB
5. PM2 restart `lg-api`
6. nginx serves `apps/web/dist`

**Local agents must NOT run deploy scripts or SSH without explicit user request.**

## Documentation locations

| Topic | Path |
|-------|------|
| Production discovery | `livegrid/docs/ai-workflows/runs/2026-05-22-production-discovery/` |
| Local setup (this run) | `livegrid/docs/ai-workflows/runs/2026-05-22-local-setup/` |
| Nest clone reference copy | `livegrid/deployment/tmp-lg-work/` (stale — prefer `~/livegrid`) |

## Map improvement starting point

After local setup:

1. Open `~/livegrid/apps/web/src/redesign/pages/RedesignMap.tsx`
2. Related: `apps/web/src/redesign/lib/catalog-api-params.ts`, `blocks-from-api.ts`
3. API: `apps/api/src/modules/blocks/`, `apps/api/src/modules/listings/`

→ [08-final-local-dev-status.md](./08-final-local-dev-status.md)
