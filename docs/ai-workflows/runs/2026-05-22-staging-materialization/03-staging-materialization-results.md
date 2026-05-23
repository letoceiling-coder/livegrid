# Iteration 23.3 — Staging Materialization Results

## Mode

CONTROLLED STAGING · `lg_development` · 2026-05-22

---

## Run summary

| Parameter | Value |
|---|---|
| Environment | lg_development (local staging) |
| Region | 1 (MSK) |
| Run ID (final) | `82d63ddf-81f7-4802-9ebb-3bb435c7c3a8` |
| Duration | **338 s** (~5.6 min) |
| Dry run | false |

---

## Batch metrics

| Metric | Count |
|---|---:|
| Updated | **76,267** |
| BUILDING_INHERIT | **75,851** |
| BLOCK_INHERIT | **416** |
| Skipped | ~2,276 |
| Conflicts | **0** |
| Snapshots | **76,267** |

---

## Schema after (region 1)

| Field | Before | After |
|---|---:|---:|
| geo_source populated | 0 | **76,267** |
| geo_quality populated | 0 | **76,267** |
| lat/lng rows | 0 | **76,267** |
| lineage_populated | 0 | **76,267** |

---

## Lineage distribution

| geo_source | Count | % |
|---|---:|---:|
| BUILDING_INHERIT | 75,851 | 99.45% |
| BLOCK_INHERIT | 416 | 0.55% |

| geo_quality | Count |
|---|---:|
| BUILDING_CENTROID | 75,851 |
| BLOCK_CENTROID | 416 |

---

## Performance

| Metric | Value |
|---|---|
| Rows updated | 76,267 |
| Wall time | 338 s |
| Throughput | ~226 rows/s (write-heavy) |
| Sub-batch size | 50 rows/transaction |
| Batch size | 500 rows/fetch |

WAL volume: ~76k UPDATE tuples. Acceptable for off-peak staging window.

---

## Belgorod unaffected

Region 7 retains 56 legacy lat/lng rows with review decisions but no geo_source (inherit job scoped to region 1 only).

---

## Rollback test (run 1)

| Parameter | Value |
|---|---|
| Run ID | `caac8962-fb1e-4ef3-b1fe-023634175234` |
| Restored | **76,267** |
| Rollback duration | **270 s** |
| Post-rollback lineage | **0** |

Rollback verified fully reversible. Re-materialization (run 2) applied for final staging state.
