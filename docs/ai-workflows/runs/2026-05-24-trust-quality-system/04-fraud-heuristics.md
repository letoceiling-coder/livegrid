# 04 — Fraud Heuristics

Rule-based flags only. No automatic bans.

| Flag | Trigger |
|------|---------|
| DUPLICATE_LISTING | fingerprint cluster ≥ 2 |
| REPOST_LOOP | ≥ 2 archive/restore cycles |
| RAPID_ARCHIVE_REPOST | archived within 48h |
| CONTACT_SPAM | owner has ≥ 8 manual listings |
| PROMOTION_CHURN | ≥ 5 promotion changes |
| GEO_MISMATCH | geoQuality = LOW |
| PRICE_OSCILLATION | ≥ 20% swing in history |
| LOW_QUALITY | score < 40 |
| STALE_LISTING | inactive ≥ 90 days |

Dedupe via unique `dedupe_key` on `listing_flags`.
