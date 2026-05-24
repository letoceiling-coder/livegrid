# Phase 7 — Observability

**Iteration:** 64

## Admin `/admin/system`

New **Map viewport** card:
- requests/min
- avg query ms
- slow queries
- last returned batch size

## DEV `?map_debug=1`

- Works in production builds (not DEV-only anymore)
- Full MapDevOverlay HUD
- `window.__LG_MAP_SESSION__` long-session snapshot

## API metrics

`MapMetricsService.getSnapshot()` wired into system diagnostics.
