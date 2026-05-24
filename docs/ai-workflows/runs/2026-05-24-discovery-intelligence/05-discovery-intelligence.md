# 05 — Discovery Intelligence

## Service

`DiscoveryIntelligenceService`

## Aggregates (7-day window)

- **Trending listings** — favorites ×3 + views ×1 + inquiries ×5
- **Trending blocks** — favorite counts by blockId
- **Hot regions** — active listing activity by regionId
- **Rising favorites** — top favorited listings
- **View-to-contact ratio** — browse vs CRM request listingId

## Admin API

- `GET /admin/discovery/insights` — full snapshot
- `GET /discovery/trending?region_id=` — public trending ids

Safe aggregation only — no PII in insights payload.
