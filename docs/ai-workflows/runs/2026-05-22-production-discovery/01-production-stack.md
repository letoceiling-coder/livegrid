# 01 — Production Stack

**Audit date:** 2026-05-22  
**Domain:** https://livegrid.ru  
**Expected server path:** `/var/www/lg`  
**Mode:** READ-ONLY discovery

---

## Evidence Sources

| Source | Status |
|--------|--------|
| Live HTTP probes (`curl` → livegrid.ru) | ✅ Verified |
| Nest monorepo source (`deployment/tmp-lg-work`) | ✅ Verified (git: `letoceiling-coder/lg`, HEAD `43b5026`) |
| SSH `root@85.198.64.93` | ❌ Permission denied (publickey) — filesystem/PM2 not inspected on host |

All server-path claims below match **deploy scripts + live HTTP behavior**, not direct SSH listing.

---

## Current Production Stack (Verified)

```
Internet
   │
   ▼
nginx 1.24.0 (Ubuntu) — livegrid.ru:443
   │
   ├─ location /api/        → proxy_pass http://127.0.0.1:3000  (NestJS)
   ├─ location /uploads/    → proxy_pass http://127.0.0.1:3000
   ├─ location /docs        → proxy_pass http://127.0.0.1:3000  (Swagger)
   └─ location /, /assets/  → static SPA /var/www/lg/apps/web/dist
```

| Layer | Technology | Verified how |
|-------|------------|--------------|
| Edge | nginx 1.24.0 | HTTP `Server` header |
| API runtime | NestJS 11 on Express | `x-powered-by: Express` on all `/api/v1/*` |
| API port | 3000 | `deploy/livegrid.ru.ssl.conf`, `ecosystem.config.js` |
| Process manager | PM2 app `lg-api` | `deploy/ecosystem.config.js`, `verify-on-server.sh` |
| Database | PostgreSQL | Prisma schema + health JSON `"database":"up"` |
| ORM | Prisma 6 | `packages/database/prisma/schema.prisma` |
| Cache / queue | Redis + BullMQ | `FeedImportModule`, `CacheService`, ecosystem env |
| Geo | PostGIS (`ST_DWithin`, `ST_Within`) | `GeoSpatialService` raw SQL |
| Search (optional) | Meilisearch | `CatalogMeilisearchService`, `.env.example` |
| Frontend | React 18 + Vite 5 SPA | `apps/web`, prod bundle `/assets/index-DzWwKgn8.js` |
| State | TanStack Query v5 | `apps/web/package.json` |
| UI | Tailwind + shadcn/Radix | `apps/web` dependencies |
| Maps | Yandex Maps 2.1 | `MapSearch.tsx` |
| Monitoring | Prometheus + Grafana (optional docker) | `deploy-full.sh` |
| Error tracking | Sentry | `@sentry/nestjs`, `@sentry/react` |

---

## Live API Smoke (2026-05-22)

| Endpoint | HTTP | Runtime signature |
|----------|------|-------------------|
| `GET /api/v1/health` | 200 | `{"status":"ok","services":{"database":"up"}}` |
| `GET /api/v1/blocks?region_id=1&per_page=3` | 200 | Blocks with `latitude`, `longitude`, images |
| `GET /api/v1/listings?region_id=1&per_page=1&kind=APARTMENT` | 200 | Listing rows (lat/lng often null) |
| `GET /api/v1/stats/listing-kind-counts?region_id=1` | 200 | `APARTMENT: 14917` |
| `GET /api/v1/blocks/catalog-counts?region_id=1` | 200 | blocks/apartments counts |
| `GET /api/v1/search/catalog-hints?region_id=1&q=...` | 200 | Catalog hints |
| `GET /api/v1/map/complexes` | **404** | Route does **not** exist on Nest |
| `GET /api/v1/search/complexes` | **404** | Route does **not** exist on Nest |

---

## Monorepo Layout (source: `/var/www/lg` mirror)

```
lg/                          # pnpm workspace root
├── apps/
│   ├── api/                 # @lg/api — NestJS backend
│   └── web/                 # @lg/web — public SPA + /admin
├── packages/
│   ├── database/            # Prisma schema, migrations, seed
│   └── shared/              # Shared types/utils
├── deploy/                  # nginx, PM2, deploy scripts
├── package.json             # pnpm scripts: dev:api, build:web, etc.
└── pnpm-workspace.yaml      # apps/*, packages/*
```

**Git remote (local mirror):** `https://github.com/letoceiling-coder/lg.git`  
**Local HEAD:** `43b5026 fix(house-catalog): фильтры район/направление...`

**Production frontend asset:** `index-DzWwKgn8.js`, `Last-Modified: Mon, 04 May 2026` — may lag local git.

---

## What Is NOT Production

| Item | Status |
|------|--------|
| Laravel monolith in workspace root (`/home/dsc-2/livegrid`) | ❌ Not serving livegrid.ru |
| `GET /api/v1/map/complexes` (Laravel route) | ❌ 404 on production |
| `php artisan deploy` → `/var/www/livegrid.ru` | ❌ Different deploy target |
| `frontend/` (Laravel Vite app) | ❌ Not deployed to livegrid.ru |
| `dev.livegrid.ru` Laravel nginx config | ❌ API returns 404 File not found |

---

## Runtime Requirements (from ecosystem + package.json)

| Tool | Version |
|------|---------|
| Node | >= 22 |
| pnpm | >= 10 |
| PostgreSQL | Prisma datasource |
| Redis | BullMQ + cache |
| PM2 | Process supervisor |

---

## Source of Truth Declaration

For **livegrid.ru** production work:

| Concern | Source of truth |
|---------|-----------------|
| API contracts | Nest `apps/api` controllers + Swagger `/docs` |
| DB schema | `packages/database/prisma/schema.prisma` |
| Public UI | `apps/web/src/redesign/*` |
| Deploy | `deploy/deploy-full.sh`, `deploy/livegrid.ru.ssl.conf` |
| Repo | `github.com/letoceiling-coder/lg` cloned to `/var/www/lg` |

**Not source of truth for production:** Laravel `routes/api.php`, workspace `frontend/`, R2.2b Laravel map migration.
