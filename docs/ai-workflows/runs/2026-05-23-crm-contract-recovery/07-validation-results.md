# Iter 42 — Validation Results

## Automated

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |

## Post-Restart API (required)

After `pnpm dev:api` restart, verify:

```bash
TOKEN=… # login
curl -H "Authorization: Bearer $TOKEN" /api/v1/admin/crm-notifications/unread-count  # → 200
curl -H "Authorization: Bearer $TOKEN" /api/v1/admin/requests/workload               # → 200
curl -H "Authorization: Bearer $TOKEN" /api/v1/admin/ops/summary                     # → 200
curl -H "Authorization: Bearer $TOKEN" /api/v1/admin/ops/analytics?days=14         # → 200
```

## Manual QA

| Item | Expected |
|---|---|
| Admin boot | No console retry flood |
| Notification bell | Badge or silent (0), no 404 spam |
| Workload strip | KPI chips or localized error |
| Ops Center | Queues + optional analytics |
| Manager role | Scoped analytics still works |
| `?crm_debug=1` | Failed endpoint visible once |

## Pre-Fix State (documented)

Running API on :3000 returned 404 for all Iter 33+ CRM routes — **stale process**, not missing source code.
