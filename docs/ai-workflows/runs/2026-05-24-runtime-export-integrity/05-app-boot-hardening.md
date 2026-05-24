# 05 — App Boot Hardening

**Date:** 2026-05-24 · **Iter:** 62

## Layers

| Layer | Scope |
|-------|--------|
| `RouteErrorBoundary` `auth-boot` | Wraps `AppWithAuth` inside Suspense |
| `RouteErrorBoundary` `app-routes` | Wraps all `<Routes>` |
| `RouteErrorBoundary` `admin-outlet` | Wraps admin `<Outlet>` |
| `Sentry.ErrorBoundary` | Global (main.tsx) |

## Boot diagnostics

`shared/lib/boot-diagnostics.ts` — DEV exposes `window.__LG_BOOT_DIAG__` with lazy/export failure log.

Imported from `main.tsx` (side effect).

## Auth isolation

`AppWithAuth` failure no longer white-screens entire app — shows Russian fallback with diagnostic ID.
