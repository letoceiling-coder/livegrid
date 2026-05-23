# R3.1 — Deploy Readiness

## Mode

READ-ONLY verification · deploy NOT executed

**Date:** 2026-05-22  
**Candidate:** R3 diff in `apps/web/src/redesign/pages/RedesignMap.tsx`  
**Target:** livegrid.ru production (Nest platform)

---

## Readiness Checklist

### Code quality

| Item | Status | Evidence |
|---|---|---|
| TypeScript compile | ✓ PASS | `pnpm --filter web exec tsc --noEmit` exit 0 |
| Single file diff | ✓ PASS | `git diff --stat` |
| No linter regressions | ✓ PASS | read_lints clean |
| R3 scope adhered | ✓ PASS | No viewport/backend/map rewrite |

### Functional requirements (R3)

| ID | Requirement | Verified |
|---|---|---|
| R3.1 | meta.total in counts | ✓ Code + prod API |
| R3.2 | Pagination notice | ✓ Code review |
| R3.3 | Geo in listings queryKey | ✓ Code review |
| R3.4 | Loading sync | ✓ keepPreviousData + isLoading |
| R3.5 | Error states | ✓ Code review |
| R3.6 | Lazy images | ✓ Code review |

### Infrastructure

| Item | Required | Status |
|---|---|---|
| API deploy | No | N/A |
| DB migration | No | N/A |
| Redis flush | No | N/A |
| nginx reload | No (static only) | Web deploy only |
| Env vars | No changes | N/A |

---

## Automated Verification (executed)

```bash
# Diff scope
cd ~/livegrid && git diff --name-only
# → apps/web/src/redesign/pages/RedesignMap.tsx only

# Typecheck
pnpm --filter web exec tsc --noEmit
# → exit 0

# Local API meta shape
curl -s localhost:3000/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true
# → meta.total=359, data=200

# Production API meta shape
curl -s https://livegrid.ru/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true
# → meta.total=359, data=200
```

---

## Manual Verification (recommended pre-deploy)

| # | Test | Priority |
|---|---|---|
| 1 | Load `/map?region_id=1` — subtitle "Показано 200 из 359" | **P0** |
| 2 | Change room filter — sidebar stays visible | **P0** |
| 3 | Stop API — retry UI appears | P1 |
| 4 | Switch to Дома — listings total correct | P1 |
| 5 | Mobile overlay CTA text | P1 |
| 6 | Secondary + geo URL params — refetch | P2 |

**Not executed in this read-only verification session** — code analysis + API shape confirmed.

---

## Deploy Procedure (when approved)

```
1. Merge R3 diff to deploy branch
2. pnpm build:web (or CI equivalent)
3. Deploy static assets to production CDN/nginx
4. NO api restart required
5. Smoke test /map within 5 minutes
6. Monitor browser console errors (15 min)
```

---

## Rollback Trigger

Rollback if any of:

- JS runtime error on `/map` affecting >1% sessions
- Blank map with API healthy
- Infinite retry loop (not expected — no auto-retry UI loop)

Rollback: revert single file, rebuild web, redeploy.

---

## Known Limitations (acceptable for R3)

1. Still max 200 markers loaded — pagination notice only, no page 2
2. Stale meta.total during refetch (~300ms)
3. Blocks API error may fall through to listings query (pre-existing)
4. `FilterSidebar` receives `totalCount` but does not display it in UI body (pre-existing unused prop)

---

## Deploy Readiness Status

| Gate | Result |
|---|---|
| Code complete | ✓ |
| Automated checks | ✓ |
| Production API compatible | ✓ |
| Risk classification | LOW |
| Manual smoke test | **Pending** (recommended) |
| Deploy authorized | **Pending human approval** |

**Ready for web-only production deploy after manual smoke test.**
