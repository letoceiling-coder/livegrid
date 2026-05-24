# 03 — CRM Responsiveness UX

**Iteration:** 81 · **Date:** 2026-05-25

## Improvements

| Surface | Change |
|---------|--------|
| `CrmWorkloadStrip` | First-contact time, callback overdue, unread count row |
| `AdminRequests` | Existing SLA filter chips (overdue/stale) + velocity context |
| `RequestCommunicationPanel` | «Клиент ждёт ответа · N мин/ч» when buyer message unanswered >15m |
| `AdminConversationsPage` | Existing pending/callback/stale badges (unchanged, validated) |
| `AdminRequestDetail` | SLA banner preserved from prior iterations |

## Inbox prioritization

Default list sort remains `priority` (SLA-derived). Workload strip toggles `sla=overdue|stale` filters.

## Files

- `CrmWorkloadStrip.tsx`
- `RequestCommunicationPanel.tsx`
- `AdminRequests.tsx`
