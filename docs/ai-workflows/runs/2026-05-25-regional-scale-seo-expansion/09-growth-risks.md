# 09 — Growth Risks

**Iteration:** 75 · **Date:** 2026-05-25

## P1 — Address before second region launch

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shared sitemap on shared DB | Wrong domain URLs in index | Separate API instance per domain OR add `region_id` sitemap filter |
| Global block slug uniqueness | Import collision | Region-prefixed slugs or validation at import |
| `publicSiteUrl` not in canonical | Duplicate content across domains | Wire region `publicSiteUrl` when second domain goes live |

## P2 — Monitor

| Risk | Trigger | Action |
|------|---------|--------|
| Sitemap regen cost | 3+ regions × 65k URLs | Debounce regen; regional chunk filter |
| Complex sitemap memory sort | >2k ЖК | Restore cursor pagination with priority tiers |
| Parity targets wrong | New region feed size unknown | Set `FEED_PARITY_TARGETS_<CODE>` env |

## P3 — Accepted

| Risk | Rationale |
|------|-----------|
| Client-only meta (no SSR) | Sitemap + JSON-LD sufficient at current crawl volume |
| No district landing pages | Filter URLs + internal links provide crawl paths |
| FEED geo at block level | By design for TrendAgent feed |

## Verdict

**Growth path clear** with documented P1 items for multi-domain launch — no blockers for MSK continued operation.
