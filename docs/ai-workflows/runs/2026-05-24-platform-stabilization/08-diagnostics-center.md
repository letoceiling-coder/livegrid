# 08 — Dev Diagnostics Center

**Date:** 2026-05-24 · **Iter:** 61

## Admin UI

`/admin/system` — extended sections:

1. **Platform / Schema** — from API `diagnostics.platform`
2. **Dev workspace (client)** — `import.meta.env.DEV` only
   - Lazy route registry count
   - Failed lazy import log
   - Workspace hints (build shared, migrate deploy)

## API endpoints

| Method | Path | Auth |
|--------|------|------|
| GET | `/admin/system/diagnostics` | admin, editor |
| GET | `/admin/system/platform` | admin, editor (refresh schema scan) |

## Client module

`apps/web/src/shared/lib/platform-diagnostics.ts`

Production builds omit dev workspace panel (guard on `import.meta.env.DEV`).
