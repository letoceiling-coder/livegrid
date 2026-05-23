# Iter 33 — Notification Audit

## Mode

OPERATIONAL ATTENTION DELIVERY — Phase 1 audit

---

## Pre-Iter 33 Baseline

| Capability | State |
|---|---|
| TG outbound (new lead) | ✓ `telegram-notify.service.ts` |
| In-app CRM notifications | ✗ None |
| Unread state | ✗ None |
| Attention routing | ✗ SLA visual only |
| BullMQ | ✓ Feed import only |
| Admin polling | React Query 15–30s on lists |
| Toast usage | Minimal / none in admin CRM |

---

## Post-Iter 33 Inventory

### Data
- `crm_notifications` table — append-only, idempotent dedupe
- Enums: `CrmNotificationType`, `CrmNotificationPriority`

### API
| Endpoint | Purpose |
|---|---|
| `GET /admin/crm-notifications` | List for current user |
| `GET /admin/crm-notifications/unread-count` | Badge counter |
| `POST /admin/crm-notifications/:id/read` | Mark one read |
| `POST /admin/crm-notifications/read-all` | Mark all read |
| `POST /admin/crm-notifications/dev/sla-scan` | Admin SLA routing scan |

### Services
- `CrmNotificationsService` — emit (idempotent), list, read
- `AttentionRoutingService` — deterministic rules
- `CrmReminderService` — BullMQ-ready stub, no external send

### Frontend
- `CrmNotificationBell` — sticky header, 30s poll
- DEV metrics in `crm-observability`

---

## Capability Matrix

| Requirement | Status |
|---|---|
| Notification domain model | ✓ DONE |
| Unread badge + center | ✓ DONE |
| Attention routing | ✓ DONE |
| SLA escalation notifications | ✓ DONE (daily dedupe) |
| TG claim routing | ✓ DONE |
| BullMQ reminder readiness | ✓ STUB |
| Realtime websockets | ✗ OUT OF SCOPE |
| External push/SMS/email | ✗ BY DESIGN |
| Auto-spam | ✗ BY DESIGN |

---

## Verification

| Check | Result |
|---|---|
| web tsc | ✓ PASS |
| api tsc | ✓ PASS |
| Migration deploy | **PENDING** |
