# Iter 41 — SLA Forecasting

## Short-Horizon Projections

| Metric | Horizon | Method |
|---|---|---|
| `overdueProjected24h` | +24h | `current + dailySlope × 1` |
| `staleProjected48h` | +48h | `current + dailySlope × 2` |

Daily slope computed from last ≤7 snapshot points in overdue/stale series.

---

## Risk Signals

| Code | Trigger |
|---|---|
| `sla_degradation` | slope > 0.5 OR projected ≥ current + 2 |
| `stale_growth` | slope > 0.3 OR projected ≥ current + 1 |

Severity escalates at +5 overdue / +3 stale thresholds.

---

## SLA Recovery Trend

Existing `slaTrend.recoveryProxy` from Iter 35 remains; forecast layer adds forward-looking projection without replacing live SLA state.

---

## API

`operationalForecast.slaForecast`:

```typescript
{
  overdueNow, staleNow,
  overdueProjected24h, staleProjected48h,
  confidence
}
```
