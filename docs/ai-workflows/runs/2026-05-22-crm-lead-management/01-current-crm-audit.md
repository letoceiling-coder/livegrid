# Iter 31 — Current CRM Audit

## Mode

POST-CONVERSION PRODUCT WORKFLOW — Phase 1 audit  
**Scope:** CRM + lead management only (no map/geo/viewport)

---

## Executive Summary

LiveGrid had **lead capture** (conversion forms, TG notify) but **weak post-conversion workflow**. Iter 31 closes the largest product gap with a minimal, additive CRM layer on the existing NestJS + Prisma stack.

---

## Baseline (pre-Iter 31)

| Area | State | Gap |
|---|---|---|
| `Request` model | 4 statuses (`NEW`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `assignedTo`, `telegramSent` | No pipeline stages, no timeline |
| Admin list | `AdminRequests.tsx` — table + kanban, bulk assign | Old 4-status model, no search, no detail route |
| Admin detail | None | No lead context page |
| API roles | `@Roles('manager')` only on admin requests | Editors/admins blocked despite UI nav |
| TG claim | `telegram-notify.service.ts` sets `assignedTo` + `IN_PROGRESS` | No audit trail in admin |
| Filtering | status + assignee | No text search, no `lastActivity` |
| Notifications | TG outbound only | No in-app manager notifications |

---

## Post-Iter 31 Inventory

### Data model (`packages/database/prisma/schema.prisma`)

- **RequestStatus:** `NEW`, `IN_PROGRESS`, `CONTACTED`, `VIEWING_SCHEDULED`, `NEGOTIATION`, `SUCCESS`, `CLOSED`, `SPAM` + legacy `COMPLETED`, `CANCELLED`
- **RequestEvent** append-only timeline (`request_events`)
- Indexes: `(status, createdAt)`, `(assignedTo, status)`, `(requestId, createdAt)`

Migration: `20260523120000_crm_request_lifecycle/migration.sql`

### API (`apps/api/src/modules/requests/`)

| Endpoint | Roles | Notes |
|---|---|---|
| `GET /admin/requests` | admin, editor, manager | + `search` query |
| `GET /admin/requests/:id` | admin, editor, manager | Includes events + block/listing enrichment |
| `PUT /admin/requests/:id` | admin, editor, manager | Status transitions enforced |
| `POST /admin/requests/:id/notes` | admin, editor, manager | Appends `NOTE_ADDED` event |
| `GET /admin/requests/assignees` | admin, editor, manager | manager/agent/editor/admin |
| `POST /requests` | public | Creates lead + `CREATED` event |
| TG webhook | public | Claim → assign + events |

### Frontend (`apps/web/src/admin/`)

| File | Purpose |
|---|---|
| `lib/request-crm.ts` | Labels, colors, transition hints, helpers |
| `lib/crm-observability.ts` | DEV metrics (`?crm_debug=1`) |
| `components/CrmDebugOverlay.tsx` | DEV overlay |
| `pages/AdminRequests.tsx` | List: search, sticky filters, mobile cards, desktop table |
| `pages/AdminRequestDetail.tsx` | Full lead detail + timeline + TG block |

Route: `/admin/requests/:id`

---

## CRM Gap Matrix

| Requirement | Status | Notes |
|---|---|---|
| Lead statuses (8 + legacy) | ✓ DONE | Backend enforced transitions |
| Manager assignment | ✓ DONE | Admin UI + TG claim parity |
| Request visibility (list) | ✓ DONE | Filters, search, pagination |
| Request detail UX | ✓ DONE | Client, object, source, actions |
| TG workflow visibility | ◐ PARTIAL | Uses `telegramSent`, `assignedTo`, timeline — no `tgDeliveryStatus` column |
| Timeline/history | ✓ DONE | `RequestEvent` model |
| Lead filtering | ✓ DONE | Status chips, assignee, search |
| Mobile manager UX | ✓ DONE | Card layout `< md`, sticky filters |
| lastActivity column | ✗ GAP | Not computed; use `updatedAt` or latest event in follow-up |
| Kanban pipeline view | ✗ REMOVED | List-first CRM; kanban dropped in refactor (acceptable) |
| Bulk assign | ✗ GAP | Removed with list refactor; restore if ops need it |
| In-app notifications | ✗ GAP | Out of scope |
| Agent role CRM access | ✗ BY DESIGN | Agents see listings, not requests queue |
| Realtime updates | ✗ BY DESIGN | Manual refresh / invalidate on mutation |

---

## Auth Roles (current)

| Role | Admin nav "Заявки" | API `/admin/requests/*` |
|---|---|---|
| admin | ✓ | ✓ |
| editor | ✓ | ✓ |
| manager | ✓ | ✓ |
| agent | ✗ | ✗ |
| client / user | ✗ | ✗ |

Hierarchy guard: `userLevel >= minRequired` (`roles.guard.ts`).

---

## Verification

| Check | Result |
|---|---|
| `pnpm --filter web exec tsc --noEmit` | ✓ PASS |
| `pnpm --filter api exec tsc --noEmit` | ✓ PASS (test files excluded from main tsconfig) |
| DB migration applied | **PENDING** — run `migrate:deploy` before prod |
| Manual QA checklist | **PENDING** — see `08-final-verdict.md` |
