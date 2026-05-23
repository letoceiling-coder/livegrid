# 05 — Startup flow

**Date:** 2026-05-22  
**Verified local stack:** PostgreSQL + Redis + API `:3000` + Web `:5173`

## Prerequisites checklist

1. Infra running → [02-local-infra.md](./02-local-infra.md)
2. `~/livegrid/.env` with LF line endings → [03-env-setup.md](./03-env-setup.md)
3. Migrations + seed (+ optional `db push`) → [04-db-setup.md](./04-db-setup.md)
4. Node 22 + pnpm install

## Terminal 1 — Infrastructure

```bash
~/livegrid/scripts/local-infra-start.sh
```

## Terminal 2 — API

### Option A — Production build (verified working)

```bash
chmod +x ~/livegrid/scripts/local-dev-api.sh
~/livegrid/scripts/local-dev-api.sh
```

Or manually:

```bash
cd ~/livegrid
nvm use 22
unset API_PORT API_PREFIX
set -a && source .env && set +a
pnpm build:api
cd apps/api && node dist/main.js
```

Expected log:

```
API running on http://localhost:3000/api/v1
Swagger: http://localhost:3000/docs
Repeatable feed import cron disabled (FEED_IMPORT_DISABLE_REPEAT)
Redis cache connected
```

### Option B — `pnpm dev:api` (NOT working at HEAD)

```bash
pnpm dev:api   # tsx watch src/main.ts
```

**Fails** with:

```
UndefinedDependencyException: FeedImportService (?, +, +, +, +, BullQueue_feed-import)
```

Root cause: circular/undefined DI at runtime under `tsx watch`. **Production `nest build` + `node dist/main.js` works.** Use Option A until fixed upstream.

## Terminal 3 — Web (Vite)

```bash
cd ~/livegrid
nvm use 22
pnpm dev:web
```

Expected:

```
VITE v5.4.21  ready
➜  Local:   http://localhost:5173/
```

Vite proxies (from `apps/web/vite.config.ts`):

| Path | Target |
|------|--------|
| `/api/*` | `http://127.0.0.1:3000` |
| `/uploads/*` | `http://127.0.0.1:3000` |

## Smoke tests

```bash
# Health
curl -s http://localhost:3000/api/v1/health

# Regions (seeded)
curl -s http://localhost:3000/api/v1/regions

# Blocks (empty without feed import)
curl -s "http://localhost:3000/api/v1/blocks?region_id=1&per_page=1"

# Listings (empty; requires db push if schema drift)
curl -s "http://localhost:3000/api/v1/listings?region_id=1&per_page=1"

# Via Vite proxy
curl -s http://localhost:5173/api/v1/health

# Swagger
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/docs   # 200

# SPA
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/map    # 200
```

## Verified responses (2026-05-22)

```json
// GET /api/v1/health
{"status":"ok","timestamp":"...","services":{"database":"up"}}

// GET /api/v1/regions (truncated)
[{"id":1,"code":"MSK","name":"Москва",...},{"id":3,"code":"BELGOROD",...}]

// GET /api/v1/blocks?region_id=1&per_page=1
{"data":[],"meta":{"page":1,"per_page":1,"total":0,"total_pages":0}}
```

## Optional services

| Service | Start | Needed for map? |
|---------|-------|-----------------|
| MinIO | `docker compose up -d minio` | No (media uploads) |
| Meilisearch | `docker compose --profile search up -d` | No (PG fallback) |

## Production deploy reference (read-only)

Production uses PM2 (`deploy/ecosystem.config.js`):

- `cwd`: `/var/www/lg/apps/api`
- `script`: `dist/main.js`
- DB: `lg_production` (never point local `.env` there)

Deploy scripts in `deploy/`: `deploy-from-git.sh`, `deploy-full.sh`, `deploy-api.sh`.

→ [06-map-verification.md](./06-map-verification.md)
