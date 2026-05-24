# 09 — Growth Risks

**Iteration:** 78 · **Date:** 2026-05-25

## Low risk

| Risk | Mitigation |
|------|------------|
| Thin district landings indexed | Diagnostics `thinDistricts`; optional future noindex <5 |
| Room count query at scale | 2000 take cap; add materialized counts if slow |
| CMS template empty | Fallback defaults in `content-defaults.ts` |

## Medium risk (monitor)

| Risk | Action |
|------|--------|
| Filter URL proliferation | noindex rules + avoid sitemap inclusion of filters |
| Duplicate district names across regions | Always require `region_id` in landing URLs |
| Complex nearby fetch extra blocks list call | Cache; limit 6 nearby |

## Out of scope

- Full apartment/listing sitemap index (size/build time)
- AI content generation for landings

## Rollback

- Remove discovery graph routes + catalog landing UI
- Revert `catalog-seo-meta.ts` to iter 77 version
