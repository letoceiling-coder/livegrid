# 06 — Operational Dashboards

**Iteration:** 81 · **Date:** 2026-05-25

## Admin System (`/admin/system`)

New section: **Lead velocity & responsiveness**

- Response SLA score badge (ok ≥80)
- Avg first contact / assignment
- Overdue / stale counts
- Callback overdue, unread/stale threads
- Fast/slow agent distribution (counts only)
- Bottleneck list + link to CRM queue

Poll: 60s (aligned with marketplace/engagement panels).

## CRM queue (`/admin/requests`)

`CrmWorkloadStrip` velocity row from same API.

## Files

- `AdminSystemPage.tsx`
- `CrmWorkloadStrip.tsx`
- `requests-admin-meta.controller.ts`
