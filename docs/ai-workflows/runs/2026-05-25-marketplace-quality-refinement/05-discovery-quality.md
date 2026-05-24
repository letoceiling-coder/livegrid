# 05 — Discovery Quality

**Iteration:** 74 · **Date:** 2026-05-25

## Rule-based discovery (existing)

| Feature | Component |
|---------|-----------|
| Related listings | `RelatedListingsCarousel` on detail pages |
| Recommendation reasons | `RECOMMENDATION_REASON_LABEL` from `@lg/shared` |
| Saved search | `SaveSearchButton` on catalog |
| Nearby ЖК | Complex page room groups — existing |

## Iter 74 fix

**Duplicate dedupe** in `RelatedListingsCarousel` — filter by unique `id` before render.

## Not added

AI recommendations, vector similarity, trending ML — out of scope.

## Verdict

**Cleaner related listings** without duplicate cards; rule-based discovery preserved.
