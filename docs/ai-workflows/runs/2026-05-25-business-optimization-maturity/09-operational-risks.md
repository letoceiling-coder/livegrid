# 09 — Operational Risks

**Iteration:** 77 · **Date:** 2026-05-25

## Low risk

| Risk | Mitigation |
|------|------------|
| Duplicate hint false positive (family shared phone) | Informational only; ops judgment |
| Sticky CTA overlaps mobile nav | `safe-area-pb`, `pb-24` on pages |
| Draft banner stale localStorage | Links to server draft id when present |

## Medium risk (monitor)

| Risk | Action |
|------|--------|
| Duplicate scan at high lead volume | Add index on `(createdAt, phone)` if P95 create >200ms |
| SELECTION leads without listing ids | CRM comment includes contextFooter; train managers |

## Out of scope risks (unchanged)

- Payment gateway absence blocks self-serve monetization
- No real-time lead push (Telegram existing only)

## Rollback

- Web: revert Favorites/Compare/ListingDetail/Catalog/AdminMyListings
- API: remove `findRecentDuplicatePhone` block in create()
