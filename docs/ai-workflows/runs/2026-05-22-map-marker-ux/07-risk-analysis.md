# Iteration 2 — Risk Analysis

## Mode

`@gstack/careful` · `@gstack/cso`

---

## Risk Matrix

| Risk | Likelihood | Impact | Severity | Mitigation |
|---|---|---|---|---|
| Marker flicker on mode cross | Low | Low | **LOW** | Fewer rebuilds than before |
| Wrong label at mode boundary | Low | Low | **LOW** | Thresholds match TZ (12, 14) |
| XSS via complex name | Very Low | Medium | **LOW** | escapeMarkerHtml |
| Popup z-index conflict | Low | Low | **LOW** | z-10 unchanged |
| Listings/blocks visual inconsistency | Low | Low | **LOW** | Shared layout module |
| Break sidebar sync | Very Low | Medium | **LOW** | onSelect unchanged |
| R3 + Iter2 deploy coupling | Medium | Low | **LOW** | Independent files |

---

## Deploy Surface

| Component | Deploy |
|---|---|
| `apps/web` static | Yes |
| `apps/api` | No |
| Redis/DB | No |

**Blast radius:** `/map` marker appearance + popup only.

---

## Rollback

Revert 3 files:
- `map-marker-layout.ts` (delete)
- `MapSearch.tsx`
- `ListingsMapSearch.tsx`

No data migration. Instant rollback via previous bundle.

---

## Known Limitations (accepted)

1. Still full clusterer rebuild on mode cross (not incremental placemark update)
2. HTML string templates (Yandex constraint)
3. 200 marker cap unchanged
4. Active marker rebuild on selection (pre-existing)

---

## Classification

### **LOW** overall risk

**Reasoning:**
- 3 frontend files, no backend
- Improves on existing pattern (fewer zoom rebuilds)
- TZ compliance fixes (price fallback, readable badges)
- Typecheck passes
- No query/filter/architecture changes

---

## Pre-existing Separate Diff

`RedesignMap.tsx` contains R3 correctness changes (separate iteration). Deploy can be:
- **Combined:** R3 + Iteration 2 web bundle
- **Split:** Cherry-pick marker files only

No functional dependency between R3 and marker UX.
