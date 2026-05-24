# 08 — Conversion UX

**Iteration:** 74 · **Date:** 2026-05-25

## Existing conversion stack (verified)

| Element | Location |
|---------|----------|
| `ConversionCTABar` | Listing detail, map popup |
| `ConsultationFlow` | Modal lead capture |
| `LeadForm` | Detail pages |
| Phone action | `usePhoneAction` with fallback to callback |
| Favorites / compare | Detail page actions |
| Sticky catalog CTA | Filter mobile bar "Показать N объектов" |

## Iter 74 contribution

- Empty catalog state → reset filters (reduces dead-end)
- Map loading overlay (reduces bounce during map init)
- Trust badge on listings (increases click confidence)

## Not added

Payment gateway, subscription CTAs, AI assistant — out of scope.

## Verdict

**Conversion path preserved and strengthened** at filter empty-state and trust layers.
