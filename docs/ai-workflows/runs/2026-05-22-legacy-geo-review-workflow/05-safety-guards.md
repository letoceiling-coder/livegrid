# Iteration 22.5 — Safety Guards

## Mode

PRODUCTION SAFETY · 2026-05-22

---

## Guard matrix

| Guard | Implementation | Test |
|---|---|---|
| Impossible EXACT downgrade | `assertDecisionAllowedForListing` + resolver STUB_BLOCKED | ✓ |
| Impossible overwrite without review | DANGEROUS_OVERWRITE in dry-run; review required for legacy | ✓ |
| Impossible review after materialization | `geo_source IS NOT NULL` → ALREADY_MATERIALIZED | ✓ |
| Impossible UI_ONLY lineage | Not in GeoSource enum (Iter 20) | ✓ |
| Immutable review history | Append-only INSERT; DUPLICATE_FINAL_DECISION | ✓ |
| No listing geo writes on POST | Only `listing_geo_review_decisions` INSERT | ✓ verified |
| Production blocked | `NODE_ENV=production` → 503 | ✓ |

---

## Validation error codes (deterministic)

```
LISTING_NOT_FOUND
NOT_SHADOW_UNCLASSIFIED
ALREADY_MATERIALIZED
INVALID_COORDS
EXACT_DOWNGRADE_FORBIDDEN
MISSING_BUILDING_FK
MISSING_BLOCK_FK
INVALID_REVIEW_STATUS
REVIEWER_REQUIRED
DUPLICATE_FINAL_DECISION
```

All throw `LegacyGeoReviewValidationError` with stable `code` field.

---

## POST decision safety chain

```
1. assertValidDecisionInput (reviewer, status enum)
2. Load listing + parents
3. assertReviewableListing (shadow + no lineage + valid coords)
4. assertNoDuplicateFinalDecision
5. assertDecisionAllowedForListing (FK checks per status)
6. INSERT review decision only
7. Return intent + listingGeoUnchanged: true
```

---

## What POST does NOT do

- UPDATE listings.lat/lng
- SET geo_source / geo_quality
- Trigger materialization job
- Modify resolver logic
- Enable viewport

---

## Belgorod row specifics

All 56 rows:

- region_id = 7
- data_source = MANUAL
- No block_id / building_id
- Resolver suggests MANUAL_EXACT
- Expected review outcome: **APPROVED_AS_EXACT** (preserve coords)

---

## Guard against accidental bulk materialization

Future materialization job (Iter 23+) MUST:

1. Check review decision exists for SHADOW_UNCLASSIFIED rows
2. Use `materializationIntentFromReview()` to determine write payload
3. Skip rows with MARKED_INVALID or no decision
