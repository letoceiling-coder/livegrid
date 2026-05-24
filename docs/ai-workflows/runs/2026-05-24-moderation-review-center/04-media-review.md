# 04 — Media Review

Component: `MediaDiffGrid.tsx`

## Detected changes

| Signal | Logic |
|--------|-------|
| Main photo changed | `mainPhotoUrl` compare |
| Plan changed | `planUrl` compare |
| Added photos | URLs in pending gallery not in live set |
| Removed photos | URLs in live gallery not in pending set |
| Reordered | Same multiset, different order |
| Gallery diff | Side-by-side thumbnails with labels |

## Safe restore on reject (live + pending revision)

API resets snapshot payload to **live** payload and clears `isPendingRevision`.  
Live media URLs on the public listing are never deleted.

## UI

- Amber border on «Стало» images
- Removed photos shown with strikethrough marker section
- Reorder warning badge when detected
