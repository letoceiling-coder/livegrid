# Iter 43 — Phase 5: Mobile Admin Hardening

## Viewport Target

360px–430px (iPhone SE through standard Android)

## Layout Changes

| Element | Desktop | Mobile (<768px) |
|---------|---------|-----------------|
| Sidebar | Fixed 240px | Off-canvas drawer + backdrop |
| Header | Bell only | Hamburger + Bell |
| Nav touch targets | py-2.5 (~40px) | min-h-[44px] |
| Shell height | h-screen | h-[100dvh] |
| Main scroll | overflow-auto | overscroll-contain |

## Component Mobile Behavior

### CrmNotificationBell
- Panel: `max-sm:fixed max-sm:top-14 max-sm:left-4 max-sm:right-4`
- Close button visible on mobile
- `max-h-[min(70vh,420px)]` with overscroll-contain

### AdminOpsCenter / AdminRequests
- `pb-24` bottom padding (clears debug overlay on mobile)
- Grid: `grid-cols-2 sm:grid-cols-4` for stat cards
- Sticky filters with backdrop blur

### AdminDashboard
- Workload tiles: `grid-cols-1 sm:grid-cols-3`
- Recent requests: clickable links to detail

### CrmDebugOverlay
- Repositioned: `max-sm:bottom-20 max-sm:left-2` (avoids thumb zone)

## Polling on Mobile

- Visible mobile: full OPS_CRITICAL cadence (foreground operational use)
- Hidden mobile tab: `MOBILE_BACKGROUND` — all polls suspended
- No reduced "mobile-active" profile (acceptable: managers use phone for triage)

## QA Checklist (360px)

- [ ] Hamburger opens/closes drawer
- [ ] Ops Center queues scroll without horizontal overflow
- [ ] Notification panel fits viewport
- [ ] Request list cards readable; SLA badges visible
- [ ] Detail page actions reachable without zoom
- [ ] No layout jump on analytics skeleton → content
