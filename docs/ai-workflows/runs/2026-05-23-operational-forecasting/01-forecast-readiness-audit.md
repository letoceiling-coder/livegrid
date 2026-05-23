# Iter 41 — Forecast Readiness Audit

## Pre-Iter 41 Baseline

| Capability | State | Gap |
|---|---|---|
| Historical snapshots | ✓ 11 kinds (Iter 40) | No forecast storage |
| Trend series | ✓ SLA, source, lifecycle, quality | No projection |
| Live SLA metrics | ✓ | No +24h/+48h forecast |
| Manager workload | ✓ | No saturation scoring |
| Drift warnings | ✓ | Not forecast-oriented |
| Conversion quality | ✓ Iter 40 | No decay acceleration |

---

## Forecast Reliability Matrix

| Signal | Min snapshots | Volatility gate | Post-41 |
|---|---|---|---|
| Overdue +24h | 3 | σ/μ < 0.6 | ✓ linear slope |
| Stale +48h | 3 | σ/μ < 0.6 | ✓ |
| Queue overload | 3 | slope + level | ✓ |
| Reopen acceleration | 3 | degrading trend | ✓ |
| Manager saturation | live only | N/A | ✓ heuristic |
| Pipeline decay | 2 quality/lifecycle trends | delta ≥10% | ✓ |
| Operational drift | 2+ drift warnings | count-based | ✓ |

---

## Confidence Scoring

| Level | Criteria |
|---|---|
| **high** | ≥7 snapshot days AND avg volatility < 0.35 |
| **medium** | ≥3 snapshot days AND avg volatility < 0.6 |
| **low** | otherwise — projections shown with explicit low confidence |

No fake precision: all forecasts include `confidence` field.

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter @lg/shared build` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
