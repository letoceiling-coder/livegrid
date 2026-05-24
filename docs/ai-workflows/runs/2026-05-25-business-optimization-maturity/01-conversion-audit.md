# 01 — Lead Conversion Audit

**Iteration:** 77 · **Date:** 2026-05-25

## Scope

Audit of CTA hierarchy, mobile sticky bars, callback ergonomics, inquiry friction, favorites/compare → inquiry, map → lead, listing → consultation.

## Baseline (pre-iter 77)

| Surface | Sticky mobile CTA | SELECTION flow | Notes |
|---------|-------------------|----------------|-------|
| Apartment detail | ✅ ConversionCTABar | — | Reference pattern |
| Complex detail | ✅ sticky | — | |
| Listing detail (non-apartment) | ❌ | — | Sidebar only |
| Favorites | ❌ | ❌ | Print/collection only |
| Compare | ❌ | ❌ | Spec table only |
| Catalog map popup | ✅ | — | MapPopupActions |

## Gaps closed (iter 77)

1. **`SelectionInquiryBar`** — shared component wiring `ConsultationFlow` with `requestType: SELECTION` for multi-object intent.
2. **Favorites** — desktop inline + mobile sticky SELECTION CTA when ≥1 favorite.
3. **Compare** — same pattern when comparison list non-empty.
4. **Listing detail** — mobile sticky `ConversionCTABar` aligned with apartment pattern.
5. **Duplicate-phone hint** — post-submit banner when same number submitted within 48h (API + LeadForm).

## CTA hierarchy (unchanged, validated)

Primary: consultation / viewing (`ConversionCTABar`)  
Secondary: callback (`usePhoneAction`)  
Tertiary: inline `LeadForm` on detail pages  

## Remaining P3 (not blocking)

- Map list view bulk SELECTION CTA
- A/B on sticky label copy per region
- Abandoned-flow telemetry dashboard (ops-only, no new infra)

## Files

- `SelectionInquiryBar.tsx` (new)
- `Favorites.tsx`, `Compare.tsx`
- `RedesignListingDetail.tsx`
- `LeadForm.tsx`, `requests.service.ts`
