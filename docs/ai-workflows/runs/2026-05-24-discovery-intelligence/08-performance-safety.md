# 08 — Performance + Safety

## Bounds

| Limit | Value |
|-------|-------|
| Candidate pool | 80 |
| Related results | 12 |
| Feed max | 24 |
| Cache entries | 200 |
| Cache TTL | 5 min |
| Alert users/run | 100 |

## Safety

- Region filter on all scoring (reject cross-region)
- Public visibility filter on all candidate queries
- No N+1: batch hydrate cards by id list
- No realtime recompute — cache + bounded scans only
- Reuses existing `RetentionMatchService` for saved search params (no duplicate filter logic)
