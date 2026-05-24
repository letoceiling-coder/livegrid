# 09 — Performance

## Indexes added

- `(promotion_tier, promoted_until)`  
- `(vip_priority)`  

## Pagination stability

- Fixed `id ASC` tiebreaker in promotion rank sort  
- Expire scan capped at 50 per public catalog request  
- Bulk expire capped at 500  

## Cache

No catalog cache layer modified — listing queries unchanged except orderBy.

Explicit price sorts bypass promotion rank — stable price ordering.
