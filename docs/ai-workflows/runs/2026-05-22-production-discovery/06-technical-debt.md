# 06 — Technical Debt

**Scope:** Nest production platform + workspace misalignment  
**Mode:** Analysis only

---

## Critical Debt

### D1 — Dual platform in one workspace

| System | Path | Production |
|--------|------|------------|
| Nest monorepo | `deployment/tmp-lg-work/` | ✅ livegrid.ru |
| Laravel monolith | workspace root | ❌ not live |

Engineering effort (R2.2b map reconciliation) was applied to **wrong codebase** for production impact.

### D2 — Documentation / rules drift

`.cursor/rules/livegrid-architecture.mdc` states Laravel is production API.  
Measured production serves Nest Express on all `/api/v1/*`.

### D3 — No staging environment

`dev.livegrid.ru` Laravel config exists; API returns 404.  
QA relies on production API or local dev only.

### D4 — SSH access gap

Cannot verify server git SHA, PM2 state, or env on host from current environment.

---

## Map-Specific Debt

| ID | Issue | Impact |
|----|-------|--------|
| M1 | No viewport/bbox loading | Loads up to 200 pins always |
| M2 | No marker clustering | Performance at scale |
| M3 | Apartment listings null coords | Empty listings map unless secondary approx coords |
| M4 | 200 cap silent truncation | User may not see all objects |
| M5 | Dual RedesignMap implementations | Nest vs Laravel diverging |
| M6 | blocksQuery + parallel Nest calls on Laravel fork | Wasted bandwidth (Laravel path only) |

---

## Backend Debt

| ID | Issue |
|----|-------|
| B1 | Single PM2 instance (`instances: 1`) — no horizontal scale |
| B2 | Catalog cache TTL short (45s) — thundering herd on traffic spikes |
| B3 | Complex price sort uses raw SQL — maintenance burden |
| B4 | Meilisearch optional — behavior differs if MEILI_HOST unset |
| B5 | Secrets in ecosystem.config.js template |
| B6 | No `/map/complexes` — map logic embedded in blocks service (large file 1000+ lines) |

---

## Frontend Debt

| ID | Issue |
|----|-------|
| F1 | `MapSearch` `compact` prop passed but not implemented in component |
| F2 | Duplicate list UI (MapSearch internal + RedesignMap sidebar) |
| F3 | Prod bundle stale vs git (May 4 vs May 22 local) |
| F4 | Chunk load reload hack — deploy UX friction |
| F5 | Admin + public in one SPA — large bundle |
| F6 | `rooms`/`dachas` tabs shown but unsupported on map |

---

## Database / Import Debt

| ID | Issue |
|----|-------|
| I1 | Feed import + manual admin — two data sources (FEED vs MANUAL) |
| I2 | Listing coords not backfilled from block coords for apartments |
| I3 | PostgreSQL only — no shared schema with Laravel MySQL fork |
| I4 | Import stale job recovery (`FEED_IMPORT_STALE_MINUTES`) — ops complexity |

---

## Deployment Debt

| ID | Issue |
|----|-------|
| P1 | Manual deploy scripts — no CI gate |
| P2 | `deploy-full.sh` removes legacy nginx symlinks — risky if multi-site |
| P3 | Docker monitoring optional — may be off in prod |
| P4 | No blue/green — deploy replaces live dist in place |
| P5 | Frontend immutable cache — users need hard refresh after deploy if chunk hash unchanged edge cases |

---

## Abandoned / Legacy Areas

| Area | Status |
|------|--------|
| Laravel monolith production cutover | Started in repo, never wired to livegrid.ru |
| `GET /map/complexes` on production | Never existed (Laravel-only design) |
| R2.2b Laravel state migration | Complete in wrong repo for prod |
| Nest `lg.livegrid.ru` subdomain plan | Documented in PROJECT_PLAN.md, livegrid.ru uses main domain |
| `apps/admin` package | Not in workspace — admin embedded in web |

---

## Duplicate Systems

| Concern | Copy A (prod) | Copy B (workspace) |
|---------|---------------|-------------------|
| Backend | Nest + PG | Laravel + MySQL |
| Frontend | apps/web | frontend/ |
| Map page | RedesignMap (Nest) | RedesignMap (Laravel) |
| Import | FeedImportModule | FeedImporter.php |
| CRM | /admin in Nest web | /crm + /crm2 Laravel |
| Search | blocks + catalog-hints | complexes_search + search/complexes |

---

## Fake Adapters / Drift

- Laravel `useMapPageComplexes` → endpoint production doesn't have
- `.cursor/rules` treating tmp-lg-work as non-source-of-truth
- `PROJECT_FULL_CONTEXT.md` dev.livegrid.ru as Laravel backend — broken
- Hero/catalog param builders differ (snake_case vs camelCase)

---

## Performance Bottlenecks (Ranked)

1. Full map fetch (200 items) without viewport strategy
2. PostGIS + Prisma + cache miss on complex geo filters
3. Large blocks.service.ts single-responsibility blur
4. SPA bundle size (admin + public)
5. Feed import lock duration during RUNNING batches

---

## Deployment Risks (Ranked)

1. Deploying Laravel frontend to Nest nginx root
2. nginx misconfig taking down all API proxy
3. prisma migrate deploy failure mid-deploy
4. PM2 restart during active import
5. Asset cache serving old JS after partial deploy
