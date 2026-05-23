# Iteration 27.2 — Information Architecture

## Mode

Sequential scroll structure · anchor navigation only · 2026-05-22

---

## Principle

**All sections visible in one scroll.** Navigation pills scroll to anchors — no content unmounting.

Removed: `@/components/ui/tabs` panel switching on complex page.

---

## Section order

```
Gallery (#gallery)
  ↓
Header meta (#header-meta)
  ↓
Sticky anchor nav
  ↓
Buildings (#buildings)
  ↓
Apartments (#apartments) — type groups
  ↓
Chessboard (#chess) — active building
  ↓
Layouts (#layouts) — if data
  ↓
Description (#description)
  ↓
Infrastructure (#infrastructure)
  ↓
Map (#map)
  ↓
Developer (#developer)
  ↓
Lead (#lead)
  ↓
Similar (#similar)
```

Empty sections omitted from nav (except apartments + lead always present).

---

## Anchor navigation

`ComplexAnchorNav`:
- Sticky `top-16` below header
- Horizontal scroll on mobile
- `IntersectionObserver` highlights active section
- Respects `prefers-reduced-motion` for scroll

---

## Building → chessboard link

`activeBuildingId` state:
- Building pills in `#buildings`
- Chessboard renders **one** building at a time
- Defaults to first building

---

## Lead form placement

Moved from sidebar-only to `#lead` section with price summary card — visible on all breakpoints.

Mobile: fixed bottom bar → scroll to `#lead`.
