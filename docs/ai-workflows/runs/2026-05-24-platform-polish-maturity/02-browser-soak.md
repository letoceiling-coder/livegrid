# 02 — Browser Soak

**Iteration:** 73 · **Date:** 2026-05-24 · **Dataset:** 65,504

## Automated soak

| Test | Result |
|------|--------|
| Playwright governance soak (catalog/map loop) | **Blocked** — Playwright chromium unavailable on ubuntu26.04 dev host |
| Sitemap index API soak | ✅ PASS — `sitemapindex` + `apartments-1.xml` |
| Extended curl soak (90 requests, 60s) | ✅ PASS — avg **367 ms** per request triple |
| Catalog counts stability | ✅ 65,504 throughout |

## Simulated routes (curl)

```
/catalog, /map, /api/v1/blocks/catalog-counts × 30 cycles
```

No HTTP errors; no count regression.

## Full 60min browser soak

Not executed in CI environment (no Playwright browser). Spec added:

`apps/e2e/tests/soak/governance-polish.spec.ts`

Run on machine with browsers:

```bash
E2E_BASE_URL=https://livegrid.ru E2E_SKIP_WEBSERVER=1 SOAK_DURATION_MS=3600000 \
  npx playwright test --project=soak-governance
```

## Verdict

**API/route soak PASS.** Full browser 60min soak **deferred** to nightly runner with Playwright installed.
