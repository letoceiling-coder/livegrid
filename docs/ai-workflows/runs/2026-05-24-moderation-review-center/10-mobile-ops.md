# 10 — Mobile Ops UX (360px)

## Queue page

- Horizontal scroll tabs, 44px min height
- Full-width search + stacked region/agent selects
- Card rows stack vertically

## Review center

- Live/pending summary: 1-col grid on mobile, 2-col on lg
- `RevisionDiffPanel`: stacked field rows (label / live / pending)
- `ModerationActionBar`: sticky bottom, full-width approve button
- `pb-32` page padding avoids overlap with action bar
- Touch targets ≥ 44px on all action buttons

## Debug overlay

- `max-sm:bottom-36` — clears sticky action bar
- Narrow max-width on small screens
