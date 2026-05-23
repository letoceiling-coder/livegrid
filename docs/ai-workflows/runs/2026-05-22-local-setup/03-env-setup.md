# 03 — Environment setup

**Date:** 2026-05-22  
**Rule:** Local-only values. No production secrets copied.

## Source of truth

| File | Purpose |
|------|---------|
| `~/livegrid/.env.example` | Template (lists all supported vars) |
| `~/livegrid/docker-compose.yml` | Dev DB/Redis credentials |
| `~/livegrid/apps/api/src/app.module.ts` | `envFilePath: '../../.env'` (repo root) |
| `~/livegrid/apps/web/vite.config.ts` | `envDir: repoRoot` (repo root) |

## Created file

**Path:** `~/livegrid/.env` (gitignored)

```bash
cp ~/livegrid/.env.example ~/livegrid/.env
# Edit values — see table below
```

### Local values (verified working)

```env
DATABASE_URL=postgresql://lg_admin:lg_dev_password@localhost:5432/lg_development
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=local-dev-access-secret-min-32-chars-xx
JWT_REFRESH_SECRET=local-dev-refresh-secret-min-32-chars-x
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

API_PORT=3000
API_PREFIX=/api/v1
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
PUBLIC_SITE_URL=http://localhost:5173

TRENDAGENT_BASE_URL=https://dataout.trendagent.ru
TRENDAGENT_DEFAULT_REGION=msk
TRENDAGENT_REGIONS=msk
FEED_IMPORT_DISABLE_REPEAT=true

S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=lg-media
S3_REGION=us-east-1

TELEGRAM_WEBHOOK_URL=http://localhost:3000/api/v1/telegram-bot/webhook
```

### Prisma symlink

Prisma CLI reads `.env` from `packages/database/`:

```bash
ln -sf ../../.env ~/livegrid/packages/database/.env
```

## Critical: Unix line endings (LF)

**`.env` MUST use LF, not CRLF.** Windows-style `\r` in `API_PORT` or `API_PREFIX` breaks Nest routing:

- Symptom: all routes return `404 Cannot GET /api/v1/health`
- Log shows: `API running on http://localhost:3000\r/api/v1`

Fix:

```bash
sed -i 's/\r$//' ~/livegrid/.env
```

Also avoid polluting the shell:

```bash
unset API_PORT API_PREFIX DATABASE_URL REDIS_URL
set -a && source ~/livegrid/.env && set +a
```

## Variables NOT set locally (intentionally empty)

| Variable | Reason |
|----------|--------|
| `MEILI_HOST` | Optional; PostgreSQL-only search works |
| `SENTRY_DSN_*` | No error reporting to prod |
| `TG_API_ID`, `TG_SESSION_STRING` | Telegram import not needed for map |
| `YANDEX_MAPS_API_KEY` | Set in admin → site_settings or env; map loads without markers key |
| `FEED_LOCAL_DIR` | No local TrendAgent feed dump |

## Seed credentials (local admin)

From `packages/database/prisma/seed.ts`:

- Email: `admin@livegrid.ru`
- Password: `admin123!`

## Node version

```bash
nvm install 22
nvm use 22
node -v   # v22.22.3
corepack enable
pnpm -v   # 10.33.0
```

→ [04-db-setup.md](./04-db-setup.md)
