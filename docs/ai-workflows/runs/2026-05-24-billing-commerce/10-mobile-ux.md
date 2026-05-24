# 10 — Mobile UX

## 360px constraints

- Account billing tabs scroll horizontally (inherits AccountLayout)
- Quota bars stack single column on narrow viewports
- Promotion cards: 1-col mobile, 3-col sm+
- Invoice rows: compact padding, touch targets ≥44px
- Swipe invoice archive: touch handlers, −120px max drag

## Verified patterns

- `min-h-[44px]` on primary actions
- `truncate` on long invoice descriptions
- `pb-24` bottom safe area on admin billing page
