# 04 — Autosave System

## Hybrid persistence

| Layer | Role |
|-------|------|
| localStorage `v2` | Fast UX cache, offline-ish recovery |
| Server snapshot | Source of truth |

## Client hook

`useWizardAutosave` — 1500ms debounce after `isDirty`

## API

```
PUT /admin/listings/wizard/:id/draft
{
  payload,
  expectedVersion,
  wizardStep
}
```

## Conflict handling

- Server compares `expectedVersion` vs `listings.draft_version`
- Mismatch → `409 Conflict` + `currentVersion`
- Client shows conflict toast, prompts refresh

## Draft creation

```
POST /admin/listings/wizard/drafts { regionId, kind? }
```

Triggered when user advances past geo step without existing `serverListingId`.
