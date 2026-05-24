# 11 — QA Matrix

| Case | Expected | Status |
|------|----------|--------|
| Duplicate detection | Same fingerprint → DUPLICATE flag | ✅ |
| Trust scoring | 0–100 deterministic | ✅ shared |
| Fraud flags | Dedupe prevents duplicates | ✅ |
| Moderation metrics | rejectRate, distribution | ✅ API |
| Promotion abuse | PROMOTION_CHURN flag | ✅ heuristic |
| Quality badges | HIGH_QUALITY at ≥80 | ✅ |
| Mobile rendering | compact TrustBadgeRow | ✅ |
| Pagination | meta.total_pages | ✅ |
| Console errors | typecheck clean | ✅ |
| No auto-bans | flags only | ✅ by design |
| CRM/automation | untouched | ✅ additive |

## Post-deploy

1. Apply migration `20260524700000_trust_quality`
2. Run `POST /admin/trust/scan`
3. Verify `/admin/trust` tabs
4. Check listing detail badges
5. Verify `?listing_debug=1` trust section
