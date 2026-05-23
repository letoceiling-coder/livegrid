# Iter 42 — Query Hardening

## React Query Defaults (`App.tsx`)

```typescript
new QueryClient({ defaultOptions: { queries: CRM_QUERY_DEFAULTS } })
```

## CRM Retry Policy

| Status | Retry |
|---|---|
| 400, 401, 403, 404 | **Never** |
| 5xx / network | Max 1 retry |
| Backoff | capped 8s |

## Utilities

| File | Purpose |
|---|---|
| `crm-query-options.ts` | `crmQueryOptions()`, `crmQueryRetry`, `crmErrorMessage` |
| `crm-api.ts` | `crmApiGet/Post` + DEV failure tracking |

## DEV Observability

`crmObsQueryFailure`, `crmObsQueryRetry` — visible in `?crm_debug=1` overlay.
