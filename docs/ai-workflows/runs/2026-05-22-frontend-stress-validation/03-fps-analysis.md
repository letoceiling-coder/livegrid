# Iteration 26.3 — FPS Analysis

## Mode

Frame rate measurement during map interaction · 2026-05-22

---

## Instrumentation

`useMapFpsTracker` — DEV-only rAF loop:
- Samples instantaneous FPS each frame
- Tags samples by phase: `idle`, `pan`, `zoom`, `selection`
- Tracks min FPS per phase + session average

Overlay fields:
- `fps avg`
- `fps min pan/zoom/sel`
- `fps phase` (current)

---

## Thresholds

| Level | FPS | Interpretation |
|---|---:|---|
| **GREEN** | ≥ 50 | Smooth |
| **YELLOW** | 30–49 | Usable with jank |
| **RED** | < 30 | Unacceptable for production map |

---

## Scenarios

### B — Pan storm
Rapid map drag 30s → read `fps min pan`

### A — Zoom storm
Zoom 10↔15 repeatedly → read `fps min zoom`

### C — Selection spam
50 rapid marker clicks → read `fps min sel`

### D — Mobile 375×667
Repeat A+B on mobile emulation → compare mins

---

## Expected bottlenecks

| Phase | Expected pressure | Reason |
|---|---|---|
| Pan | Moderate | Yandex tile + cluster repaint |
| Zoom | **High** | Mode transition → full cluster rebuild |
| Selection | Low | Icon layout swap only |

---

## Reduced motion

Sidebar uses `prefersReducedMotion` for scroll — map cluster path **unaffected**.

Verify: with `prefers-reduced-motion: reduce`, FPS profile similar (no CSS animation on markers).

---

## Manual checklist

- [ ] Pan storm min FPS recorded
- [ ] Zoom storm min FPS recorded
- [ ] Selection spam min FPS recorded
- [ ] Mobile emulation min FPS recorded

**Record values from overlay — do not assume.**
