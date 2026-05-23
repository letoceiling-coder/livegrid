# Iter 47 — Phase 6: Runtime QA Matrix

## Public URLs

| Area | URL | Expected |
|------|-----|----------|
| Health | https://livegrid.ru/api/v1/health | `status:ok` |
| Homepage | https://livegrid.ru/ | 200, listings load |
| Map | https://livegrid.ru/map | markers render |
| Catalog | https://livegrid.ru/catalog | filters work |
| Login | https://livegrid.ru/login | form loads |
| Admin | https://livegrid.ru/admin | dashboard (auth required) |

## Admin / CRM

| Area | Path | Check |
|------|------|-------|
| Dashboard | `/admin` | no console 404 |
| Ops Center | `/admin/ops` | queues load |
| Requests | `/admin/requests` | list + workload strip |
| My listings | `/admin/my-listings` | agent cabinet |
| Listings gov | `/admin/listings` | filters work |
| CRM notifications | bell icon | unread count 200 |

## Server commands

```bash
# Health
curl -sS https://livegrid.ru/api/v1/health | jq .

# PM2
ssh root@85.198.64.93 'pm2 status lg-api && pm2 logs lg-api --lines 50 --nostream'

# Full server verify
ssh root@85.198.64.93 'cd /var/www/lg && bash deploy/verify-on-server.sh runtime'

# Migration status
ssh root@85.198.64.93 'cd /var/www/lg/packages/database && source ../../deploy/load-api-env.sh && pnpm exec prisma migrate status'
```

## Feature-specific

| Feature | Verification |
|---------|--------------|
| Auth | login → JWT → admin access |
| CRM snapshots | Ops analytics panel loads |
| Listings ownership | manual listing shows agent contact |
| Geo | map pins match catalog |
| Viewport | map sidebar loads (no 500) |
| TG notifications | admin bell no 404 |
| Queues | Bull/feed import not broken |

## Mobile

- Admin drawer at 360px
- Listing cards usable
