# 04 — Request Linkage

## Per-request fields

- `communicationThread` — 1:1 via `crm_threads.request_id`
- `interactionCount` — denormalized counter incremented on each message
- `lastActivityAt` — updated on message append (existing SLA input)

## API linkage

| Endpoint | Purpose |
|----------|---------|
| `GET /admin/requests/:id/communication` | Thread + filtered messages |
| `POST /admin/requests/:id/communication/messages` | Append note/text |
| `POST /admin/requests/:id/communication/contact` | Contact attempt |
| `POST /admin/requests/:id/communication/callback` | Schedule callback |

## Entity links on thread

- `listingId`, `blockId` copied from request at bootstrap
- `buyerUserId` from JWT on create when present

## Backward compatibility

Existing `POST /admin/requests/:id/notes` still writes `RequestEvent` **and** mirrors to `CrmMessage` NOTE (syncTimeline: false on mirror to avoid duplicate events).
