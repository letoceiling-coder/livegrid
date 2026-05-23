# Local Auth Recovery — Safe Local Fix

## Command

```bash
pnpm db:auth-repair
```

Runs: `apps/api/scripts/local-auth-repair.mjs`

## Safety Guards

| Guard | Behavior |
|---|---|
| `NODE_ENV === 'production'` | **exit 1** — refuses to run |
| Upsert only | no truncate, no schema change |
| Local users list | explicit allowlist |

## Users Restored

| email | password | fullName | role |
|---|---|---|---|
| dsc-23@yandex.ru | 123123123 | Джон Уик | admin |
| admin@livegrid.ru | admin123! | Администратор | admin |

## Snapshot Integrity

- Does **not** modify blocks, requests, CRM snapshots, or other tables
- Only `users` upsert for listed emails
- Idempotent — safe to re-run

## When to Use

- After prod-like snapshot restore missing dev accounts
- After `db:seed` overwrote expected local users
- When login 401 persists after confirming user missing

## Not Used

- Production deploy
- Production DB
- JWT secret rotation
- Guard/RBAC changes
