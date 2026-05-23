# Iteration 22.7 — Risk Analysis

## Mode

PRODUCTION SAFETY · 2026-05-22

---

## Risks mitigated

| Risk | Mitigation | Status |
|---|---|---|
| Auto-classification of legacy coords | Human review required; separate enum | ✓ |
| Accidental listing geo writes | POST writes review table only | ✓ verified |
| Review state in geo_source | Separate ListingGeoReviewStatus enum | ✓ |
| Production exposure | DEV-only gate | ✓ |
| Duplicate/conflicting decisions | Immutable append + DUPLICATE guard | ✓ |
| EXACT downgrade | Resolver + validation guards | ✓ |
| Viewport premature enable | Not touched | ✓ |

---

## Residual risks

| Risk | Level | Notes |
|---|---|---|
| 55 rows still PENDING_REVIEW | Medium | Ops must complete Belgorod review |
| Review decisions not synced to staging/prod | Medium | Migration + manual review session |
| Intent not enforced until Iter 23 | Low | By design — governance first |
| Test decision on listing 109902 in local DB | Low | DEV verification artifact |

---

## Safety checklist

- [x] No listing lat/lng writes
- [x] No geo_source / geo_quality writes
- [x] No viewport changes
- [x] No frontend semantic changes
- [x] No resolver logic changes
- [x] No materialization UPDATEs
- [x] Additive migration only
- [x] tsc api pass
- [x] tsc web pass
- [x] 53/53 geo tests pass
- [x] 56 SHADOW_UNCLASSIFIED confirmed
- [x] POST verified listingGeoUnchanged=true

---

## Before/after schema counts

| Metric | Before review session | After test decision |
|---|---:|---:|
| geo_source populated | 0 | 0 |
| geo_quality populated | 0 | 0 |
| lat/lng rows | 56 | 56 |
| review decisions | 0 | 1 |

Listing geo fields unchanged. Only review audit table mutated.

---

## Unacceptable (blocked)

| Action | Iter 22 |
|---|---|
| Materialization UPDATE | ✗ |
| Viewport enablement | ✗ |
| Auto-classify 56 rows | ✗ |
| Modify fallbackCoords | ✗ |
| Production deploy requirement | ✗ |
