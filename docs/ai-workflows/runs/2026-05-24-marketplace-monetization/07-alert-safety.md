# 07 — Alert / Retention Safety

- Saved search match engine uses `findAll` with `created_desc` — promoted listings may rank higher but **still pass all filters**
- Notification dedupe keys unchanged (`ss:{id}:listing:{id}`) — no boost spam
- Price drop alerts use favorite price snapshot — promotion tier irrelevant
- Moderation reject does not auto-remove promotion tier (manager must remove); assign blocked for non-public states
