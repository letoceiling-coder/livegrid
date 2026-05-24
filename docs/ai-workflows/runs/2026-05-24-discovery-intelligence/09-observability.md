# 09 — Observability

## DEV overlay (`?listing_debug=1`)

Extended `fetchListingDebugBundle()` with discovery metrics from `GET /admin/discovery/metrics`:

- `relatedQueryMs`
- `feedQueryMs`
- `cacheHits` / `cacheMisses`
- `lastSignals` (top scoring signals)
- `recommendationCount`

Displayed in `ListingDebugOverlay` under **discovery** section.
