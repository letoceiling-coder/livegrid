# 05 — Homepage Maturity

**Iteration:** 67 · **Date:** 2026-05-24  
**Route:** `/` · **Component:** `RedesignIndex.tsx`

## Requirement checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Strong hero | ✅ | Search-forward hero with category links |
| Richer category sections | ✅ | Catalog category rails (apartments, houses, land, commercial) |
| Trending sections | Partial | Discovery blocks when API returns data |
| Recommendation sections | Partial | Related / featured complexes |
| Trust/reliability blocks | ✅ **iter 67** | `PublicTrustStrip` — live apartment + JK counts, feed sync copy |
| Ecosystem highlights | Partial | Links to catalog, map, news |
| Responsive layout polish | ✅ | Grid breakpoints sm/lg |
| Performance-safe animations | ✅ | Minimal motion; count queries staleTime 120s |

## Iter 67: PublicTrustStrip

Injects after hero:

- **Live counts** from `/stats/listing-kind-counts` and `/blocks/catalog-counts`
- **Weekly feed sync** messaging (aligned with iter 65 cron policy)
- **Verified data** trust copy

Counts reflect production DB — **deploy feed recovery before marketing push** or strip shows ~15k not ~67k apartments.

## TrendAgent comparison

Donor homepage is denser: promotional banners, developer logos, editorial modules, mortgage promos. LiveGrid intentionally lighter to avoid scope creep (no payment/mortgage gateway).

| Dimension | TA | LiveGrid |
|-----------|----|---------|
| Visual density | High | Medium |
| Live inventory proof | Implicit | **Explicit counts (iter 67)** |
| Category depth | Many rails | Core 4 types |
| Hero search | ✅ | ✅ |

## Remaining gaps (documented, not implemented)

1. **Editorial / news teaser row** — news route exists; homepage module optional.
2. **«Popular districts»** chip row — could deep-link to catalog filters.
3. **Developer logo wall** — needs curated CMS or API aggregation.

## Performance notes

- Trust strip queries gated on `regionId`; 2 lightweight GETs, cached 2 min.
- No carousel autoplay on hero — LCP-friendly.

## Verdict

**Homepage maturity: 78/100** — premium baseline with trust strip; donor-level promotional density deferred to content ops, not engineering iteration.
