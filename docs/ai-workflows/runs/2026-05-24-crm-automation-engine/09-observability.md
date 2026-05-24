# 09 — Observability

## DEV Overlay

`?crm_debug=1` extended in `crm-observability.ts`:

| Field | Source |
|-------|--------|
| automationFetchMs | Request detail automation panel |
| automationPendingTasks | Pending task count |
| automationRecommendations | Recommendation count |
| automationTaskPressure | Open tasks globally |
| automationEffectiveness | 24h effectiveness % |
| automationTasksCreated | Tasks created 24h |
| automationCooldownSkips | Last scan cooldown skips |
| automationRuns | Metrics probe poll count |

## Probes

- `CrmAutomationMetricsProbe` — polls `/admin/automation/metrics` in DEV
- `crmObsAutomationFetch` — detail panel timing

## API Debug

`GET /admin/automation/debug` — last scan stats (in-memory, resets on restart).
