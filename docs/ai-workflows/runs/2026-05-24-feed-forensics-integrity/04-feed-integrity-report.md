# 04 — Feed integrity report

## API

`GET /admin/feed-import/integrity?region=msk&include_apartments=1`

Returns:

- Feed counts: `blocks_in_feed`, optional live `apartments_in_feed`
- DB breakdown: by status, orphans, catalog-eligible
- Vitrine: `GET /blocks/catalog-counts` equivalent
- `integrity_score` 0–100
- `comparison.*.delta` fields

## Admin UI

`/admin/feed-import` — **Feed integrity** panel with score, deltas, SOLD count.

## Production snapshot (2026-05-22 evidence)

| Metric | Value | Source |
|--------|-------|--------|
| ACTIVE+published apartments (MSK) | 14 917 | `stats/listing-kind-counts` |
| Blocks on vitrine | 359 | map performance audit |
| TrendAgent reference | ~67 145 / 462 ЖК | User TЗ (donor site) |

## Expected after full import

- `apartments_in_feed` ≈ 67k in batch stats
- `apartments_upserted` ≈ `apartments_in_feed`
- ACTIVE ≈ feed count minus legitimately sold units
- Vitrine ≤ ACTIVE (block_id + price filters)

## Integrity score formula

`min(apartments%, blocks%)` adjusted down for orphans and sold>active.
