# Local Auth Recovery — Local DB Audit

## Connection

```
DATABASE_URL=postgresql://lg_admin:lg_dev_password@localhost:5432/lg_development
```

## Pre-Repair State

| Query | Result |
|---|---|
| `users` count | **1** |
| `dsc-23@yandex.ru` exact | **NOT FOUND** |
| `dsc-23@yandex.ru` ILIKE | **NOT FOUND** |

### Only user present

| Field | Value |
|---|---|
| email | `admin@livegrid.ru` |
| fullName | Администратор |
| role | admin |
| isActive | true |
| passwordHash | SET (from seed) |

## Expected vs Actual

| Expected | Actual |
|---|---|
| `dsc-23@yandex.ru` from prod snapshot | **Missing** — DB had seed-only admin |
| Password `123123123` | N/A — user did not exist |

## Conclusion

401 was caused by **missing user row**, not hash mismatch. Snapshot restore did not include the expected account (or DB was re-seeded with default seed only).

## Post-Repair State

After `pnpm db:auth-repair`:

| email | role | isActive | passwordHash |
|---|---|---|---|
| dsc-23@yandex.ru | admin | true | SET (bcrypt rounds=10) |
| admin@livegrid.ru | admin | true | SET (refreshed) |
