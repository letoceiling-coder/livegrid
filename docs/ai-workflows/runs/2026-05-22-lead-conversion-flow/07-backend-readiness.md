# Iteration 30.7 — Backend + TG Readiness

## Mode

LEAD + CONTACT CONVERSION FLOW · backend audit · 2026-05-22

---

## Readiness matrix

| Capability | Status | Evidence |
|---|---|---|
| Public lead submission | **READY** | `POST /requests` |
| Request types (CONSULTATION, CALLBACK, MORTGAGE, etc.) | **READY** | CreateRequestDto |
| blockId / listingId linkage | **READY** | Prisma Request model |
| User attribution (JWT optional) | **READY** | `@OptionalJwtUser()` |
| User request history | **READY** | `GET /requests/me` |
| Admin request management | **READY** | `/admin/requests` |
| Telegram new-request notify | **READY** | `TelegramNotifyService.notifyNewRequest` |
| TG claim from notification | **READY** | Callback `rq\|{id}` |
| TG bot webhook | **READY** | `POST /telegram-bot/webhook` |
| Favorites API | **READY** | `/favorites/*` |
| Site settings (phone) | **READY** | `/content/settings` |
| Anti-spam / rate limit on /requests | **PARTIAL** | Not audited in depth |
| Per-object contact phone | **MISSING** | No API field wired |
| CRM two-way sync | **MISSING** | Out of scope |
| SMS verification | **MISSING** | Not required for MVP |

---

## TG architecture (existing)

```
POST /requests
  → RequestsService.create()
  → if telegram configured → notifyNewRequest()
  → Manager claims via inline button in TG chat
```

Frontend does NOT call TG directly — TG-ready via backend pipeline.

---

## Auth persistence

| Feature | Status |
|---|---|
| JWT access on form submit | **READY** (optional) |
| Guest → user request link | **PARTIAL** (only if JWT sent at submit time) |
| Guest favorites merge | **READY** |

---

## Explicit non-inventions

No fake endpoints, no mock success responses, no simulated CRM webhooks.
