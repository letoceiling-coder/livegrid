# Iter 40 — Deal Quality Analytics

## Quality Metrics (beyond SUCCESS count)

| Metric | Formula | Operational meaning |
|---|---|---|
| `successStabilityPct` | (SUCCESS − unstable) / SUCCESS | Deals that stay closed |
| `reopenAfterSuccessPct` | reopen-from-SUCCESS / SUCCESS | Unstable wins |
| `negotiationCompletionPct` | NEGOTIATION→SUCCESS / entered negotiation | Negotiation quality |
| `fastSpamPct` | spam_fast / terminal | Low-quality inflow |
| `healthyLifecyclePct` | healthy_lifecycle / SUCCESS | Full-path conversions |
| `recoverySuccessPct` | recovered_success / SUCCESS | Stale recovery rate |
| `weakSuccessPct` | weak_success / SUCCESS | Thin wins |
| `fakeProgressionPct` | fake_progression / sample | Activity without substance |

---

## Service

`CrmOutcomeQualityService` — bounded scan:

- MAX 400 requests per period
- MAX 40 events per request
- 60s in-memory cache (global scope only)

---

## Warnings (auto-generated)

| Code | Trigger |
|---|---|
| `unstable_success_elevated` | reopenAfterSuccess ≥ 15% |
| `fast_spam_elevated` | fastSpam ≥ 10% |
| `fake_progression` | fakeProgression ≥ 5% |
| `negotiation_quality_low` | negotiationCompletion < 40% (n≥5) |
