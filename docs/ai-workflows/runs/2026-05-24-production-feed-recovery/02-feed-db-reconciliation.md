# 02 — Feed vs DB reconciliation

**API:** `GET /admin/feed-import/integrity?region=msk&include_apartments=1`

## Delta categories

| Category | Detection |
|----------|-----------|
| Missing apartments | `feed_expected - db_active_published` |
| False SOLD | SOLD in DB + `external_id` in live feed |
| Legitimate SOLD | SOLD + not in feed |
| Orphan apartments | ACTIVE + `block_id IS NULL` |
| Orphan blocks | blocks in DB without buildings/listings |
| Duplicate external_id | SQL HAVING count > 1 |

## Recovery-safe plan

1. Audit SQL baseline
2. Integrity report with live `apartments.json` count
3. SOLD recovery plan (dry-run)
4. Execute restore → full weekly re-import
5. Verify integrity score > 90%
