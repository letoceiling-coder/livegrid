# 07 — Error Boundaries

**Date:** 2026-05-24 · **Iter:** 61

## Components

| Boundary | Location | Isolates |
|----------|----------|----------|
| `Sentry.ErrorBoundary` | `main.tsx` | Global (existing) |
| `RouteErrorBoundary` | `App.tsx` routes | Public SPA routes |
| `RouteErrorBoundary` | `AdminLayout` outlet | Admin pages |
| `CrmAnalyticsErrorBoundary` | Ops Center | Analytics panel (iter 43) |

## RouteErrorBoundary features

- Russian fallback copy
- Diagnostic ID (`rb-admin-outlet-N`)
- Retry + home navigation
- Dev console logging

## Rule

Single route/component failure must not white-screen the entire app.
