# Iteration 11.8 — Final Verdict

## Verdict

**Shadow render comparison layer delivered — DEV-only, opt-in, legacy unchanged.**

Iteration 11 adds optional **visual diff** on top of Iter 9–10 numeric parity — without switching production rendering to viewport.

---

## Deliverables

| Item | Status |
|---|---|
| `isViewportShadowRenderEnabled()` | ✓ |
| `useShadowViewportRender` | ✓ |
| `shadow-marker-layout.ts` (green/orange) | ✓ |
| MapSearch / ListingsMapSearch wiring | ✓ |
| MapDevOverlay shadow layer stats | ✓ |
| Performance guards | ✓ |
| Documentation (01–08) | ✓ |
| `tsc --noEmit` | ✓ |

---

## Visual diff legend

| Color | Meaning |
|---|---|
| Blue (main) | Legacy production markers |
| Green (shadow) | Overlap — filter-correct match |
| Orange (shadow) | Viewport-only extras |

Legacy-only markers: blue only (not on shadow layer).

---

## How to use

```
/map?region_id=1&map_debug=1&viewport_debug=1&viewport_shadow_render=1
```

Apply filters (geo, district) and observe:

- Geo 5 km → green only, no orange (matches Iter 10 100% parity)
- No filters → orange dots where viewport exceeds 200-row legacy page

---

## What this is NOT

| Excluded | Status |
|---|---|
| Production viewport rendering | ✗ not enabled |
| Legacy source replacement | ✗ |
| Viewport-driven selection | ✗ |
| Sidebar viewport feed | ✗ |
| 200-cap removal | ✗ |

---

## Readiness progression

| Iteration | Capability |
|---|---|
| Iter 8 | Prototype + metrics |
| Iter 9 | Shadow numeric parity |
| Iter 10 | Filter SQL parity |
| **Iter 11** | **Visual shadow diff (DEV)** |

---

## Next steps (optional, not started)

- Staging QA with real users behind flag
- Screenshot automation for geo/district scenarios
- Iter 12: sidebar decoupling / cap strategy (separate RFC)

---

## Conclusion

Iteration 11 completes the **visual comparison** loop for viewport validation. Production map behavior remains identical unless both DEV flags are explicitly enabled. Safe to merge for internal QA.

**Overall: READY FOR DEV VISUAL QA** — not for production viewport rollout.
