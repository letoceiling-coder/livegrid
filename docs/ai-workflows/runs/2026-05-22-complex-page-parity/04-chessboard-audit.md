# Iteration 27.4 — Chessboard Audit

## Mode

Chessboard vs FINAL_TZ / TrendAgent reference · 2026-05-22

---

## Current implementation (`Chessboard.tsx`)

| Feature | Status | Evidence |
|---|---|---|
| Building grouping | ✓ | One board per building (page selects active) |
| Section grouping | ✓ | `sectionBoards` per section number |
| Floor ordering | ✓ | Descending (`sort (a,b) => b - a`) |
| Status colors | ✓ | available=white, reserved=gray, sold=black |
| Status filter toggles | ✓ | Multi-select, min 1 active |
| Click → apartment | ✓ | Link for non-sold |
| Tooltip | ✓ | `title` on cells |
| Room filter dim | ✓ | `roomFilter` prop (optional) |
| Sold in board | ✓ | API fetches ACTIVE,RESERVED,SOLD |

---

## API structure

Listings mapped in `blocks-from-api.ts`:
- `section`, `floor`, `number`, `rooms` from `apartment.*`
- `buildingId` / `buildingName` from listing row

**Gap:** If API omits `section` or `number`, board uses fallbacks (column index, id).

---

## Gaps vs ideal TrendAgent

| Gap | Class | Mitigation |
|---|---|---|
| No queue/deadline per section header | Document | Building pill shows deadline from block |
| Column headers are index not apt number | Low | Sorted by apt number within floor |
| No hover plan preview on chess cell | Future | Apartment page has plan |
| Horizontal scroll on narrow mobile | Acceptable | `overflow-x-auto` |

---

## Fake data policy

**No fake data added.** Empty section → dashed placeholder cells from real floor grid only.

---

## Manual validation

- [ ] Select each building tab → chess updates
- [ ] Click available cell → `/apartment/:id`
- [ ] Toggle status filters
- [ ] Sold cells not clickable
