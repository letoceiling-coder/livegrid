# 03 — Import limit audit

## Search results (production importer)

| Location | Limit | Truncates import? |
|----------|-------|-------------------|
| `processApartments` `batchSize=500` | Chunk loop | **No** — iterates all `data.length` |
| `fetchJson` timeout | 300_000 ms | Fails batch if timeout |
| `getHistory` `take: 20` | Admin UI only | No |
| `getHealthSummary` `take: 30` | Diagnostics only | No |
| `MAX_REASONABLE_PRICE_RUB` | Price → null | Excludes from **vitrine MV**, not from DB row |
| `processBuildings` `if (!blockId) continue` | Skips orphan building | Building not upserted |
| Apartments upsert | No skip on missing block | Creates listing with `blockId=null` |

## Frontend / SSR

- **No** TrendAgent HTTP from web app (grep: only API admin modules)
- Map/catalog use LiveGrid API only

## Conclusion

**No hidden row cap** explains 67k→15k. Gap is explained by:

1. **Status SOLD** (markSold after smaller feed)
2. **Metric definition** (TrendAgent all feed rows vs LiveGrid ACTIVE+published)
3. **Vitrine filters** (`block_id`, `price >= 100k`)

Evidence script: `scripts/reliability/feed-forensics.sh`
