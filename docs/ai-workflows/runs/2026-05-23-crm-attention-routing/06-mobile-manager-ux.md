# Iter 33 — Mobile Manager UX

## 360px checklist

| Item | Implementation |
|---|---|
| Bell touch target | 40×40px |
| Dropdown width | `min(100vw-2rem, 380px)` fixed on small screens |
| Close button | Visible on mobile header |
| Scroll | `max-h 70vh`, `overscroll-contain`, `pb-safe` |
| Unread pulse | `motion-safe:animate-pulse` on badge |
| Reduced motion | `motion-safe:` prefix on animations |

## Operational scanning

- URGENT/HIGH items sort first in API list
- Unread rows: `bg-primary/5`
- One tap → request detail + mark read

## Sticky context

Bell in layout header — visible on all admin CRM pages while scrolling.
