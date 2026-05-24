# 06 — Media System

## Wizard UX (`ListingWizardMediaStep`)

- Drag & drop zone → `POST /admin/media/upload`
- Gallery grid with remove + drag reorder
- Mediateka picker via existing `MediaPickerDialog`
- Main photo + plan (apartment/room) slots

## Validation (client)

| Rule | Value |
|------|-------|
| Max gallery | 24 |
| Max file size | 15 MB |
| MIME | jpeg, png, webp, gif |

## RBAC fix

`media-admin.controller.ts`:

- `GET folders`, `GET files`, `POST upload` → `@Roles('editor', 'agent', 'manager')`

Agents can upload during wizard without editor role.

## Storage model

URLs stored on kind tables (`photoUrl`, `extraPhotoUrls`, etc.) — unchanged.
