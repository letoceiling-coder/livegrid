# Iteration 29.7 — Risk Analysis

## Mode

CHESSBOARD PRODUCT PARITY · risks · 2026-05-22

---

## Scope containment ✓

| Risk area | Mitigation |
|---|---|
| Map / geo / viewport | Zero changes |
| Backend API | Zero changes — same listings query |
| Complex page IA | Chess section unchanged in scroll order |
| Apartment page | Zero changes |

---

## Product risks

| Risk | Severity | Mitigation |
|---|---|---|
| Double-click vs single-click confusion | Low | Hint text explains; single click selects |
| Mobile sheet + complex sticky CTA overlap | Medium | Inline summary not fixed; sheet is modal |
| Hover preview off-screen | Low | Position flip logic |
| Missing section/number from API | Medium | Fallbacks: section=1, id as number |
| 500 listing cap truncates chess | Medium | Pre-existing; documented in performance doc |

---

## Technical risks

| Risk | Severity | Mitigation |
|---|---|---|
| Memo bypass if props unstable | Low | Cell props are primitives + apartment ref |
| Keyboard nav order vs visual grid | Low | Query interactive cells in DOM order |
| Debug overlay in production | None | Gated by `import.meta.env.DEV` + query param |
| Status color drift vs other pages | Low | Centralized `chessboard-status.ts` |

---

## Edge states handled

| Case | UX |
|---|---|
| Fully sold floor | Muted floor label + title tooltip |
| Empty section (no apts) | Message «В этой секции нет данных» |
| Hidden price | «Цена по запросу» on cell + preview |
| No plan | StableMediaFrame branded fallback |
| Sold cell | Dark, no link, no preview |
| All statuses filtered off | Prevented — min 1 legend active |
| Duplicate apt numbers | Sort tie-break: area, id |

---

## Rollback

Revert `Chessboard.tsx` + delete new chess files. No migrations, no feature flags required for prod (debug is DEV-only).

---

## Missing integrations

1. Room filter from `ApartmentTypeGroups` → chessboard (prop exists, not wired)
2. Telephony quick-call from preview
3. Virtualization for 500+ cell grids
