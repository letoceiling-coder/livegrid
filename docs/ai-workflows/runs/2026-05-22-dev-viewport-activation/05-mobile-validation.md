# Iteration 25.5 — Mobile Validation

## Mode

Mobile UX audit under viewport primary source · 2026-05-22

---

## Layout (unchanged)

| Element | Mobile behavior |
|---|---|
| Sidebar | `max-h-[40vh]` — bottom panel |
| Map | Remaining viewport height |
| Popup | Bottom sheet style, full width on small screens |
| Filter overlay | Full-screen slide-up |

Viewport activation does not change layout CSS — only marker count on map.

---

## Validation checklist

| Check | Status | Notes |
|---|---|---|
| 40vh sidebar | **PASS** (design) | No CSS changes |
| Gesture conflicts (map pan vs sidebar scroll) | **HOLD** | Manual mobile test |
| Body scroll lock (filter overlay) | **PASS** (design) | `useBodyScrollLock` unchanged |
| Popup interaction | **HOLD** | Higher marker density may affect tap targets |
| Cluster tap behavior | **HOLD** | 6,533 markers — cluster density high |
| FPS under density | **HOLD** | Requires device profiling |

---

## Potential blockers

1. **High marker density** — Moscow wide view with 6,533 markers may reduce frame rate on low-end mobile devices during cluster rebuild
2. **Popup + sidebar overlap** — popup at bottom may overlap 40vh sidebar on small phones when both visible
3. **Viewport-only selection** — no sidebar feedback when tapping markers outside 200-row list

---

## Mitigation (future, not Stage 1)

- Viewport-driven sidebar pagination
- Reduce marker count at low zoom via server-side clustering
- Collapse popup when sidebar expanded on mobile

---

## Manual test procedure

1. Chrome DevTools → mobile viewport (375×667)
2. Open test URL with flags
3. Pan map — verify sidebar doesn't steal gestures
4. Tap cluster — verify zoom
5. Tap marker — verify popup doesn't clip under sidebar
6. Open filters — verify scroll lock
