# 08 — Ops + Moderation

## Admin UI

`/admin/ecosystem` — publish/suspend profiles, branding review count

## API

- `GET /admin/ecosystem/profiles`
- `POST /admin/ecosystem/agencies/:id/status`
- `POST /admin/ecosystem/agents/:id/status`
- `POST /admin/ecosystem/agencies/:id/branding`

## Account self-service

- `PATCH /account/ecosystem/agency` (manager+)
- `PATCH /account/ecosystem/agent` (agent+)

Profiles start DRAFT until admin publishes.
