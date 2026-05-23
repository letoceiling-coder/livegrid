# Iter 31 — Security + Governance

## Mode

Phase 10 — role checks, mutation permissions, visibility matrix

---

## Role Hierarchy (API)

`apps/api/src/auth/guards/roles.guard.ts`:

```
admin: 100
editor: 80
manager: 60
agent: 40
client: 20
```

Access granted when `userLevel >= min(requiredRoles)`.

---

## Permission Matrix

| Action | ADMIN | EDITOR | MANAGER | AGENT | USER |
|---|---|---|---|---|---|
| View admin requests list | ✓ | ✓ | ✓ | ✗ | ✗ |
| View request detail | ✓ | ✓ | ✓ | ✗ | ✗ |
| Change status | ✓ | ✓ | ✓ | ✗ | ✗ |
| Assign / reassign | ✓ | ✓ | ✓ | ✗ | ✗ |
| Add notes | ✓ | ✓ | ✓ | ✗ | ✗ |
| Create lead (public form) | ✓ | ✓ | ✓ | ✓ | ✓ |
| View own leads (`GET /requests/me`) | ✓ | ✓ | ✓ | ✓ | ✓ |
| TG claim (via linked TG account) | ✓ | ✓ | ✓ | ✓* | ✗ |
| TG notify admin (`/admin/telegram-notify`) | ✓ | ✗ | ✗ | ✗ | ✗ |
| User management | ✓ | ✗ | ✗ | ✗ | ✗ |

\* Agent can claim via TG if Telegram linked, but **cannot** access admin CRM UI.

---

## Frontend Guards

`App.tsx`:

```tsx
<RequireAuth roles={['admin', 'editor', 'manager']}>
  <AdminRequests /> / <AdminRequestDetail />
</RequireAuth>
```

`AdminLayout` nav item "Заявки" — same role set.

**Alignment fix (Iter 31):** API expanded from `manager`-only to `admin, editor, manager` to match frontend.

---

## Mutation Safety

| Mutation | Validation |
|---|---|
| Status change | `assertStatusTransition()` → 400 on invalid |
| Assign | UUID format via DTO; FK enforced by Prisma |
| Notes | Non-empty trim; 400 if blank |
| Public create | DTO validation; rate limit via existing infra |

No hidden admin bypass endpoints added.

---

## Ownership / Visibility

- **All CRM roles see all requests** — no manager-scoped filter by default
- **No row-level "only my leads"** — filter by assignee is manual
- **TG claim** prevents double-claim if already assigned to different user

---

## Data Exposure

Detail endpoint returns:

- Client PII (name, phone, email) — staff only
- Block/listing metadata — non-sensitive
- Event timeline with actor names

Public `POST /requests` does not expose admin fields.

---

## Recommendations (not blockers)

1. Add optional `?assigned_to=me` for manager default view
2. Restrict editors from SPAM/CLOSED if compliance requires
3. Audit log integration with existing `AuditAction` for CRM mutations (currently event table only)

---

## Threat Model Notes

- Invalid status transitions: blocked server-side ✓
- Agent escalating to admin CRM: blocked by roles ✓
- Unauthenticated admin mutations: JWT + RolesGuard ✓
- IDOR on request detail: any authenticated CRM role can read any id — acceptable internal tool; tighten if external managers onboarded
