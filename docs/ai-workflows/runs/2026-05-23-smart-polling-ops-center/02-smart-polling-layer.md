# Iter 34 — Smart Polling Layer

## Profiles

| Profile | When |
|---|---|
| `FOCUSED_ACTIVE` | Tab visible, user active |
| `FOCUSED_IDLE` | Visible, no input 90s |
| `BACKGROUND_TAB` | Hidden desktop tab |
| `MOBILE_BACKGROUND` | Hidden + viewport ≤768px OR offline |
| `OPS_CRITICAL` | On `/admin/ops` or `/admin/requests`, not idle |

## Interval matrix (ms)

| Policy | ACTIVE | IDLE | BACKGROUND | MOBILE_BG | OPS_CRITICAL |
|---|---|---|---|---|---|
| unreadCount | 12s | 30s | 120s | off | 8s |
| opsCenter | 15s | 45s | 180s | off | 10s |
| requestQueue | 15s | 30s | 120s | off | 12s |
| workload | 30s | 60s | 180s | off | 20s |

`false` = suspended polling.

## Usage

```typescript
const interval = useSmartPollInterval('opsCenter');
refetchInterval: interval === false ? false : interval,
```

Single source: `CRM_POLLING_MATRIX` in `crm-polling-policy.ts`.
