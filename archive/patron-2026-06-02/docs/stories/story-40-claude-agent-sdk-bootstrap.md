# Story 40 — Claude Agent SDK bootstrap (model config + tool-call infra + prompt caching)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~2h
**Depends on:** story-30-hono-skeleton, story-06-env-and-secrets-setup

## BDD Acceptance Criteria

```
Given ANTHROPIC_API_KEY is present in env
When the api boots
Then a singleton `agentClient` (instance of @anthropic-ai/sdk Anthropic) is exported from apps/api/src/agent/client.ts
And model identifiers are exported: AGENT_MODEL_DECISION = "claude-opus-4-7" and AGENT_MODEL_BATCH = "claude-sonnet-4-6"
And a TS enum AgentIntent lists: OpenPosition, RepayPosition, MonitorDepeg, VerifyMerchant, PersonalizeLimits, HandleDispute

Given a caller invokes `runAgent({ intent, userId, input, tools })` from apps/api/src/agent/runner.ts
When the runner executes
Then it calls `agentClient.messages.create` with model=AGENT_MODEL_DECISION (or BATCH for PersonalizeLimits)
And system prompt cache_control = { type: "ephemeral" } is set on the system block (per @anthropic-ai/sdk caching docs)
And max_tokens defaults to 4096 (overridable per intent)
And tool_choice is "auto" for intents that may decline, "any" for intents that MUST act

Given the agent returns a tool_use response
When runner processes the response
Then each tool_use block is dispatched to a registered tool handler keyed by tool.name
And tool_result blocks are appended to the message thread
And the loop continues until stop_reason === "end_turn" OR a hard cap of 12 iterations is hit
And every iteration is persisted to agent_tasks.result with token usage stats

Given ANTHROPIC_API_KEY is missing
When the api boots
Then zod env validation throws at startup with a clear message
And no agent call can be made
```

## File modification map

- `apps/api/src/agent/client.ts` — NEW — singleton `Anthropic` client + model constants + AgentIntent enum
- `apps/api/src/agent/runner.ts` — NEW — `runAgent()` loop: message → tool dispatch → tool_result → loop until end_turn or cap
- `apps/api/src/agent/types.ts` — NEW — `AgentInput`, `AgentResult`, `ToolDefinition`, `ToolHandler` types
- `apps/api/src/agent/registry.ts` — NEW — `registerTool(name, schema, handler)` + `getRegisteredTools()` returning Anthropic tool definitions
- `apps/api/src/agent/prompts/system-base.ts` — NEW — base system prompt with Patron context + safety constraints (per-action $50 default ceiling, refuse if frozen, ERC-8004 logging mandatory)
- `apps/api/src/lib/env.ts` — UPDATE — add `ANTHROPIC_API_KEY` to zod schema as required string
- `apps/api/package.json` — UPDATE — add `@anthropic-ai/sdk` to dependencies (pin to latest minor)
- `apps/api/src/agent/__tests__/runner.test.ts` — NEW — Vitest unit covering: tool dispatch happy path, iteration cap exit, missing tool handler error, stop_reason end_turn exit

## Shell verification

```bash
# Dependency installed
pnpm --filter @patron/api list @anthropic-ai/sdk | grep "@anthropic-ai/sdk"

# Types compile
pnpm --filter @patron/api typecheck

# Bootstrap files exist
test -f apps/api/src/agent/client.ts
test -f apps/api/src/agent/runner.ts
test -f apps/api/src/agent/registry.ts
test -f apps/api/src/agent/prompts/system-base.ts

# Constants exported
grep -q "claude-opus-4-7" apps/api/src/agent/client.ts
grep -q "claude-sonnet-4-6" apps/api/src/agent/client.ts
grep -q "AgentIntent" apps/api/src/agent/client.ts

# Caching configured
grep -q "cache_control" apps/api/src/agent/runner.ts

# Iteration cap defined
grep -q "12" apps/api/src/agent/runner.ts

# Tests pass
pnpm --filter @patron/api vitest run src/agent/__tests__/runner.test.ts
```

## Notes

- Per ADR-001, decision engine lives in the Hono backend (NOT OpenClaw). This story establishes the singleton.
- Per architecture stack table: Opus 4.7 for decisions (`OpenPosition`, `RepayPosition`, `MonitorDepeg`, `VerifyMerchant`, `HandleDispute`); Sonnet 4.6 only for `PersonalizeLimits` weekly batch.
- Use `@anthropic-ai/sdk` v0.x latest. Verify via Context7 before coding: `mcp__plugin_context7_context7__resolve-library-id libraryName="@anthropic-ai/sdk"` then `query-docs topic="tool use prompt caching streaming"`.
- Prompt caching is mandatory on the system block — the system prompt for Patron is large (Patron context + safety constraints + tool inventory descriptions) and identical across requests. Caching cuts cost ~90% on cache hits.
- Hard iteration cap of 12 prevents runaway loops from hallucinated infinite tool calls (Grok/Bankrbot pattern per security domain §3.8).
- Per security domain §3.8 (excessive agency): system prompt MUST include the $50 default per-action ceiling, must-respect-frozen-status, and must-log-ERC-8004-receipt constraints.
- DO NOT make live LLM calls in unit tests — story-53 introduces recorded tool-call fixtures. Tests here mock `agentClient.messages.create` directly.
- Streaming is NOT required for v1 backend-only flow (intents are run as scheduled jobs, not streamed to UI). Add streaming in v2 if needed.
