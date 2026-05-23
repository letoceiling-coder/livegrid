# Iter 37 — Snapshot Generation Pipeline

## Components

| File | Role |
|---|---|
| `crm-snapshot.service.ts` | Generate, backfill, purge, status |
| `crm-snapshot.processor.ts` | BullMQ worker |
| `crm-snapshot-scheduler.service.ts` | Repeatable cron registration |
| `crm-snapshot.constants.ts` | Queue names, retention, cron |
| `bull-shared.module.ts` | Shared Redis connection |

---

## BullMQ

| Setting | Value |
|---|---|
| Queue | `crm-snapshot` |
| Nightly job | `crm_snapshot_nightly` @ `30 2 * * *` UTC |
| Backfill job | `crm_snapshot_backfill` |
| Disable | `CRM_SNAPSHOT_DISABLE_REPEAT=true` |

---

## API Endpoints

| Method | Path | Roles |
|---|---|---|
| GET | `/admin/ops/snapshots/status` | admin, editor |
| POST | `/admin/ops/snapshots/generate?date=&force=&dryRun=` | admin, editor |
| POST | `/admin/ops/snapshots/backfill` | admin, editor |

---

## Idempotency

1. Load existing kinds for `snapshot_date`
2. Skip kinds already present (unless `force`)
3. Single writer lock via `generating` flag — rejects concurrent generate

---

## Backfill

- Max **30 days** lookback
- Fills days missing all 5 kinds
- Does not overwrite existing complete days

---

## Dry Run

`dryRun=true` — computes payloads and returns sizes without DB writes.

---

## Manual QA

- [ ] First generate creates 5 rows
- [ ] Second generate skips (idempotent)
- [ ] `force=true` replaces rows
- [ ] `dryRun=true` writes nothing
