# 10 — Mobile UX (360px)

## Communication panel

- Stacked message cards, full-width
- Tab bar with `min-h-[44px]` touch targets
- Sticky bottom reply bar with `touch-manipulation`
- Callback datetime input full-width on narrow screens
- `max-h-[420px]` scroll region for messages

## Agent inbox

- Column layout collapses: meta moves below title on `max-sm`
- Filter chips as rounded pills, 36px min height
- Unread row `bg-primary/5` for scanability

## Admin request detail

- Communication tab replaces overview content (no horizontal scroll)
- Bottom padding `pb-24` for sticky controls above mobile browser chrome

## Verified targets

- 360px width layout in component class names (`max-sm`, `sm:` breakpoints)
- No fixed-width modals in communication flow
