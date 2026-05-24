# 01 — Domain Audit

**Iteration:** 57 — Trust + Listing Quality + Fraud Safety  
**Date:** 2026-05-24

## Existing Foundation

| Domain | Location | Trust hook |
|--------|----------|------------|
| Listings | `listings` table, `ListingsService` | Quality scoring input |
| Moderation | `ListingsModerationService`, edit history | Reject counts, approve latency |
| Ownership | `ownerUserId`, sellers | Agent trust, contact spam |
| Geo | `geoQuality`, review decisions | GEO_MISMATCH flags |
| Promotions | `ListingsPromotionService` | PROMOTION_CHURN detection |
| Communication | CRM threads (Iter 54) | Not auto-scanned (future) |
| Discovery | Recommendation scoring | Unaffected (additive badges) |

## Insertion Map

```
Listing (MANUAL)
  ├─ photos, description, geo ──► quality score (0–100)
  ├─ fingerprint hash ──────────► duplicate clusters
  ├─ edit history ──────────────► fraud heuristics (flags)
  ├─ ownerUserId ───────────────► agent_trust_score
  └─ agency_verifications ──────► public badges

Bounded scan (150 listings/run)
  ├─► listing_trust_scores (cache)
  ├─► listing_flags (dedupe-safe)
  └─► agent_trust_scores

Public: GET /listings/:id/trust → badges
Admin: /admin/trust → operational workflow
```

## Safety

- Flags only — no auto-bans, no blocking writes
- Deterministic fingerprint — no fuzzy AI search
- Additive tables only
