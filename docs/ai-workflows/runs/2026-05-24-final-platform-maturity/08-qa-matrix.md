# Phase 8 — QA Matrix

**Iteration:** 63 · **Date:** 2026-05-24

## Automated checks

| Check | Command | Expected |
|-------|---------|----------|
| Symbol drift | `pnpm check:symbol-drift` | PASS |
| Runtime integrity | `pnpm check:runtime-integrity` | PASS |
| Web unit tests | `pnpm --filter @lg/web test` | PASS |
| API typecheck | `pnpm --filter @lg/api typecheck` | PASS |

## Manual QA matrix

| Scenario | Status | Notes |
|----------|--------|-------|
| Long admin session | ☐ | System page 30s poll — verify no storm |
| Feed import recovery | ☐ | Trigger import; check health panel |
| Partial import warnings | ☐ | History shows amber badge |
| Moderation queue | ☐ | Unchanged — smoke test |
| CRM lifecycle | ☐ | Unchanged — smoke test |
| Selections share links | ☐ | `/selections/:token` + SEO |
| Apartment navigation | ☐ | Lazy routes + JSON-LD |
| Mobile catalog | ☐ | No changes this iter |
| Map stress | ☐ | Prior hold — no rewrite |
| Telegram flows | ☐ | Nest webhook smoke |

## Regression guards

- No payment / websocket / AI moderation added
- No schema migration required
- Additive API only

## Verdict

**PENDING MANUAL** — automated gates must pass in CI/local before prod deploy.
