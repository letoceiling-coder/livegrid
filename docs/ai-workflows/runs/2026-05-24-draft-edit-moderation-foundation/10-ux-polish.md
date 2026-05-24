# 10 — UX Polish

## Implemented

| Feature | Location |
|---------|----------|
| Autosave indicator | Footer (cloud icon + status) |
| Draft restored toast | Hydration + banner |
| Unsaved changes warning | `beforeunload` when `isDirty` |
| Step validation badges | Amber border on invalid steps |
| Publish confirmation | confirm() dialog |
| Moderation badges | REVIEW/REJECTED labels + reject note |
| Pending revision banner | Wizard body |
| Mobile sticky footer | Iter 49 footer retained |

## Autosave states

`idle | pending | saving | saved | error | conflict`

## Moderation UX

Agents see «На модерацию» when flag enabled.
