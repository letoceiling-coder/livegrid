# 07 — Risk analysis

**Date:** 2026-05-22  
**Mode:** EXTREME SAFETY

---

## Risk matrix

| Risk | Severity | Likelihood | Mitigation |
|------|----------|------------|------------|
| Local app connects to prod DB | **Critical** | Low if `.env` guarded | Only `lg_development` in `~/livegrid/.env`; code review |
| Accidental prod TRUNCATE/DROP | **Critical** | Low | Never run restore/sanitize SQL on server |
| Unsanitized dump leaked | **High** | Medium | Sanitize script; no git; chmod 700 |
| `pg_dump` load on production | Low | Low | `pg_dump` is read-only; schedule off-peak |
| Schema mismatch after restore | Medium | Medium | Migrations first, data-only restore |
| Missing MV refresh → empty counts | Medium | High | sanitize script + manual REFRESH |
| Stale Redis cache | Low | High | `FLUSHDB` after restore |
| Huge dump disk fill | Medium | Medium | Tier M export; monitor `/tmp` on server |
| Seller/user PII in dump | High | Medium | Exclude tables or sanitize |
| Production credentials in docs | **Critical** | — | **Never document prod passwords** |
| SSH export by unauthorized party | High | — | Server access control only |

---

## What pg_dump does NOT do

- Does not lock tables indefinitely (uses MVCC snapshot)
- Does not DELETE or UPDATE rows
- Does not restart services
- Does not modify Redis/nginx/PM2

Acceptable production operation when executed by authorized operator.

---

## Forbidden operations (never)

```
TRUNCATE / DROP / DELETE on lg_production
DATABASE_URL pointing to production from local Nest
pg_restore --dbname=lg_production
pnpm db:migrate against production from dev machine
redis-cli -h production FLUSHALL
FEED_IMPORT trigger against production from local queue
```

---

## Safe operations

```
pg_dump -d lg_production ... (on server)
scp dump file to dev
pg_restore -d lg_development ...
sanitize-local-map-snapshot.sql on lg_development
pnpm db:seed on local
```

---

## Current environment constraints (2026-05-22)

| Constraint | Impact |
|------------|--------|
| SSH `root@85.198.64.93` denied | Operator must run export manually when access granted |
| TrendAgent 403 | Full feed re-import not alternative to snapshot on WSL |
| Catalog mirror already live | 11 blocks — snapshot upgrade path when SSH available |

---

## Incident response (if prod touched by mistake)

1. Stop local/process immediately
2. Do **not** run further SQL
3. Assess whether connection was read-only or write
4. Restore from production backup (server-side procedure — out of scope)
5. Rotate credentials if `.env` leaked

---

## Compliance checklist

- [ ] Dump stored outside repository
- [ ] Sanitization run before developer access
- [ ] Local admin password is seed default, not production
- [ ] Integration tokens cleared
- [ ] No production coupling in running services

→ [08-final-recommendation.md](./08-final-recommendation.md)
