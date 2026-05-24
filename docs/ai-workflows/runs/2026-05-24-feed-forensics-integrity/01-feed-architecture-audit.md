# 01 — Feed architecture audit

**Date:** 2026-05-24  
**Scope:** `apps/api/src/modules/feed-import/**`

## Pipeline (verified)

```
about.json → ref files → blocks → buildings → apartments → deriveBlockStatuses → MV refresh
```

| Component | Role |
|-----------|------|
| `FeedImportProcessor` | BullMQ worker, `attempts` on manual trigger = 3 |
| `FeedImportService.executeBatch` | Orchestration, stats, progress |
| `FeedFetcherService` | HTTP (server-only) or `FEED_LOCAL_DIR` |
| `FeedProcessorService` | Prisma upserts; `batchSize=500` is **chunk only**, not cap |

## Retry behavior

- HTTP fetch: 3 attempts, exponential backoff (fetcher)
- BullMQ manual jobs: 3 attempts, 60s backoff
- Repeatable cron: weekly Monday 04:00 `Europe/Moscow` (default)

## Partial import semantics

- Per-file errors → appended to `stats.errors`, batch still `COMPLETED`
- `hasWarnings: true` when errors non-empty
- Apartment step failure → batch `FAILED`, **markSold not run**

## Critical: markSold

At end of `processApartments`, listings in DB but absent from current feed array → `status=SOLD`.

**Risk:** truncated/smaller feed + successful completion → mass SOLD.  
**Fix (iter 65):** skip markSold when `apartments_in_feed < previous × FEED_MARK_SOLD_MIN_RATIO` (default 0.85).

## No silent truncation in code

Audited: no `take`/`limit` on apartment processing loop. Full `apartments.json` loaded into memory once.

→ [03-import-limit-audit.md](./03-import-limit-audit.md)
