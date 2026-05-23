# Iter 43 — Phase 2: Query Coordination Hardening

## Central Modules

| Module | Role |
|--------|------|
| `crm-query-keys.ts` | Canonical keys + `CRM_FOCUS_SCOPES` |
| `crm-invalidation.ts` | Scoped, deduped invalidation (800ms gap) |
| `crm-cache-policy.ts` | Tiered `gcTime` / `staleTime` |
| `useCrmRouteFocusRefresh.ts` | Layout-level focus coordinator |

## Invalidation Scopes

```typescript
request_mutation   → lists, workload, ops summary, unread (NOT analytics)
notification_read  → notifications root
ops_manual         → ops root (summary + analytics)
requests_manual    → lists + workload
focus_*            → route-scoped prefixes on tab restore
```

## Wiring (shipped)

- **AdminRequestDetail** mutations → `crmInvalidate('request_mutation')`
- **AdminOpsCenter** manual refresh → `crmInvalidate('ops_manual')`
- **AdminRequests** manual refresh → `crmInvalidate('requests_manual')`
- **CrmNotificationBell** mark read → `crmInvalidate('notification_read')`
- **AdminLayout** → `useCrmRouteFocusRefresh()` replaces per-page focus hooks

## Focus Refresh Flow

```
visibility restore OR window focus OR online
  → CrmRefreshContext.refreshGeneration++
  → useCrmRouteFocusRefresh (500ms debounce, 2s min gap)
  → crmInvalidateFocus(prefixes for current route)
  → refetchType: 'active' only
```

**Double-bump fix:** visibility restore sets `skipNextFocusRefresh` for 400ms so focus event does not fire twice.

## Analytics Isolation from Lists

`request_mutation` explicitly excludes `admin/ops/analytics`. Status changes refresh operational UI without forcing heavy analytics recomputation.

## Dedupe Guarantees

- Global `MIN_INVALIDATION_GAP_MS = 800` in `crmInvalidate` / `crmInvalidateFocus`
- Hook-level `CRM_FOCUS_REFRESH_MIN_GAP_MS = 2000` before calling orchestrator
- React Query `refetchOnWindowFocus: false` globally

## Deferred (HOLD)

- List virtualization (requests table >100 rows)
- Dedicated `analytics` poll policy key (using `2× opsCenter` multiplier)
