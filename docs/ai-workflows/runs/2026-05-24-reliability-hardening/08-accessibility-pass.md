# 08 — Accessibility Pass

## Changes (highest-risk fixes)

- Skip link to `#admin-main` in admin layout (keyboard focus visible)
- Existing `prefers-reduced-motion` in `App.css`
- `NetworkStatusBanner` uses `role="status"`
- Touch targets maintained at 44px on admin nav (existing)

## Deferred

Full audit of all modals/focus traps — out of scope for additive pass.
