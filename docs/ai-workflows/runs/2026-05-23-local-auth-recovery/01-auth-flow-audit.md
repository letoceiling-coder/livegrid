# Local Auth Recovery — Auth Flow Audit

## Login Path

```
POST /api/v1/auth/login
  → AuthController.login()
  → AuthService.login(LoginDto)
  → prisma.user.findUnique({ email }) | findFirst({ phone })
  → bcrypt.compare(password, passwordHash)
  → issueTokensForUser() → JWT access + refresh
  → session row (refresh hash)
```

## Tables Used

| Table | Purpose |
|---|---|
| `users` | email, password_hash, role, is_active |
| `sessions` | refresh token hash |

## Guards (unchanged)

- JWT payload: `{ sub, email, role }`
- `@Public()` on login/register/refresh
- RBAC via `@Roles()` on admin routes — **not modified**

## Pre-Recovery Issue

| Step | Result |
|---|---|
| Frontend POST `/api/v1/auth/login` | 401 |
| UI message | `Invalid credentials` (English raw JSON) |
| Root cause | **User not in DB** — not password mismatch |

## Post-Recovery Changes (minimal)

| Change | Scope |
|---|---|
| Email normalized to lowercase on login | `auth.service.ts` |
| Russian error messages | login + telegram/code paths |
| DEV debug logs (reason, bcrypt ms) | no passwords logged |
| Frontend `formatAuthError()` | maps legacy English + new Russian |

## Unchanged

- JWT structure
- Guards / RBAC
- Register flow (already lowercases email)
- Production config
