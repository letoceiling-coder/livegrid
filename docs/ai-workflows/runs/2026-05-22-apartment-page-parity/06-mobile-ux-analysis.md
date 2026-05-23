# Iteration 28.6 — Mobile UX Analysis

## Mode

APARTMENT PAGE PRODUCT PARITY · mobile · 2026-05-22

Target viewport: **360px** (iPhone SE class)

---

## Layout decisions

| Element | Mobile behavior |
|---|---|
| Breadcrumbs | Truncate JK name `max-w-[140px]` |
| Gallery | Full width, 4:3 aspect, swipe via arrows |
| Price | Full width card, no sidebar |
| Spec cards | 2-column grid |
| Object/location tables | Stack vertically (`md:grid-cols-2`) |
| Map | `min-h-[220px]`, `max 45vh` |
| Footer | `pb-24` to clear sticky CTA |

---

## Sticky CTA

```text
fixed bottom-0 lg:hidden
safe-area-pb
Позвонить | Заявка
```

- Disabled when sold
- «Заявка» scrolls to `#lead`
- Does not overlap footer content due to page padding

---

## Touch targets

- Gallery nav buttons: 44px effective (p-2 + icon)
- Tab buttons: full-width flex-1, py-2
- CTA buttons: h-11 (44px)

---

## Readability

- Body text: `text-sm leading-relaxed`
- Spec labels: `text-[11px]`
- Price: scales `text-3xl` on mobile, `text-4xl` sm+

---

## Reduced motion

- `prefersReducedMotion()` from `map-sidebar-scroll-utils`
- Anchor scroll: `behavior: 'auto'`
- Gallery dot indicators: `transition-none`

---

## Manual QA checklist

- [ ] 360px — no horizontal scroll
- [ ] Sticky CTA visible above safe area
- [ ] Gallery lightbox usable one-handed
- [ ] Long description wraps without overflow
- [ ] Mortgage block visible without scrolling past price
- [ ] Sold banner readable

---

## Known limitations

- Lightbox swipe gesture not implemented (arrow buttons only)
- Phone CTA shows toast, not dialer
