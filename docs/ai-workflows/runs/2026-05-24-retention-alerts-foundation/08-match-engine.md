# 08 — Match Engine

**Service:** `RetentionMatchService`

## Rules

- Converts `SavedSearchParamsJson` → `QueryListingsDto`
- Forces `is_published=true`, `statuses=ACTIVE,RESERVED`
- Public visibility enforced by listings service (non-admin)
- Region + geo passed through geo resolver (same as catalog)
- Excludes REVIEW/REJECTED/ARCHIVED via visibility filter

## Query normalization

Shared `normalizeSavedSearchSignature` — sorted param keys, region_id included in hash.

Object type → listing kind mapping mirrors catalog (`apartments` → APARTMENT, etc.).

## Dedupe

Notifications use keys like `ss:{searchId}:listing:{listingId}`.
