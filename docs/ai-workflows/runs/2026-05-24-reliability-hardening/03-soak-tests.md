# 03 — Soak Tests

## Mini Soak (CI-safe)

`tests/soak/mini-soak.spec.ts` — default 120s catalog/home loop.

Checks:
- Iteration count > 3
- JS heap growth < 150MB (when `performance.memory` available)

## Full Admin Soak (manual/nightly)

`tests/soak/admin-session.spec.ts` — routes: ops, requests, tasks, trust, system.

Default duration: 60min via `SOAK_DURATION_MS=3600000`.

## Bounded Diagnostics

Soak tests log console errors; no unbounded screenshot/video retention beyond Playwright defaults.
