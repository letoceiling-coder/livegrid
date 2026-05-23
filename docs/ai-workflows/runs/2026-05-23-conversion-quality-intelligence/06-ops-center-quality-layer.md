# Iter 40 — Ops Center Quality Layer

## UI: `CrmAnalyticsPanel` — Conversion quality section

| Widget | Data |
|---|---|
| Healthy lifecycle % | `metrics.healthyLifecyclePct` |
| Success stability % | `metrics.successStabilityPct` |
| Negotiation → SUCCESS % | `metrics.negotiationCompletionPct` |
| Recovery SUCCESS % | `metrics.recoverySuccessPct` |
| Quality warnings | `warnings[]` |
| Recovery leaders | `managerRecovery` (top 6) |
| Source quality | `sourceQuality` (admin only) |
| Quality trends | `history.qualityTrends` sparklines |

---

## Request Detail: `qualityHints`

Subtle chips in `AdminRequestDetail`:

- «Успешно закрыт без reopen»
- «Нестабильный SUCCESS»
- «Лид восстановлен после stale»
- «Переговоры сорвались»
- «Быстрый SPAM»

No AI text walls — same pill pattern as lifecycle/attribution hints.

---

## API Bundle

`GET /admin/ops/analytics?days=14` adds `conversionQuality` parallel to existing `pipeline` and `attribution`.

Polling unchanged: analytics at 2× ops interval, 60s staleTime.
