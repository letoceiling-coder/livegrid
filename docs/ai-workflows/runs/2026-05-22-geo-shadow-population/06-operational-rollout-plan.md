# Iteration 21.6 — Operational Rollout Plan

## Mode

SHADOW NORMALIZATION · recommendations only · 2026-05-22

---

## Phased materialization plan (future — NOT Iter 21)

### Phase A — Legacy review (56 rows)

1. Export SHADOW_UNCLASSIFIED sample rows from dry-run report
2. Human classify each: MANUAL_EXACT, UNKNOWN, or coord correction
3. Manual UPDATE with audit trail
4. Re-run dry-run → confirm SHADOW_UNCLASSIFIED = 0

### Phase B — MSK inherit bulk (region 1)

1. Scope: `region_id=1 AND geo_source IS NULL AND building_id IS NOT NULL`
2. Expected: ~75,998 BUILDING_INHERIT writes
3. Batch job with `--dry-run` gate before each batch write
4. Post-batch: verify `lineage_populated` count matches expected

### Phase C — Block-only inherit (416 rows)

1. Scope: block FK resolvable, no building coords
2. BLOCK_INHERIT materialization

### Phase D — Missing enrichment (2,132 rows)

1. Do NOT blind-write MISSING rows
2. Upstream: ensure block/building coords populated
3. Re-run dry-run after enrichment

---

## SQL query strategy

### Selection query (keyset pagination)

```sql
SELECT l.id, l.region_id, l.lat, l.lng,
       l.geo_source, l.geo_quality, l.geo_entity_id, l.geo_entity_kind,
       l.block_id, l.building_id, l.data_source,
       b.latitude AS block_lat, b.longitude AS block_lng,
       bld.latitude AS building_lat, bld.longitude AS building_lng
FROM listings l
LEFT JOIN blocks b ON b.id = l.block_id
LEFT JOIN buildings bld ON bld.id = l.building_id
WHERE l.id > $cursor
  AND l.geo_source IS NULL
ORDER BY l.id ASC
LIMIT 500;
```

### Lock risk assessment

| Risk | Level | Mitigation |
|---|---|---|
| Row-level lock on listings | Medium | Short transactions, batch=500 |
| FK join lock on blocks/buildings | Low | Read-only JOIN in SELECT |
| Deadlock with feed import | Medium | Run off-peak; advisory lock |
| Long-running txn | Low | Commit per batch |

---

## Update window recommendation

| Window | Rationale |
|---|---|
| Off-peak (02:00–05:00 MSK) | Minimal concurrent listing writes |
| After feed import completes | Avoid race with `processApartments()` |
| Before viewport rollout | Coords must exist before enabling map |

---

## Pre-flight checklist

- [ ] Dry-run report GO or GO_WITH_REVIEW signed off
- [ ] SHADOW_UNCLASSIFIED rows manually resolved
- [ ] Staging dry-run on production snapshot
- [ ] Rollback script prepared (NULL geo columns — additive, reversible)
- [ ] Monitoring: `lineage_populated` counter alert

---

## Rollback strategy

Geo columns are nullable (Iter 20). Emergency rollback:

```sql
-- Emergency only — clears materialization, preserves lat/lng
UPDATE listings SET
  geo_source = NULL, geo_quality = NULL,
  geo_confidence = NULL, geo_entity_id = NULL,
  geo_entity_kind = NULL, geo_resolved_at = NULL,
  geo_resolution_version = NULL
WHERE geo_resolution_version = 1;
```

Does NOT revert denormalized lat/lng — separate decision required.

---

## Index churn mitigation

- Materialize in primary key order (matches index insert pattern)
- `ANALYZE listings` after job completion
- Monitor `pg_stat_user_tables.n_tup_upd`

---

## NOT in scope (Iter 21)

- Job deployment
- Queue workers
- Cron scheduling
- Production execution
