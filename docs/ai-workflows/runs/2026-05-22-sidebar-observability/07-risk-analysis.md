# Iteration 14.7 — Risk Analysis

## Change surface

| File | Change type |
|---|---|
| `map-sidebar-layout.ts` | +`resolveSidebarOverscan()` DEV helper |
| `map-sidebar-scroll-utils.ts` | **New** — scroll hardening |
| `useSidebarVirtualizerDebug.ts` | **New** — DEV hook |
| `map-render-observability.ts` | +sidebar snapshot fields |
| `MapSidebarVirtualList.tsx` | Hardening + debug hook |
| `MapDevOverlay.tsx` | +sidebar section |

---

## Risk matrix

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Prod bundle size increase | Low | Low | DEV guards + DCE |
| scrollend unsupported | Low | Low | rAF idle fallback |
| False clip warnings | Medium | Low | DEV only; line-clamp expected |
| Coalesce too aggressive | Low | Low | 280ms tunable |
| Overlay clutter | Low | Low | DEV only |
| Semantic regression | Very low | High | No data/API changes |

---

## Rollback

| Step | Action |
|---|---|
| 1 | Remove debug hook from `MapSidebarVirtualList` |
| 2 | Revert scroll utils (restore simple smooth scroll) |
| 3 | Revert observability fields |

Scroll hardening (reduced-motion, coalesce) is **safe to keep** even if observability reverted.

---

## Testing gaps

| Gap | Notes |
|---|---|
| No automated FPS test | Manual DEV checklist |
| Safari scrollend | Manual verify |
| Screen reader + virtual list | Unchanged from Iter 13 |

---

## Explicit non-risks

| Item | Status |
|---|---|
| Viewport rollout | Not touched |
| Sidebar semantics | Unchanged |
| API calls | Unchanged |
| Overscan default | Still 8 |

---

## Conclusion

**Low-risk hardening iteration.** Highest value: DEV metrics for future viewport phases. Production users receive scroll accessibility improvements only.
