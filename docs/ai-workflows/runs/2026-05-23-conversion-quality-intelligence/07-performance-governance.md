# Iter 40 — Performance + Observability

## Bounded Scans

| Limit | Value |
|---|---|
| Outcome sample | 400 requests |
| Events per request | 40 |
| Cache TTL | 60s |
| Manager recovery rows | 12 |
| Source quality rows | 10 |

No full historical replay. No unbounded recovery analysis.

---

## DEV Observability (`?crm_debug=1`)

| Metric | Source |
|---|---|
| `outcomeComputeMs` | `conversionQuality.computeMs` |
| `qualityAggregationMs` | same (aggregate path) |
| Snapshot payload | existing snapshot bytes in generate response |
| Quality trend latency | `history.queryMs` |

Extended in `crm-observability.ts` + `CrmDebugOverlay`.

---

## Snapshot Integration

| Kind | Payload |
|---|---|
| `CONVERSION_QUALITY` | metrics, warnings, sourceQuality |
| `RECOVERY_INTELLIGENCE` | managerRecovery, recoverySuccessPct |

Trend series (`history.qualityTrends`):

- success_stability
- negotiation_quality
- recovery_rate
- fake_progression

Requires ≥2 daily snapshots for sparklines.

---

## Post-Deploy

```bash
POST /admin/ops/snapshots/generate?force=true
```
