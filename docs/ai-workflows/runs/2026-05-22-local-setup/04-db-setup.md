# 04 — Database setup (Prisma)

**Date:** 2026-05-22  
**Database:** `lg_development` on `localhost:5432` — **fully isolated from production**

## Install dependencies

```bash
cd ~/livegrid
nvm use 22
pnpm install
```

Verified: completes in ~46s at HEAD.

## Generate Prisma client

```bash
pnpm db:generate
```

## Apply migrations

**Non-interactive (recommended for setup):**

```bash
cd ~/livegrid/packages/database
npx prisma migrate deploy
```

Verified: all migrations through `20260504123000_house_avangard_fields` applied successfully.

**Interactive (creates new migrations during dev):**

```bash
pnpm db:migrate   # prisma migrate dev
```

## Seed

Seed requires `DATABASE_URL` in environment (tsx does not auto-load `.env`):

```bash
cd ~/livegrid
set -a && source .env && set +a
pnpm db:seed
```

### Seed creates

| Data | Details |
|------|---------|
| Feed regions | msk, mo, belgorod, spb, krd, ekb, nsk, kzn |
| Admin user | `admin@livegrid.ru` / `admin123!` |
| Site settings | company, contacts, SEO, map office coords, integrations |
| Navigation menus | header_main, footer |
| Demo news | 6 published articles |

**Seed does NOT import TrendAgent blocks/apartments.** Map will show empty markers until feed import or manual data.

## Known schema drift at HEAD (verified)

After `migrate deploy`, `GET /api/v1/listings` failed:

```
The column `listings.lat` does not exist in the current database.
```

Prisma schema (`packages/database/prisma/schema.prisma`) defines `lat`/`lng` on `Listing`, but no migration adds these columns.

**Local fix (safe on empty dev DB only):**

```bash
cd ~/livegrid/packages/database
npx prisma db push --accept-data-loss
```

After push, listings endpoint returns `200` with empty data:

```json
{"data":[],"meta":{"page":1,"per_page":2,"total":0,"total_pages":0}}
```

**Action for repo maintainers:** add migration for `listings.lat`/`listings.lng` or remove fields from schema.

## PostGIS

Migration `20260414130000_postgis_public_site_url` runs `CREATE EXTENSION IF NOT EXISTS postgis`.

Also enabled manually during infra setup:

```bash
~/miniforge/bin/psql -U lg_admin -d lg_development \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

## Verify DB

```bash
~/miniforge/bin/psql -U lg_admin -d lg_development -c "\dt" | head -20
curl -s http://localhost:3000/api/v1/health
# {"status":"ok","services":{"database":"up"}}
```

## Prisma Studio (optional)

```bash
pnpm db:studio
# Opens browser UI for lg_development
```

→ [05-startup-flow.md](./05-startup-flow.md)
