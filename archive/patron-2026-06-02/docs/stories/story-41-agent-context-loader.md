# Story 41 — Agent context loader (per-user state into prompt context)

**Epic:** Epic 3 — Agent Decision Engine
**Estimated:** ~2h
**Depends on:** story-40-claude-agent-sdk-bootstrap, story-33-db-schema-events-tasks-keys

## BDD Acceptance Criteria

```
Given a userId and an AgentIntent
When `loadAgentContext({ userId, intent })` is called from apps/api/src/agent/context.ts
Then it returns an AgentContext object with: user (evm_address, erc8004_agent_id, frozen, permission_summary), openPositions (array), reputation (lifetime + last 10 entries), merchantWhitelist (array), spendingCaps (per-action + daily), recentEvents (last 20 ActionLogged for this user)
And every field is Zod-validated via AgentContextSchema before return
And the returned object serializes to JSON ≤ 12_000 chars (so it fits in the cached system block budget)

Given a user's `frozen` flag is true in the users table
When `loadAgentContext` is called for any intent EXCEPT MonitorDepeg
Then it throws AgentFrozenError with message "agent is frozen for user <id>; refuse all writes"
And the error is caught by runner.ts and the agent task is marked status=failed with errorMessage='agent_frozen'

Given the context loader runs
When it formats the context for injection
Then `formatContextBlock(ctx)` returns a markdown string starting with "## User context" containing all fields as bullet lists
And the formatted block is appended to the system prompt (NOT the user message) so it participates in the ephemeral cache_control block
And the block ends with a "## Hard constraints" section listing: per-action ceiling, frozen status, allowed contract addresses, current block timestamp

Given the userId does not exist in the users table
When `loadAgentContext` runs
Then it throws UserNotFoundError with status_code metadata
And no partial context is returned
```

## File modification map

- `apps/api/src/agent/context.ts` — NEW — `loadAgentContext({ userId, intent })` async function: parallel `Promise.all` of `loadUser`, `loadOpenPositions`, `loadReputation`, `loadMerchantWhitelist`, `loadSpendingCaps`, `loadRecentEvents`; assembles into `AgentContext`; throws `AgentFrozenError` / `UserNotFoundError`
- `apps/api/src/agent/contextSchema.ts` — NEW — Zod schemas: `AgentContextSchema`, `OpenPositionSchema`, `ReputationEntrySchema`, `MerchantSchema`, `SpendingCapsSchema`; export inferred TS types
- `apps/api/src/agent/contextFormatter.ts` — NEW — `formatContextBlock(ctx: AgentContext): string` returns markdown block ≤ 12000 chars; truncates `reputation` and `recentEvents` arrays first if budget exceeded
- `apps/api/src/agent/errors.ts` — NEW — `AgentFrozenError`, `UserNotFoundError`, `AgentContextTooLargeError` (Error subclasses with discriminating `name`)
- `apps/api/src/agent/runner.ts` — UPDATE — call `loadAgentContext` before invoking `agentClient.messages.create`; append `formatContextBlock(ctx)` to the system prompt; catch `AgentFrozenError` and short-circuit with structured failure
- `apps/api/src/agent/prompts/system-base.ts` — UPDATE — add placeholder `{{CONTEXT_BLOCK}}` token; runner replaces with formatted context
- `apps/api/src/agent/__tests__/context.test.ts` — NEW — Vitest unit tests using ephemeral Postgres + Drizzle: (1) loads full context for a seeded user, (2) throws AgentFrozenError when frozen=true and intent=OpenPosition, (3) DOES NOT throw when frozen=true and intent=MonitorDepeg (read-only), (4) throws UserNotFoundError for unknown userId, (5) truncates reputation when over budget
- `apps/api/src/agent/__tests__/contextFormatter.test.ts` — NEW — Vitest: snapshot of formatted markdown for a deterministic fixture; assert ≤ 12000 chars

## Shell verification

```bash
cd apps/api

# Files exist
test -f src/agent/context.ts
test -f src/agent/contextSchema.ts
test -f src/agent/contextFormatter.ts
test -f src/agent/errors.ts

# Typecheck
pnpm typecheck
test $? -eq 0

# Tests pass against ephemeral Postgres
pnpm vitest run src/agent/__tests__/context.test.ts src/agent/__tests__/contextFormatter.test.ts
test $? -eq 0

# Context block size budget enforced
grep -q "12000\|12_000" src/agent/contextFormatter.ts

# Frozen-user short-circuit is wired into runner
grep -q "AgentFrozenError" src/agent/runner.ts

# Context block injected into system prompt (not user message)
grep -q "CONTEXT_BLOCK" src/agent/prompts/system-base.ts
```

## Notes

- Per ADR-001, the decision engine lives in the Hono backend; this loader is the single source of truth for the agent's view of user state. No tool call should re-fetch what the loader already provides.
- Per security domain §3.8 (excessive agency), the `frozen` flag is the kill switch. Writes MUST be refused for frozen users; `MonitorDepeg` is exempt because it is read-only (only signals risk; rotation still requires non-frozen state).
- The context block goes in the SYSTEM prompt so it participates in `cache_control: { type: "ephemeral" }` (from story-40). Per-user context changes between requests but per-request it is static, so caching still amortizes the encoding cost.
- 12_000 char budget chosen so context + base system prompt fits comfortably under Anthropic's prompt-cache minimum tokens threshold (~1024 tokens) with headroom for prompt-suffix instructions per intent.
- Reputation entries from ERC-8004 should be loaded via the `ReputationProxy` view function exposed in a thin DB-cached layer (story-52 writes them; this story reads them). For now, read from `events` table where `event_name = 'ActionLogged'` and filter by user's `erc8004_agent_id`.
- DO NOT load secret material (private keys, API key hashes) into context. The context is what the LLM sees; treat it as eventually-loggable.
- File MUST stay under 400 LOC each (Biome rule from story-01).
