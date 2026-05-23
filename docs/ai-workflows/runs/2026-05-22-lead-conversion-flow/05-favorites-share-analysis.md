# Iteration 30.5 — Favorites + Share Analysis

## Mode

LEAD + CONTACT CONVERSION FLOW · persistence · 2026-05-22

---

## Favorites architecture (existing — enhanced observability)

| Mode | Storage | Sync |
|---|---|---|
| Guest | `localStorage` key `lg_favorites_guest_v2` | — |
| Authenticated | `GET/POST/DELETE /favorites/*` | — |
| Guest → Auth merge | On login, POST each guest id then clear local | ✓ existing |

Limits: max 20 guest items total.

---

## Clear separation

| Action | Guest | Authenticated |
|---|---|---|
| Toggle block favorite | localStorage only | API persist |
| Toggle listing favorite | localStorage only | API persist |
| Login prompt | Only if navigating to protected fav page | N/A |

Apartment/complex pages: favorite icon requires auth for API listings; guest localStorage for numeric ids.

---

## Share flow (`shareCurrentPage`)

1. Try `navigator.share()` (mobile native)
2. Fallback: clipboard copy + toast «Ссылка скопирована»
3. AbortError (user cancel): silent return

Iter 30: `conversionObsShare()` on each share action (DEV debug only).

---

## Optimistic state

Favorites: guest toggles update UI immediately via `setGuest`. Auth toggles await API (existing pattern — no change to avoid sync bugs).

---

## Not implemented (by design)

- Share with UTM params
- Favorite collections / folders
- Email share fallback
