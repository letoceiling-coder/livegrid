# 11 — QA Matrix

| Case | Expected | Status |
|------|----------|--------|
| Smoke E2E health | `/health` ok/degraded | ✅ |
| Catalog load | No pageerror | ✅ smoke |
| Contract tests | 9 shared + 30 web | ✅ |
| Migration check | 45 folders | ✅ |
| Typecheck | all packages | ✅ |
| Admin offline banner | Shows when offline | ✅ UI |
| System diagnostics | Read-only JSON | ✅ API |
| Mini soak heap | < 150MB growth | ✅ test |
| crm_debug reliability | fail/retry lines | ✅ |
| Skip link focus | Keyboard accessible | ✅ |
| Console errors (unit) | vitest clean | ✅ |

## Manual QA

1. `/admin/system` as admin — verify tiles
2. `?crm_debug=1` — trigger failed CRM fetch, see rel fails increment
3. DevTools offline — NetworkStatusBanner appears
4. `pnpm test:e2e:soak` locally with web running
5. Nightly: `SOAK_DURATION_MS=3600000 pnpm --filter @lg/e2e test:soak:full`
