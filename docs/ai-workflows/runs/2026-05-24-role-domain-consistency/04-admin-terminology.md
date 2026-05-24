# 04 — Admin Terminology

**Iteration:** 69 · **Date:** 2026-05-24

## Russian business labels (audit)

| Context | Label used | Correct? |
|---------|------------|----------|
| User role agent | «Агент» | ✅ |
| User role manager | «Менеджер» | ✅ |
| User role editor | «Редактор» | ✅ (not «директор») |
| User role admin | «Администратор» | ✅ |
| User role client | «Клиент» | ✅ |
| Listing owner (manual) | «Ответственный агент» | ✅ |
| Feed contact | «Контакт агентства» | ✅ |
| Ecosystem nav | «Агенты» / «Агентства» | ✅ |
| Moderation | «Агент: {name}» | ✅ |
| Trust center | «Агенты», «Подозр. агенты» | ✅ (human fraud context) |
| CRM assignee | «Менеджер» | ✅ |
| Wizard step | «Назначить агента» | ✅ |

## Incorrect / avoided (not found in product UI)

| Term | Status |
|------|--------|
| «AI агент» | ❌ Not found |
| «Ассистент» | ❌ Not found |
| «AI assistant» | ❌ Not found |
| «Autonomous agent» | ❌ Not found |

## Fixes applied (iter 69)

| Before | After | File |
|--------|-------|------|
| `Timeline intelligence` | `Хронология заявок` | `CrmAnalyticsPanel.tsx` |

## Acceptable isolated references

| Location | Text | Scope |
|----------|------|-------|
| `AdminDocs.tsx` | ChatGPT for copying docs | Admin dev helper only |
| Swagger (internal) | “operational intelligence” | API docs, not public |

## Optional future polish (not required)

- Rename internal modules `*Intelligence*` → `*Insights*` for staff clarity (cosmetic, large diff)
- Add UI alias «Директор» if `editor` role rebranded

## Verdict

Admin and public Russian terminology is **proptech-consistent**. One English “intelligence” label **corrected**.
