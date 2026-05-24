# 09 — Observability

## DEV overlay (`?crm_debug=1`)

Extended `CrmSnapshot` in `crm-observability.ts`:

| Metric | Source |
|--------|--------|
| `communicationFetchMs` | Panel fetch timing |
| `activeThreads` | Admin metrics endpoint |
| `unreadConversations` | Admin metrics endpoint |
| `avgReplyLatencyMs` | Buyer→staff reply pairs |
| `staleConversations` | 48h stale heuristic |
| `callbackOverdueCount` | Past `meta.scheduledAt` |

## Probe

`CrmCommunicationMetricsProbe.tsx` — mounted in `AdminLayout`, polls `GET /admin/crm/communication/metrics` every 60s in DEV.

## API metrics

`CrmCommunicationService.getCommunicationMetrics()` — bounded scans (500 rows max).

## Production

Metrics endpoint requires admin/editor role; overlay DEV-only.
