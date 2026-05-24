# 08 — Media Persistence

## Storage

Media URLs in wizard `payload`:

- `mainPhotoUrl`
- `extraPhotoUrls[]` (order preserved)
- `planUrl` (apartment/room)

## Autosave

Full array written to snapshot on each save — order preserved.

## Live edit safety

Pending revision keeps public photos unchanged until publish/approve.

## Orphan uploads

Deferred: no garbage collection job in Iter 50. Mediateka files remain until manual cleanup.

## Validation

Existing DTO limits: max 24 gallery URLs, 2048 char URL length.
