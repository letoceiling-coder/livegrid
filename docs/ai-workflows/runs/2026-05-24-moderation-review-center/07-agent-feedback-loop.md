# 07 — Agent Feedback Loop

**Page:** `/admin/my-listings`

## Badges & states

| State | UI |
|-------|-----|
| REVIEW / REJECTED | Visibility tab + wizard edit link (Iter 50) |
| Pending revision on PUBLIC | Amber «правки на проверке» badge |
| Reject reason | Red alert box with `moderationNote` |
| Last moderator action | Label + date + moderator name |

## Actionable UX

- Rejected → open wizard edit, see note in wizard footer (Iter 50)
- Pending revision on live listing → public card unchanged; agent edits via wizard
- REVIEW draft → full wizard flow until approved

Agents do **not** see moderation queue (manager+ only).
