# 07 — Admin Trust Center

## Route

`/admin/trust` — `AdminTrustPage.tsx`

## Tabs

| Tab | Endpoint |
|-----|----------|
| Флаги | `GET /admin/trust/flagged-listings` |
| Агенты | `GET /admin/trust/suspicious-agents` |
| Дубликаты | `GET /admin/trust/duplicate-clusters` |

## Actions

- `POST /admin/trust/scan` — bounded scan (admin/editor)
- `POST /admin/trust/agency/:userId/verify`
- `POST /admin/trust/agency/:userId/revoke`

## Workflow

Review flags → link to moderation review → manual action. No auto-enforcement.
