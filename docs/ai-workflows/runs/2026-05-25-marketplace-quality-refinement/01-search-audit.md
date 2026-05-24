# 01 — Search Quality Audit

**Iteration:** 74 · **Date:** 2026-05-25

## Stack (existing only)

| Layer | Implementation |
|-------|----------------|
| ЖК search | Prisma ILIKE + optional Meilisearch block IDs |
| Autocomplete | `GET /search/catalog-hints` |
| Listings search | `GET /listings?search=` via catalog API params |
| Map search | Viewport + filter URL params (shared with catalog) |

No Elasticsearch, no vector search added.

## Gaps found (before)

| Issue | Impact |
|-------|--------|
| Raw trim only — no ё/е normalization | "Сёверная" misses "Северная" |
| Metro prefix `м.` not stripped | Duplicate queries |
| Duplicate filter URL builders | catalog-url-sync vs catalog-api-params (by design — URL vs API) |
| No client normalization on commit | Inconsistent URL search param |

## Fixes (iter 74)

| Change | File |
|--------|------|
| `normalizeSearchQuery()` | `apps/api/src/common/search-query.util.ts` |
| `searchQueryVariants()` for metro/district hints | same |
| API blocks search uses normalized query | `blocks.service.ts` |
| Hints metro/district multi-variant ILIKE | `search.service.ts` |
| Client normalize on filter commit | `RedesignCatalog.tsx`, `search-normalize.ts` |

## Normalization rules

- Trim + collapse whitespace
- `ё` → `е`
- Strip leading `м.` / `м `
- Strip quotes
- Max 120 chars

## Verification

```
GET /search/catalog-hints?region_id=1&q=sokol → 200
Production catalog-counts: 65,504 stable
Unit tests: search-normalize.test.ts (3/3 pass)
```

## Verdict

**Marketplace-grade search normalization** on existing Prisma/Meili stack — no new search infrastructure.
