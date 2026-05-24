# 07 — Public UX Validation

**Iteration:** 69 · **Date:** 2026-05-24

## Client-facing surfaces audited

| Page | AI concepts | Contact model |
|------|-------------|---------------|
| `/` homepage | None | Lead forms → CRM |
| `/catalog` | None | — |
| `/complex/:slug` | None | LeadForm / CTA |
| `/apartment/:id` | None | LeadForm / agency CTA |
| `/listing/:id` | None | **publicContact** agent or agency |
| `/agent/:slug` | None | Human realtor profile + phone |
| `/agency/:slug` | None | Agency team links to human agents |
| `/favorites`, `/map` | None | — |
| Account area | None | User profile |

## Feed listings (public)

- Contact card: **«Контакт агентства»**
- Phone from builder/seller feed data
- No personal employee unless manual override path

## Manual listings (public)

- Contact card: **«Ответственный агент»**
- Avatar, name, phone from `ownerUser`
- Email gated to authenticated viewers (`showEmail`)

## Ecosystem public pages

- `/agent/:slug` — employee landing (listings, bio, trust badges)
- Clear human identity (name, photo, agency affiliation)
- Route segment `agent` = realtor URL convention (industry standard)

## SEO / JSON-LD

- Breadcrumb label for `/agent/*` → «Агент» (human page)
- No AI or assistant schema types

## Client never sees

- Role names in admin sense
- “Intelligence” product branding
- ChatGPT, LLM, assistant wording

## Verdict

Public UX is **free of AI contamination**. Contact semantics match business rules (agency vs employee).
