# Iter 31 — Request Detail Page

## Mode

Phase 4 — full lead context

---

## Implementation

**File:** `apps/web/src/admin/pages/AdminRequestDetail.tsx`  
**Route:** `/admin/requests/:id`  
**API:** `GET /admin/requests/:id`

---

## Sections

### 1. Header

- Back link to list
- Request id, status badge, created/updated timestamps

### 2. Contact actions

- **Позвонить** — primary CTA, `tel:` href
- **Объект** — link to `/listing/:id` when `listingId` set
- **ЖК** — link to `/complex/:slug` when block resolved

### 3. Client info

Name, phone, request type, original form comment.

### 4. Object + source

- Object label from enriched `block` / `listing` (API joins)
- Source URL truncated with title tooltip

### 5. Status + assignment

- Manager `<select>` — assign / unassign (`assignedTo`)
- Status `<select>` — current + `allowedNextStatuses()` only
- Errors surface API transition violations

Mutations: `PUT /admin/requests/:id`

### 6. Telegram block

Shown when TG state derivable from real fields:

| Field | Source |
|---|---|
| notified | `telegramSent` |
| claimed | `assignedTo != null` |
| claimedBy | `assignedUser.fullName/email` |
| claimedAt | latest `ASSIGNED` event `createdAt` |
| via TG | `ASSIGNED` event note contains "Telegram" |

**No fake fields** — `tgDeliveryStatus` not shown (column does not exist).

### 7. Notes

Textarea + send → `POST /admin/requests/:id/notes`  
Appends `NOTE_ADDED` to timeline.

### 8. Timeline / history

Reverse-chronological list from `events[]`:

- CREATED, ASSIGNED, STATUS_CHANGED, NOTE_ADDED, CONTACTED, VIEWING_SCHEDULED
- Human-readable status arrows for STATUS_CHANGED
- Actor name + timestamp per event

---

## Sold apartment lead

When `listing.status === 'sold'` (or similar), detail still renders — manager can close as CLOSED/SPAM. No special sold-banner in v1 (follow-up if needed).

---

## Mobile layout

Single column stack, `pb-24` for bottom safe area, touch-friendly selects (`h-10`).

Long timeline scrolls naturally; no virtualisation (acceptable for ≤100 events).

---

## DEV Observability

`crmObsDetailFetch`, `crmObsStatusUpdate` + `CrmDebugOverlay`.
