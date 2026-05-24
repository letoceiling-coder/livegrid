# 09 — Production Risks

**Iteration:** 71 · **Date:** 2026-05-24

## P0 — Critical

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Hotpatch drift** — production source patched outside git | Lost on next `git checkout`/deploy | Commit + deploy feed-processor + listings.service fixes to main; pull on server |
| **Partial compile deploy** | API outage (`MODULE_NOT_FOUND`) | Always `rm tsconfig.tsbuildinfo && tsc` full build; use `deploy-api.sh` |
| **LISTINGS_EXPIRE on FEED** | 50k listings vanish from vitrine | FEED exclude + `LISTINGS_EXPIRE_DISABLE`; merge to main |

## P1 — High

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Code lag (iter 47 vs 68)** | No recovery API, sitemap, integrity | Schedule production deploy of iter 65–68 |
| **Static sitemap at 65k URLs** | SEO under-indexing | Deploy SitemapModule + regenerate |
| **Redis stale cache** | Wrong public counts after MV refresh | Document FLUSHDB or cache invalidation in import hook |
| **BullMQ + crontab dual trigger** | Duplicate Monday imports | Monitor `/var/log/lg/cron-feed-import.log`; set `FEED_IMPORT_DISABLE_REPEAT` after validation |

## P2 — Medium

| Risk | Impact | Mitigation |
|------|--------|------------|
| **4909 INACTIVE ARCHIVED FEED** | Minor catalog gap | Audit orphans; optional restore if in feed |
| **8127 SOLD FEED** | Donor delta | Expected if sold off-feed; monitor SOLD spike |
| **Public latency 760–880ms** | UX at scale | CDN caching, MV already in place; profile map endpoints |
| **Admin credentials in cron script** | Security | Rotate; use service token |

## P3 — Low

| Risk | Impact | Mitigation |
|------|--------|------------|
| Browser map perf untested | Jank at 65k | Run map soak |
| TrendAgent IP whitelist | Import fails off-server | Keep imports server-side only |

## Monitoring priorities

1. `catalog-counts.apartments` — alert if < 55,000
2. PM2 restart count — alert if > 3/hour
3. Feed import `step=Failed` in logs
4. Post-deploy: `healthy_import` from iter 68 health endpoint

## Verdict

Risks are **manageable** with git deploy and monitoring. Primary residual risk is **undeployed iter 65–68 code** and **hotpatch drift**.
