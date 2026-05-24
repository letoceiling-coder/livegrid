# 09 — UX Findings

**Iteration:** 73 · **Date:** 2026-05-24

## Fixed

1. **Idle import polling** — progress endpoint polled every 3s even when idle → smart interval
2. **Admin feed import mobile** — header overflow on narrow screens → stacked layout
3. **Catalog filter bar** — missing safe-area on iOS → `env(safe-area-inset-bottom)`
4. **Inconsistent loading** — mixed spinners → `AdminLoadingState`
5. **Status chips** — ad-hoc colors → `AdminStatusBadge`

## Observed (no change this iter)

1. AdminDashboard chunk 396KB — acceptable with lazy load
2. Map viewport metrics require MapViewport API module on production
3. Full trust/billing admin pages hidden in governance build — intentional
4. Playwright cannot install on ubuntu26.04 dev host

## Recommended follow-up

1. Nightly 60min Playwright soak on staging
2. Map FPS profiling with Chrome DevTools on `/map` at 65k
3. Deploy web entity SEO (SeoJsonLd) when ready — local only today

## Verdict

**Critical UX gaps closed** for governance operations.
