# 02 — Full Deploy (Governance Slice)

**Iteration:** 72 · **Date:** 2026-05-24

## Deploy method

Rsync governance slice + `governance-deploy.sh` (not full monorepo — excludes billing, discovery, AI).

## Deployed modules

| Module | Endpoints |
|--------|-----------|
| Feed recovery | `/admin/feed-import/recovery/*` |
| Feed integrity | `/admin/feed-import/integrity`, `/health` |
| Sitemap | `/api/v1/sitemap/*`, `/admin/sitemap/*` |
| Feed processor fix | Republish on upsert |

## Build

```bash
cd /var/www/lg/apps/api
rm -rf dist tsconfig.tsbuildinfo
pnpm exec tsc --outDir dist --declaration --sourceMap
pm2 reload deploy/ecosystem.config.js --update-env
```

## Verification (2026-05-24 20:20 UTC)

| Check | Result |
|-------|--------|
| `GET /health` | ok |
| `catalog-counts` | 65,504 / 480 |
| `GET /admin/feed-import/health` | 200, ok |
| `GET /admin/feed-import/integrity` | 200, ACTIVE 65504 |
| `GET /admin/feed-import/recovery/audit` | 200 |
| `GET /admin/feed-import/recovery/incident` | recoveryMode: false |

## Not deployed (by design)

Billing, discovery, CRM automation, ecosystem, trust, platform-stability UI modules — out of iter 72 scope.

## Verdict

**Production code parity** for iter 65–71 governance APIs achieved on server.
