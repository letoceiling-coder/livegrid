# Iteration 23.2 — Materialization Job Design

## Mode

CONTROLLED STAGING · 2026-05-22

---

## Component

`GeoMaterializationJobService` — `geo-materialization-job.service.ts`

---

## Architecture

```
┌──────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ Keyset batch │───▶│ Classify inherit │───▶│ Sub-batch tx     │
│ geo_source   │    │ BUILDING/BLOCK   │    │ UPDATE + snapshot│
│ IS NULL      │    │ skip others      │    │ (50 rows/tx)     │
└──────────────┘    └─────────────────┘    └──────────────────┘
```

---

## Features

| Feature | Implementation |
|---|---|
| Deterministic batching | Keyset cursor `id ASC`, batch=500 |
| Dry-run mode | `--dry-run` flag, no writes |
| Transactional batches | Sub-batches of 50, timeout 120s |
| Rollback snapshots | `listing_geo_materialization_snapshots` |
| Idempotent guard | `WHERE geo_source IS NULL` |
| Staging-only guard | Blocks `NODE_ENV=production` |
| Scope filter | `inherit_only` — BUILDING/BLOCK inherit |

---

## Skipped classifications

SHADOW_UNCLASSIFIED, MISSING, INVALID, DANGEROUS_OVERWRITE, LINEAGE_CONFLICT, UNCHANGED — never written by inherit job.

---

## Rollback table

`listing_geo_materialization_snapshots` stores before/after state per listing per runId. Rollback restores exact before state.

---

## Entry points

| Entry | Command |
|---|---|
| CLI | `pnpm --filter api geo:materialize --region=1` |
| CLI dry-run | `... geo:materialize --dry-run --region=1` |
| CLI rollback | `... geo:materialize --rollback=<runId>` |
| DEV endpoint | `GET /api/v1/geo/_shadow/materialization/run` |
| Rollback endpoint | `GET /api/v1/geo/_shadow/materialization/rollback/:runId` |
| Observability | `GET /api/v1/geo/_shadow/materialization/observability` |

---

## Future-safe design

- Separate runIds for audit trail
- Sub-batch transactions prevent timeout at scale
- Snapshot-based rollback (not destructive)
- Resolver parity validation post-run
- Review decisions gate shadow rows (future EXACT materialization pass)
