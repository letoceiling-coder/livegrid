# 06 — Billing Center

## Account UI — `/account/billing`

- Current plan + quota bars (360px-safe)
- Promotion purchase cards
- Compact invoice list with swipe-to-archive (client-side)
- Order history

## Admin UI — `/admin/billing`

- Metrics strip
- Account list
- Overdue invoices + mark paid
- Scan overdue batch
- Link to Ops Center

## API

- `GET /account/billing/summary`
- `GET /account/billing/invoices`
- `POST /account/billing/promotions/orders`
- `GET /admin/billing/metrics`
- `GET /admin/billing/accounts`
- `POST /admin/billing/invoices/:id/paid`
