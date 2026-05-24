# 06 — Public Data Quality

**Iteration:** 68 · **Date:** 2026-05-24

## Audit endpoint

`GET /admin/feed-import/recovery/data-quality?region=msk`

## Metrics

| Field | Meaning |
|-------|---------|
| `catalogEligible` | ACTIVE/RESERVED, published, PUBLIC, APARTMENT, with block |
| `withoutBuilder` | Missing builder linkage |
| `withoutDistrict` | Missing district |
| `withoutGeo` | No lat/lng |
| `invalidCoordinates` | Out-of-range coords |
| `orphanApartments` | ACTIVE FEED apartments without block |
| `orphanBlocks` | Blocks with no active listings |
| `duplicateExternalIds` | Duplicate feed IDs |
| `duplicateBlockSlugs` | Slug collisions |
| `apartmentsWithoutPlan` | No plan URL |
| `blocksWithoutImages` | Active blocks lacking gallery |
| `parityPercent` | vs donor 67k / 462 |

## Pre-recovery expected issues

- Low `catalogEligible` (~15k) — SOLD incident
- Elevated `sold` in audit (not in this endpoint but related)
- Possible orphan spike after partial imports

## Post-recovery acceptance

| Metric | Accept |
|--------|--------|
| `parityPercent.apartments` | ≥90% |
| `parityPercent.blocks` | ≥85% |
| `orphanApartments` | <100 |
| `duplicateExternalIds` | 0 |
| `duplicateBlockSlugs` | 0 |

## Admin UI

Feed Import page → **Public catalog data quality** panel with parity % and orphan counts.

## Verdict

Data quality **observable**. Trustworthy public catalog **blocked on recovery execution**.
