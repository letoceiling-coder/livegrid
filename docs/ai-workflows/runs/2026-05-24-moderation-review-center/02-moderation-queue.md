# 02 — Moderation Queue

**Route:** `/admin/moderation/listings`  
**Nav:** Admin sidebar «Модерация» (admin, editor, manager)

## Tabs

| Tab | API `tab` | Filter logic |
|-----|-----------|--------------|
| На модерации | `REVIEW` | `visibility=REVIEW` |
| Отклонённые | `REJECTED` | `visibility=REJECTED` |
| Правки опублик. | `PENDING_REVISION` | PUBLIC/HIDDEN + `isPendingRevision` |
| Недавно одобрено | `RECENTLY_APPROVED` | approve history 14d + PUBLIC |

## Filters

- **Search** (`q`) — ID, title, address (case-insensitive)
- **Region** (`region_id`) — from `/regions`
- **Agent** (`owner_user_id`) — from `/admin/listings/agents`
- **Stale only** (`stale_only`) — REVIEW tab, `lastActivityAt` > 48h

## Queue row signals

- Visibility badge
- «правки» badge when `isPendingRevision`
- «stale» warning when REVIEW > 48h
- `moderationNote` preview (reject reason)
- Price, region, agent

## Pagination

Standard `page` / `per_page` (max 100).
