# 07 — Billing Integration

## Plan-aware branding

| Plan | Theme |
|------|-------|
| PREMIUM_AGENCY | `premium_agency` gradient |
| AGENCY | `agency` blue |
| AGENT | `premium` violet |
| FREE | `default` |

`resolvePublicTheme()` prefers billing plan over profile `themeKey`.

Featured blocks in discovery: `kind=premium` filters AGENCY/PREMIUM_AGENCY plans.

Trust scores unchanged by plan.
