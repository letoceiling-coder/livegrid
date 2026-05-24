# 03 — Message Model

## Types (`CrmMessageType`)

| Type | Use |
|------|-----|
| `TEXT` | Buyer-visible or staff reply |
| `SYSTEM` | Auto bootstrap |
| `NOTE` | Internal CRM note |
| `CONTACT_ATTEMPT` | Call/message attempt log |
| `CALLBACK_SCHEDULED` | Scheduled callback with `meta.scheduledAt` |

## Visibility (`CrmMessageVisibility`)

| Scope | Audience |
|-------|----------|
| `INTERNAL` | All staff on thread |
| `BUYER_VISIBLE` | Public token API + staff |
| `MANAGER_ONLY` | admin/editor + author |

## Audit storage

- Immutable append-only rows in `crm_messages`
- `meta` JSON for callback channel, overdue flags
- Timeline mirror via existing `RequestEvent` for NOTE / CONTACTED / VIEWING_SCHEDULED

## Mention parsing

`extractMentionedUserIds()` in `@lg/shared` — `@uuid` in body triggers `MANAGER_MENTIONED` notification.
