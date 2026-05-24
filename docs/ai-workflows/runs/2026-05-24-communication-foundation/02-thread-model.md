# 02 — Thread Model

## Tables

- `crm_threads` — one thread per request (`request_id` unique)
- `crm_thread_participants` — BUYER (token/user), AGENT (assignee)
- `crm_messages` — all communication payloads

## Thread types (`CrmThreadType`)

| Type | When |
|------|------|
| `LISTING_INQUIRY` | `request.listingId` set |
| `COMPLEX_INQUIRY` | `request.blockId` set (no listing) |
| `SUPPORT` | General consultation |
| `INTERNAL` | Reserved for manual internal threads |

## Participants

| Role | Key |
|------|-----|
| BUYER | `buyer_token` and/or `buyer_user_id` |
| AGENT | `user_id` of assignee |
| MANAGER | Via staff `user_id` + mention routing |
| SYSTEM | Bootstrap messages |

## Bootstrap

On `POST /requests`, `RequestsService.create` generates `buyerToken` and async-bootstraps thread with SYSTEM + optional initial TEXT from comment.

Legacy requests: `ensureThreadForRequest()` on first admin communication fetch.

## Migration

`20260524400000_crm_communication` — additive enums + tables + `requests.interaction_count`
