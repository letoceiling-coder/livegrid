# 05 — Weekly cron policy

## Single source of truth

**BullMQ repeatable job** in `FeedImportService.onModuleInit`:

```
FEED_IMPORT_CRON=0 4 * * 1
FEED_IMPORT_CRON_TZ=Europe/Moscow
```

## Also preserved

- Manual: `POST /admin/feed-import/trigger`
- Emergency shell: `deploy/cron-feed-import.sh` (Monday fallback)
- Disable: `FEED_IMPORT_DISABLE_REPEAT=true`

## Overlap

- `assertNoOverlappingImport()` on trigger
- Cron shell: reset only RUNNING/PENDING **>3h**

## Remove on production

Any legacy 6h crontab entries.
