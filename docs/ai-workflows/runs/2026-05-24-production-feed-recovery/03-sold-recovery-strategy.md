# 03 — SOLD recovery strategy

## Principle

**Never** restore all SOLD. Only restore **false SOLD**:

```
status = SOLD AND data_source = FEED AND external_id IN current_feed.apartments[]._id
```

## Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/admin/feed-import/recovery/sold-plan` | dry-run plan |
| POST | `/admin/feed-import/recovery/sold-restore?dry_run=1` | preview |
| POST | `/admin/feed-import/recovery/sold-restore` | execute (admin) |

## Safety gates

- Feed must have ≥ 50k apartments (MSK)
- Warnings on high false-SOLD ratio
- `FEED_RECOVERY_FORCE=true` override on server
- Batched `updateMany` by external_id chunks (5000)
- MV refresh + cache invalidate after restore

## Reversibility

Re-run import with healthy feed re-applies markSold for truly removed units. Recovery batch ID logged in response.
