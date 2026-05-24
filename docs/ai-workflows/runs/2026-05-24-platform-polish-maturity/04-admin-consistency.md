# 04 — Admin UX Consistency

**Iteration:** 73 · **Date:** 2026-05-24

## New shared components

| Component | Purpose |
|-----------|---------|
| `AdminLoadingState` | Unified spinner + label |
| `AdminStatusBadge` | ok / warn / error / neutral chips |
| `CrmInlineError` | Existing — retry UX (reused) |

## Applied to

- `AdminFeedImport` — health badge, loading history, incident banner
- `AdminSystemPage` — loading state, feed status badge
- `AdminLayout` — NetworkStatusBanner, RouteErrorBoundary (existing)

## Polling consistency

| Page | Before | After |
|------|--------|-------|
| Feed Import progress | 3s always | **3s only when import running** |
| Feed health | 60s | 60s (unchanged) |
| System diagnostics | 30s | 30s (unchanged) |

## Verdict

**Operational UX language unified** for governance admin pages.
