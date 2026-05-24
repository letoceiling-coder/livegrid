# 06 — Cross-Project Pollution Audit

**Iteration:** 69 · **Date:** 2026-05-24

## Sources checked

| External pattern | Found in LiveGrid app code? |
|------------------|----------------------------|
| Assistant platforms / BotMate | **No** |
| AI runtimes (OpenAI SDK, LangChain) | **No** |
| Cursor Agent SDK (`Agent.create`) | **No** |
| Vector DB / embedding pipelines | **No** |
| Autonomous tool-calling loops | **No** |
| WebSocket chat assistants | **No** (CRM messaging is human-human) |

## Telegram integration

- `telegram-bot` module — **notification + auth**, not LLM assistant
- User-facing: login, CRM alerts, `/start` commands
- **Not** an AI agent product surface

## CRM automation

- `crm-automation-engine` — rule-based triggers (status changes, follow-up tasks)
- Assigns tasks to **human** `User` rows
- No prompt/LLM pipeline

## Discovery “intelligence”

- Heuristic scoring only (`@lg/shared/discovery`, `DiscoveryIntelligenceService`)
- Documented as non-ML in source comments
- Internal service name — acceptable pollution risk, not runtime leakage

## Legacy / duplicate folders

- `deployment/`, `frontend/` at repo root — older deploy docs, not assistant imports
- No botmate or assistant-platform code copied into `apps/`

## Engineering docs folder

`docs/ai-workflows/` — **meta-documentation** for Cursor iteration runs.  
Not deployed, not linked from public site, not shown to clients.

## Architecture purity

LiveGrid remains:
- NestJS API + Prisma + React SPA
- Proptech catalog + CRM + feed import
- Human ecosystem profiles

## Verdict

**Clean proptech architecture.** No assistant-runtime or cross-project AI platform pollution in runtime code.
