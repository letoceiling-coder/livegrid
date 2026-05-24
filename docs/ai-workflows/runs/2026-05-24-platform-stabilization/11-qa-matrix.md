# 11 — QA Matrix

**Date:** 2026-05-24 · **Iter:** 61

| Scenario | Expected | Verified |
|----------|----------|----------|
| `pnpm check:workspace` | PASS | ✓ |
| `@lg/shared` build + tests | 34 pass | ✓ |
| `@lg/web` tests | 35 pass | ✓ |
| `@lg/api` typecheck | PASS | ✓ |
| Fresh `@lg/shared` dep in web | Resolves | ✓ (prior fix) |
| DB offline | Health degraded + warningsRu | Manual |
| Missing migration | Platform snapshot `ok: false` | Manual (reproduced 2026-05-24) |
| Admin route crash | RouteErrorBoundary fallback | Code review |
| Moderation/billing/ecosystem lazy | Named lazyWithReload | ✓ |
| Console on homepage | No fatal 500 after migrate | Manual post-fix |

## Manual follow-up

- [ ] Restart API and confirm `/health` includes `schema: compatible`
- [ ] Open `/admin/system` in DEV — platform + client panels
- [ ] Mobile admin smoke (existing hold)
