# 09 — Concurrency Safety

## Version field

`listings.draft_version` — incremented on each server save.

## Client behavior

- Sends `expectedVersion` on PUT/submit
- On 409: show conflict warning, update local version
- No automatic merge (by design)

## Multi-tab

Last writer wins with version gate — stale tab gets conflict on save.

## Multi-device

Server snapshot wins on hydration unless local is newer + dirty (merge helper).

## Not implemented

- Editing locks
- CRDT / operational transform
- Real-time sync
