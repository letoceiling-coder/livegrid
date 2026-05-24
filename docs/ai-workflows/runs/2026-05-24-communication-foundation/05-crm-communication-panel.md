# 05 — CRM Communication Panel

## Component

`apps/web/src/admin/components/RequestCommunicationPanel.tsx`

## AdminRequestDetail integration

Tab bar: **Обзор** | **Коммуникация**

Communication tab shows:
- Thread message list with type badges
- Interaction count, stale + callback overdue chips
- Sub-tabs: **Тред** | **Заметки** | **Операции**
- Sticky reply bar (360px-safe, 44px touch targets)

## Operations tab

- Datetime picker + schedule callback
- Contact attempt quick log
- Callback chips with overdue styling (red border)

## Manager notes

- `MANAGER_ONLY` visibility
- `@uuid` mention support for notifications

## Timeline integration

Request overview tab keeps existing event timeline. Communication events also appear in `request_events` where mirrored (notes, contact, callback).
