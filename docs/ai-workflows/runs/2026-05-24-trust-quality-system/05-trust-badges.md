# 05 — Trust Badges

## Badge Types

| Badge | Condition |
|-------|-----------|
| Verified agency | `agency_verifications.status = VERIFIED` |
| Trusted agent | `agent_trust_score ≥ 75` |
| High quality listing | `quality_score ≥ 80` |
| Recently verified | moderation approve within 14d |

Max 3 badges shown publicly.

## UI

- `TrustBadgeRow` — compact pills, icon-only on cards
- Listing detail — full labels below title
- ListingCard — optional `trustBadges` prop, bottom overlay

## API

- `GET /listings/:id/trust`
- `GET /listings/trust-badges?ids=1,2,3` (max 50)
