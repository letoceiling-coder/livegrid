# 04 — Agent Response Operations

**Iteration:** 81 · **Date:** 2026-05-25

## Agent-facing surfaces

| Tool | Purpose |
|------|---------|
| `/admin/conversations` | Inbox with pending reply, callback, stale markers |
| Request detail communication | Callback scheduling, contact attempts, thread |
| My Listings | Supply-side (iter 80) — separate from CRM velocity |

## Internal nudges (not public)

- Pending reply badge on communication panel
- Callback overdue count in thread header
- Workload strip highlights unassigned overdue count

## No new bulk ops

Response iteration focuses on visibility and nudges — no auto-assign or auto-close.

## Files

- `AdminConversationsPage.tsx`
- `RequestCommunicationPanel.tsx`
