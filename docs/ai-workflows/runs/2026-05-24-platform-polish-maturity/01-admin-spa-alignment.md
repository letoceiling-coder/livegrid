# 01 — Admin SPA Alignment

**Iteration:** 73 · **Date:** 2026-05-24

## Deployed

Web dist rebuilt with `VITE_ADMIN_GOVERNANCE_SLICE=true` and rsynced to `/var/www/lg/apps/web/dist/`.

| Surface | Route | API backing |
|---------|-------|-------------|
| Feed Import governance UI | `/admin/feed-import` | health, integrity, recovery, sitemap |
| System diagnostics | `/admin/system` | `/admin/system/diagnostics` |
| Ops Center | `/admin/ops` | existing CRM APIs |
| Build stamp | Admin sidebar | `__LG_BUILD_TIME__` |

## API addition

`SystemDiagnosticsGovernanceModule` deployed — production-safe diagnostics without billing/trust/automation deps.

## Nav governance filter

`admin-governance-nav.ts` hides unreleased routes in production build:

- Billing, Ecosystem, Trust, Conversations, Promotions

## Verification

```
GET https://livegrid.ru/admin/feed-import → 200
GET /admin/system/diagnostics (auth) → feed + sitemap sections populated
```

## Verdict

**Frontend/admin parity with production APIs achieved** for governance surfaces.
