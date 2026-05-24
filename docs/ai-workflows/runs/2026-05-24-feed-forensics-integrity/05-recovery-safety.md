# 05 — Recovery safety

## Implemented guards (iter 65)

1. **markSold ratio guard** — skip when new feed <85% of previous `apartments_in_feed`
2. **Stats tracking** — `apartments_in_feed`, `apartments_marked_sold`, `mark_sold_skipped`
3. **Cron** — no longer kills healthy RUNNING batches
4. **Failed batch** — does not run markSold (apartment step incomplete)

## Not transactional (by design)

Import is multi-stage upsert, not staging table swap. Partial ref-file errors leave prior data intact.

## Recovery procedure

1. Check `import_batches.stats` for last COMPLETED
2. Run integrity report with `include_apartments=1`
3. If SOLD inflated: manual re-import after fix deploy (markSold guard active)
4. `POST /admin/feed-import/refresh-cache` after successful full import

## Orphan detection

- Listings `block_id IS NULL` — counted in health + integrity
- Buildings skipped when block missing — does not delete existing buildings
