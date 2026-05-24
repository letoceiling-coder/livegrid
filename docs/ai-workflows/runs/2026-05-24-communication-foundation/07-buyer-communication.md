# 07 — Buyer Communication

## Token flow

1. `POST /requests` returns `{ ...row, buyerToken }`
2. `LeadForm` persists token in `localStorage` key `lg_inquiry_threads`
3. Buyer can revisit history without account

## Public API

| Method | Path |
|--------|------|
| GET | `/communication/inquiry/:token` |
| POST | `/communication/inquiry/:token/messages` |

Returns only `BUYER_VISIBLE` messages.

## Profile UI

`BuyerInquiryHistory.tsx` on `/profile` — reads stored tokens, fetches thread, allows follow-up message.

## Anonymous safety

- Token is 48-char hex (unguessable)
- No PII in token
- Auth users also get `buyerUserId` on thread when JWT present on submit

## Not built

- Full public chat app UI on listing pages
- Email/SMS delivery of replies
