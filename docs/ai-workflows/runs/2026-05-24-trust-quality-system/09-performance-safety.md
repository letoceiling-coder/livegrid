# 09 — Performance + Safety

## Bounds

| Limit | Value |
|-------|-------|
| Listings per scan | 150 |
| Duplicate hashes | 80 |
| Agents scored | 100 |
| Batch badges | 50 ids |

## Rules

- Deterministic SHA-256 fingerprints — no fuzzy search
- Dedupe-safe flag inserts (P2002 skip)
- No blocking writes on listings
- No automatic destructive actions
- Cron-safe: `POST /admin/trust/scan`
