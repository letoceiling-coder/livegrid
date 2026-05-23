# Iter 41 — Performance + Safety

## Bounded Forecasting

| Limit | Value |
|---|---|
| Projection window | last 7 trend points |
| Horizons | 24h, 48h, 7d only |
| Cache TTL | 60s per scope |
| Capacity rows | 12 max |
| Snapshot generate | reuses 14d history query |

No unbounded statistical scans. No fake precision — confidence always exposed.

---

## DEV Observability (`?crm_debug=1`)

| Metric | Source |
|---|---|
| `forecastComputeMs` | `operationalForecast.computeMs` |
| `historyQueryMs` | trend query (shared) |

---

## Snapshot Kinds

| Kind | Payload |
|---|---|
| `FORECAST_SIGNALS` | confidence, slaForecast, riskSignals, pipelineDecay |
| `CAPACITY_PRESSURE` | capacityPressure, teamSaturationScore |

Historical forecast tracking via `history.forecastTrends`:

- projected_overdue_24h
- projected_stale_48h
- team_saturation
- risk_signal_count

---

## Post-Deploy

```bash
POST /admin/ops/snapshots/generate?force=true
```

Migration: `20260523220000_crm_operational_forecast`
