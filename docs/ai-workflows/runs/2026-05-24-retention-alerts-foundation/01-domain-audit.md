# 01 — Domain Audit (Iter 52)

**Date:** 2026-05-24  
**Scope:** Saved searches, favorites intelligence, alerts, user retention

## Pre-Iter 52 state

| Capability | Status |
|------------|--------|
| Catalog + URL filters | ✓ |
| Favorites (listing/block) | ✓ basic |
| User collections | ✓ Profile + Favorites |
| CRM notifications | ✓ staff only |
| Saved searches | ✗ |
| User notifications | ✗ |
| Browse history | ✗ |
| Alert engine | ✗ |

## Retention architecture map

```
Catalog filters (URL) ──► SaveSearchButton ──► saved_searches
                              │
                              ▼
                    RetentionMatchService ──► listings.findAll (PUBLIC)
                              │
                              ▼
                    RetentionAlertsService (bounded scan)
                              │
                              ▼
                    user_notifications (deduped)

Favorites ──► priceAtSave, note, collectionId
           ──► price drop / update scans

Listing detail ──► user_browse_history (upsert, cap 100)

Account cabinet:
  /account/favorites
  /account/saved-searches
  /account/history
  /account/notifications
```

## Unchanged (safe)

- Map, viewport, geo pipeline, CRM, moderation, listings lifecycle, ownership, deploy
