# 01 — Production Baseline

**Iteration:** 70 · **Date:** 2026-05-24  
**Mode:** Production Recovery Execution

## Snapshot method

Public API probe from audit environment + server-side scripts for admin metrics.

**Scripts:** `production-baseline-snapshot.sh`, `production-state-audit.sql`, `deploy/audit-feed-db.sh`

## BEFORE metrics (production — live probe 2026-05-24)

| Metric | Value | Donor target | Parity |
|--------|-------|--------------|--------|
| Vitrine apartments (`catalog-counts`) | **14,917** | ~67,000 | **22.3%** |
| Vitrine ЖК (`catalog-counts`) | **359** | ~462 | **77.7%** |
| `APARTMENT` kind count (stats) | **14,917** | ~67,000 | 22.3% |
| API health | `ok`, database `up` | — | ✅ |

**Source:** `GET https://livegrid.ru/api/v1/blocks/catalog-counts?region_id=1`

## Root cause (confirmed iter 65–66)

Mass **false SOLD** after **degraded/partial imports**, amplified by legacy aggressive crons — not silent row limits.

## Expected admin baseline (run on server)

After auth, capture via `production-baseline-snapshot.sh before`:

| Endpoint | Purpose |
|----------|---------|
| `recovery/audit` | ACTIVE/SOLD/orphans/duplicates |
| `integrity?include_apartments=1` | Feed vs DB score |
| `recovery/incident` | SOLD spike alert |
| `health` | Stale/stuck/degraded 7d |
| `snapshots` | Import trend |
| `recovery/data-quality` | Catalog eligible parity |

## SQL baseline (server)

```bash
psql "$DATABASE_URL" -v region_code=msk -f scripts/reliability/production-state-audit.sql
```

Extended queries (iter 70): duplicate `external_id`, FEED vs MANUAL, orphan blocks, degraded batches.

## TrendAgent feed access

From non-whitelisted IP: **403** on `dataout.trendagent.ru` — recovery **must run on production server** with whitelisted IP + `FEED_HTTP_FETCH_ALLOWED=true`.

## Stored artifacts

```
/var/log/lg/feed-recovery-baseline/{timestamp}-before/
/var/log/lg/feed-recovery-baseline/{timestamp}-after/
```

## Verdict

Baseline confirms **~15k/359 vitrine** vs **~67k/462 donor**. Recovery execution **required** on production host.
