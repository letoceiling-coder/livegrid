# 06 — Failure UX

## Components

- `NetworkStatusBanner` — sticky offline warning in admin shell
- `CrmInlineError` — existing retry button pattern (unchanged)
- `CrmRefreshContext` — auto refresh on `online` event

## Behavior

- Offline: polling profiles throttle via existing policy
- Partial failure: section-level errors with retry (CRM pattern)
- No blocking modals on transient API errors
