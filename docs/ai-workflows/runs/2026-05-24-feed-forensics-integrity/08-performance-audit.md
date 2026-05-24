# 08 — Performance + storage audit

## Import duration drivers

- Full `apartments.json` parse in memory (~67k objects)
- Per-row upsert (not bulk COPY) — safe but ~30–60 min for full MSK
- `batchSize=500` progress logging every 500 rows

## Memory

- Peak: entire apartments array + Prisma connection pool
- PM2 `max_memory_restart: 1G` — monitor during full import

## DB

- Unique `(region_id, external_id)` prevents duplicates
- Indexes on listings support catalog MV refresh

## Queue

- Single worker per batch recommended for memory
- BullMQ failed jobs surfaced in health

## 70k+ readiness

- No code change required for volume
- Ensure Redis + adequate import window (weekly cron)
- Integrity `include_apartments=1` is admin-only heavy op
