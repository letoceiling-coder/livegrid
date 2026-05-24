# 02 — Playwright Foundation

## Package

`apps/e2e` — `@lg/e2e`

## Config

- `playwright.config.ts` — smoke, soak, soak-full projects
- `fixtures/base.ts` — console error capture, `apiUrl()` helper

## Smoke Tests

`tests/smoke/public-flows.spec.ts`:
- API health
- Home + catalog load
- Login page
- Admin auth redirect

## Commands

```bash
pnpm test:e2e              # smoke (default)
pnpm test:e2e:soak         # mini soak ~2min
SOAK_DURATION_MS=3600000 pnpm --filter @lg/e2e test:soak:full  # 60min manual
```

## Env

- `E2E_BASE_URL` — web (default `http://127.0.0.1:5173`)
- `E2E_API_URL` — API (default `http://127.0.0.1:3000`)
- `E2E_SKIP_WEBSERVER=1` — CI API-only mode
