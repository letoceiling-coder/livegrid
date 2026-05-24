# 09 — Observability

## DEV-only overlays

### `?listing_debug=1`

Extended bundle with billing block:
- active subscriptions
- overdue invoices
- promotion revenue 30d
- pending orders
- quota pressure hint
- fetch timing

### `?crm_debug=1`

Billing metrics available via same admin API; Ops Center panel visible in admin routes.

## Admin debug endpoint

`GET /admin/billing/debug` — extended metrics (invoice counts, 24h generation rate)

**PROD:** debug endpoints require auth; overlay gated by `import.meta.env.PROD`.
