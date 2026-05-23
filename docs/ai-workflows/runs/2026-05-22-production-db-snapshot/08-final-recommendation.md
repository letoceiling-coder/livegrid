# 08 — Final recommendation

**Date:** 2026-05-22  
**Goal:** Safe realistic local map database without production risk

---

## Executive summary

Production map realism requires **real blocks, listings, geo, and reference data**. Three safe paths exist; ranked by realism vs safety:

| Priority | Method | Realism | When to use |
|----------|--------|---------|-------------|
| **1** | **Read-only `pg_dump` → local restore → sanitize** | ★★★★★ | SSH/server access available |
| 2 | TrendAgent `FEED_LOCAL_DIR` + feed import | ★★★★★ | Feed dump on disk; TrendAgent not 403 |
| 3 | Catalog mirror script (current) | ★★★ | Immediate dev; no server access |

**This document set implements strategy #1** — not executed against production (no SSH).

---

## Recommended workflow (when operator has server access)

```bash
# ON PRODUCTION SERVER (read-only)
export ALLOW_PROD_SNAPSHOT=yes
bash /var/www/lg/scripts/map-snapshot-export.example.sh /tmp/lg_map_msk_$(date +%Y%m%d).dump

# TRANSFER (file only)
scp root@85.198.64.93:/tmp/lg_map_msk_*.dump ~/livegrid-snapshots/

# ON LOCAL WSL
cd ~/livegrid/packages/database && npx prisma migrate deploy
# truncate map tables in lg_development (see doc 05)
pg_restore --dbname=lg_development --data-only --disable-triggers ~/livegrid-snapshots/lg_map_msk_*.dump
psql -U lg_admin -d lg_development -f ~/livegrid/scripts/sanitize-local-map-snapshot.sql
cd ~/livegrid && set -a && source .env && set +a && pnpm db:seed
redis-cli FLUSHDB
~/livegrid/scripts/local-dev-api.sh &
pnpm dev:web
# → http://localhost:5173/map
```

---

## Until snapshot available — current state

Local dev already has **Tier catalog-mirror** data (see `2026-05-22-local-map-data/`):

- 11 blocks, 24 listings, 40 districts, 50 subways
- Sufficient for UI wiring, insufficient for production-scale performance/filter testing

**Continue map development** on mirror data; **upgrade to snapshot** when export is performed.

---

## Artifacts created

| Path | Purpose |
|------|---------|
| `docs/ai-workflows/runs/2026-05-22-production-db-snapshot/01–08` | Strategy docs |
| `~/livegrid/scripts/map-snapshot-export.example.sh` | Server-side read-only export template |
| `~/livegrid/scripts/sanitize-local-map-snapshot.sql` | Local-only post-restore sanitization |

---

## Development readiness after snapshot restore

| Check | Expected |
|-------|----------|
| `GET /blocks?region_id=1` | Hundreds+ blocks (Tier R) |
| `GET /listings?kind=APARTMENT` | Thousands+ rows |
| District/subway filters | Populated |
| Sidebar on `/map` | Real ЖК names, prices |
| Geo radius/polygon | Works with PostGIS |
| Secondary apartments | Real coords or fallback path testable |
| Performance | Representative of production |

---

## Yandex Maps

Snapshot may include production `yandex_maps_api_key` in `site_settings` — **clear in sanitize script** and use dev-restricted key locally.

---

## Git / workspace

- Primary workspace: `~/livegrid`
- Add `~/livegrid-snapshots/` to personal gitignore
- Do not commit `.dump` files
- Production truth remains Nest monorepo — not Laravel `livegrid/`

---

## Doc index

1. [01-production-db-analysis.md](./01-production-db-analysis.md)
2. [02-safe-export-scope.md](./02-safe-export-scope.md)
3. [03-snapshot-strategy.md](./03-snapshot-strategy.md)
4. [04-sanitization-strategy.md](./04-sanitization-strategy.md)
5. [05-local-restore-plan.md](./05-local-restore-plan.md)
6. [06-postgis-compatibility.md](./06-postgis-compatibility.md)
7. [07-risk-analysis.md](./07-risk-analysis.md)
8. **08-final-recommendation.md** (this file)

---

**Status:** Strategy complete. Production export **not executed** (extreme safety). Ready for operator when SSH access is available.
