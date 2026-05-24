# 07 — Performance + Operational Safety

**Iteration:** 77 · **Date:** 2026-05-25

## Audit summary

| Area | Risk | Mitigation |
|------|------|------------|
| CRM request list polling | Low | Smart interval + tab visibility |
| Duplicate phone scan | Low | 48h window, take 40, indexed createdAt |
| Trust strip on catalog | Low | staleTime 120s, shared query keys |
| SelectionInquiryBar | None | Lazy ConsultationFlow dialog |
| Sticky CTA rerenders | Low | Memoized context objects |

## Duplicate scan cost

One extra `findMany` on request create — bounded (40 rows, 48h). Acceptable at current lead volume.

## Deploy safety

- No sitemap/feed file moves (iter 76 lesson)
- Web + API slice deploy; full `tsc` on API

## Conversion rerenders

Sticky bars mount once per page; no new global listeners.

## Production baseline

65,504 apartments · 480 ЖК — stable
