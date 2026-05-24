# 06 — Route Verification

**Iteration:** 82 · **Date:** 2026-05-25

## Runtime diagnostics endpoint

```
GET /admin/system/route-contract
```

Returns:

- `registeredModules` — expected modules from manifest
- `routes` — method, path, owning module, `expectedRegistered`
- `missingRouteReport` — empty when `app.module.ts` is aligned
- `noteRu` — pointer to smoke script

Implementation:

- `admin-route-manifest.ts`
- `admin-route-contract.service.ts`
- `system-diagnostics.controller.ts`

## Smoke script

```bash
# Local
API_BASE=http://127.0.0.1:3000 JWT=<token> node scripts/verify-admin-routes.mjs

# Production
API_BASE=https://livegrid.ru/api JWT=<token> node scripts/verify-admin-routes.mjs
```

### Route matrix (script)

| Route | Required | Expected without JWT |
|-------|----------|----------------------|
| `/admin/tasks/summary` | yes | 401 |
| `/admin/tasks?filter=today&page=1` | yes | 401 |
| `/admin/automation/metrics` | yes | 401 |
| `/admin/moderation/listings?page=1&per_page=5` | yes | 401 |
| `/admin/trust/metrics` | yes | 401 |
| `/admin/billing/metrics` | yes | 401 |
| `/admin/ops/summary` | yes | 401 |
| `/admin/system/route-contract` | yes | 401 |
| `/admin/system/diagnostics` | yes | 401 |
| `/admin/ecosystem/metrics` | no | 401 |
| `/admin/discovery/metrics` | no | 401 |

With valid admin JWT: all required routes → **200** (or 403 if role wrong).

Exit code `1` if any required route returns non-2xx (except auth-only without JWT).

## Protected route validation

All listed routes use `@ApiBearerAuth()` + `@Roles(...)`. Smoke script without JWT validates routes **exist** (401 ≠ 404).

## Post-deploy checklist

1. `pm2 reload deploy/ecosystem.config.js`
2. `curl -s localhost:3000/api/v1/health`
3. `node scripts/verify-admin-routes.mjs` with JWT
4. Browser: `/admin/tasks`, `/admin/moderation/listings`, `/admin/ops` — no console 404 spam
