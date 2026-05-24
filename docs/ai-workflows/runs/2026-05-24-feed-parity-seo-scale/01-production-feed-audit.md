# 01 — Production Feed Audit

**Iteration:** 68 · **Date:** 2026-05-24  
**Mode:** Production Consolidation

## Known production state (pre-recovery)

| Metric | TrendAgent donor | LiveGrid production (iter 65–66 forensics) |
|--------|------------------|---------------------------------------------|
| Apartments | ~67,000 | ~15,000 ACTIVE/published |
| ЖК (blocks) | ~462 | ~359 with vitrine listings |
| Root cause | — | False mass `markSold` after degraded/partial imports |

## Audit tooling (available)

| Tool | Endpoint / script |
|------|-------------------|
| Integrity report | `GET /admin/feed-import/integrity?region=msk&include_apartments=1` |
| Production state audit | `GET /admin/feed-import/recovery/audit?region=msk` |
| SOLD recovery plan | `GET /admin/feed-import/recovery/sold-plan?region=msk` |
| Incident status | `GET /admin/feed-import/recovery/incident?region=msk` |
| SQL audit | `scripts/reliability/production-state-audit.sql` |
| Recovery runner | `scripts/reliability/feed-recovery-run.sh` |

## Metrics tracked

- **ACTIVE / SOLD / RESERVED** counts (FEED source)
- **False SOLD candidates** — SOLD in DB but present in live `apartments.json`
- **Duplicate external_id** groups
- **Orphan apartments** — ACTIVE without `block_id`
- **Orphan blocks** — blocks without active listings
- **Integrity score** — active_published vs `apartments_in_feed`

## Local execution status

**DB unavailable in dev sandbox** (`psql` not installed). Production recovery must run on server with:

1. `FEED_HTTP_FETCH_ALLOWED=true` on backend
2. Whitelisted server IP for TrendAgent feed
3. Admin credentials for recovery API

## Expected post-recovery targets

| Metric | Target |
|--------|--------|
| `apartments_in_feed` (import stats) | ~67,000 |
| ACTIVE+published FEED apartments | ≥90% of feed |
| Vitrine catalog-eligible | ~67k (with block_id) |
| Blocks with active listings | ~462 |
| Integrity score | ≥85 |

## Verdict

Audit infrastructure **complete**. Execution is **ops-held** until production deploy of iter 65–68 API + recovery script run.
