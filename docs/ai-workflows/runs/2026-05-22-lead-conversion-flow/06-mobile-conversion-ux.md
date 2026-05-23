# Iteration 30.6 — Mobile Conversion UX

## Mode

LEAD + CONTACT CONVERSION FLOW · mobile · 2026-05-22

Target: **360px**

---

## Sticky CTAs

| Page | Mobile sticky | Behavior |
|---|---|---|
| Apartment | ConversionCTABar fixed bottom | Phone + viewing |
| Complex | Consultation + PDF | Opens ConsultationFlow |
| Map popup | In-popup actions | Stack layout |

`safe-area-pb` on sticky bars and consultation sheet.

---

## Consultation sheet UX

- Bottom sheet `max-h-[90vh]` scrollable
- Form fields `h-11` touch targets
- Phone input `type="tel"` with +7 mask
- Keyboard: sheet scrolls with focused input (Radix default)
- Close: swipe down or close button

---

## Reduced motion

- ConsultationFlow dialog: animation disabled when `prefersReducedMotion()`
- Scroll-to-section on apartment/complex unchanged from prior iterations

---

## Touch targets

- CTA buttons: h-11 (44px)
- Map popup buttons: h-9 sm stack

---

## Manual QA checklist

- [ ] 360px apartment sticky CTA
- [ ] Open consultation sheet — keyboard doesn't hide submit
- [ ] Phone tap with configured phone_main → dialer opens
- [ ] Phone tap without phone → callback sheet + toast
- [ ] Form submit success closes sheet
- [ ] Network error shows message, no fake success
- [ ] Sold apartment — phone disabled

Test: `?conversion_debug=1` for metrics overlay.
