# 09 — Operational Risks

**Iteration:** 80 · **Date:** 2026-05-25

## Residual risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Bulk refresh without content change | Medium | Agent-only; max 50; does not republish hidden |
| Stale semantics split (30/48/90d) | Low | Operator docs; marketplace-health uses 30/60/90 buckets |
| FEED freshness proxy | Medium | Uses `updatedAt` 90d; feed import health separate |
| Duplicate external count approximate | Low | In-memory filter on groupBy; not exhaustive at 500+ dup groups |
| Inactive agent heuristic | Low | «No MANUAL activity 60d» — may include new agents |
| Module circular deps | Low | RetentionModule ↔ ListingsModule already established |

## Not risks (explicitly out of scope)

- AI inventory scoring
- Auto-delisting stale manual
- Payment/subscription changes

## Monitoring

Watch `freshness.score` and `liquidity.score` on Admin System; investigate if either drops below 70 for 7+ days.

## Follow-ups (P3)

- Bulk lifecycle (hide/archive) with audit trail
- FEED quality batch scoring sample
- Agent KPI dashboard tile on AdminDashboard
