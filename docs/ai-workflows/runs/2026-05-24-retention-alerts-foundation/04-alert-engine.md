# 04 — Alert Engine

**Service:** `RetentionAlertsService`

## Triggers (bounded scan, no realtime)

| Scan | Trigger | Notification type |
|------|---------|-------------------|
| `scanSavedSearchMatches` | Listing created after `lastMatchAt` matching saved params | SAVED_SEARCH_MATCH |
| `scanFavoritePriceDrops` | Current price < priceAtSave / lastNotifiedPrice | PRICE_DROP |
| `scanFavoriteListingUpdates` | Listing updated in 24h | FAVORITE_UPDATE |
| `scanRestoredListings` | PUBLIC listing updated in 7d | LISTING_RESTORED |

## Invocation

- `POST /admin/retention/scan` (editor+) — manual bounded run
- BullMQ-ready constants: `RETENTION_ALERTS_QUEUE`, job names

## Caps

- 100 saved searches / run
- 50 listings / search
- 200 favorites / run
- 50 notifications / user / day
