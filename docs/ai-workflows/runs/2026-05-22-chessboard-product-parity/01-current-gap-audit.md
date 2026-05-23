# Iteration 29.1 — Current Gap Audit

## Mode

CHESSBOARD PRODUCT PARITY · gap analysis · 2026-05-22

Reference: FINAL_TZ, TrendAgent / Domclick / Cian new-build chessboard patterns.

---

## Before (pre-Iter 29)

| Area | State | Gap |
|---|---|---|
| Layout | Single grid per section, all sections stacked | No section tabs; cognitive overload on multi-section |
| Hierarchy | Building name + legend only | No availability summary line |
| Tooltip | Native `title` attribute | No plan preview, no CTA, no price trust |
| Colors | Hardcoded hex in component | Not shared with apartment/catalog semantics |
| Selection | None | No selected state clarity |
| Mobile | Horizontal scroll only | No tap preview; tiny cells |
| Performance | Full component rerender on filter toggle | No memoized cells; no metrics |
| Keyboard | None | Not accessible |
| Sold floors | Same floor label styling | No visual cue for fully sold floors |
| Empty section | Dashed cells only | No message when section has zero data |
| Debug | None | No chess observability |

---

## After (Iter 29)

| Area | Status |
|---|---|
| Section tabs | ✓ When >1 section — switch without scroll |
| Building → section → floor → apt hierarchy | ✓ Tabs + sticky floor column + column index |
| Rich hover preview (desktop) | ✓ Plan + price + status + CTA via `ChessboardPreview` |
| Mobile tap sheet | ✓ Bottom sheet replaces hover tooltip |
| Inline selection summary (mobile) | ✓ Above hint text |
| Centralized status semantics | ✓ `chessboard-status.ts` |
| Memoized cells | ✓ `ChessboardCell` |
| Event delegation hover | ✓ Single preview overlay — no per-cell popover mount |
| Keyboard nav | ✓ Arrow keys + Enter |
| DEV observability | ✓ `?chess_debug=1` overlay |
| `display-price.ts` in cells + preview | ✓ |
| `StableMediaFrame` in preview | ✓ |

---

## Gap matrix (remaining)

| Item | Severity | Notes |
|---|---|---|
| Column headers = slot index not apt number | Low | Sorted by number within floor |
| Pinch zoom on mobile grid | Low | Horizontal scroll sufficient for MVP |
| Room filter wiring from type groups | Medium | Prop exists; not connected from complex page |
| Telephony in preview CTA | Medium | Links to apartment page only |
| Virtualized grid for 500+ cells | Low | Warning in debug overlay; no rewrite yet |
| Queue/deadline in section header | Low | Building pill shows deadline |

---

## Files touched

| File | Change |
|---|---|
| `Chessboard.tsx` | Full UX refactor |
| `ChessboardCell.tsx` | New — memoized cell |
| `ChessboardPreview.tsx` | New — tooltip/sheet content |
| `ChessDebugOverlay.tsx` | New — DEV metrics |
| `chessboard-status.ts` | New — shared semantics |
| `chessboard-board.ts` | New — board computation |
| `chessboard-observability.ts` | New — DEV metrics API |
| `RedesignComplex.tsx` | ChessDebugOverlay mount |

---

## Portal comparison

| Pattern | Iter 29 |
|---|---|
| Status color legend with counts | ✓ |
| Section switcher | ✓ |
| Hover plan preview | ✓ (desktop) |
| Tap detail on mobile | ✓ (sheet) |
| Sold = non-clickable dark cells | ✓ |
| Price on cell | ✓ `formatDisplayPrice` |
| Double-click / CTA to listing | ✓ |
