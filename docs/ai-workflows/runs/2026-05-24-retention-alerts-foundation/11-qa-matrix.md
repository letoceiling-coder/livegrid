# 11 — QA Matrix

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | Save search from catalog | Row in saved_searches | Manual |
| 2 | Duplicate search | 409 → overwrite | Manual |
| 3 | Admin scan new matches | Notification created | Manual |
| 4 | Favorite price drop | PRICE_DROP notification | Manual |
| 5 | Alert dedupe | Same dedupeKey skipped | Manual |
| 6 | Browse listing | History row upserted | Manual |
| 7 | Region filter in saved search | Match respects region_id | Manual |
| 8 | Mobile save + cabinet | 360px usable | Manual |
| 9 | Auth restore | Saved searches persist | Manual |
| 10 | Typecheck | `pnpm typecheck` pass | ✓ |
| 11 | Console errors | Zero on account pages | Manual |

## Pre-deploy

Apply migration `20260524200000_retention_saved_searches`.

Schedule retention scan via cron or BullMQ worker when ready.
