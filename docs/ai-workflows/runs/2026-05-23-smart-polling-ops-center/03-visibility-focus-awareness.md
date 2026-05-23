# Iter 34 — Visibility + Focus Awareness

## APIs used

- `document.visibilitychange` — tab hidden/visible
- `window focus` / `blur` — window focus
- `navigator.onLine` — offline suspend
- `pointerdown` / `keydown` — idle reset (90s threshold)

## Behaviors

| Event | Action |
|---|---|
| Tab hidden | Slow polling (or suspend mobile) |
| Tab visible again | `refreshGeneration++` → debounced invalidate |
| Window focus | Same as tab restore |
| Back online | Immediate refresh generation |
| Idle 90s | Switch to FOCUSED_IDLE profile |

## Storm prevention

- Debounce: 500ms (`CRM_FOCUS_REFRESH_DEBOUNCE_MS`)
- Min gap between bursts: 2s (`CRM_FOCUS_REFRESH_MIN_GAP_MS`)
- Skipped refreshes tracked in `crm_debug`

## Provider scope

`CrmRefreshProvider` wraps entire `AdminLayout`.
