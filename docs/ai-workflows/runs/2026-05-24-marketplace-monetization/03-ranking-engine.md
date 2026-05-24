# 03 — Ranking Engine

## When promotion rank applies

Public catalog only (`!admin_view`, no actor), default sort (`created_desc` or unset).

Explicit sorts (`price_asc`, `price_desc`, etc.) **ignore** promotion — user intent preserved.

## Deterministic ORDER BY

1. vipPriority DESC  
2. boostScore DESC  
3. lastActivityAt DESC  
4. createdAt DESC  
5. id ASC (stable tiebreaker)

## Safety rules

- assignPromotion rejects REVIEW/REJECTED/ARCHIVED/unpublished
- Expired tier treated as STANDARD via expire scan + `effectivePromotion()`
- No random ordering
