# Iteration 13.7 — Risk Analysis

## Risk matrix

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Row height mismatch / clipped text | Low | Medium | Fixed 72px + overflow-hidden; tune constant |
| Scroll jump on image load | Low | Medium | Fixed height rows, absolute img in thumb |
| Scroll reset on refetch | Low | Low | Reset keyed on `mapUrlSig` only |
| Selection scroll jank | Low | Low | smooth scroll only on external select |
| Virtual list + React 18 strict mode | Low | Low | TanStack stable API |
| Package bundle size | Low | Low | ~3KB gz virtual core |
| a11y regression | Low | Medium | role=list, keyboard nav added |
| Map regression | Very low | High | Zero map file logic changes |

---

## Out-of-scope risks (unchanged)

| Risk | Status |
|---|---|
| 200-cap semantic gap | Still present — by design |
| Viewport/map mismatch | Still present — no viewport work |
| Listings fake coords | Unchanged |
| Mobile 40vh UX | Improved perf, not layout |

---

## Rollback plan

| Step | Action |
|---|---|
| 1 | Revert `RedesignMap.tsx` sidebar section to inline map |
| 2 | Delete `MapSidebarVirtualList.tsx`, `map-sidebar-layout.ts` |
| 3 | Optional: remove `@tanstack/react-virtual` |

Single PR revert — no API or database rollback.

---

## Production safety

| Guard | ✓ |
|---|---|
| Same data source | ✓ |
| Same API calls | ✓ |
| Same counts/copy | ✓ |
| Feature flag required | **No** — direct production improvement |
| DEV-only gate | **No** — safe for all users |

---

## Testing gaps (honest)

| Gap | Mitigation |
|---|---|
| No automated E2E scroll test | Manual DEV checklist |
| No CI FPS benchmark | Structural DOM metrics documented |
| Screen reader full audit | Basic ARIA added; full SR test recommended |

---

## Dependency risk

`@tanstack/react-virtual@3.x` — same org as existing `@tanstack/react-query`.

Pin in lockfile via pnpm. No peer conflict with React 18.

---

## Conclusion

**Low-risk, isolated UI optimization.** Highest impact mitigation is fixed row heights. Rollback is trivial. No architectural or API exposure.
