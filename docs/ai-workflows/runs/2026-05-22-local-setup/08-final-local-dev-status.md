# 08 — Final local dev status

**Date:** 2026-05-22  
**Goal:** Fully working local clone of production Nest platform  
**Mode:** Safe setup only — no production server/DB touched

---

## Summary

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Clone `~/livegrid` | ✅ Done | HEAD `43b5026`, not overwritten |
| 2. Repo discovery | ✅ Done | pnpm monorepo, apps/api + apps/web |
| 3. Local infra | ✅ Done | Miniforge PG 16+PostGIS + Redis 8.6, no sudo |
| 4. Env setup | ✅ Done | `~/livegrid/.env` local-only, LF fixed |
| 5. Database | ✅ Done | migrate deploy + seed + `db push` for schema drift |
| 6. Start services | ✅ Partial | API via **build** works; `dev:api` fails |
| 7. Map verification | ✅ Partial | Page + APIs work; empty data, no Yandex key |
| 8. Workspace docs | ✅ Done | This run folder (8 files) |

---

## What is running now

| Service | URL / Port | Status |
|---------|------------|--------|
| PostgreSQL | `localhost:5432` / `lg_development` | ✅ Up |
| Redis | `localhost:6379` | ✅ Up (PONG) |
| Nest API | `http://localhost:3000/api/v1` | ✅ Up (node dist/main.js) |
| Vite web | `http://localhost:5173` | ✅ Up |
| Swagger | `http://localhost:3000/docs` | ✅ 200 |

---

## Verified commands (copy-paste)

```bash
# Infra
~/livegrid/scripts/local-infra-start.sh

# API
~/livegrid/scripts/local-dev-api.sh

# Web (separate terminal)
cd ~/livegrid && nvm use 22 && pnpm dev:web

# Smoke
curl -s http://localhost:3000/api/v1/health
curl -s "http://localhost:3000/api/v1/blocks?region_id=1&per_page=1"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/map
```

---

## Known issues (documented, not hidden)

### 1. `pnpm dev:api` fails (tsx watch)

```
UndefinedDependencyException: FeedImportService dependency at index [0]
```

**Workaround:** `pnpm build:api && node apps/api/dist/main.js` (or `scripts/local-dev-api.sh`).

### 2. Schema drift: `listings.lat` / `listings.lng`

Migrations don't add columns present in Prisma schema.  
**Local fix applied:** `npx prisma db push --accept-data-loss`  
**Repo fix needed:** proper migration.

### 3. CRLF in `.env`

Causes 404 on all API routes if `\r` suffix on env vars.  
**Fix:** `sed -i 's/\r$//' ~/livegrid/.env` + `unset API_PORT API_PREFIX` before sourcing.

### 4. Empty map data

Seed does not import TrendAgent feeds. Blocks/listings APIs return `data: []`.  
**Next step:** set `FEED_LOCAL_DIR` or run admin feed import.

### 5. Yandex Maps

`GET /content/maps-config` → `{"apiKey":null}`. Map UI loads but tiles may not render.

### 6. Docker / sudo unavailable

Used Miniforge user-space install instead of `docker compose` or `systemctl`.

---

## Tooling installed on this machine

| Tool | Location / Version |
|------|-------------------|
| nvm + Node 22 | `v22.22.3` |
| pnpm | `10.33.0` |
| Miniforge | `~/miniforge` |
| Helper scripts | `~/livegrid/scripts/local-infra-start.sh`, `local-dev-api.sh` |

---

## Security checklist

- [x] No production DATABASE_URL in local `.env`
- [x] No production JWT secrets copied
- [x] No SSH/deploy to production server
- [x] No nginx/PM2 changes on remote
- [x] Local DB name `lg_development` (not `lg_production`)

---

## Ready for map improvements?

**Yes — infrastructure gate passed.**

Before meaningful map UI work:

1. Import feed data **or** create test listings with lat/lng
2. Optionally set Yandex Maps API key
3. Open Cursor workspace at `~/livegrid`
4. Edit `apps/web/src/redesign/pages/RedesignMap.tsx` (Nest), not Laravel `RedesignMap.tsx`

---

## Doc index

1. [01-clone-and-structure.md](./01-clone-and-structure.md)
2. [02-local-infra.md](./02-local-infra.md)
3. [03-env-setup.md](./03-env-setup.md)
4. [04-db-setup.md](./04-db-setup.md)
5. [05-startup-flow.md](./05-startup-flow.md)
6. [06-map-verification.md](./06-map-verification.md)
7. [07-workspace-strategy.md](./07-workspace-strategy.md)
8. **08-final-local-dev-status.md** (this file)
