# 07 — Ops Integration

## Ops Center

Panel: subscriptions, overdue, rev 30d, pending orders, plan distribution, pressure hint.

Poll interval: 4× base ops interval.

## System Diagnostics

`/admin/system/diagnostics` extended with `billing` block from `BillingMetricsService`.

## Endpoints

- `GET /admin/billing/metrics` — primary ops feed
- `POST /admin/billing/scan/overdue` — batch status transition ISSUED → OVERDUE
