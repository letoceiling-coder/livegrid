# Iteration 27.5 — Mobile UX Analysis

## Mode

360px production usability · 2026-05-22

---

## Layout decisions

| Element | Mobile behavior |
|---|---|
| Gallery | `aspect-[16/10]`, max-height 420px |
| Anchor nav | Horizontal scroll, sticky |
| Building pills | Wrap, min-width 140px |
| Chessboard | Horizontal scroll inside card |
| Lead form | Full width in `#lead` |
| Sticky CTA | Fixed bottom bar `lg:hidden` |
| Page padding bottom | `pb-24` clears CTA |

---

## Sticky CTA

Fixed bar:
- Primary: «Консультация» → scroll to `#lead`
- Secondary: PDF link

Does not overlap footer when scrolled to bottom (`pb-24` on main).

---

## Typography

- H1: `text-2xl` mobile → `text-3xl` sm+
- Section H2: `text-lg` → `text-xl`
- Meta: `text-xs` / `text-sm` hierarchy preserved

---

## Checklist (360px)

- [ ] Gallery swipe buttons reachable
- [ ] Anchor pills scroll horizontally
- [ ] Type group expand tap targets
- [ ] Chess horizontal scroll
- [ ] Bottom CTA not covering form submit
- [ ] Breadcrumb truncates gracefully

---

## Reduced motion

Anchor scroll + accordion animation disabled when `prefers-reduced-motion: reduce`.
