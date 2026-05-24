# 08 — Observability + Incident Safety

**Iteration:** 70 · **Date:** 2026-05-24

## Dashboards (iter 65–68)

| Surface | Metrics |
|---------|---------|
| `/admin/feed-import` | Incident banner, integrity, snapshots, data quality, sitemap |
| `/admin/system` | Feed health, sitemap metrics, map viewport |
| `GET /admin/feed-import/health` | Stale, stuck, degraded 7d, governance |
| `GET /admin/feed-import/recovery/incident` | SOLD spike, recovery mode |

## Alert conditions (post-recovery monitoring)

| Issue | Severity |
|-------|----------|
| `degraded_import` (7d) | critical |
| `stale_sync` (>200h) | warning |
| `stuck_batch` (>120min) | critical |
| `soldSpikeAlert` | recovery mode |
| Integrity score < 85 | warning |
| `orphan_apartments` > 100 | warning |

## Recovery execution logs

```
/var/log/lg/production-recovery-execution.log
/var/log/lg/feed-recovery-baseline/
/var/log/lg/cron-governance-audit.log
```

API logs: `SOLD recovery recovery-{region}-{ts}: restored N`

## Incident prevention (verified in code)

- Weekly cron only (after ops cleanup)
- markSold ratio guard 0.85
- Degraded quarantine
- Overlap protection on trigger
- SOLD recovery gated on feed size

## Production pre-recovery incident state

Public vitrine **14,917** apartments strongly suggests **recoveryMode** active — verify via `recovery/incident` on server.

## Verdict

Observability **ready**. Execute recovery then **monitor integrity weekly** after Monday import.
