# 09 — Recovery validation

## Before recovery (production SQL)

```sql
SELECT status, COUNT(*) FROM listings
WHERE region_id=1 AND data_source='FEED' AND kind='APARTMENT'
GROUP BY status;
```

Record: ACTIVE, SOLD counts.

## Dry-run

```
GET /admin/feed-import/recovery/sold-plan?region=msk
```

Expect: `falseSoldCandidates` >> 0, `feedApartmentCount` ~67000.

## Execute

```
POST /admin/feed-import/recovery/sold-restore?region=msk
```

Requires admin JWT + `FEED_RECOVERY_FORCE` if warnings.

## After

| Metric | Expected delta |
|--------|----------------|
| ACTIVE | +falseSoldCandidates |
| SOLD | −falseSoldCandidates |
| integrity_score | > 85% |
| catalog-counts | apartments ↑ |

## Full sync

After recovery: manual full import with iter 66 guards → `healthy_import: true`.

## Evidence artifacts

- `recoveryBatchId` in API response
- API logs: `SOLD recovery recovery-msk-*`
- import_batches stats post re-import
