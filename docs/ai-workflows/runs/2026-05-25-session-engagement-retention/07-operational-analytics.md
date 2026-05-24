# 07 — Operational Analytics

**Iteration:** 79 · **Date:** 2026-05-25

## API

`GET /admin/retention/engagement-metrics` (admin/editor)

`EngagementMetricsService` aggregates:

| Metric | Source |
|--------|--------|
| `browseEvents7d` / `30d` | `userBrowseHistory` counts |
| `browseUsers7d` | Distinct users with browse events |
| `avgBrowseDepth7d` | events / users |
| `favoritesTotal`, `favoritesUsers`, `favoritesAdded7d` | `favorite` table |
| `favoritesActivationPct` | favorites users / browse users (capped 100%) |
| `savedSearchesTotal`, `savedSearchUsers` | `savedSearch` table |
| `returnUserHint` | Same ratio as depth (diagnostic) |

Compare usage remains **client-only** — noted in `noteRu`.

## Admin UI

`AdminSystemPage` — “Engagement & retention” section with depth badge (ok if ≥2).

## Funnel diagnostics (manual)

Use depth + favorites activation + saved search users together:

- Low depth + low favorites → surface engagement blocks not seen (check dismiss rates)
- High depth + low favorites → CTA/favorite UX friction
- High saved searches + low return → reminder UX (SavedSearchReminder)

## Files

- `engagement-metrics.service.ts`
- `account-retention.controller.ts`, `retention.module.ts`
- `AdminSystemPage.tsx`
