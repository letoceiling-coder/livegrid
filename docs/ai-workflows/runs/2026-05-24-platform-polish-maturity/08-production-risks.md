# 08 — Production Risks

**Iteration:** 73 · **Date:** 2026-05-24

## P2 — Medium

| Risk | Mitigation |
|------|------------|
| Playwright unavailable on dev CI | Run soak on staging runner with `npx playwright install` |
| Governance nav hides routes | Set `VITE_ADMIN_GOVERNANCE_SLICE=false` for full admin builds |
| System diagnostics partial | Deploy full module when schema migrations land |
| Dual BullMQ repeat keys | Monitor Monday import |

## P3 — Low

| Risk | Notes |
|------|-------|
| Admin chunk size (AdminDashboard 396KB) | Existing; lazy loaded |
| Map metrics null on System page | Expected until MapViewport deployed |

## Resolved

- Admin SPA iter 47 stale build ✅
- Idle feed progress polling ✅

## Verdict

**Low residual UX risk.**
