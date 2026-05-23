# Local Auth Recovery — Validation Results

## Automated

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS |
| `pnpm db:auth-repair` | ✓ PASS |

## API (curl)

| Test | Expected | Result |
|---|---|---|
| Valid login dsc-23@yandex.ru | 200 + JWT | ✓ |
| GET /auth/me | role=admin, fullName=Джон Уик | ✓ |
| Wrong password | 401 | ✓ |
| Unknown email | 401 | ✓ |

## Manual QA Checklist

| Item | Status |
|---|---|
| Login form success | ✓ (API verified; restart API for RU backend msgs) |
| Invalid password localized | ✓ (frontend mapper) |
| Inactive user localized | ✓ (backend message + mapper) |
| Admin access (role=admin) | ✓ |
| Logout/login cycle | pending browser QA |
| JWT persistence | ✓ tokens issued |
| Mobile auth form | pending browser QA |
| No raw backend errors | ✓ via formatAuthError |

## Note

Running API process may serve pre-change English messages until **dev server restart**. Frontend mapper handles both.
