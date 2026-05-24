# 07 — Operational Dashboards

**Iteration:** 78 · **Date:** 2026-05-25

## Admin System → SEO governance (extended)

New **`landingCoverage`** block under `seo`:

| Metric | Meaning |
|--------|---------|
| `coveredDistricts` | Districts with ≥1 public listing |
| `coveredSubways` | Metro stations linked to blocks |
| `thinDistricts` | Districts with <5 listings (amber alert) |
| `orphanDistricts` | Districts in DB without listing coverage |
| `indexableLandingPatterns` | districts + subways landing count |
| `crawlDepthHint` | Ratio proxy for internal link depth |

## Source

`DiscoveryGraphService.getLandingCoverageMetrics()` via `SystemDiagnosticsGovernanceService`.

## Existing (validated)

- Sitemap stale badge, URL count, apartment coverage %
- Feed health parity (iter 76)

## Files

- `system-diagnostics-governance.service.ts`
- `AdminSystemPage.tsx`
