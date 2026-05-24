# 06 — Trust Integration

## Public presentation

- `EcosystemTrustChips` — verified agency, trust score, quality, response label, listing count
- `TrustBadgeRow` on agent pages — reuses `deriveTrustBadges`
- `activeSince` from user `createdAt`

## Rules

- Trust independent from billing tier
- No star ratings or user reviews
- Response reliability only when CRM sample ≥ threshold
