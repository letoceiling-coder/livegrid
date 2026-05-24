# 09 — Operational Risks

**Iteration:** 81 · **Date:** 2026-05-25

## Residual risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Latency sample bias | Medium | 7d window, median not mean; sample size in API |
| Public hint false positive | Low | Conservative thresholds; hidden when slow |
| Agent tier internal leak | Low | Never rendered on public pages |
| Circular module deps | Low | StatsModule → RequestsModule one-way |
| 500-request SLA scan cap | Low | Documented; totals from full workload query |

## Monitoring

Alert informally when `responseSlaScore` < 70 for 24h+ or `callbackOverdueCount` spikes.

## Out of scope

Auto-escalation, AI reply suggestions, websocket live inbox.
