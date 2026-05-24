# 11 — QA Matrix

| # | Scenario | Expected | Status |
|---|----------|----------|--------|
| 1 | Approve new REVIEW draft | → PUBLIC, snapshot applied, history row | Manual |
| 2 | Reject with reason | Note required; REJECTED or snapshot reset | Manual |
| 3 | Approve pending revision on PUBLIC | Live updated; isPendingRevision=false | Manual |
| 4 | Compare media | Main/plan/gallery diff visible | Manual |
| 5 | Concurrent moderator (version bump) | 409 conflict toast | Manual |
| 6 | Agent sees reject in My Listings | moderationNote + badge | Manual |
| 7 | Mobile moderation 360px | Sticky bar, stacked diff | Manual |
| 8 | Rollback safety | Reject on live keeps PUBLIC card | Manual |
| 9 | Refresh persistence | Queue tab/filters survive refresh | Manual |
| 10 | Stale queue warning | >48h REVIEW shows stale badge | Manual |
| 11 | Typecheck | `pnpm typecheck` pass | ✓ |
| 12 | Console errors | Zero on queue + review pages | Manual |

## Pre-deploy checklist

1. Apply migration `20260524100000_listing_wizard_drafts` if not applied
2. Enable `listing_moderation_enabled` in settings when ready
3. Smoke test as manager on staging
4. Verify PUBLIC catalog unchanged for listings in REVIEW
