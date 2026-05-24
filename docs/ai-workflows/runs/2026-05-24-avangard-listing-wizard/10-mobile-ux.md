# 10 — Mobile UX

## Target

360px minimum width.

## Implemented

| Pattern | Location |
|---------|----------|
| Sticky action footer | `ListingWizardFooter` — bottom bar with backdrop blur |
| Large touch targets | `min-h-11` on inputs/buttons |
| Responsive step indicator | 2-col grid on mobile, 5-col on sm+ |
| Kind grid | 2 columns on mobile |
| Bottom padding | `pb-28` on wizard container for footer clearance |
| Autosave drafts | localStorage on every draft change |

## Deferred

- Bottom-sheet selectors (native select used)
- Keyboard scroll-into-view polish
