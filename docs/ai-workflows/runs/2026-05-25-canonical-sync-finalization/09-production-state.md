# 09 — Production State

**Iteration:** 83 · **Date:** 2026-05-25

## Target topology

```
GitHub livegrid.git (main)
        ↓ git pull
/var/www/lg (clean tree)
        ↓ deploy-full.sh
PM2 lg-api + nginx static (apps/web/dist → public)
        ↓
https://livegrid.ru
```

## API modules (post-deploy)

All registered in `app.module.ts`:

- Core: Listings, Requests, FeedImport, Stats, Search
- Governance: CrmAutomation, Trust, Billing, Ecosystem
- Ops: SystemDiagnostics, Discovery, Retention, Sitemap

## Database

All migrations through `20260524900000_agency_ecosystem` applied.

## Frontend

Single Vite build from same commit as API — no bundle/API version skew.

## Monitoring

- Health: `/api/v1/health`
- Metrics: `/api/v1/metrics`
- Route contract: `/admin/system/route-contract`
