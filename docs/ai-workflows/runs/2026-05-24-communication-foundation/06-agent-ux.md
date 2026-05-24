# 06 — Agent UX

## Inbox page

`/admin/conversations` — `AdminConversationsPage.tsx`

Filters: all | pending | callbacks (query param)

## Rows show

- Client label (name/phone/subject)
- Thread type, last message preview
- Chips: Ждёт ответа, Callback, Застой
- Unread highlight (participant `lastReadAt` vs last message)
- Link to `/admin/requests/:id`

## API

`GET /admin/crm/communication/conversations?filter=`

Roles: admin, editor, manager, **agent**

## Nav

Admin sidebar **Переписки** (MessageSquare icon)

## Not built (deferred)

- Realtime push / typing indicators
- Mobile native app
- Bulk mark-read across inbox
