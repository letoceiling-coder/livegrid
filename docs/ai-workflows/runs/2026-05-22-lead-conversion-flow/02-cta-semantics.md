# Iteration 30.2 — CTA Semantics

## Mode

LEAD + CONTACT CONVERSION FLOW · CTA unification · 2026-05-22

Source: `apps/web/src/redesign/lib/conversion-cta.ts`

---

## Unified labels

| Key | Label | Icon |
|---|---|---|
| consultation | Получить консультацию | MessageCircle |
| price | Узнать цену | Tag |
| phone | Позвонить | Phone |
| callback | Обратный звонок | Phone |
| save | Сохранить | Heart |
| share | Поделиться | Share2 |
| mortgage | Ипотека | Calculator |
| viewing | Записаться на просмотр | MessageCircle |
| details | Подробнее | MessageCircle |
| submit | Отправить заявку | — |
| submitting | Отправка… | — |

---

## Surface-specific usage

| Surface | Primary CTA | Secondary CTA |
|---|---|---|
| Apartment | Позвонить | Записаться на просмотр |
| Complex hero | Позвонить | Записаться на просмотр |
| Complex sticky (mobile) | Получить консультацию | PDF |
| Map listing popup | Позвонить + консультация | Подробнее |
| Map complex popup | Позвонить + консультация | Подробнее |
| Listing detail | Позвонить | Записаться на просмотр |
| Home help | Получить консультацию | — |
| Sold apartment | Phone disabled | Получить консультацию |

---

## Disabled behavior

- **Sold:** phone button disabled; consultation opens with sold context
- **Loading form:** submit shows «Отправка…», button disabled
- **No phone:** phone button active — triggers CALLBACK consultation fallback

---

## Component API

`ConversionCTABar`:
- `context: ConsultationContext` — auto-fills LeadForm
- `onConsultation(ctx)` — opens ConsultationFlow
- `consultationLabel?` — override secondary label
- `showPhone?` — default true
- `layout: 'row' | 'stack'`
- `size: 'default' | 'sm'`
