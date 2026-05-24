# 05 — Integrity + Observability

**Iteration:** 72 · **Date:** 2026-05-24

## Live endpoints

| Endpoint | Status | Key data |
|----------|--------|----------|
| `/admin/feed-import/health` | ✅ | ok, 0 stuck, 0 failed 24h |
| `/admin/feed-import/integrity` | ✅ | ACTIVE 65504, blocks 1336 |
| `/admin/feed-import/recovery/audit` | ✅ | Status breakdown |
| `/admin/feed-import/recovery/incident` | ✅ | recoveryMode: false |
| `/admin/sitemap/metrics` | ✅ | 14 apartment chunks + complexes |
| `/admin/feed-import/progress` | ✅ | idle |

## Integrity snapshot

- orphanApartments: 11
- duplicateExternalIdGroups: []
- sold: 8,127 (expected off-feed)
- integrity_score: computed on full apartment fetch

## Admin UI

Production web still iter 47 build — **AdminFeedImport / AdminSystemPage** iter 68 UI not redeployed this iteration. API observability fully live; admin UI refresh is optional follow-up.

## Verdict

**Full operational visibility** at API layer. Admin SPA deploy deferred.
