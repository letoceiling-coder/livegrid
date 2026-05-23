# Iteration 29.8 — Final Verdict

## Mode

CHESSBOARD PRODUCT PARITY · Iteration 29 · 2026-05-22

---

## Verdict

**GO_WITH_HOLD** — Chessboard UX now matches FINAL_TZ portal-grade new-build selection patterns with shared status semantics, rich preview, and mobile sheet flow. Hold items: room-filter wiring from type groups, browser QA on large real JK, virtualization if ≥400 cells show jank.

---

## Readiness matrix

| Area | Status |
|---|---|
| Building → section → floor hierarchy | **GO** |
| Availability semantics | **GO** |
| Hover preview + plan | **GO** |
| Mobile tap sheet | **GO** |
| Selection clarity | **GO** |
| Keyboard accessibility | **GO** |
| Price trust (`display-price.ts`) | **GO** |
| Cross-page status labels | **GO** |
| DEV observability | **GO** |
| Performance (measured) | **HOLD** — browser QA pending |
| Room filter integration | **HOLD** — prop unused |

---

## Delivered

| Item | ✓ |
|---|---|
| `chessboard-status.ts` — shared palette | ✓ |
| `chessboard-board.ts` — grid computation | ✓ |
| `ChessboardCell` memoized | ✓ |
| `ChessboardPreview` with StableMediaFrame | ✓ |
| Section tabs | ✓ |
| Event-delegation hover preview | ✓ |
| Mobile bottom sheet | ✓ |
| Sold floor indicator | ✓ |
| Empty section message | ✓ |
| `chess_debug` overlay | ✓ |
| Unit tests (9 new) | ✓ |
| Documentation 01–08 | ✓ |

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ |
| Web tests | ✓ 27/27 |

---

## Manual checklist

- [ ] Large ЖК — scroll + section tabs
- [ ] Multiple sections — tab switch
- [ ] Sold floor — muted label
- [ ] Hover spam — preview stable, no flicker
- [ ] Rapid apartment switching — selection ring updates
- [ ] Mobile 360px — tap sheet + inline summary
- [ ] Tooltip responsiveness — check `chess_debug` latency
- [ ] Keyboard — arrows + Enter
- [ ] No layout jumps on hover preview
- [ ] Hidden price apartment — «Цена по запросу»

Test URL: `/complex/{slug}?chess_debug=1`

---

## Explicit non-deliverables (correct)

- No viewport/geo/cluster changes
- No backend rewrite
- No canvas rewrite
- No CRM / telephony
- No production debug overhead

---

## Next steps (optional)

1. Wire `roomFilter` from expanded type group selection
2. Row virtualization if large JK measurements fail thresholds
3. Deep-link `?building=&section=` query params
4. Integrate chess metrics into unified `map_debug` panel

---

## Overall

Chessboard is **production-quality structurally** for core new-build conversion UX. Remaining work is integration polish and real-JK browser validation — not fundamental IA or semantics.
