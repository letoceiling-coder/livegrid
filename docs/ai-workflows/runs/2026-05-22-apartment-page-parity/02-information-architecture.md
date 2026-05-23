# Iteration 28.2 — Information Architecture

## Mode

APARTMENT PAGE PRODUCT PARITY · IA · 2026-05-22

---

## Target sequential structure (FINAL_TZ)

```
1. Gallery / plans        → #gallery   (ApartmentMediaGallery)
2. Header meta            → (inside #price block)
3. Price + mortgage       → #price     (ApartmentPriceTrust)
4. Main CTA               → #cta
5. Characteristics        → #characteristics
6. Floor/building context → #building-context
7. Layout / plans         → (gallery plan tab — no duplicate)
8. Description            → #description
9. Infrastructure / map   → #map
10. Similar apartments    → #similar
11. Contact / lead        → #lead
```

---

## Navigation

- **ComplexAnchorNav** reused from Iter 27
- Scroll-spy via `IntersectionObserver` (`rootMargin: -20% 0 -55% 0`)
- Sections in nav: Медиа · Цена · Характеристики · [Описание] · Карта · [Похожие] · Заявка
- `prefersReducedMotion()` → instant scroll jumps

---

## Tabs policy

| Allowed | Forbidden |
|---|---|
| Media switching (plan / photos / finishing) | Hiding price, specs, or lead behind tabs |
| Lightbox overlay | Accordion-only critical info |

---

## Breadcrumbs

`Главная / Каталог / {ЖК} / {комнатность}, {площадь}`

Header icon row: favorite · compare · presentation · share

---

## Sold / reserved flow

- Banner above gallery when `status !== available`
- Sold: CTAs disabled; lead form accepts consultation on similar
- Reserved: lead CTA remains active with copy adjustment

---

## Data sources (unchanged)

- API: `GET /listings/:id` → `mapListingDetailToApartmentPage`
- Similar: `GET /listings?block_id=&kind=APARTMENT&status=ACTIVE`
- Mock fallback: `getApartmentById` for non-numeric slugs
- Redirect: non-APARTMENT or no block → `/listing/:id`

---

## Mobile layout

- Single column throughout
- Fixed bottom CTA bar (`lg:hidden`, `safe-area-pb`)
- Gallery aspect `4/3` → `16/10` on sm+
- No sidebar column
