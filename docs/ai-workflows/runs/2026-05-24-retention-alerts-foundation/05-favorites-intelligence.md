# 05 — Favorites Intelligence

## Schema extensions (`favorites`)

- `note` — user annotation
- `collection_id` — link to user_collections
- `last_viewed_at` — engagement tracking
- `price_at_save` — captured on add listing
- `last_notified_price` — price drop dedupe watermark

## API

| Endpoint | Purpose |
|----------|---------|
| GET `/favorites` | List + `priceChangePct`, `hasPriceDrop` |
| PATCH `/favorites/:id` | Update note / collection |
| POST `/favorites/:id/view` | Mark viewed |
| POST `/favorites/listing/:id` | Add with price snapshot |

## Account UI

`/account/favorites` — swipe-to-delete, price drop badge, inline notes.
