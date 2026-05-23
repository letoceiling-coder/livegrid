# Iteration 21.5 — Performance Analysis

## Mode

SHADOW NORMALIZATION · measured · 2026-05-22

---

## Dry-run throughput (read-only)

| Scope | Rows | Duration | Rows/sec |
|---|---:|---:|---:|
| All regions | 78,602 | 5,986 ms | ~13,130 |
| Region 1 (MSK) | 78,543 | 4,780 ms | ~16,430 |

Dry-run is **read-heavy** (JOIN listing + block + building per batch). No UPDATE cost included.

---

## Projected real materialization cost

| Phase | Estimate |
|---|---|
| CPU (resolver) | ~6 s for 78k rows (negligible) |
| DB UPDATE (76k inherit rows) | **Dominant cost** — 76,414 row updates |
| Index maintenance | 3 new indexes on geo columns |
| WAL volume | ~76k UPDATE tuples × row width |

Conservative estimate for real write job: **5–15 minutes** at batch=500 with proper indexing, depending on hardware and concurrent load.

---

## Recommended batch sizing

| Parameter | Value | Rationale |
|---|---|---|
| Batch size | **500** | Matches dry-run default; balances lock duration vs progress |
| Pagination | Keyset `id ASC` | Stable cursor, no OFFSET drift |
| Transaction | 1 batch = 1 txn | Rollback per batch on failure |
| Concurrency | **1 worker** | Avoid lock contention on listings table |
| Throttle | 50–100 ms between batches | Reduce WAL burst |

---

## Future transaction strategy

```sql
-- Pseudocode — NOT executed
BEGIN;
UPDATE listings SET
  lat = $1, lng = $2,
  geo_source = $3, geo_quality = $4,
  geo_confidence = $5, geo_entity_id = $6,
  geo_entity_kind = $7, geo_resolution_version = 1,
  geo_resolved_at = NOW()
WHERE id = ANY($batch_ids)
  AND geo_source IS NULL;  -- idempotent guard
COMMIT;
```

Idempotent guard: only update rows without existing lineage.

---

## Re-materialization impact

- `geo_resolution_version` bump triggers selective re-run
- EXACT rows: noop (EXACT_PRESERVED)
- Inherit rows: cheap UPDATE if parent coords unchanged
- Index `listings_geo_quality_region_id_idx`: useful for viewport post-rollout

---

## Index pressure

| Index | Write amplification |
|---|---|
| `listings_geo_quality_region_id_idx` | 1 insert per materialized row |
| `listings_geo_source_idx` | 1 insert per materialized row |
| `listings_geo_entity_idx` | 1 insert per row with entity |

Post-materialization: run `ANALYZE listings` — no VACUUM FULL needed for UPDATE-in-place.

---

## WAL implications

~76k UPDATEs ≈ moderate WAL burst. Recommend:

- Off-peak execution window
- `synchronous_commit=on` (default) — durability over speed
- Monitor replication lag if read replicas exist
- No materialization during peak feed import

---

## Scalability verdict

Dry-run proves resolver scales linearly. Real bottleneck is **DB write throughput**, not resolver CPU. Batch=500 with single worker is safe starting point.
