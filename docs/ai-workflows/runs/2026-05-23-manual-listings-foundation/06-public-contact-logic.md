# Iter 44 — Phase 6: Public Contact Logic

## Implementation

`@lg/shared` → `resolveListingPublicContact()`  
API → `ListingsGovernanceService.enrichPublicContact()` on `findOne`  
Web → `RedesignListingDetail.tsx` agent/agency card before LeadForm

## Rules

### FEED listings

```typescript
kind: 'agency'
label: builder.name || 'Агентство'
phone: seller.phone (builder has no phone in schema)
email: only when authenticated
```

- No personal agent leakage
- Seller email stripped for anonymous users

### MANUAL listings (with ownerUser)

```typescript
kind: 'agent'
userId, fullName, phone, avatarUrl
email: only when authenticated
```

- Responsible agent card with tel: CTA
- Avatar initial fallback

### Anonymous vs authorized

| Field | Anonymous | Authorized (JWT on findOne) |
|-------|-----------|----------------------------|
| Phone | ✓ | ✓ |
| Email | ✗ | ✓ (if present) |
| Agent name | ✓ | ✓ |

**Endpoint:** `GET /listings/:id` accepts optional JWT via `@OptionalAuth()` for richer contact.

## Truth safety

- Contact derived from listing row at read time — no client-side guessing
- MANUAL without ownerUser falls back to agency path (seller/builder name)
- LeadForm remains separate conversion path (unchanged)

## Verification checklist

- [ ] FEED listing shows agency label, no agent UUID
- [ ] MANUAL with owner shows agent card + phone
- [ ] Anonymous: no email in DOM
- [ ] Logged-in user: email visible when present
