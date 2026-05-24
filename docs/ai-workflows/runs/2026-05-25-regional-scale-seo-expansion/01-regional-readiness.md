# 01 — Regional Readiness Audit

**Iteration:** 75 · **Date:** 2026-05-25

## Current state

| Layer | Status |
|-------|--------|
| DB isolation | `regionId` on districts, blocks, listings, feeds |
| API filters | `region_id` on catalog, map, stats, search |
| Frontend | `useDefaultRegionId`, `RegionSelector`, `?region_id=` / `?city=` |
| Feed governance | Per-region import, `FEED_IMPORT_ALLOWED_REGIONS` |
| Deploy model | `deploy/SECOND_REGION.md` — one domain per region instance |

## Gaps (documented, not rewritten)

| Gap | Risk | Mitigation |
|-----|------|------------|
| Sitemap global (single `PUBLIC_SITE_URL`) | Cross-region URL mixing on shared DB | Per-instance deploy OR future `region_id` sitemap filter |
| `publicSiteUrl` unused in canonical | Multi-domain canonical drift | Stored in DB; wire when second domain goes live |
| Block slug globally unique | Collision on new regions | Import-time validation (report-only) |
| Belgorod nav vs `/belgorod` | Inconsistent entry | Both supported; sitemap adds `/belgorod` |

## Production baseline

- **MSK:** 65,504 apartments / 480 ЖК — stable
- Feed health, data-quality audit per region code
- Iter 75: per-region health rows in `/admin/feed-import/health`

## Verdict

**Multi-region data-ready.** SEO/deploy checklist documented. Safe expansion via allowlist + separate domain instances — no architecture rewrite.
