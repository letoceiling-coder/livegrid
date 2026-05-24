# 03 — Content Landing Operations

**Iteration:** 78 · **Date:** 2026-05-25

## CMS group: `seo_landings`

| Key | Purpose |
|-----|---------|
| `seo_landing_district_intro` | Template for district landings |
| `seo_landing_subway_intro` | Template for metro landings |
| `seo_landing_region_intro` | Template for region catalog |
| `seo_landing_faq_json` | FAQ array `{q,a}` |
| `seo_landing_district_{slug}` | Per-district override |
| `seo_landing_subway_{slug}` | Per-metro override |
| `seo_landing_region_{id}` | Per-region override |

## Governance rules

- **CMS-managed only** — bootstrapped defaults on API start, editable in admin site settings.
- **No AI-generated content** — templates use `{district}`, `{subway}`, `{region}`, `{regionSuffix}` placeholders.
- FAQ capped at 8 items client-side.

## API

`GET /content/seo-landing?region_id=&region_name=&district=&subway=`

Returns `{ kind, intro, faq }`.

## Files

- `content-defaults.ts` — `DEFAULT_SEO_LANDING_SETTINGS`
- `content.service.ts` — `ensureSeoLandingSettings`, `resolveSeoLanding`
