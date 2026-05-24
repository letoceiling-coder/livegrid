# 08 — Observability

## `?listing_debug=1`

Extended trust section:

- avg quality score
- flagged count
- duplicate warnings
- reject rate
- anomaly count (suspicious agents)
- fetch timing

## API

`GET /admin/trust/debug` — last scan stats (in-memory).

## Fetch

`fetchTrustObservability()` in `listing-observability.ts` — parallel with moderation/promotion/discovery bundle.
