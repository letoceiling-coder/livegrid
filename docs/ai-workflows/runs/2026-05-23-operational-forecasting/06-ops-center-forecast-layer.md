# Iter 41 — Ops Center Forecast Layer

## UI Section: Operational forecast

| Widget | Data |
|---|---|
| Overdue +24h projection | `slaForecast.overdueProjected24h` |
| Stale +48h projection | `slaForecast.staleProjected48h` |
| Readiness score | `readinessScore` (0–100) |
| Risk signal count | `riskSignals.length` |
| Risk list | code, label, horizon, confidence |
| Capacity pressure | manager rows with saturation |
| Pipeline decay | acceleration warnings |
| Forecast trends | `history.forecastTrends` sparklines |

---

## Request Detail: `riskHints`

| Hint | Rule |
|---|---|
| Риск stale в ближайшие 24ч | ACTIVE at ≥80% of stale threshold |
| Менеджер перегружен | assignee saturation yellow/red |
| Переговоры замедляются | NEGOTIATION ≥72h or >1.5× median |
| Нестабильный источник | source qualityScore < 0 |
| Высокий reopen risk | ≥1 reopen event |

Subtle pills — same pattern as quality/lifecycle hints. No AI assistant language.

---

## API

`GET /admin/ops/analytics` → `operationalForecast`

Computed synchronously from already-fetched analytics + history (no extra DB round-trip).
