# 01 — Domain Audit

**Iteration:** 60 — Agency + Agent Public Ecosystem  
**Date:** 2026-05-24

## Ecosystem insertion map

| Existing | Ecosystem hook | Risk |
|----------|----------------|------|
| `User` + roles | Profile owner | Low |
| `AgencyVerification` (Iter 57) | Public verified badge | None — read-only |
| `AgentTrustScore` | Trusted agent badge | None |
| `Listing.ownerUserId` | Public listings on profile | Low — PUBLIC only |
| `BillingAccount.plan` | Theme/branding only | Trust decoupled |
| Trust badges (`deriveTrustBadges`) | Reused on agent pages | Low |
| Moderation | Profile status SUSPENDED | Independent |

## Gaps filled

- No public agency URL → `agency_profiles` + `/agency/:slug`
- No agent public page → `agent_profiles` + `/agent/:slug`
- No discovery rankings → bounded API (no fake ratings)

## Non-goals

- Social feed, reviews, messaging between users
- Star ratings
