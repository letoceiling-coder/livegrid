# Local Auth Recovery — Password Verification

## Method

Same as backend: `bcrypt.compare(plain, passwordHash)` via `@prisma/client` + `bcrypt`.

## Target Credentials

| Field | Value |
|---|---|
| email | dsc-23@yandex.ru |
| password | 123123123 |

## Pre-Repair

| Check | Result |
|---|---|
| User exists | ✗ |
| Hash compare | N/A |

## Post-Repair (`local-auth-repair.mjs`)

```
✓ dsc-23@yandex.ru (admin) verify=true
✓ admin@livegrid.ru (admin) verify=true
```

Repair script hashes with **bcrypt rounds=10** (matches `AuthService.register` / login compare path).

## Live API Verification

```bash
curl -X POST http://127.0.0.1:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"dsc-23@yandex.ru","password":"123123123"}'
```

**Result:** 200 — `accessToken` + `refreshToken` issued.

`/auth/me` with token:

```json
{
  "email": "dsc-23@yandex.ru",
  "fullName": "Джон Уик",
  "role": "admin",
  "isActive": true
}
```

## Wrong Password

```bash
# password: wrongpass (≥6 chars)
→ 401 (same message as missing user — no leak)
```
