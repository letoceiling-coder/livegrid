# 01 — Domain Audit (Iter 54)

**Date:** 2026-05-24  
**Mode:** Additive communication layer on live CRM

## Existing surfaces

| Surface | Location | Role today |
|---------|----------|------------|
| Requests | `requests` table, `RequestsService` | Lead intake, SLA, assignment |
| Request events | `request_events`, `RequestEventsService` | Timeline: CREATED, ASSIGNED, NOTE_ADDED, CONTACTED, VIEWING_SCHEDULED |
| CRM notifications | `crm_notifications`, `AttentionRoutingService` | Deduped staff alerts |
| Admin detail | `AdminRequestDetail.tsx` | Status, assignee, inline notes → `POST /admin/requests/:id/notes` |
| Public forms | `LeadForm.tsx` → `POST /requests` | Anonymous + optional JWT `userId` |
| Buyer account | `Profile.tsx` → `GET /requests/me` | Auth-linked requests only |

## Gap

No persistent **thread/message** model. Notes live only in `request_events`. No buyer-visible history, callback ops layer, or agent inbox.

## Communication insertion map

```
LeadForm / API create
  └─► Request (existing)
  └─► RequestEvent CREATED (existing)
  └─► CrmThread bootstrap (NEW)
        └─► CrmMessage SYSTEM + initial TEXT
        └─► CrmThreadParticipant BUYER (token / userId)

Admin note / contact / callback
  └─► CrmMessage (NEW)
  └─► RequestEvent (existing, mirrored for NOTE/CONTACT/CALLBACK types)
  └─► CrmNotification via communication notify (NEW types)

Assignment change
  └─► RequestEvent ASSIGNED (existing)
  └─► CrmThreadParticipant AGENT sync (NEW)
```

## Invariants preserved

- CRM list/detail/SLA unchanged
- Moderation, listings, retention, geo, deploy untouched
- No WebSocket / realtime messenger
