# 10 — Final verdict

**Iteration:** 65 — TrendAgent Feed Forensics + Data Integrity  
**Date:** 2026-05-24  
**Verdict:** **GO_WITH_HOLD**

## Delivered

| Area | Status |
|------|--------|
| Forensic integrity API | ✅ `GET /admin/feed-import/integrity` |
| markSold safety guard | ✅ ratio guard + stats |
| Feed row counts in batch stats | ✅ `*_in_feed` fields |
| Weekly Monday cron | ✅ default + TZ |
| HTTP fetch server-only gate | ✅ `FEED_HTTP_FETCH_ALLOWED` |
| Admin integrity panel | ✅ `/admin/feed-import` |
| Forensics script | ✅ `scripts/reliability/feed-forensics.sh` |
| Documentation | ✅ 01–10 |

## Root cause (evidence-based)

**Not** silent row limits in code.  
**Primary:** mass `markSold` after imports completing with smaller apartment set, amplified by aggressive 6h cron and cron force-reset of RUNNING batches.  
**Secondary:** public metrics compare TrendAgent all-feed vs LiveGrid ACTIVE/vitrine filters.

## Holds (production)

1. **Deploy** API + set `FEED_HTTP_FETCH_ALLOWED=true`, remove 6h crons
2. **Run full manual import** on whitelisted IP; confirm `apartments_in_feed` ~67k
3. **SQL verify** SOLD counts before/after; plan SOLD→ACTIVE recovery if needed
4. **Enable** `FEED_IMPORT_DISABLE_REPEAT=false` with weekly cron after validation

## QA matrix

| Test | Expected |
|------|----------|
| Integrity report MSK | score + deltas visible |
| Truncated feed simulation | `mark_sold_skipped: true` |
| Manual trigger | stats include `apartments_in_feed` |
| Dev without FEED_HTTP_FETCH | 403 unless FEED_LOCAL_DIR |
| Weekly cron registration | log shows Monday pattern |

## Not in scope

Payment, websocket, AI, vector search — unchanged.
