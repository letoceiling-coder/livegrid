# R3.1 — Diff Review

## Mode

READ-ONLY · `@gstack/review` + `@gstack/careful`

**Repo:** `~/livegrid`  
**Date:** 2026-05-22  
**Deploy:** NOT executed

---

## Diff Scope (verified)

```bash
cd ~/livegrid && git diff --name-only
# apps/web/src/redesign/pages/RedesignMap.tsx

git diff --stat
# 1 file changed, 89 insertions(+), 16 deletions(-)
```

| Check | Result | Evidence |
|---|---|---|
| Only RedesignMap.tsx changed | **PASS** | `git diff --name-only` |
| No backend files | **PASS** | No `apps/api/**` in diff |
| No route changes | **PASS** | No router/App.tsx changes |
| No env/config changes | **PASS** | No package.json change |
| Untracked `.local/`, `scripts/` | **N/A** | Not part of R3 commit |

---

## Backend Contract Analysis

| Area | Changed | Notes |
|---|---|---|
| API URLs | No | Same `buildBlocksSearchParams` / `buildListingsSearchParams` |
| Query params | No | Still `page=1`, `per_page=200` |
| Request headers | No | Same `apiGet` |
| Response parsing | Type-only | Added `CatalogListResponse<T>` — reads existing `meta` field |
| Redis | No | Server-side unchanged |
| Nest routes | No | — |

**Production API shape confirmed:**

```bash
curl -s "https://livegrid.ru/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true"
# meta.total: 359, data: 200
# meta keys: page, per_page, total, total_pages
```

R3 consumes `meta.total` that **already exists** in production responses. No backend deploy required.

---

## Type-Level Changes Only

```diff
- return apiGet<{ data: ApiBlockListRow[] }>(`/blocks?${sp}`);
+ return apiGet<CatalogListResponse<ApiBlockListRow>>(`/blocks?${sp}`);
```

Runtime behavior identical — TypeScript now documents full response shape. `meta` was always returned; previously ignored client-side.

---

## Query Key Changes

| Query | Change | Production impact |
|---|---|---|
| blocks | Removed duplicate `filters.marketType` | Cache key normalization; may cause one extra cold fetch per browser session |
| listings | Added 5 geo params | **Bug fix** — extra fetch only when geo changes in listings mode (correct behavior) |

No new endpoints. No param renames.

---

## Intentional UX Delta vs Production

| Surface | Production (pre-R3) | After R3 deploy |
|---|---|---|
| Subtitle | `200 объектов на карте` | `Показано 200 из 359 объектов` |
| FilterSidebar `totalCount` prop | 200 | 359 |
| Mobile CTA | `Показать 200 объектов` | `Показать 200 из 359 объектов` |
| Sidebar on refetch | Blank "Загрузка…" | List stays visible |
| API error | Looks like empty catalog | Retry UI |

These are **correctness fixes**, not breaking changes.

---

## Diff Safety Verdict

| Criterion | Status |
|---|---|
| Single-file frontend diff | ✓ PASS |
| No backend contract changes | ✓ PASS |
| No API shape changes required | ✓ PASS |
| No route changes | ✓ PASS |
| No Redis behavior changes | ✓ PASS |

**Diff safety: APPROVED for web-only deploy.**
