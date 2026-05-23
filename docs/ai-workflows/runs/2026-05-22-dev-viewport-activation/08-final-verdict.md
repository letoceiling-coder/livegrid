# Iteration 25.8 — Final Verdict

## Mode

DEV STAGE 1 VIEWPORT ACTIVATION · 2026-05-22

---

## Verdict

**GO_WITH_HOLD** — DEV Stage 1 frontend activation is implemented and safe to exercise locally. Staging rollout remains **HOLD** until manual browser validation completes (cluster density, mobile FPS, selection sync gaps).

---

## Readiness matrix

| Area | Status | Notes |
|---|---|---|
| Frontend viewport source | **GO** | `?viewport_listings=1` + DEV guard implemented |
| Cluster stability | **HOLD** | 6,533-marker rebuild needs browser profiling |
| Selection sync | **HOLD** | Viewport-only markers don't sync sidebar highlight |
| Mobile | **HOLD** | Layout unchanged; density/FPS untested |
| Performance | **HOLD** | API 214ms measured; cluster rebuild ms unknown |
| Rollback | **GO** | URL flag removal = instant legacy restore |
| Production readiness | **BLOCKED** | DEV-only by design; not for production |

---

## Delivered

| Item | Status |
|---|---|
| `isViewportListingsSourceEnabled()` | ✓ |
| Hybrid map (viewport) + sidebar (legacy) | ✓ |
| Shadow parity + cap artifact overlay | ✓ |
| `MapDevOverlay` Stage 1 indicators | ✓ |
| Unit tests (7 new) | ✓ |
| Documentation (01–08) | ✓ |

---

## Verification proof

| Check | Result |
|---|---|
| `pnpm --filter api exec tsc --noEmit` | ✓ |
| `pnpm --filter web exec tsc --noEmit` | ✓ |
| Web unit tests | ✓ 9/9 |
| Viewport parity (Iter 24) | ✓ 16/16 |
| Production activation | **Blocked** (correct) |
| Legacy API removal | **No** (correct) |
| `fallbackCoords` removal | **No** (correct) |

---

## Manual test URL

```
/map?region_id=1&viewport_debug=1&viewport_listings=1&map_debug=1
```

Confirm:

1. Overlay shows `viewport_listings: PRIMARY MAP SOURCE`
2. Marker count ~6,533 Moscow wide (after fetch)
3. Sidebar still shows ≤200 rows with pagination gap warning
4. Cap artifact warning visible in shadow section

---

## Explicit non-deliverables (correct)

- No production deploy
- No staging rollout
- No legacy API removal
- No sidebar rewrite
- No cluster architecture rewrite
- No shadow overlay removal

---

## Next steps (Stage 2+)

1. Browser profile cluster rebuild at 6,533 markers
2. Mobile FPS validation
3. Sidebar pagination or viewport-driven list
4. Staging activation with separate flag governance
5. Production guard review before any prod flag

---

## Overall

**GO_WITH_HOLD** for DEV experimentation. Backend was ready after Iter 24; frontend now has a controlled activation path. Do not proceed to staging until HOLD items are validated in browser.
