# 09 — Forensics root cause

## Question

Why TrendAgent **~67 145** apartments / **462** ЖК vs LiveGrid **~14 917** / **359**?

## Evidence (code + production probes)

### 1. No importer truncation

Source audit: apartment loop processes `data.length` fully. `batchSize=500` is chunking only.

### 2. Metric mismatch (partial)

| TrendAgent site | LiveGrid public API |
|-----------------|---------------------|
| All feed apartments | `ACTIVE+RESERVED`, `isPublished=true` |
| ЖК with offers | Blocks with `require_active_listings` |

Vitrine MV also requires `block_id NOT NULL`, `price >= 100_000`.

**Does not alone explain 67k → 15k** — production DB total ACTIVE published ≈ 15k (not 45k+).

### 3. Primary root cause: markSold after degraded import

Mechanism:

1. `processApartments` builds `existingExtIds` from **current feed array**
2. `markSoldListings` sets `SOLD` on all FEED apartments not in set
3. Aggressive **6h cron** + cron script **force-failing RUNNING** batches → overlapping/partial imports
4. If import completes with **smaller** `apartments.json` snapshot (failed retry, stale CDN, interrupted run), markSold marks ** tens of thousands** as SOLD

Supporting signals to verify on production SQL:

```sql
SELECT status, COUNT(*) FROM listings
WHERE region_id=1 AND kind='APARTMENT' AND data_source='FEED'
GROUP BY status;
-- Expect: SOLD >> ACTIVE if hypothesis true

SELECT stats->>'apartments_in_feed', stats->>'apartments_marked_sold'
FROM import_batches WHERE region_id=1 AND status='COMPLETED'
ORDER BY finished_at DESC LIMIT 5;
```

### 4. Blocks 462 → 359

`catalog-counts` counts blocks with ≥1 ACTIVE published apartment with block_id.  
Feed has ~1308 block records; vitrine shows subset with live offers — **359 is plausible** for offer-filtered count vs TrendAgent marketing number **462**.

## Fix applied

- markSold ratio guard (`FEED_MARK_SOLD_MIN_RATIO=0.85`)
- Weekly Monday cron only
- Stuck-only cron reset
- Forensic integrity API + stats `apartments_in_feed`

## Required production action

1. Deploy iter 65
2. Run **one full manual import** on whitelisted server
3. Verify `apartments_in_feed` ≈ 67k and ACTIVE recovers
4. If SOLD remains high, one-time SQL review before re-import (ops decision)
