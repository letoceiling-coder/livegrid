# 04 — Import hardening (iter 66)

## Finalized protections

1. **markSold ratio guard** — skip if feed < 85% previous
2. **Degraded quarantine** — `stats.degraded=true`, `integrity_checkpoint=QUARANTINED`
3. **No lastImportedAt** update on degraded batches
4. **healthy_import** flag when full successful sync
5. **Overlap prevention** — DB PENDING/RUNNING + BullMQ active/waiting check
6. **Status mutation blocked** when markSold skipped (no mass SOLD)

## Batch stats

`degraded`, `healthy_import`, `integrity_checkpoint`, `last_imported_at_skipped`, `apartments_in_feed`, `mark_sold_skipped`

## Rule

Incomplete feed → **never** mass-update statuses to SOLD.
