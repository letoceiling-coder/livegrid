# Iteration 23.5 — Rollback Validation

## Mode

CONTROLLED STAGING · 2026-05-22

---

## Rollback execution

```bash
npx tsx geo-materialization-job.cli.ts --rollback=caac8962-fb1e-4ef3-b1fe-023634175234
```

---

## Results

| Metric | Value |
|---|---:|
| Snapshots restored | **76,267** |
| Duration | **270 s** (~4.5 min) |
| Errors | **0** |

---

## Schema verification post-rollback

| Field | Before materialization | After rollback |
|---|---:|---:|
| geo_source (region 1) | 0 | **0** |
| geo_quality (region 1) | 0 | **0** |
| lat/lng (region 1) | 0 | **0** |
| lineage_populated | 0 | **0** |

**Full restoration confirmed** — inherit rows returned to pre-materialization null state.

---

## Transaction strategy

- Sub-batches of 50 listings per transaction
- 120s timeout per sub-batch
- Individual listing UPDATE restores snapshot fields
- No DELETE of snapshots (audit trail preserved)

---

## Rollback safety properties

| Property | Verified |
|---|---|
| Reversible | ✓ 76,267/76,267 restored |
| Non-destructive | ✓ snapshots retained |
| Idempotent re-run | ✓ re-materialization after rollback succeeded |
| Belgorod isolation | ✓ region 7 lat/lng unchanged (56 rows) |
| Review decisions preserved | ✓ 56 decisions intact |

---

## Production rollback playbook

1. Identify runId from `listing_geo_materialization_snapshots`
2. Execute rollback CLI/endpoint (staging-tested)
3. Verify `lineage_populated` returns to expected pre-run count
4. Investigate root cause before re-materialization

Emergency SQL (documented, not executed):

```sql
-- Per-run rollback via snapshots — prefer service rollback
UPDATE listings l SET ... FROM listing_geo_materialization_snapshots s
WHERE l.id = s.listing_id AND s.run_id = $1;
```

---

## Re-materialization

After rollback validation, run 2 (`82d63ddf-81f7-4802-9ebb-3bb435c7c3a8`) re-applied materialization for continued staging validation.
