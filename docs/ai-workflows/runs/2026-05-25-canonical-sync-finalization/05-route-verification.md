# 05 — Route Verification

**Iteration:** 83 · **Date:** 2026-05-25

## Script

```bash
API_BASE=https://livegrid.ru JWT=<token> pnpm verify:admin-routes
```

## Required 200 (with admin JWT)

| Route |
|-------|
| `/admin/tasks/summary` |
| `/admin/tasks?filter=today&page=1` |
| `/admin/moderation/listings?page=1&per_page=5` |
| `/admin/automation/metrics` |
| `/admin/trust/metrics` |
| `/admin/billing/metrics` |
| `/admin/system/route-contract` |

## Contract endpoint

`GET /admin/system/route-contract` → `missingRouteReport: []`

## Browser

No repeated 404 in Network tab on `/admin/ops`.
