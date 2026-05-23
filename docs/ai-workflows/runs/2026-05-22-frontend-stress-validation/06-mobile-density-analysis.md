# Iteration 26.6 — Mobile Density Analysis

## Mode

Mobile viewport interaction under 6,533 map markers · 2026-05-22

---

## Layout (unchanged)

| Element | Mobile |
|---|---|
| Sidebar | `max-h-[40vh]` bottom panel |
| Map | Remaining height |
| Popup | Full-width bottom sheet |
| Debug overlay | Scrollable, max 85vh |

---

## Interaction matrix

| Action | Map source | Sidebar | Expected stress |
|---|---|---|---|
| Pinch zoom | Viewport cluster | Legacy 200 | **High** (rebuild) |
| Pan | Viewport fetch + render | Static | Moderate |
| Tap marker | Selection + popup | No row if outside 200 | Low–moderate |
| Tap sidebar row | Pan + highlight | Virtual scroll | Low |
| Popup + sidebar | Overlap at bottom | Both visible | UX friction |

---

## Scenario D — Mobile 375×667

1. DevTools mobile emulation
2. Run Scenarios A + B + C
3. Record FPS mins and rebuild p95
4. Test popup tap with sidebar open

---

## Known partial sync (Iter 25)

Viewport-only marker selection:
- Popup works (merged lookup)
- Sidebar row **not highlighted** if ID ∉ 200-row page

Not a performance blocker — product limitation.

---

## Mobile thresholds

Same as desktop FPS/rebuild thresholds. Mobile typically **1 tier worse**.

| Desktop | Mobile adjustment |
|---|---|
| GREEN FPS ≥ 50 | ≥ 40 acceptable |
| GREEN rebuild p95 ≤ 500ms | ≤ 800ms acceptable |

Document actual mobile numbers from overlay.

---

## Blockers to watch

1. Popup clipped under 40vh sidebar
2. Tap target density in clustered areas
3. Scroll gesture conflict (map vs sidebar)

---

## Manual checklist

- [ ] Mobile zoom storm FPS min
- [ ] Mobile pan storm req/min
- [ ] Popup usable with sidebar visible
- [ ] No scroll lock conflicts on map page
