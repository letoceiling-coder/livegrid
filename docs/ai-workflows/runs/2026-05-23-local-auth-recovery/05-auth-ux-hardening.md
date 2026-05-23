# Local Auth Recovery — Auth UX Hardening

## Problem

Login showed raw backend JSON: `Invalid credentials` (English).

## Solution

### Backend (`auth.service.ts`)

| Old | New |
|---|---|
| Invalid credentials | Неверный email или пароль |
| Account is disabled | Аккаунт деактивирован |

Same message for missing user and wrong password — **no security leak**.

### Frontend (`apps/web/src/lib/auth-errors.ts`)

`formatAuthError()` maps:

- Legacy English keys (backward compat until API restart)
- New Russian backend messages (pass-through)
- HTTP status fallbacks

Used in:

- `Login.tsx` — form + telegram code request
- `Register.tsx` — registration errors

## Example UX

| Scenario | User sees |
|---|---|
| Wrong password | Неверный email или пароль |
| Unknown email | Неверный email или пароль |
| Inactive account | Аккаунт деактивирован |
| Validation (short password) | Backend validation text (Russian where available) |

## Additional Fix

Login email normalized to **lowercase** server-side — consistent with register path.
