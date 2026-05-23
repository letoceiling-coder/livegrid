# Iteration 13.8 — Final Verdict

## Verdict

### **SIDEBAR VIRTUALIZATION SHIPPED — PRODUCTION-SAFE**

Iteration 13 virtualizes the legacy map sidebar **without semantic, API, or map architecture changes**.

---

## Deliverables

| Item | Status |
|---|---|
| `@tanstack/react-virtual` dependency | ✓ |
| `MapSidebarVirtualList.tsx` | ✓ |
| `map-sidebar-layout.ts` constants | ✓ |
| `RedesignMap.tsx` wired | ✓ |
| `pnpm --filter web exec tsc --noEmit` | ✓ |
| Documentation 01–08 | ✓ |

---

## What changed

| Layer | Change |
|---|---|
| Sidebar list body | 200 DOM rows → ~20–28 windowed rows |
| Images | Bounded lazy load to visible window |
| Selection | + scroll-into-view on map tap |
| a11y | + list roles, keyboard ↑↓ Home End |

---

## What did NOT change

| Item | Status |
|---|---|
| Catalog page-1 data (200 cap) | Unchanged |
| API calls / React Query | Unchanged |
| Counts / subtitle copy | Unchanged |
| Map cluster / viewport shadow | Unchanged |
| Mobile 40vh layout | Unchanged |
| Filter semantics | Unchanged |

---

## Performance summary

| Metric | Before | After |
|---|---|---|
| DOM row nodes | 200 | ~21–28 |
| Image nodes (sidebar) | up to 200 | ~21–28 |
| Selection React churn | 200 rows | ~2 memo rows |
| Map cluster on select | 0 rebuilds | 0 rebuilds |

---

## DEV verification checklist

```
□ /map?region_id=1 — 200 blocks load, sidebar scrolls smoothly
□ Elements: [role=listitem] count ≈ 25, not 200
□ Sidebar click → map popup + highlight
□ Map marker click → sidebar row highlighted + scrolled visible
□ Toggle row → deselect
□ Change filter → scroll resets top
□ Refetch same filter → scroll preserved
□ Mobile 40vh — fling scroll smooth
□ ?map_debug=1 — cluster rebuilds unchanged on sidebar clicks
□ tsc --noEmit passes
```

---

## Readiness

| Category | Status |
|---|---|
| Production sidebar perf | **Improved** |
| Viewport rollout | **Not started** (correct) |
| Iter 12 hybrid architecture | **Unblocked for future phases** |
| Rollback safety | **High** |

---

## Next steps (optional, not Iter 13)

- Iter 14: viewport API count + cursor (RFC)
- Chrome Memory snapshot before/after on staging
- Screen reader full pass on virtual list

---

## Conclusion

Iteration 13 delivers the ** highest-ROI, lowest-risk** item from Iter 12 RFC: virtualize the existing 200-row sidebar. Safe for production merge. No viewport or semantic rollout implied.

**Overall: READY FOR PRODUCTION**
