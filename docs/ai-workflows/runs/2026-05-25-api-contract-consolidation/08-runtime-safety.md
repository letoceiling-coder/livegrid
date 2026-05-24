# 08 — Runtime Safety

**Iteration:** 82 · **Date:** 2026-05-25

## Goal

Frontend must **never hard-fail** on optional governance metrics when API slice is temporarily unavailable or deploy is mid-flight.

## Implementation

### `crmApiGetOptional`

`apps/web/src/admin/lib/crm-api.ts`:

```typescript
export async function crmApiGetOptional<T>(path: string, endpointId: string): Promise<T | null> {
  try {
    return await crmApiGet<T>(path, endpointId);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 501)) {
      return null;
    }
    throw e;
  }
}
```

404/501 → `null` (no throw, no retry storm). Other errors (401, 403, 500) still propagate.

### Ops Center

`AdminOpsCenter.tsx` — automation, trust, billing queries:

- `queryFn` → `crmApiGetOptional`
- `retry: false`
- Panels render degraded/empty when `data === null`

Required ops data (`/admin/ops/summary`, analytics) remains strict `crmApiGet`.

### Existing safe patterns (unchanged)

| Location | Pattern |
|----------|---------|
| `CrmAutomationMetricsProbe` | `apiGetOrNull` |
| `listing-observability.ts` | try/catch → `null` for moderation/discovery |
| `fetchModerationObservability` | catch → `null` |

### Dedicated pages

`AdminTrustPage`, `AdminBillingPage`, `AdminTasksPage` — intentional hard errors if module missing (user navigated to feature). After Iter 82 API registration, these should not 404.

## Observability

Failed optional fetches still log via `crmObsQueryFailure` only when thrown — optional 404s are swallowed before observability throw path in `crmApiGetOptional`.

## Future optional candidates

If a governance slice is **disabled by flag**, switch dedicated page to optional fetch + banner. Not required for Iter 82 — all slices deploy fully.
