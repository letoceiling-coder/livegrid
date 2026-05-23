# Iter 34 — Mobile Ops Behavior

## Battery-safe rules

| State | Behavior |
|---|---|
| Hidden + mobile viewport | All CRM polling **suspended** |
| Tab restore | Immediate debounced refresh |
| Touch targets | Ops queue rows min 44px padding |
| Animations | `motion-safe:` on spinners/pulse |

## 360px

- Ops Center cards: 2-column grid
- Queue sections stack vertically on lg breakpoint
- Notification bell unchanged from Iter 33

## Offline

- `enabled: online` on polled queries
- Profile → MOBILE_BACKGROUND when offline
- Online event triggers refresh generation
