# Iteration 30.1 — Conversion Flow Audit

## Mode

LEAD + CONTACT CONVERSION FLOW · audit · 2026-05-22

---

## Before (pre-Iter 30)

| Surface | Phone CTA | Consultation | Lead form | Favorites | Share |
|---|---|---|---|---|---|
| Apartment page | Toast placeholder | Scroll to #lead | Inline LeadForm ✓ | Auth + guest ✓ | shareCurrentPage ✓ |
| Complex hero | Inert button | Dialog + LeadForm | Inline #lead ✓ | Block favorite ✓ | ✓ |
| Complex sticky mobile | Scroll to #lead | — | — | — | — |
| Map listing popup | — | — | Link only | — | — |
| Map complex popup | — | — | Link only | — | — |
| Listing detail | Toast placeholders | Toast + inline form | LeadForm ✓ | ✓ | ✓ |
| Home help CTA | — | Inert button | ContactsSection | — | — |
| Chessboard preview | — | Link to apartment | — | — | — |
| Catalog cards | — | Link to complex | — | ✓ | — |

---

## Backend (existing — NOT invented)

| Endpoint | Status | Notes |
|---|---|---|
| `POST /requests` | **READY** | Public, optional JWT bind |
| `GET /requests/me` | **READY** | Authenticated user requests |
| Telegram notify on create | **READY** | Async if configured |
| `POST/DELETE /favorites/*` | **READY** | Block + listing |
| Guest favorites localStorage | **READY** | Merge on login |
| `GET /content/settings` | **READY** | `phone_main` for site phone |

---

## After (Iter 30)

| Surface | Phone | Consultation | Notes |
|---|---|---|---|
| All ConversionCTABar surfaces | Site `phone_main` or CALLBACK fallback | ConsultationFlow modal/sheet | Unified |
| Map popups | ✓ via MapPopupActions | ✓ | |
| Apartment / complex / listing | ✓ | ✓ | |
| Home help CTA | — | ✓ ConsultationFlow | |
| Inline LeadForm sections | Unchanged | Real POST /requests | |

---

## Gap matrix (remaining)

| Item | Severity | Status |
|---|---|---|
| Per-developer phone from listing API | Medium | **MISSING** — site phone only |
| Developer CRM telephony integration | Medium | **MISSING** |
| Catalog card inline CTA | Low | Cards link to detail/complex |
| Chessboard direct consultation | Low | Opens apartment page |
| Analytics vendor | N/A | DEV-only local metrics |

---

## Files touched

| File | Change |
|---|---|
| `conversion-cta.ts` | Unified labels + context type |
| `ConsultationFlow.tsx` | Reusable modal/sheet |
| `ConversionCTABar.tsx` | Phone + consultation buttons |
| `MapPopupActions.tsx` | Map popup CTAs |
| `usePhoneAction.ts` | Safe phone + fallback |
| `conversion-observability.ts` | DEV metrics |
| `LeadForm.tsx` | onSuccess + observability hooks |
