# Iter 41 — Forecast Domain Model

## Canonical Module

`packages/shared/src/crm/operational-forecast.ts`

Heuristic/statistical only — **no ML**.

---

## Derived Concepts

| Concept | Code | Derivation |
|---|---|---|
| Overload risk | `overload_risk` | Queue pressure slope + level |
| SLA degradation | `sla_degradation` | Overdue daily slope → +24h projection |
| Manager saturation | `manager_saturation` | saturationScore from open + overdue |
| Queue instability | `queue_instability` | High queue pressure volatility |
| Reopen acceleration | `reopen_acceleration` | Reopen series slope / degrading trend |
| Conversion decay | `conversion_decay` | Pipeline decay signals aggregate |
| Operational drift | `operational_drift` | Multiple drift warnings |
| Forecast confidence | `low` / `medium` / `high` | Snapshot depth + volatility |

---

## Core Functions

| Function | Purpose |
|---|---|
| `projectMetric()` | Linear daily slope from last 7 points |
| `computeForecastConfidence()` | Snapshot count + volatility → confidence |
| `buildOperationalForecast()` | Full aggregate from live + history |
| `analyzeOperationalRiskHints()` | Per-lead rule-based risk chips |

---

## Horizons (bounded)

| Horizon | Use |
|---|---|
| 24h | Overdue projection, stale risk hints |
| 48h | Stale projection, capacity pressure |
| 7d | Pipeline decay, operational drift |

No long-term predictions.
