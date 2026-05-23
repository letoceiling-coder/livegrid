# Iter 33 — Security + Governance

## Recipient visibility

- All list/read endpoints filter **`recipientId = current user`**
- No cross-manager notification leakage
- Mark read validates ownership (404 if wrong user)

## Role access

| Endpoint | admin | editor | manager | agent |
|---|---|---|---|---|
| CRM notifications | ✓ | ✓ | ✓ | ✗ |
| dev/sla-scan | ✓ | ✗ | ✗ | ✗ |

Matches CRM queue access from Iter 31.

## SLA broadcast (unassigned)

Unassigned OVERDUE/STALE notifies all active admin/editor/manager — intentional queue visibility, daily dedupe prevents spam.

## TG claim

Previous assignee notified if different from claimer — no hidden bypass.

## Governance

- Notifications are **derived from CRM events** — cannot be forged via API
- No endpoint accepts arbitrary `recipientId` from client
- External delivery (TG/SMS/email) remains separate admin TG config — not triggered by this layer
