# 04 — ЖК / Complex Page Maturity

**Iteration:** 67 · **Date:** 2026-05-24  
**Route:** `/complex/:slug` · **Component:** `RedesignComplex.tsx`

## Requirement checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| SEO blocks | ✅ | `useEntitySeoMeta` — title, description, OG, ApartmentComplex JSON-LD |
| Listing statistics | ✅ | Apartment counts, price range, room breakdown |
| Completion dates | ✅ | From block metadata when present |
| Developer info | ✅ | `#developer` section when builder known |
| Infrastructure blocks | ✅ | `#infrastructure` grid |
| Nearby transport | Partial | Address/geo; dedicated metro list when in feed data |
| Map experience | ✅ | Embedded map section `#map` |
| Gallery quality | ✅ | Lazy-loaded images |
| Sticky filters / nav | ✅ | Section nav + sticky CTA (`complex:sticky` source) |
| Structured navigation | ✅ | Anchor sections: apartments, chess, layouts, infra, developer |

## Architecture highlights

- **Conditional sections** — nav tabs built from available data (`hasApartments`, `hasChess`, `hasInfra`, etc.) — avoids empty headings.
- **Chessboard** — `ChessboardPreview` for availability grid when API provides matrix.
- **Similar complexes** — discovery carousel at page bottom.
- **Lead capture** — `ConversionCTABar` + consultation context per section.

## Prerender / SEO

- Up to **500** complex URLs embedded at build via `prerender-seo.mjs` (`PRERENDER_MAX_COMPLEX`).
- Remaining complexes rely on client-side `useEntitySeoMeta` after hydration.
- `SeoJsonLd` skips `/complex/*` to avoid duplicate Organization + entity graphs.

## TrendAgent comparison

| Area | TA | LiveGrid |
|------|----|---------|
| Section nav | ✅ | ✅ |
| Price stats header | ✅ | ✅ |
| Mortgage hints | Calculator widgets | Informational only (by design — no payments) |
| Transport tab | Rich metro times | Partial — depends on feed fields |
| Photo gallery density | High | Good; CDN path via media URLs |

## Remaining gaps

| Gap | Severity |
|-----|----------|
| Sitemap covers 500/ N complexes only | Medium |
| Metro walking times not computed | Low |
| Sticky section nav on very small screens (360px) | Low — scroll-mt tuned |

## Verdict

**Complex page maturity: 86/100** — high-quality landing feel; transport richness and full sitemap coverage are incremental improvements, not blockers.
