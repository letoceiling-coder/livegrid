# 03 — Save Search UX

## Catalog

Component: `SaveSearchButton.tsx` in catalog toolbar (auth required).

Actions:
- **Save** — name prompt + POST `/account/saved-searches`
- **Duplicate** — 409 → confirm overwrite
- Captures: filters, regionId, geo from URL

## Account page

`/account/saved-searches`:
- Filter chips preview
- Toggle alerts (checkbox)
- Rename (prompt)
- Delete
- Open in catalog link

Mobile: horizontal chips, 44px touch targets, stacked save form on narrow screens.
