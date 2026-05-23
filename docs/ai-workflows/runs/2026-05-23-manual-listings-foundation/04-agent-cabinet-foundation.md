# Iter 44 — Phase 4: Agent Cabinet Foundation

## Route

`/admin/my-listings` — `AdminMyListings.tsx`

## Access

- Nav item «Мои объявления» for agent + manager roles
- Agents landing redirect: `/admin` → `/admin/my-listings`
- RBAC: `RequireAuth roles={['agent', 'manager', 'admin', 'editor']}`

## Tabs (visibility-scoped)

| Tab | Filter |
|-----|--------|
| Активные | `visibility=PUBLIC` |
| Черновики | `visibility=DRAFT` |
| Скрытые | `visibility=HIDDEN` |
| Архив | `visibility=ARCHIVED` |

Query: `data_source=MANUAL`, `admin_view=true`, `scope=owned`, paginated 20/page.

## Listing cards

- Photo (planUrl / photoUrl by kind)
- Title or address
- Price (formatPrice)
- Visibility badge
- Updated date + stale hint (30+ дн.)
- Min touch target 36–44px (mobile 360px safe)

## Actions (MANUAL owned)

| Action | Lifecycle |
|--------|-----------|
| Редактировать | Navigate to kind-specific manual edit path |
| Скрыть | `hide` (PUBLIC only) |
| Опубликовать | `publish` (DRAFT) or `republish` (HIDDEN/ARCHIVED) |
| Архив | `archive` (non-ARCHIVED) |

## Intentionally NOT built

- Kanban board
- Bulk operations
- In-cabinet media editor
- Full Avangard wizard (link to `/admin/listings/wizard/new` only)

## Performance

- 20 items/page — no 400+ hydration
- React Query cache key per tab+page
- Invalidates both `my-listings` and `listings` on lifecycle mutate
