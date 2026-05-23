# 08 — Final Platform Recommendation

**Audit:** Production Platform Discovery + Local Workspace Alignment  
**Date:** 2026-05-22  
**Verdict:** Production = **Nest monorepo**; local workspace must realign

---

## What LiveGrid REALLY Is

LiveGrid production (`https://livegrid.ru`) is:

> A **pnpm NestJS monorepo** deployed at `/var/www/lg`, serving a **React SPA** and **REST API** from the same domain, backed by **PostgreSQL + Prisma**, with **Redis/BullMQ** import pipeline, **PostGIS** geo filters, and **PM2** process management.

It is **not** the Laravel monolith in the current Cursor workspace root.

---

## Evidence Summary

| Claim | Verified |
|-------|----------|
| API is Express/Nest | ✅ `x-powered-by: Express` |
| `/blocks` serves map ЖК | ✅ 200 with lat/lng |
| `/map/complexes` absent | ✅ 404 |
| Frontend is `apps/web/dist` | ✅ `/assets/index-*.js` |
| nginx → :3000 for API | ✅ ssl conf + behavior |
| Git repo | ✅ `letoceiling-coder/lg` |
| SSH server inspect | ❌ not available |

---

## Architecture Quality Assessment

| Dimension | Nest production | Score | Notes |
|-----------|-----------------|-------|-------|
| Maintainability | Modular Nest modules, typed Prisma | **B+** | blocks.service very large |
| Scalability | Redis cache, optional Meili, PG | **B** | Single PM2 instance, no map viewport |
| Deployment stability | Scripted deploy + verify | **B+** | Manual, no CI |
| DX | pnpm monorepo, Swagger, Vite | **A-** | Workspace confusion hurts |
| API consistency | snake_case, validated DTOs | **B+** | Differs from Laravel camelCase |
| Frontend consistency | Single redesign layer | **B+** | Admin+public bundle heavy |
| Infra complexity | nginx + PM2 + Redis + PG + optional Docker | **B** | Manageable for team size |
| Long-term viability | Active prod traffic + import | **A-** | If team commits to one stack |

---

## Scalability Assessment

**Current capacity:** Adequate for ~15k listings / region 1 MSK.

**Limits:**
- Map loads 200 objects without viewport paging
- Single API process
- PostGIS queries on heavy geo filters

**Growth path (Nest-native):**
- Viewport bbox param on `/blocks`
- Marker clustering in MapSearch
- PM2 cluster mode or horizontal API behind nginx
- Read replicas for PostgreSQL

---

## Deployment Stability Assessment

**Strengths:** `deploy-from-git.sh`, `verify-on-server.sh`, nginx reload (not restart), PM2 auto-restart.

**Weaknesses:** No CI, no staging, prod bundle may lag git, immutable asset cache.

**Rating:** **Production-stable** for current traffic if deploy script discipline maintained.

---

## DX Assessment

**Good:** Monorepo, typed end-to-end, Swagger, React Query patterns, URL-synced catalog.

**Bad:** Developer workspace pointed at wrong repo; rules contradict production; R2.2b work lost to wrong target.

**Rating:** **C+ today** (fixable to A- with workspace realignment).

---

## Recommended Platform Direction

### Answer: **A) Continue Nest platform** for livegrid.ru

Based on **real production system**, not assumptions:

| Factor | Nest | Laravel monolith |
|--------|------|------------------|
| Currently live | ✅ | ❌ |
| Has live data + import | ✅ PG | ❌ not on prod domain |
| Has admin CRM | ✅ /admin | Separate unfinished CRM2 |
| Map works today | ✅ /blocks | ❌ endpoint not deployed |
| Team deploy path | ✅ deploy-from-git | ❌ artisan deploy unused |

**Laravel monolith (B)** remains a **future migration option**, not current direction. Pursuing it requires explicit program: data migration, nginx cutover, feature parity, CRM strategy — **months of work**.

---

## What Should Survive

| Keep | Why |
|------|-----|
| Nest `/var/www/lg` entire stack | Production truth |
| `apps/web/src/redesign/*` | Active UI |
| Blocks + Listings API model | Powers catalog + map |
| FeedImport + BullMQ | Production data pipeline |
| PostGIS geo layer | Working geo filters |
| `catalog-url-sync` + `catalog-api-params` | Mature filter/URL architecture |
| Admin in Nest web | Operational CRM |
| Deploy scripts + verify | Proven ops |

---

## What Should Be Deprecated

| Deprecate / freeze | Why |
|--------------------|-----|
| Laravel map reconciliation (R2.2b) on prod path | Wrong stack |
| Laravel as "production" in rules/docs | Factually wrong |
| Nested `deployment/tmp-lg-work` copy | Use git clone at workspace root |
| Dual RedesignMap maintenance | Consolidate on Nest |
| `/map/complexes` as prod requirement | Not in Nest; use `/blocks` |
| dev.livegrid.ru broken Laravel | Fix or remove |

**Selective salvage from Laravel repo:**
- `complexes_search` denormalization ideas → optional Nest materialized view
- CRM2 entity model → long-term if Nest admin insufficient

---

## Long-Term Risks

1. **Split-brain development** — two repos, two maps, two imports (ongoing if not fixed)
2. **Wrong-target features** — shipping Laravel changes that never reach users
3. **Migration never completes** — Laravel becomes permanent zombie fork
4. **Map scale** — 200-pin cap without viewport strategy
5. **Listing coords** — apartment map quality for secondary market
6. **Ops bus factor** — manual deploy + no staging

---

## Immediate Action Plan

| Priority | Action |
|----------|--------|
| P0 | Open `~/livegrid` Nest clone as primary Cursor workspace |
| P0 | Update `.cursor/rules` — Nest = production |
| P1 | Restore SSH key for `/var/www/lg` SHA verification |
| P1 | Fix or decommission dev.livegrid.ru staging |
| P2 | Port any valuable R2.2b **concepts** to Nest RedesignMap (not Laravel code) |
| P2 | Map improvements on Nest: viewport, coord backfill, clustering |
| P3 | Decide Laravel monolith fate: archive vs migration program |

---

## Final Strategic Recommendation

> **LiveGrid production is the Nest monorepo (`letoceiling-coder/lg`). All production feature work — especially map, catalog, import, admin — must happen in `apps/api` and `apps/web`, deployed via `deploy-from-git.sh` to `/var/www/lg`.**
>
> The Laravel monolith in the current workspace is **not production** and should not receive production-targeted changes until an explicit, staged migration is approved.
>
> **Local workspace alignment:** clone Nest repo to workspace root, update Cursor rules, stop R2.x reconciliation on Laravel `frontend/`.

**Platform direction: A (Nest) — confirmed by runtime evidence.**

---

## Report Index

| File | Topic |
|------|-------|
| [01-production-stack.md](./01-production-stack.md) | Stack overview |
| [02-backend-architecture.md](./02-backend-architecture.md) | Nest API modules |
| [03-frontend-architecture.md](./03-frontend-architecture.md) | React SPA |
| [04-map-architecture.md](./04-map-architecture.md) | Map runtime |
| [05-deployment-architecture.md](./05-deployment-architecture.md) | Deploy/nginx/PM2 |
| [06-technical-debt.md](./06-technical-debt.md) | Debt register |
| [07-local-workspace-strategy.md](./07-local-workspace-strategy.md) | Dev alignment |

---

## Audit Limitations

- SSH to `85.198.64.93` failed — server git SHA, PM2 uptime, exact `.env` not confirmed
- Production frontend build date (May 4) may differ from local git HEAD (May 22)
- Meilisearch enabled/disabled on prod not HTTP-verifiable

**Re-run server phase when SSH access restored.**
