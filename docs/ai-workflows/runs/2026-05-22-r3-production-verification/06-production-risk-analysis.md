# R3.1 — Production Risk Analysis

## Mode

READ-ONLY · `@gstack/careful` + `@gstack/cso`

---

## Risk Matrix

| Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|
| Web-only deploy breaks map | Low | High | **LOW** | Single file, typecheck pass |
| meta.total missing in API | Very Low | Medium | **LOW** | Fallback to `blocks.length`; prod confirmed 359 |
| Stale count during refetch | Medium | Low | **LOW** | "обновление…" suffix; <300ms |
| Blocks error → listings fallback masks error | Low | Low | **LOW** | Pre-existing, not R3 regression |
| Geo key fix causes extra listings fetch | Low | Low | **LOW** | Correctness fix, rare path |
| User confusion from new count text | Low | Low | **LOW** | Intentional honesty improvement |
| keepPreviousData shows wrong filters briefly | Low | Low | **LOW** | Synced map+list; short duration |
| FilterSidebar totalCount unused in UI | N/A | None | **N/A** | Prop passed but not rendered in sidebar body (pre-existing) |

---

## Deploy Surface

| Component | Deploy needed | Risk |
|---|---|---|
| `apps/web` static build | **Yes** | LOW |
| `apps/api` | **No** | — |
| PostgreSQL | **No** | — |
| Redis | **No** | — |
| nginx config | **No** | — |

**Blast radius:** map page (`/map`) and any route rendering `RedesignMap`.

---

## Rollback Plan

| Step | Action | Time |
|---|---|---|
| 1 | Revert `RedesignMap.tsx` to `354836d` | <5 min |
| 2 | Rebuild web bundle | ~2 min |
| 3 | Deploy previous static assets | standard pipeline |

No database migration rollback needed.

---

## Production Behavior Delta

### Visible to users

1. Count shows 359 not 200 — **correct**
2. Pagination notice — **new honest disclosure**
3. Sidebar stable during filter change — **improved**
4. Error retry button — **new, rare path**

### Invisible to users

- React Query key fixes
- TypeScript types
- Lazy image loading

---

## Dependencies

| Dependency | Version | Risk |
|---|---|---|
| @tanstack/react-query | ^5.83.0 | keepPreviousData stable API |
| lucide-react AlertCircle | existing | icon import only |
| apiGet / blocks API | unchanged | — |

---

## Staging vs Production Parity

Verified against **live production API**:

```
https://livegrid.ru/api/v1/blocks?region_id=1&per_page=200&require_active_listings=true
→ HTTP 200, meta.total=359, data.length=200
```

Local snapshot matches production counts. R3 logic validated against real response shape.

---

## Classification

### Overall deploy risk: **LOW**

**Reasoning:**

1. **Single frontend file** — minimal blast radius
2. **No backend deploy** — no Redis/DB/API coordination
3. **No contract changes** — consumes existing `meta.total`
4. **Typecheck passes** — compile-time safety
5. **Improvements are additive** — error UI, pagination notice, loading sync
6. **Known edge cases are LOW severity** — stale label during refetch, blocks-error fallback (pre-existing)
7. **Rollback is trivial** — one file revert

### Conditions that would raise to MEDIUM (not present)

- Backend deploy required ✗
- Map component rewrite ✗
- Query contract change ✗
- Multiple file cross-cutting changes ✗
- Untested TanStack API ✗

### Would be HIGH if (not present)

- Viewport API added
- Pagination logic changed
- Redis TTL modified
- Breaking URL param rename

---

## Pre-Deploy Requirements

| # | Requirement | Owner |
|---|---|---|
| 1 | Web build succeeds | CI |
| 2 | Manual smoke `/map?region_id=1` | QA |
| 3 | Verify subtitle "200 из 359" | QA |
| 4 | Filter change — no sidebar flash | QA |
| 5 | Optional: mobile 375px check | QA |

**No production deploy in this verification run.**
