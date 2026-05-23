# Iter 44 — Phase 2: Ownership Contract

## Canonical rules

### FEED listings

```
dataSource = FEED
ownerUserId = null (immutable)
external_id = feed key (no manual- prefix)
```

- No agent owner
- Agency contact only on public pages
- Admin/editor may change status/publish only
- Lifecycle endpoints reject FEED rows

### MANUAL listings

```
dataSource = MANUAL
ownerUserId = agent UUID (nullable for admin-created legacy)
external_id = manual-{ownerUuid}-{suffix}
```

- Owned by agent or assignable to agent/manager
- Editable by: owner agent, admin, editor, manager
- Visible in agent cabinet when scope matches
- Lifecycle + assign endpoints apply

## Enforcement layers

| Layer | Mechanism |
|-------|-----------|
| DB | `owner_user_id` FK → `users.id` ON DELETE SET NULL |
| Legacy | `external_id` prefix `manual-{uuid}-` backfilled + kept in sync on assign |
| API create | `ListingsGovernanceService.manualCreateFields()` sets owner for agent role |
| API mutate | `assertAgentCanManage()` checks ownerUserId OR external_id prefix |
| API list | `applyOwnershipScope()` restricts agents to owned MANUAL unless `scope=all` |
| API assign | `@Roles('manager')` — manager/editor/admin only |

## Agent restrictions

- Agents **ONLY** see/edit own MANUAL listings (unless elevated role)
- Agents use **transfer** (peer handoff); managers use **assign** (governance)
- Feed listings: read-only for agents in admin table

## Backfill strategy (migration)

```sql
-- owner from external_id
UPDATE listings SET owner_user_id = regexp_match(external_id, '^manual-([0-9a-f-]{36})-')[1]::uuid
WHERE data_source = 'MANUAL' AND external_id ~ '^manual-[0-9a-f-]{36}-';

-- visibility from status + is_published
DRAFT → DRAFT | INACTIVE/SOLD → ARCHIVED | unpublished ACTIVE → HIDDEN | else PUBLIC
```

**Non-destructive:** additive columns only, no row deletion.

## Rollback notes

- Drop FK + indexes + columns if reverting (requires down migration)
- `external_id` prefix remains authoritative fallback if `owner_user_id` nulled
- Public catalog unaffected: still gates on `visibility=PUBLIC` + `isPublished`

## Ownership mismatch detection

`parseOwnerFromExternalId(external_id) !== ownerUserId` counted in observability endpoint for data hygiene.
