# Iter 37 — Ops Center Historical UX

## New UI Sections

Added to `CrmAnalyticsPanel` when `history.snapshotCount > 0`:

1. **Исторические тренды** header + query timing
2. **Drift warnings** — red alert list
3. **Trend cards** (4 primary series) — sparkline + direction arrow + delta %
4. **История менеджеров** — compact table

When no snapshots: dashed info box explaining nightly cron / manual generate.

---

## Sparklines

CSS-only `Sparkline` component — 7-point mini bars, no chart library.

`motion-safe` not required — static bars.

---

## Trend Arrows

| Direction | Icon | Color |
|---|---|---|
| improving | ↓ | green |
| degrading | ↑ | red |
| stable | → | muted |

For overdue/stale: improving = counts falling.

---

## Polling

Unchanged — history bundled in analytics query at 2× ops interval.

No additional poll for snapshots.

---

## Mobile (360px)

- Trend cards: 1 column on mobile, 2 on sm+
- Manager history: horizontal scroll
- Drift warnings: full width stack

---

## Manual QA

- [ ] Sparklines render with 2+ snapshots
- [ ] Empty state before first snapshot
- [ ] Drift warning on degrading overdue
- [ ] 7d sparkline uses last 7 points
