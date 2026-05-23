# Iteration 29.6 — Performance Analysis

## Mode

CHESSBOARD PRODUCT PARITY · performance · 2026-05-22

---

## Baseline (pre-Iter 29)

| Issue | Impact |
|---|---|
| Monolithic cell render in map loop | Full grid rerender on any state change |
| Native title tooltips | No mount cost but zero product value |
| No metrics | Unknown hover/selection cost |

---

## Optimizations applied

| Technique | Purpose |
|---|---|
| `ChessboardCell` + `memo()` | Isolate cell render; only changed cells rerender |
| Event delegation for hover | Single preview state vs N hover handlers |
| `useMemo` for `sectionBoards` | Expensive grid computation cached |
| `useCallback` for handlers | Stable refs for delegated events |
| Single floating preview | O(1) tooltip DOM vs O(n) popovers |

---

## NOT applied (by design)

| Technique | Reason |
|---|---|
| Canvas rewrite | Out of scope — architecture rewrite |
| Full grid virtualization | Needs measured pain on real 500+ JK data |
| Backend pagination for chess | No backend changes |

---

## DEV observability

Enable: `/complex/{slug}?chess_debug=1`

Metrics (`chessboard-observability.ts`):

| Metric | Description |
|---|---|
| `apartmentCount` | Total apts in active building |
| `visibleCellCount` | Rendered non-null cells |
| `hoverLatencyMs` | mouseenter → preview paint |
| `tooltipOpenLatencyMs` | Same as hover (single overlay) |
| `selectionPropagateMs` | click → selected state |
| `rerenderCount` | Chessboard render cycles |
| `largeJkWarning` | ≥400 apartments flag |

Overlay: `ChessDebugOverlay` — fixed bottom-right, DEV only.

---

## Large ЖК stress

| Threshold | Action |
|---|---|
| ≥400 apartments | Debug warning displayed |
| 500 API cap | Existing `per_page=500` on listings query |

Future: window rows by visible floor range if measurements show jank.

---

## Rerender analysis

State changes and expected blast radius:

| State | Rerender scope |
|---|---|
| `hoverPreview` | Chessboard shell + preview div only (cells memoized) |
| `selectedId` | Previous + new selected cells only |
| `activeStatuses` | All cells (hidden flag changes) — acceptable |
| `activeSectionTab` | One section board swap |

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ |
| Unit tests | ✓ 27/27 |

Browser measurements pending manual QA with `chess_debug=1`.
