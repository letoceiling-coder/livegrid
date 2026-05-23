# Iteration 22.2 — Review Schema Design

## Mode

PRODUCTION SAFETY · additive only · 2026-05-22

---

## Migration

`packages/database/prisma/migrations/20260522230000_listing_geo_review_decisions/migration.sql`

---

## New enum: ListingGeoReviewStatus

Separate from `GeoSource` — governance state only:

| Status | Meaning |
|---|---|
| PENDING_REVIEW | No decision recorded |
| APPROVED_AS_EXACT | Preserve coords; future MANUAL_EXACT |
| APPROVED_AS_BUILDING | Future BUILDING_INHERIT materialization |
| APPROVED_AS_BLOCK | Future BLOCK_INHERIT materialization |
| MARKED_INVALID | Exclude from materialization |
| SKIPPED | Informational; no action |

**No UI_ONLY.** **No geo_source overload.**

---

## New table: listing_geo_review_decisions

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| listing_id | INTEGER FK → listings | CASCADE delete |
| review_status | ListingGeoReviewStatus | |
| reviewer | VARCHAR(128) | Required |
| decision_reason | TEXT | Optional audit note |
| before_lat/lng | DECIMAL | Snapshot at decision time |
| proposed_lat/lng | DECIMAL | Inherit coords if applicable |
| created_at | TIMESTAMPTZ | Immutable |

**Append-only** — no UPDATE on decisions. Latest decision wins by `created_at DESC`.

---

## Indexes

| Index | Purpose |
|---|---|
| `(listing_id, created_at DESC)` | Latest decision lookup |
| `(review_status)` | Metrics aggregation |
| Partial `listings_legacy_geo_review_idx` | Legacy candidate scan |

Partial index predicate:

```sql
WHERE lat IS NOT NULL AND lng IS NOT NULL AND geo_source IS NULL
```

---

## Prisma model

```prisma
model ListingGeoReviewDecision {
  listingId    Int
  reviewStatus ListingGeoReviewStatus
  reviewer     String
  ...
  listing Listing @relation(...)
}
```

Listing model gains `geoReviewDecisions` relation — **no new columns on listings**.

---

## What this table does NOT do

- Does NOT write geo_source / geo_quality on listings
- Does NOT materialize coords
- Does NOT replace resolver logic

It is an **audit trail** for human sign-off before future materialization.
