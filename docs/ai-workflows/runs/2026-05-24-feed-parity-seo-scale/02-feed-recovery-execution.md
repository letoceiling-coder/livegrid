# 02 — Feed Recovery Execution

**Iteration:** 68 · **Date:** 2026-05-24

## Recovery sequence (production)

```bash
export API_BASE=https://livegrid.ru/api/v1
export ADMIN_EMAIL=...
export ADMIN_PASSWORD=...
export REGION=msk

# Audit only (default)
./scripts/reliability/feed-recovery-run.sh

# Execute SOLD restore after reviewing dry-run
EXECUTE_SOLD_RESTORE=1 ./scripts/reliability/feed-recovery-run.sh

# Full import + sitemap
EXECUTE_SOLD_RESTORE=1 TRIGGER_FULL_IMPORT=1 ./scripts/reliability/feed-recovery-run.sh
```

## Phase breakdown

| Phase | Action | Gate |
|-------|--------|------|
| 1 | `recovery/audit` | Read ACTIVE/SOLD/orphans |
| 2 | `integrity?include_apartments=1` | Confirm feed vs DB delta |
| 3 | `sold-restore?dry_run=1` | Review `falseSoldCandidates` |
| 4 | `sold-restore` (POST) | Admin only; batched restore |
| 5 | `trigger?region=msk` | Full import on whitelisted IP |
| 6 | `recovery/data-quality` | Parity % vs donor |
| 7 | `admin/sitemap/generate` | SEO index after healthy import |

## Safety guards (iter 65–66)

- **markSold ratio guard** — `FEED_MARK_SOLD_MIN_RATIO=0.85`
- **Degraded quarantine** — skip `lastImportedAt`, flag `integrity_checkpoint=QUARANTINED`
- **Overlap protection** — `assertNoOverlappingImport()` on trigger
- **SOLD recovery** — only restores IDs present in current feed snapshot

## Verification checklist

- [ ] `stats.apartments_in_feed` ≈ 67k on completed batch
- [ ] `stats.healthy_import=true`, `degraded=false`
- [ ] `recovery/data-quality` parity ≥90% apartments
- [ ] Homepage `PublicTrustStrip` shows ~67k apartments
- [ ] No spike in `orphanApartments`

## Verdict

Recovery **scripted and API-ready**. **Not executed** in dev (no production DB). **GO_WITH_HOLD** until ops run on production.
