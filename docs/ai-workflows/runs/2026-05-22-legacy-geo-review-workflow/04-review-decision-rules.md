# Iteration 22.4 — Review Decision Rules

## Mode

PRODUCTION SAFETY · pure governance contract · 2026-05-22

---

## Module

- `legacy-geo-review.types.ts` — enums, contracts, error codes
- `legacy-geo-review.utils.ts` — pure validation + intent derivation

---

## Decision → future materialization intent

| Review Status | preserveCoords | futureGeoSource | futureGeoQuality | allowed |
|---|---|---|---|---|
| APPROVED_AS_EXACT | ✓ | MANUAL_EXACT | EXACT | ✓ |
| APPROVED_AS_BUILDING | ✗ | BUILDING_INHERIT | BUILDING_CENTROID | ✓ |
| APPROVED_AS_BLOCK | ✗ | BLOCK_INHERIT | BLOCK_CENTROID | ✓ |
| MARKED_INVALID | ✓ | null | INVALID | ✗ |
| SKIPPED | ✓ | null | null | ✗ |

**Intent is returned in API response only** — NOT written to listings table in Iter 22.

---

## APPROVED_AS_EXACT

- Preserve stored lat/lng
- Future materialization assigns MANUAL_EXACT + EXACT
- Requires valid WGS84 coords
- Suitable for Belgorod manual houses (no block/building FK)

---

## APPROVED_AS_BUILDING / APPROVED_AS_BLOCK

- Future materialization replaces coords with parent centroid
- Requires resolvable building/block FK + parent coords
- Not applicable to current 56 rows (all lack FK)

---

## MARKED_INVALID

- Excludes listing from future bulk materialization
- Coords preserved but geo_quality would be INVALID if materialized

---

## SKIPPED

- Informational deferral
- No materialization intent

---

## Eligibility rules

Listing must be:

1. SHADOW_UNCLASSIFIED per dry-run classifier
2. Has stored lat/lng
3. `geo_source IS NULL` (not materialized)
4. No prior final review decision

---

## Immutable history

- Each POST creates new row in `listing_geo_review_decisions`
- No UPDATE on existing decisions
- Duplicate final decision rejected (`DUPLICATE_FINAL_DECISION`)

---

## Verified example (listing 109902)

```
Decision: APPROVED_AS_EXACT
Reviewer: iter22-test
Before: lat=50.70754, lng=36.574826, geo_source=null
After:  lat=50.70754, lng=36.574826, geo_source=null  ← unchanged
Intent: MANUAL_EXACT / EXACT / preserveCoords=true
```
