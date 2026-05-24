# 09 — Observability

## Extended Debug Overlays

### `?crm_debug=1`

Added:
- `reliabilityFailedRequests`
- `reliabilityRetryCount`
- `reliabilityPollingPressure`

### `?listing_debug=1`

Unchanged bundle; trust section from Iter 57 remains.

## Probes

- `ReliabilityMetricsProbe` — bridges tracker → CRM debug overlay

## Tracker

`apps/web/src/lib/reliability-tracker.ts` — DEV-only, no prod overhead when flags off.
