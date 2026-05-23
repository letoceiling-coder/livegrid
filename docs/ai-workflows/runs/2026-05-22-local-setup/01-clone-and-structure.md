# 01 — Clone and repository structure

**Date:** 2026-05-22  
**Scope:** Production Nest monorepo only (`https://github.com/letoceiling-coder/lg.git`)  
**Local path:** `/home/dsc-2/livegrid` (`~/livegrid`)

## Clone status

| Item | Value |
|------|-------|
| Remote | `https://github.com/letoceiling-coder/lg.git` |
| Branch | `main` |
| HEAD | `43b5026` — fix(house-catalog): фильтры район/направление, скрипт бэкапа из DB.sql |
| Clone target | `~/livegrid` — **already present, not overwritten** |

```bash
# If cloning fresh:
git clone https://github.com/letoceiling-coder/lg.git ~/livegrid
cd ~/livegrid
```

## Monorepo layout

```
~/livegrid/
├── apps/
│   ├── api/          # NestJS backend (Express, port 3000, prefix /api/v1)
│   └── web/          # React SPA (Vite, port 5173)
├── packages/
│   ├── database/     # Prisma schema, migrations, seed
│   └── shared/       # Shared types/utils
├── deploy/           # Production deploy scripts, nginx, PM2 ecosystem
├── docker-compose.yml
├── .env.example
├── pnpm-workspace.yaml
├── package.json
└── scripts/          # local-infra-start.sh, local-dev-api.sh (added during setup)
```

**Note:** No root `README.md` or `turbo.json` at HEAD. Workspace is **pnpm-only** (not Turborepo).

## Workspace config

`pnpm-workspace.yaml`:

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

## Root scripts (`package.json`)

| Script | Purpose |
|--------|---------|
| `pnpm dev:api` | Nest watch via `tsx watch src/main.ts` |
| `pnpm dev:web` | Vite dev server |
| `pnpm dev:admin` | Admin app (if used) |
| `pnpm build:api` / `build:web` | Production builds |
| `pnpm db:generate` | `prisma generate` |
| `pnpm db:migrate` | `prisma migrate dev` (interactive) |
| `pnpm db:seed` | Seed via `tsx prisma/seed.ts` |
| `pnpm db:studio` | Prisma Studio |

**Engines:** Node `>=22`, pnpm `>=10`.

## Runtime requirements (verified)

- **Node.js 22** — installed via nvm: `v22.22.3`
- **pnpm 10** — `10.33.0`
- **PostgreSQL 16+** with **PostGIS**
- **Redis 7+**

## Production reference (read-only, not modified)

| Item | Production value |
|------|------------------|
| Server path | `/var/www/lg` |
| Domain | `https://livegrid.ru` |
| API | Nest on `:3000`, nginx proxies `/api/` |
| SPA | `apps/web/dist` served by nginx |
| PM2 | `deploy/ecosystem.config.js` → `lg-api` |

## What this repo is NOT

- Not the Laravel monolith at `/home/dsc-2/livegrid`
- Not `frontend/` in the Laravel repo
- Map API on production: `GET /api/v1/blocks`, `GET /api/v1/listings` — **not** `/map/complexes`

## Next steps

→ [02-local-infra.md](./02-local-infra.md)
