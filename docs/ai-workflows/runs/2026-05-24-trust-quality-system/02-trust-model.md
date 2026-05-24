# 02 — Trust Model

## Migration

`20260524700000_trust_quality`

## Tables

| Table | Purpose |
|-------|---------|
| `listing_trust_scores` | Cached 0–100 quality score + fingerprint |
| `agent_trust_scores` | Per-user trust metrics |
| `agency_verifications` | Verified agency status |
| `listing_flags` | Fraud/quality flags (dedupe key) |

## Enums

- `ListingTrustFlagType` — 9 flag types
- `ListingTrustFlagSeverity` — INFO, WARN, ALERT
- `AgencyVerificationStatus` — PENDING, VERIFIED, REVOKED

## Shared

`packages/shared/src/listings/listing-trust.ts` — scoring, badges, fingerprint key builder.
