# 05 — Parity Validation

**Iteration:** 70 · **Date:** 2026-05-24

## Donor vs LiveGrid (BEFORE recovery)

| Entity | TrendAgent (expected) | LiveGrid production | Delta | Parity % |
|--------|----------------------|---------------------|-------|----------|
| Apartments (vitrine) | ~67,000 | **14,917** | −52,083 | **22.3%** |
| ЖК (vitrine) | ~462 | **359** | −103 | **77.7%** |

**Probe:** 2026-05-24 public `catalog-counts?region_id=1`

## Post-recovery targets

| Metric | Accept |
|--------|--------|
| `apartments_in_feed` (import stats) | ≥ 65,000 |
| Vitrine apartments | ≥ 90% of feed eligible (with block_id) |
| Vitrine ЖК | ≥ 440 |
| Integrity score | ≥ 85 |
| `parityPercent.apartments` (data-quality API) | ≥ 90% |

## Validation endpoints

```
GET /blocks/catalog-counts?region_id=1
GET /admin/feed-import/integrity?region=msk&include_apartments=1
GET /admin/feed-import/recovery/data-quality?region=msk
GET /admin/feed-import/diagnostics?region=msk
```

## Delta analysis (server SQL)

- Missing entities: ACTIVE with `block_id IS NULL` (orphans — excluded from vitrine)
- Duplicate `external_id`: must be 0 groups
- SOLD still in feed IDs: should drop after restore + import

## Geo / image integrity

Use `recovery/data-quality`:

- `withoutGeo`, `invalidCoordinates`
- `apartmentsWithoutPlan`, `blocksWithoutImages`
- Accept: orphans < 100, duplicates = 0

## Verdict

**Pre-recovery parity: FAIL (22%)**. Post-recovery validation **pending** production run.
