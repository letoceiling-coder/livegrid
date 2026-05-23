# Iteration 30.4 — Phone + Contact Analysis

## Mode

LEAD + CONTACT CONVERSION FLOW · telephony · 2026-05-22

---

## Phone sources audited

| Source | Availability | Used |
|---|---|---|
| CMS `phone_main` via `/content/settings` | **READY** when configured | ✓ `useSitePhone` |
| RedesignHeader / Footer | Same setting | ✓ existing |
| Per-listing developer phone | **MISSING** in API | Not used |
| Per-block agent phone | **MISSING** in API | Not used |
| Hidden/masked telephony | **MISSING** | N/A |

---

## Phone CTA behavior (`usePhoneAction`)

```
Click «Позвонить»
  ├─ phone_main configured → window.location.href = tel:+7...
  └─ no phone → open CALLBACK ConsultationFlow + toast
                 «Телефон временно недоступен. Оставьте заявку — мы перезвоним.»
```

**Never:**
- Fake `tel:` links
- Random placeholder numbers
- Silent no-op

---

## Sold / archived handling

- Sold apartment: phone button **disabled**
- Archived listing: follows listing status (SOLD disables phone in ConversionCTABar via `sold` flag)

---

## Alternative when no telephony

1. CALLBACK consultation modal (preferred)
2. Inline lead form on page (always available)
3. Contacts page with site phone (when configured)

---

## Future backend needs (documented, not faked)

| API gap | Priority |
|---|---|
| `listing.contactPhone` or `block.salesPhone` | High |
| Click-to-call tracking webhook | Low |
| Call center hours in settings | Medium |
