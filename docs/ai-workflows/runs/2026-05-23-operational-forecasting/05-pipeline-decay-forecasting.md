# Iter 41 — Pipeline Decay Forecasting

## Acceleration Detection

Uses existing lifecycle + quality trend directions from snapshot history.

| Signal | Source trend | Trigger |
|---|---|---|
| Negotiation slowdown | `negotiation_to_success_h` | degrading, delta ≥10% |
| Success stability decay | `success_stability` | degrading, delta ≤−10% |
| Fake progression growth | `fake_progression` | degrading, delta ≥10% |
| Reopen quality decay | live conversion quality | reopenAfterSuccess ≥15% |

---

## Aggregate Risk

When ≥1 pipeline decay signal active → `conversion_decay` risk signal added to forecast bundle.

---

## Trend Acceleration

Ops Center shows `accelerationPct` from trend `deltaPct` — not a separate ML model.

Sparklines in `history.forecastTrends` track projected overdue/stale and team saturation over time.
