# 01 — Domain Terminology Audit

**Iteration:** 69 · **Date:** 2026-05-24  
**Mode:** Domain Consolidation

## Business rule (canonical)

**AGENT = human real estate employee** (realtor / sales manager).  
NOT AI, LLM, autonomous assistant, or tool runtime.

## Search results — AI agent infrastructure

| Pattern | Matches in app code (`apps/`, `packages/`) |
|---------|---------------------------------------------|
| `AgentRuntime` | **0** |
| `AiAgent` | **0** |
| `AssistantAgent` | **0** |
| `AgentExecutor` | **0** |
| `AgentMemory` | **0** |
| `ToolAgent` | **0** |
| `AutonomousAgent` | **0** |
| `subagent` / `CursorAgent` / `@cursor/sdk` Agent | **0** |
| `openai` / `langchain` / `anthropic` / `gpt-` | **0** |
| `vector search` / `vectorStore` / embeddings runtime | **0** (comment: rule-based scoring only) |
| `AI agent` / `AI агент` / `LLM agent` (UI) | **0** |
| `Ассистент` / `assistant` (UI strings) | **0** |

## Ambiguous but **proptech-correct** uses of “agent”

| Symbol | Meaning | Verdict |
|--------|---------|---------|
| `UserRole.agent` | Human realtor RBAC role | ✅ Correct |
| `EcosystemAgentService` | Public profile for employee (`AgentProfile`) | ✅ Correct |
| `/agent/:slug` | Public realtor landing page | ✅ Correct |
| `publicContact.kind: 'agent'` | Responsible human employee on manual listing | ✅ Correct |
| `ownerMode: 'agent'` | Wizard: assign human owner | ✅ Correct |
| `ListingContactAgent` type | Human contact DTO | ✅ Correct |

## “Intelligence” naming (heuristic, not AI)

| Symbol | Implementation | Risk |
|--------|----------------|------|
| `DiscoveryIntelligenceService` | Rule-based trending/popularity | Low — internal name |
| `timeline-intelligence.ts` | CRM timeline heuristics | Low — internal |
| `trend-intelligence.ts` | Trend direction heuristics | Low — internal |
| `ops-center` “operational intelligence” | Swagger summary only | Low |
| ~~`Timeline intelligence`~~ (admin UI) | Was English label | **Fixed** → «Хронология заявок» |

Comments in code explicitly state **no ML/embeddings** where relevant (`recommendation-scoring.ts`, `operational-forecast.ts`).

## “Orchestration” hits

Only in **feed import**, **CRM invalidation**, **wizard** — standard software orchestration, not AI agent orchestration. No action required.

## Dev-only “AI” paths (not user-facing)

- `docs/ai-workflows/` — internal iteration runbooks for Cursor/engineering workflow
- `AdminDocs.tsx` — mentions ChatGPT for copying admin docs as **prompt context** (staff tooling, not product feature)

## Verdict

**No AI-agent contamination** in production application code. Domain term `agent` consistently maps to **human employee** in business logic and public UX.
